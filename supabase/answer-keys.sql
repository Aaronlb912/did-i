-- Answer keys: a widget or watch tap reaches the account with the app closed.
-- Run after consent-guards.sql and social-live.sql (db:apply:all order).
-- Safe to run again.
--
-- When the app signs in it asks for one key per device (make_answer_key).
-- The app keeps the key in the iOS Keychain (shared with the widget through
-- the app group) or the Android Keystore. The server keeps only its sha256.
--
-- A key can do one thing: key_answer writes Did or Not yet (or takes back
-- that exact tap) on a question the key's owner has on their shelf, on a
-- night that is still open. It cannot read, send, pay or buy anything. The
-- write goes through put_answers_as, the same insert and merge rule as the
-- app's own put_answers, so Realtime and the live triggers fire as usual.
-- Coins are never paid here: the device that tapped pays when its app
-- applies the tap, exactly as it does today.
--
-- Keys end on sign out (the app calls revoke_answer_keys), when the device
-- row goes (Settings, forget a phone), and with the account (cascade).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.answer_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  device_key text not null,
  key_hash bytea not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  -- Rate limit: uses since window_at.
  window_at timestamptz not null default now(),
  window_uses integer not null default 0
);

alter table public.answer_keys drop constraint if exists answer_keys_len;
alter table public.answer_keys add constraint answer_keys_len
  check (length(device_key) between 1 and 128 and octet_length(key_hash) = 32);

create unique index if not exists answer_keys_hash_idx on public.answer_keys (key_hash);
create index if not exists answer_keys_user_idx on public.answer_keys (user_id, device_key);

alter table public.answer_keys enable row level security;
revoke all on public.answer_keys from anon, authenticated;
-- The owner may list their keys, never the hash.
grant select (id, device_key, created_at, last_used_at, revoked_at) on public.answer_keys to authenticated;

