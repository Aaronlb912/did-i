-- Phone numbers for finding friends. Run after people.sql.
-- Replaces handles for new friend requests. Handles stay on old rows.

alter table public.profiles add column if not exists phone text;

update public.profiles set phone = null where phone = '';

create or replace function public.normalize_phone(raw text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digits text := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
begin
  if digits = '' or length(digits) < 10 or length(digits) > 15 then
    return null;
  end if;
  if length(digits) = 10 then
    digits := '1' || digits;
  end if;
  return '+' || digits;
end;
$$;

create or replace function public.fold_phone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists fold_phone on public.profiles;
create trigger fold_phone
  before insert or update of phone on public.profiles
  for each row execute function public.fold_phone();

alter table public.profiles drop constraint if exists profiles_phone_shape;
alter table public.profiles add constraint profiles_phone_shape
  check (phone is null or phone ~ '^\+[1-9][0-9]{9,14}$');

drop index if exists profiles_phone_key;
create unique index if not exists profiles_phone_key
  on public.profiles (phone) where phone is not null;

create or replace function public.set_my_phone(wanted text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  try text := public.normalize_phone(wanted);
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if try is null then
    raise exception 'bad phone';
  end if;
  insert into public.profiles (user_id, phone)
  values (me, try)
  on conflict (user_id) do update
    set phone = try, updated_at = now();
  return try;
end;
$$;

revoke all on function public.set_my_phone(text) from public;
grant execute on function public.set_my_phone(text) to authenticated;

create or replace function public.find_phone(wanted text)
returns table (user_id uuid, phone text, display_name text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, p.phone, p.display_name
  from public.profiles p
  where p.phone is not null
    and p.phone = public.normalize_phone(wanted)
    and p.user_id <> auth.uid();
$$;

revoke all on function public.find_phone(text) from public;
grant execute on function public.find_phone(text) to authenticated;

drop function if exists public.known_people();

create or replace function public.known_people()
returns table (
  user_id uuid,
  phone text,
  display_name text,
  share_streak boolean,
  streak integer,
  done_on date
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select case when l.from_id = (select id from me) then l.to_id else l.from_id end as who
    from public.friend_links l
    where l.state = 'ok' and (select id from me) in (l.from_id, l.to_id)
    union
    select theirs.user_id
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select id from me)
  )
  select p.user_id, p.phone, p.display_name, p.share_streak, p.streak, p.done_on
  from public.profiles p
  join mine on mine.who = p.user_id
  where p.user_id <> (select id from me);
$$;

revoke all on function public.known_people() from public;
grant execute on function public.known_people() to authenticated;

create or replace function public.queue_ask_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dname text;
  ph text;
  body text;
begin
  if new.state <> 'asked' then
    return new;
  end if;
  select coalesce(nullif(trim(p.display_name), ''), ''),
         coalesce(p.phone, '')
  into dname, ph
  from public.profiles p where p.user_id = new.from_id;

  if dname <> '' and ph <> '' then
    body := dname || ' (' || ph || ') wants to be friends.';
  elsif ph <> '' then
    body := ph || ' wants to be friends.';
  elsif dname <> '' then
    body := dname || ' wants to be friends.';
  else
    body := 'Someone wants to be friends.';
  end if;

  insert into public.push_queue (to_id, title, body, go)
  values (new.to_id, 'Friend request', body, '/friends?id=' || new.id::text);
  return new;
end;
$$;

-- Length gate for phone in hardening.sql style.
alter table public.profiles drop constraint if exists profiles_phone_len;
alter table public.profiles add constraint profiles_phone_len
  check (phone is null or length(phone) <= 16) not valid;
alter table public.profiles validate constraint profiles_phone_len;
