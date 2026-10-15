-- Silent pushes: wake closed apps so widgets and watches show new answers.
-- Run after push.sql, social-live.sql and answer-keys.sql. Safe to run again.
--
-- When an answer changes, every device that would hear about it live
-- (social-live.sql) gets a silent push too, so a closed app can pull and
-- redraw its widgets and watch:
--   your own answers (answer_log): your other devices, not the one that
--     answered (header x-didi-device from the app, or the answer key's device);
--   Did we, family and Did you answers: the same people live_ping reaches.
-- The push carries nothing but "wake". The app reads through its usual
-- queries, so what anyone sees is decided there, as today.
--
-- Coalesced per device: at most one every 10 seconds and 20 an hour. A
-- device asked again inside those limits is sent one push once they allow.
-- The push edge function drains the queue: kicked by pg_net when something
-- is waiting (at most every 2 seconds), and by a 10 second cron for the
-- ones held back. Needs pg_cron, pg_net and the Vault secrets project_url
-- and service_role_key (admin-mail.sql); without them nothing is sent.

create table if not exists public.wake_queue (
  user_id uuid not null,
  device_key text not null,
  due boolean not null default true,
  asked_at timestamptz not null default now(),
  sent_at timestamptz,
  hour_at timestamptz not null default now(),
  hour_sent integer not null default 0,
  primary key (user_id, device_key),
  foreign key (user_id, device_key) references public.devices (user_id, device_key) on delete cascade
);

alter table public.wake_queue drop constraint if exists wake_queue_len;
alter table public.wake_queue add constraint wake_queue_len check (length(device_key) <= 128);

create index if not exists wake_queue_due_idx on public.wake_queue (asked_at) where due;

alter table public.wake_queue enable row level security;
revoke all on public.wake_queue from anon, authenticated;

-- One row: when the push function was last kicked.
create table if not exists public.wake_kick (
  id integer primary key check (id = 1),
  at timestamptz not null default '-infinity'
);
insert into public.wake_kick (id) values (1) on conflict (id) do nothing;
alter table public.wake_kick enable row level security;
revoke all on public.wake_kick from anon, authenticated;

-- The device the current request came from: the answer key's (answer-keys.sql)
-- or the app's x-didi-device header. Only used to leave that device out.
create or replace function public.wake_from_device()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  d text := nullif(current_setting('didi.device', true), '');
begin
  if d is null then
    begin
      d := nullif(left(current_setting('request.headers', true)::json ->> 'x-didi-device', 128), '');
    exception when others then
      d := null;
    end;
  end if;
  return d;
end;
$$;

revoke all on function public.wake_from_device() from public, anon, authenticated;

-- Calls the push function now, unless it was called in the last 2 seconds or
-- another answer is calling it right now. Never fails the answer.
create or replace function public.wake_kick_now()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  last timestamptz;
begin
  select k.at into last from public.wake_kick k where k.id = 1 for update skip locked;
  if not found or last > now() - interval '2 seconds' then
    return;
  end if;
  update public.wake_kick set at = now() where id = 1;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"wake":true}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url');
exception when others then
  null;
end;
$$;

revoke all on function public.wake_kick_now() from public, anon, authenticated;

-- Ask for a wake on every device with a push token of these people, except
-- skip. A device already waiting stays as it is.
create or replace function public.wake_devices(who uuid[], skip text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if who is null or cardinality(who) = 0 then
    return;
  end if;
  insert into public.wake_queue as w (user_id, device_key, due, asked_at)
  select d.user_id, d.device_key, true, now()
  from public.devices d
  where d.user_id = any(who)
    and d.push_token is not null
    and d.device_key is distinct from skip
  on conflict (user_id, device_key) do update
    set due = true, asked_at = now()
    where not w.due;
  get diagnostics n = row_count;
  if n > 0 then
    perform public.wake_kick_now();
  end if;
exception when others then
  null;
end;
$$;

revoke all on function public.wake_devices(uuid[], text) from public, anon, authenticated;

-- Your own answers: your other devices.
create or replace function public.wake_own_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid[];
  n integer;
begin
  select array_agg(distinct user_id), count(*) into who, n from changed;
  -- A bulk delete (a prune of removed questions) is already on every device.
  if tg_op = 'DELETE' and n > 20 then
    return null;
  end if;
  perform public.wake_devices(who, public.wake_from_device());
  return null;
end;
$$;

revoke all on function public.wake_own_answers() from public, anon, authenticated;

drop trigger if exists wake_answer_ins on public.answer_log;
drop trigger if exists wake_answer_upd on public.answer_log;
drop trigger if exists wake_answer_del on public.answer_log;
create trigger wake_answer_ins after insert on public.answer_log
  referencing new table as changed for each statement execute function public.wake_own_answers();
create trigger wake_answer_upd after update on public.answer_log
  referencing new table as changed for each statement execute function public.wake_own_answers();
create trigger wake_answer_del after delete on public.answer_log
  referencing old table as changed for each statement execute function public.wake_own_answers();

-- live_ping from social-live.sql, plus a wake for the same people when the
-- ping is about an answer. Everything else in it is unchanged.
create or replace function public.live_ping(who uuid[], kind text, ref uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  one uuid;
begin
  foreach one in array coalesce(who, '{}') loop
    begin
      perform realtime.send(jsonb_build_object('kind', kind, 'id', ref), 'live', 'didi:' || one::text, true);
    exception when others then
      null;
    end;
  end loop;
  if kind in ('we', 'family', 'send') then
    perform public.wake_devices(who, null);
  end if;
end;
$$;

revoke all on function public.live_ping(uuid[], text, uuid) from public, anon, authenticated;

-- For the push function only. Marks up to how_many due devices sent and
-- returns their tokens.
create or replace function public.take_wake_batch(how_many integer default 200)
returns table (user_id uuid, device_key text, token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    update public.wake_queue w
    set due = false,
        sent_at = now(),
        hour_sent = case when w.hour_at < now() - interval '1 hour' then 1 else w.hour_sent + 1 end,
        hour_at = case when w.hour_at < now() - interval '1 hour' then now() else w.hour_at end
    where (w.user_id, w.device_key) in (
      select q.user_id, q.device_key from public.wake_queue q
      where q.due
        and (q.sent_at is null or q.sent_at < now() - interval '10 seconds')
        and (q.hour_at < now() - interval '1 hour' or q.hour_sent < 20)
      order by q.asked_at
      limit greatest(1, least(how_many, 500))
      for update skip locked
    )
    returning w.user_id, w.device_key
  )
  select p.user_id, p.device_key, d.push_token
  from picked p
  join public.devices d on d.user_id = p.user_id and d.device_key = p.device_key
  where d.push_token is not null;
end;
$$;

revoke all on function public.take_wake_batch(integer) from public, anon, authenticated;

-- Held-back wakes (inside the 10 second gap) go out on this tick.
select cron.unschedule('wake-push') where exists (select 1 from cron.job where jobname = 'wake-push');
select cron.schedule('wake-push', '10 seconds', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"wake":true}'::jsonb
  )
  where exists (
      select 1 from public.wake_queue q
      where q.due
        and (q.sent_at is null or q.sent_at < now() - interval '10 seconds')
        and (q.hour_at < now() - interval '1 hour' or q.hour_sent < 20)
    )
    and exists (select 1 from vault.decrypted_secrets where name = 'project_url');
$cron$);
