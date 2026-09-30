-- Did I, part six. Getting a nudge to a phone that is not open.
-- Run after the others. Safe to run again.
--
-- The phone stores its Firebase token against its device row. When a
-- send or a friend request lands, a trigger drops a job in push_queue.
-- An edge function drains the queue and talks to Firebase, because
-- Postgres has no business holding an HTTP connection open.

alter table public.devices add column if not exists push_token text;

alter table public.devices drop constraint if exists devices_token_len;
alter table public.devices add constraint devices_token_len
  check (push_token is null or length(push_token) <= 400);

-- Only rows with a token are worth reading when something happens.
create index if not exists devices_push_idx
  on public.devices (user_id) where push_token is not null;

create table if not exists public.push_queue (
  id bigserial primary key,
  to_id uuid not null references auth.users on delete cascade,
  title text not null default 'Did I',
  body text not null default '',
  go text not null default '/inbox',
  made_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists push_queue_waiting_idx
  on public.push_queue (made_at) where sent_at is null;

create index if not exists push_queue_to_idx on public.push_queue (to_id);

alter table public.push_queue enable row level security;
revoke all on public.push_queue from anon;
revoke all on public.push_queue from authenticated;

alter table public.push_queue drop constraint if exists push_queue_len;
alter table public.push_queue add constraint push_queue_len
  check (length(title) <= 80 and length(body) <= 200 and length(go) <= 80);

-- The person's own notification switches (prefs.pingsOff, set in the app's
-- Reminders screen). Kinds: sends, cheers, friends. Same names as
-- PING_KINDS in src/lib/prefs.js.
create or replace function public.push_wanted(who uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not coalesce(
    (select jsonb_typeof(p.prefs -> 'pingsOff') = 'array' and (p.prefs -> 'pingsOff') ? kind
     from public.profiles p where p.user_id = who),
    false
  );
$$;

revoke all on function public.push_wanted(uuid, text) from public;
revoke all on function public.push_wanted(uuid, text) from anon;
revoke all on function public.push_wanted(uuid, text) from authenticated;

-- What the person sees on the lock screen. Never the question itself
-- for a cheer, and never anything about who else is involved.
create or replace function public.queue_send_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  if not public.push_wanted(new.to_id, case when new.kind = 'cheer' then 'cheers' else 'sends' end) then
    return new;
  end if;
  select coalesce(nullif(p.display_name, ''), '@' || coalesce(p.handle, ''), 'A friend')
  into who
  from public.profiles p where p.user_id = new.from_id;

  insert into public.push_queue (to_id, title, body, go)
  values (
    new.to_id,
    coalesce(who, 'A friend'),
    case
      when new.kind = 'cheer' then 'sent you a cheer.'
      else 'sent you a Did I: ' || left(new.question, 120)
    end,
    '/inbox'
  );
  return new;
end;
$$;

drop trigger if exists queue_send_push on public.sends;
create trigger queue_send_push
  after insert on public.sends
  for each row execute function public.queue_send_push();

create or replace function public.queue_ask_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dname text;
  body text;
begin
  if new.state <> 'asked' or not public.push_wanted(new.to_id, 'friends') then
    return new;
  end if;
  select coalesce(nullif(trim(p.display_name), ''), '')
  into dname
  from public.profiles p where p.user_id = new.from_id;

  if dname <> '' then
    body := dname || ' wants to be friends.';
  else
    body := 'Someone wants to be friends.';
  end if;

  insert into public.push_queue (to_id, title, body, go)
  values (new.to_id, 'Friend request', body, '/friends?id=' || new.id::text);
  return new;
end;
$$;

drop trigger if exists queue_ask_push on public.friend_links;
create trigger queue_ask_push
  after insert on public.friend_links
  for each row execute function public.queue_ask_push();

-- What the edge function calls. It runs with the service role, which is
-- why neither anon nor a signed-in person can reach any of this.
create or replace function public.take_push_batch(how_many integer default 50)
returns table (id bigint, to_id uuid, title text, body text, go text, tokens text[])
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    update public.push_queue q
    set sent_at = now()
    where q.id in (
      select q2.id from public.push_queue q2
      where q2.sent_at is null
      order by q2.made_at
      limit greatest(1, least(how_many, 200))
      for update skip locked
    )
    returning q.id, q.to_id, q.title, q.body, q.go
  )
  select p.id, p.to_id, p.title, p.body, p.go,
         coalesce(array_agg(d.push_token) filter (where d.push_token is not null), '{}')
  from picked p
  left join public.devices d on d.user_id = p.to_id and d.push_token is not null
  group by p.id, p.to_id, p.title, p.body, p.go;
end;
$$;

revoke all on function public.take_push_batch(integer) from public;
revoke all on function public.take_push_batch(integer) from anon;
revoke all on function public.take_push_batch(integer) from authenticated;

-- A queue nobody drained should not grow forever.
create or replace function public.sweep_push_queue()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  gone integer;
begin
  delete from public.push_queue
  where (sent_at is not null and sent_at < now() - interval '3 days')
     or made_at < now() - interval '14 days';
  get diagnostics gone = row_count;
  return gone;
end;
$$;
