-- Sweep guards. Applied before drop-tonight.sql (see scripts/apply-all-sql.mjs). Safe to run again.
-- 1. Family codes: wrong codes also count against a cap shared by every
--    account. New codes stay 6 characters until most phones run 1.3.8,
--    which accepts 6 or 10 (1.3.7 and older take only 6).
-- 2. buy_with_gems honors the shop window (live_until too), like send_gift.
-- 3. use_invite refuses old accounts and code swaps.
-- 4. we_nudge: no self nudge, one per sender a night. (section 6 below)
-- 5. note_milestone: per-install and per-hour caps on top of the daily one.

-- 1. Family codes -----------------------------------------------------------
create table if not exists public.family_miss_days (
  day date primary key,
  misses integer not null default 0
);

alter table public.family_miss_days enable row level security;
revoke all on public.family_miss_days from anon, authenticated;


-- True while today's wrong codes, across every account, are under the cap.
create or replace function public.family_misses_open()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select m.misses from public.family_miss_days m
                   where m.day = (timezone('utc', now()))::date), 0) < 500;
$$;

revoke all on function public.family_misses_open() from public, anon, authenticated;

create or replace function public.note_family_miss(who uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.family_code_misses (user_id) values (who);
  insert into public.family_miss_days (day, misses)
  values ((timezone('utc', now()))::date, 1)
  on conflict (day) do update set misses = public.family_miss_days.misses + 1;
end;
$$;

revoke all on function public.note_family_miss(uuid) from public, anon, authenticated;

create or replace function public.look_up_family(want_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  fam public.families;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if not public.family_code_tries_left(who) then
    raise exception 'too many tries';
  end if;
  select * into fam from public.families where code = upper(btrim(coalesce(want_code, '')));
  if fam is null then
    -- The shared cap only stops guessing; a right code always works.
    if not public.family_misses_open() then
      raise exception 'too many tries';
    end if;
    perform public.note_family_miss(who);
    return jsonb_build_object('miss', 'nofamily');
  end if;
  return jsonb_build_object(
    'id', fam.id,
    'name', coalesce(fam.name, ''),
    'members', (select count(*) from public.family_members m where m.family_id = fam.id),
    'already', exists (select 1 from public.family_members m where m.family_id = fam.id and m.user_id = who)
  );
end;
$$;

revoke all on function public.look_up_family(text) from public, anon;
grant execute on function public.look_up_family(text) to authenticated;

create or replace function public.join_family(want_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  fam uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if not public.family_code_tries_left(me) then
    raise exception 'too many tries';
  end if;
  select id into fam from public.families where code = upper(btrim(coalesce(want_code, '')));
  if fam is null then
    if not public.family_misses_open() then
      raise exception 'too many tries';
    end if;
    perform public.note_family_miss(me);
    return null;
  end if;
  insert into public.family_members (family_id, user_id, role)
  values (fam, me, 'kid')
  on conflict (family_id, user_id) do nothing;
  return fam;
end;
$$;

revoke all on function public.join_family(text) from public, anon;
grant execute on function public.join_family(text) to authenticated;

-- 2. buy_with_gems window ---------------------------------------------------
create or replace function public.buy_with_gems(p_kind text, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  k text := lower(btrim(coalesce(p_kind, '')));
  id text := lower(btrim(coalesce(p_item_id, '')));
  list text;
  cost integer;
  row public.profiles;
  owned jsonb;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  list := case k when 'look' then 'looks' when 'cheer' then 'cheers' when 'buddy' then 'buddies' when 'frame' then 'frames' end;
  if k = 'frame' then
    select g.gems into cost from public.shop_catalog g
    where g.kind = 'frame' and g.item_id = id and g.gems > 0 and public.shop_item_live('frame', id);
  else
    select c.gems into cost from public.gift_catalog c
    where c.kind = k and c.item_id = id and c.gems > 0
      and public.shop_window_live(c.kind, c.live_from, c.live_until, (timezone('utc', now()))::date);
  end if;
  if list is null or cost is null then
    raise exception 'bad item';
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
  select * into row from public.profiles where user_id = who for update;
  owned := public.gem_owned_normalize(row.gem_cosmetics);
  if owned->list @> jsonb_build_array(id) then
    return owned || jsonb_build_object('gems', row.gem_balance);
  end if;
  if row.gem_balance < cost then
    raise exception 'need gems';
  end if;

  owned := public.gem_owned_add(owned, list, id);
  update public.profiles
  set gem_balance = gem_balance - cost, gem_cosmetics = owned
  where user_id = who
  returning * into row;
  return owned || jsonb_build_object('gems', row.gem_balance);
end;
$$;

revoke all on function public.buy_with_gems(text, text) from public, anon;
grant execute on function public.buy_with_gems(text, text) to authenticated;

-- 3. use_invite -------------------------------------------------------------
-- Refusals reuse 'used' (the client already shows "invite used" for it).
create or replace function public.use_invite(want_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  owner uuid;
  mine text;
  row public.profiles;
  code text := upper(btrim(want_code));
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if code is null or length(code) <> 10 then
    return 'code';
  end if;

  insert into public.profiles (user_id) values (me)
  on conflict (user_id) do nothing;

  select * into row from public.profiles where user_id = me for update;
  if row.invited_by is not null then
    return 'used';
  end if;

  -- Invites are for new accounts. Answers are not checked: a person may try
  -- the app signed out first, and those answers upload at sign up.
  if exists (select 1 from auth.users u where u.id = me and u.created_at < now() - interval '7 days') then
    return 'used';
  end if;

  select p.invite_code into mine from public.profiles p where p.user_id = me;
  if mine is not null and upper(mine) = code then
    return 'self';
  end if;

  select p.user_id into owner
  from public.profiles p
  where p.invite_code is not null and upper(p.invite_code) = code;
  if owner is null then
    return 'nobody';
  end if;
  if owner = me then
    return 'self';
  end if;

  -- Code swap: the owner was invited by me.
  if exists (select 1 from public.profiles p where p.user_id = owner and p.invited_by = me) then
    return 'used';
  end if;

  perform set_config('did_i.invite_write', '1', true);
  update public.profiles
  set invited_by = owner
  where user_id = me and invited_by is null;

  if not found then
    return 'used';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.use_invite(text) from public, anon;
grant execute on function public.use_invite(text) to authenticated;

-- 5. note_milestone ---------------------------------------------------------
-- The table's key already holds one row per install and event (10 events).
-- This adds a per-install daily cap and an hourly global cap, so a script
-- cannot use up the whole day's 50k in one burst.
create or replace function public.note_milestone(p_install text, p_event text, p_platform text, p_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.milestones where made_at > now() - interval '1 day') >= 50000 then
    return;
  end if;
  if (select count(*) from public.milestones where made_at > now() - interval '1 hour') >= 5000 then
    return;
  end if;
  if (select count(*) from public.milestones
      where install_id = p_install and made_at > now() - interval '1 day') >= 10 then
    return;
  end if;
  insert into public.milestones (install_id, event, platform, version)
  values (p_install, p_event, coalesce(p_platform, ''), left(coalesce(p_version, ''), 20))
  on conflict (install_id, event) do nothing;
end;
$$;

revoke all on function public.note_milestone(text, text, text, text) from public;
grant execute on function public.note_milestone(text, text, text, text) to anon, authenticated;

-- 6. we_nudge ---------------------------------------------------------------
-- No nudging yourself; one nudge per sender, person and night; the nightly
-- cap of 3 counts everyone's nudges to that person; a lock per person keeps
-- two at once from both slipping under it.
create or replace function public.we_nudge(card uuid, other uuid, on_night date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  name text;
  q text;
begin
  if other = who then
    raise exception 'not on this card';
  end if;
  if not exists (select 1 from public.we_members where card_id = card and user_id = who and state = 'in')
     or not exists (select 1 from public.we_members where card_id = card and user_id = other and state = 'in') then
    raise exception 'not on this card';
  end if;
  -- Tonight, or last night while it is still open. No need to say did
  -- yourself first: a card nobody answers should still get a nudge.
  if on_night < current_date - 1 or on_night > current_date + 1 then
    raise exception 'that night is closed';
  end if;
  if not exists (select 1 from public.we_cards c
                 where c.id = card and public.we_due(c.starts_on, c.cadence, c.weekdays, on_night)) then
    raise exception 'that night is closed';
  end if;
  if public.blocked_with(other) then
    raise exception 'not on this card';
  end if;
  perform pg_advisory_xact_lock(hashtext('we_nudge:' || other::text));
  if (select count(*) from public.we_nudges n where n.to_id = other and n.night = on_night)
     >= public.we_max_nudges_nightly() then
    raise exception 'enough nudges tonight';
  end if;
  if exists (select 1 from public.we_nudges n where n.from_id = who and n.to_id = other and n.night = on_night) then
    raise exception 'already nudged tonight';
  end if;
  insert into public.we_nudges (card_id, from_id, to_id, night) values (card, who, other, on_night);
  if public.push_wanted(other, 'we') then
    select coalesce(nullif(btrim(p.display_name), ''), 'Someone') into name
    from public.profiles p where p.user_id = who;
    select question into q from public.we_cards where id = card;
    insert into public.push_queue (to_id, title, body, go)
    values (other,
      left(public.push_text(other, 'we_did', jsonb_build_object('name', coalesce(name, public.push_text(other, 'someone')))), 80),
      left(public.push_text(other, 'we_turn', jsonb_build_object('q', left(q, 120))), 200), '/tonight');
  end if;
exception when unique_violation then
  raise exception 'already nudged tonight';
end;
$$;

revoke all on function public.we_nudge(uuid, uuid, date) from public;
grant execute on function public.we_nudge(uuid, uuid, date) to authenticated;
