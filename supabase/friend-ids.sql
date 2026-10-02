-- Friend IDs: every account gets a random 12-digit number to share, so adding
-- a friend never needs a phone number. Run after lockdown.sql.

alter table public.profiles add column if not exists friend_id text;
-- Profile picture (public link in the avatars bucket); rules in avatars.sql.
alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_friend_id_shape;
alter table public.profiles add constraint profiles_friend_id_shape
  check (friend_id is null or friend_id ~ '^[1-9][0-9]{11}$');

create unique index if not exists profiles_friend_id_key on public.profiles (friend_id);

-- 12 random digits, never starting with 0, not already taken.
create or replace function public.new_friend_id()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  pick text;
begin
  loop
    pick := (1 + floor(random() * 9))::int::text
      || lpad(floor(random() * 100000000000)::bigint::text, 11, '0');
    exit when not exists (select 1 from public.profiles where friend_id = pick);
  end loop;
  return pick;
end;
$$;

revoke all on function public.new_friend_id() from public, anon, authenticated;

-- Set on the first save and never changed by the person themselves.
create or replace function public.keep_friend_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.friend_id := coalesce(old.friend_id, public.new_friend_id());
  elsif new.friend_id is null or current_user in ('authenticated', 'anon') then
    new.friend_id := public.new_friend_id();
  end if;
  return new;
end;
$$;

revoke all on function public.keep_friend_id() from public;

drop trigger if exists keep_friend_id on public.profiles;
create trigger keep_friend_id
  before insert or update on public.profiles
  for each row execute function public.keep_friend_id();

-- Everyone who already has a profile gets one now.
update public.profiles set friend_id = public.new_friend_id() where friend_id is null;

-- Adding a friend no longer needs your own number on file.
drop trigger if exists need_phone_to_ask on public.friend_links;
drop function if exists public.need_phone_to_ask();

-- Wrong IDs typed, so nobody can guess their way through the numbers.
create table if not exists public.friend_id_misses (
  user_id uuid not null references auth.users on delete cascade,
  made_at timestamptz not null default now()
);

create index if not exists friend_id_misses_user_idx on public.friend_id_misses (user_id, made_at);

alter table public.friend_id_misses enable row level security;
revoke all on public.friend_id_misses from anon, authenticated;

-- Ask someone to be friends by their friend ID. Returns their name, or
-- {miss: nobody}.
create or replace function public.ask_by_friend_id(wanted text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  code text := regexp_replace(coalesce(wanted, ''), '[^0-9]', '', 'g');
  them public.profiles;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from public.friend_id_misses m
      where m.user_id = who and m.made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many tries';
  end if;
  if code !~ '^[1-9][0-9]{11}$' then
    raise exception 'bad id';
  end if;

  select * into them from public.profiles p where p.friend_id = code;
  -- A miss returns instead of raising: raising would roll back the miss
  -- row, and then the daily limit would never count anything.
  -- A block gets the same answer as a wrong ID, so it is not revealed.
  if them is null or them.user_id = who or public.blocked_with(them.user_id) then
    insert into public.friend_id_misses (user_id) values (who);
    return jsonb_build_object('miss', 'nobody');
  end if;

  insert into public.friend_links (from_id, to_id, state)
  values (who, them.user_id, 'asked')
  on conflict do nothing;

  return jsonb_build_object('user_id', them.user_id, 'display_name', coalesce(them.display_name, ''));
end;
$$;

revoke all on function public.ask_by_friend_id(text) from public, anon;
grant execute on function public.ask_by_friend_id(text) to authenticated;

-- Who a friend ID belongs to, before asking, so the app can show "Send a
-- friend request to ...?". Sends nothing. Same miss count and daily limit as
-- ask_by_friend_id. state: 'friends', 'asked' (you already asked them),
-- 'asksYou' (they asked you), or '' (nothing yet).
create or replace function public.look_up_friend_id(wanted text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  code text := regexp_replace(coalesce(wanted, ''), '[^0-9]', '', 'g');
  them public.profiles;
  mine text;
  theirs text;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from public.friend_id_misses m
      where m.user_id = who and m.made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many tries';
  end if;
  if code !~ '^[1-9][0-9]{11}$' then
    raise exception 'bad id';
  end if;

  select * into them from public.profiles p where p.friend_id = code;
  if them is null or them.user_id = who or public.blocked_with(them.user_id) then
    insert into public.friend_id_misses (user_id) values (who);
    return jsonb_build_object('miss', 'nobody');
  end if;

  select state into mine from public.friend_links where from_id = who and to_id = them.user_id;
  select state into theirs from public.friend_links where from_id = them.user_id and to_id = who;

  return jsonb_build_object(
    'user_id', them.user_id,
    'display_name', coalesce(them.display_name, ''),
    'avatar_url', coalesce(them.avatar_url, ''),
    'state', case
      when mine = 'ok' or theirs = 'ok' then 'friends'
      when theirs = 'asked' then 'asksYou'
      when mine = 'asked' then 'asked'
      else ''
    end
  );
end;
$$;

revoke all on function public.look_up_friend_id(text) from public, anon;
grant execute on function public.look_up_friend_id(text) to authenticated;

-- Your own friend ID, making one if the row is older than this file.
create or replace function public.my_friend_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  mine text;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
  select friend_id into mine from public.profiles where user_id = who;
  if mine is null then
    update public.profiles set friend_id = public.new_friend_id() where user_id = who
    returning friend_id into mine;
  end if;
  return mine;
end;
$$;

revoke all on function public.my_friend_id() from public, anon;
grant execute on function public.my_friend_id() to authenticated;

-- No phone numbers. Friend IDs replace them, and numbers already saved are
-- deleted with the column.
drop function if exists public.find_phone(text);
drop function if exists public.set_my_phone(text);
drop trigger if exists fold_phone on public.profiles;
drop function if exists public.fold_phone();
drop function if exists public.normalize_phone(text);
alter table public.profiles drop column if exists phone;

notify pgrst, 'reload schema';
