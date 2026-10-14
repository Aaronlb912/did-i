-- Readthrough 7. Apply after readthrough-6.sql (scripts/apply-all-sql.mjs).
-- Safe to run again: every function is a full recreate.

-- 1. Parents could update every column of family_members, so a parent
-- could move a member row onto any other account. The app only sets role
-- (people.js setFamilyRole).
revoke update on public.family_members from authenticated, anon;
grant update (role) on public.family_members to authenticated;

-- 2. guard_profile_wallet: an upsert fires the INSERT branch with empty
-- owned lists even when the row exists, which reset look_on, buddy_on and
-- frame_on and carried into the DO UPDATE. When the row exists, skip the
-- wear checks here; the UPDATE trigger checks real ownership.
-- Full body from readthrough-6.sql otherwise.
create or replace function public.guard_profile_wallet()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  own jsonb;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.gem_balance := 0;
    new.coin_balance := 0;
    new.gem_week := '';
    new.coin_cosmetics := '{"stamps":[],"badges":[]}'::jsonb;
    new.gem_cosmetics := '{"looks":[],"cheers":[],"buddies":[]}'::jsonb;
    new.friend_cheers := 0;
    if exists (select 1 from public.profiles p where p.user_id = new.user_id) then
      return new;
    end if;
  else
    new.gem_balance := old.gem_balance;
    new.coin_balance := old.coin_balance;
    new.gem_week := old.gem_week;
    new.coin_cosmetics := old.coin_cosmetics;
    new.gem_cosmetics := old.gem_cosmetics;
    new.friend_cheers := old.friend_cheers;
  end if;

  own := public.gem_owned_normalize(new.gem_cosmetics);

  if (tg_op = 'INSERT' or new.look_on is distinct from old.look_on)
    and exists (select 1 from public.gift_catalog c
      where c.kind = 'look' and c.item_id = new.look_on and c.gems > 0)
    and not own->'looks' @> jsonb_build_array(new.look_on)
    and not coalesce(new.coin_cosmetics->'looks', '[]'::jsonb) @> jsonb_build_array(new.look_on) then
    new.look_on := case when tg_op = 'INSERT' then 'lime' else old.look_on end;
  end if;

  if (tg_op = 'INSERT' or new.buddy_on is distinct from old.buddy_on)
    and exists (select 1 from public.gift_catalog c
      where c.kind = 'buddy' and c.item_id = new.buddy_on and c.gems > 0)
    and not own->'buddies' @> jsonb_build_array(new.buddy_on) then
    new.buddy_on := case when tg_op = 'INSERT' then '' else old.buddy_on end;
  end if;

  if (tg_op = 'INSERT' or new.frame_on is distinct from old.frame_on)
    and exists (select 1 from public.shop_catalog s
      where s.kind = 'frame' and s.item_id = new.frame_on and s.gems > 0)
    and not own->'frames' @> jsonb_build_array(new.frame_on) then
    new.frame_on := case when tg_op = 'INSERT' then '' else old.frame_on end;
  end if;

  return new;
end;
$$;

-- 3. family_lamps cap. made_at was added with default now(), so every old
-- row looked made today and blocked its maker. Backfill from made_on (a
-- date; midnight UTC is close enough for a one-day window). Runs as the
-- owner, so the trigger below leaves made_at alone.
update public.family_lamps
set made_at = made_on::timestamptz
where made_on < current_date
  and made_at > made_on::timestamptz + interval '1 day';

create or replace function public.cap_family_lamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client boolean := session_user = 'authenticator' or current_setting('role', true) in ('authenticated', 'anon');
begin
  if tg_op = 'UPDATE' then
    if client then
      new.made_at := old.made_at;
      new.made_by := old.made_by;
    end if;
    if old.archived and not new.archived then
      perform pg_advisory_xact_lock(hashtext('family_lamps:' || new.family_id::text));
      if (select count(*) from public.family_lamps l
          where l.family_id = new.family_id and not l.archived) >= 200 then
        raise exception 'too many family questions';
      end if;
    end if;
    return new;
  end if;

  new.made_at := now();
  perform pg_advisory_xact_lock(hashtext('family_lamps:' || new.family_id::text));
  if not new.archived and (select count(*) from public.family_lamps l
      where l.family_id = new.family_id and not l.archived) >= 200 then
    raise exception 'too many family questions';
  end if;
  if new.made_by is not null and (select count(*) from public.family_lamps l
      where l.made_by = new.made_by and l.made_at > now() - interval '1 day') >= 50 then
    raise exception 'too many family questions today';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_family_lamps() from public, anon, authenticated;

drop trigger if exists cap_family_lamps on public.family_lamps;
create trigger cap_family_lamps
  before insert or update on public.family_lamps
  for each row execute function public.cap_family_lamps();

-- 4a. 20 folders per family.
create or replace function public.cap_family_tags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('family_tags:' || new.family_id::text));
  if (select count(*) from public.family_tags t where t.family_id = new.family_id) >= 20 then
    raise exception 'too many family folders';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_family_tags() from public, anon, authenticated;

drop trigger if exists cap_family_tags on public.family_tags;
create trigger cap_family_tags
  before insert on public.family_tags
  for each row execute function public.cap_family_tags();

-- 4b. period_key shapes the app writes (recurrence.js periodKeyFor):
-- daily and weekly 'YYYY-MM-DD', monthly 'YYYY-MM', once 'once:<lamp id>'.
-- NOT VALID so old rows do not fail the apply; new writes are checked.
alter table public.family_answers drop constraint if exists family_answers_period_key_shape;
alter table public.family_answers add constraint family_answers_period_key_shape
  check (period_key ~ '^(\d{4}-\d{2}(-\d{2})?|once:[0-9A-Za-z-]{1,64})$') not valid;

-- 5. Ten phones: when a new phone pushes one out, drop phones with no push
-- token first, then the one seen longest ago. Full body from readthrough-6.
create or replace function public.cap_devices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('devices:' || new.user_id::text));
  if exists (select 1 from public.devices d
      where d.user_id = new.user_id and d.device_key = new.device_key) then
    return new;
  end if;
  delete from public.devices d
  where d.user_id = new.user_id
    and d.device_key in (
      select x.device_key from public.devices x
      where x.user_id = new.user_id
      order by (x.push_token is not null and x.push_token <> '') desc,
        x.last_seen_at desc, x.device_key
      offset 9
    );
  return new;
end;
$$;

revoke all on function public.cap_devices() from public, anon, authenticated;

drop trigger if exists cap_devices on public.devices;
create trigger cap_devices
  before insert on public.devices
  for each row execute function public.cap_devices();