drop policy if exists "own answer keys" on public.answer_keys;
create policy "own answer keys" on public.answer_keys
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- At most 10 live keys per account, and 30 new ones a day.
create or replace function public.cap_answer_keys()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.answer_keys k
      where k.user_id = new.user_id and k.revoked_at is null) >= 10 then
    raise exception 'too many answer keys';
  end if;
  if (select count(*) from public.answer_keys k
      where k.user_id = new.user_id and k.created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many answer keys today';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_answer_keys() from public, anon, authenticated;

drop trigger if exists cap_answer_keys on public.answer_keys;
create trigger cap_answer_keys
  before insert on public.answer_keys
  for each row execute function public.cap_answer_keys();

-- The body of put_answers (consent-guards.sql) for a given account. Nobody
-- but the definer functions below may call it.
create or replace function public.put_answers_as(me uuid, rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  put integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(rows) > 2000 then
    raise exception 'too many answers at once';
  end if;

  insert into public.answer_log
    (user_id, lamp_id, period_key, board_id, status, answered_at, note, note_at, amount, updated_at)
  select
    me,
    left(r->>'l', 64),
    left(r->>'p', 24),
    left(coalesce(r->>'b', ''), 64),
    case when r->>'s' in ('yes', 'skip', 'late') then r->>'s' else 'yes' end,
    left(coalesce(r->>'a', ''), 32),
    left(coalesce(r->>'n', ''), 500),
    left(coalesce(r->>'e', ''), 32),
    case
      when not (r ? 'm') then (
        select o.amount from public.answer_log o
        where o.user_id = me and o.lamp_id = left(r->>'l', 64) and o.period_key = left(r->>'p', 24)
      )
      -- Nested so the cast only runs on a json number.
      when jsonb_typeof(r->'m') = 'number' then (
        case when (r->'m')::numeric >= 0 and (r->'m')::numeric <= 100000
          then round((r->'m')::numeric, 2) end
      )
      else null
    end
  , now()
  from jsonb_array_elements(rows) r
  where r->>'l' is not null and r->>'p' is not null
  on conflict (user_id, lamp_id, period_key) do update
    set status = excluded.status,
        answered_at = excluded.answered_at,
        note = excluded.note,
        note_at = excluded.note_at,
        amount = excluded.amount,
        board_id = excluded.board_id,
        updated_at = now()
    where greatest(public.stamp_ts(excluded.answered_at), public.stamp_ts(excluded.note_at))
      > greatest(public.stamp_ts(public.answer_log.answered_at), public.stamp_ts(public.answer_log.note_at));

  get diagnostics put = row_count;
  return put;
end;
$$;

revoke all on function public.put_answers_as(uuid, jsonb) from public, anon, authenticated;

-- The app's own write, unchanged in what it does.
create or replace function public.put_answers(rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.put_answers_as((select auth.uid()), rows);
end;
$$;

revoke all on function public.put_answers(jsonb) from public;
grant execute on function public.put_answers(jsonb) to authenticated;

-- A new key for this device. Any older key for the same device ends.
-- Returns the key once; only its hash is kept.
create or replace function public.make_answer_key(device text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  raw bytea := extensions.gen_random_bytes(32);
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if device is null or length(device) < 1 or length(device) > 128 then
    raise exception 'bad device';
  end if;
  -- Only a device this account has checked in from.
  if not exists (select 1 from public.devices d where d.user_id = me and d.device_key = device) then
    raise exception 'unknown device';
  end if;
  update public.answer_keys set revoked_at = now()
  where user_id = me and device_key = device and revoked_at is null;
  -- Ended keys are kept a month for the owner's list, then go.
  delete from public.answer_keys
  where user_id = me and revoked_at is not null and revoked_at < now() - interval '30 days';
  insert into public.answer_keys (user_id, device_key, key_hash)
  values (me, device, extensions.digest(raw, 'sha256'));
  return encode(raw, 'hex');
end;
$$;

revoke all on function public.make_answer_key(text) from public, anon;
grant execute on function public.make_answer_key(text) to authenticated;

-- End your own keys: one device's (sign out here), one key, or all of them
-- (sign out everywhere). Returns how many ended.
create or replace function public.revoke_answer_keys(device text default null, one uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  n integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  update public.answer_keys set revoked_at = now()
  where user_id = me
    and revoked_at is null
    and (device is null or device_key = device)
    and (one is null or id = one);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.revoke_answer_keys(text, uuid) from public, anon;
grant execute on function public.revoke_answer_keys(text, uuid) to authenticated;

-- A forgotten phone's keys end with its device row.
create or replace function public.end_device_answer_keys()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.answer_keys set revoked_at = now()
  where user_id = old.user_id and device_key = old.device_key and revoked_at is null;
  return null;
end;
$$;

revoke all on function public.end_device_answer_keys() from public, anon, authenticated;

drop trigger if exists end_device_answer_keys on public.devices;
create trigger end_device_answer_keys
  after delete on public.devices
  for each row execute function public.end_device_answer_keys();

-- The night a tap may land on, in the owner's own zone: tonight, or last
-- night until 9am (GRACE_END in src/lib/zone.js; DAY_FOLD is 0).
create or replace function public.key_night_open(who uuid, night text, at timestamptz default now())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  z text := coalesce((select p.zone from public.profiles p where p.user_id = who), '');
  here timestamp;
  today date;
  floor_day date;
begin
  if night !~ '^\d{4}-\d{2}-\d{2}$' then
    return false;
  end if;
  if z = '' or not exists (select 1 from pg_timezone_names t where t.name = z) then
    z := 'UTC';
  end if;
  here := coalesce(at, now()) at time zone z;
  today := here::date;
  floor_day := case when extract(hour from here) < 9 then today - 1 else today end;
  return night::date between floor_day and today;
exception when others then
  return false;
end;
$$;

revoke all on function public.key_night_open(uuid, text, timestamptz) from public, anon, authenticated;

-- The one thing a key does. kind: 'did', 'nope', or 'undo' (takes back the
-- answer stamped exactly at). at: when it was tapped, ISO with a zone.
-- Returns 'ok', 'same' (a newer answer is already there), or why not:
-- 'bad', 'key', 'slow', 'closed', 'question'. Never raises on bad input, so a
-- widget can tell a dead key from a network miss.
create or replace function public.key_answer(key text, lamp text, night text, kind text, at text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.answer_keys;
  board text;
  tapped timestamptz;
  prev text;
  status text;
  n integer;
begin
  if key is null or key !~ '^[0-9a-f]{64}$'
     or lamp is null or length(lamp) < 1 or length(lamp) > 64
     or night is null or length(night) > 24
     or kind is null or kind not in ('did', 'nope', 'undo')
     or at is null or length(at) > 32 then
    return 'bad';
  end if;

  select * into k from public.answer_keys
  where key_hash = extensions.digest(decode(key, 'hex'), 'sha256') and revoked_at is null
  for update;
  if not found then
    return 'key';
  end if;

  -- 30 writes per key per 10 minutes. Counted before any other check, so a
  -- stolen key cannot probe questions faster either.
  if k.window_at < now() - interval '10 minutes' then
    update public.answer_keys set window_at = now(), window_uses = 1, last_used_at = now() where id = k.id;
  elsif k.window_uses >= 30 then
    return 'slow';
  else
    update public.answer_keys set window_uses = window_uses + 1, last_used_at = now() where id = k.id;
  end if;

  tapped := public.stamp_ts(at);
  -- A tap from up to a day ago (a watch out of reach), never from the future.
  if tapped is null or tapped = '-infinity'::timestamptz
     or tapped < now() - interval '1 day' or tapped > now() + interval '5 minutes' then
    return 'bad';
  end if;

  -- Open when it was tapped, so a late delivery still lands.
  if not public.key_night_open(k.user_id, night, tapped) then
    return 'closed';
  end if;

  -- The question has to be on the owner's own shelf.
  select b->>'id' into board
  from public.shelves s, jsonb_array_elements(case when jsonb_typeof(s.doc->'boards') = 'array' then s.doc->'boards' else '[]'::jsonb end) b
  where s.user_id = k.user_id
    and jsonb_typeof(b->'lamps') = 'array'
    and exists (select 1 from jsonb_array_elements(b->'lamps') l where l->>'id' = lamp)
  limit 1;
  if board is null then
    return 'question';
  end if;

  -- Tells the live triggers which device answered, so it is not woken.
  perform set_config('didi.device', k.device_key, true);

  if kind = 'undo' then
    delete from public.answer_log a
    where a.user_id = k.user_id and a.lamp_id = lamp and a.period_key = night
      and public.stamp_ts(a.answered_at) = tapped;
    get diagnostics n = row_count;
    return case when n > 0 then 'ok' else 'same' end;
  end if;

  -- Did after Not yet on the same night is 'late', as in the app
  -- (didStatusForRow in src/lib/recurrence.js).
  select a.status into prev from public.answer_log a
  where a.user_id = k.user_id and a.lamp_id = lamp and a.period_key = night;
  status := case when kind = 'nope' then 'skip' when prev = 'skip' then 'late' else 'yes' end;

  -- The same row the app's putAnswer makes: no note, no amount.
  n := public.put_answers_as(k.user_id, jsonb_build_array(jsonb_build_object(
    'b', board, 'l', lamp, 'p', night, 's', status,
    'a', to_char(tapped at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'n', '', 'e', '', 'm', null)));
  return case when n > 0 then 'ok' else 'same' end;
end;
$$;

revoke all on function public.key_answer(text, text, text, text, text) from public;
grant execute on function public.key_answer(text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
