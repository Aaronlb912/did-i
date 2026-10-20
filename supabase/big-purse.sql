-- Coins and gems go up to 999,999 (was 9,999). The phone shows big numbers
-- short (12.3k). Same functions as before, with the new cap.
alter table public.profiles drop constraint if exists profiles_gem_balance_rng;
alter table public.profiles add constraint profiles_gem_balance_rng
  check (gem_balance between 0 and 999999);
alter table public.profiles drop constraint if exists profiles_coin_balance_rng;
alter table public.profiles add constraint profiles_coin_balance_rng
  check (coin_balance between 0 and 999999);

-- from supabase/sweep2-guards.sql
create or replace function public.claim_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  row public.profiles;
  gems integer := 0;
  looks text[] := '{}';
  buddies text[] := '{}';
  frames text[] := '{}';
  joined integer;
  i integer;
  wins_look boolean;
  gems_left integer;
  pay integer;
  cos jsonb;
  pays_me boolean;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into row from public.profiles where user_id = me for update;
  if row is null then
    return jsonb_build_object('gems', 0, 'looks', '[]'::jsonb, 'joined', 0,
      'buddies', '[]'::jsonb, 'frames', '[]'::jsonb);
  end if;

  select count(*) into joined from public.profiles p
  where p.invited_by = me and public.invite_real(p.user_id);
  gems_left := public.invite_gems_left(row.invite_gems_paid);

  pays_me := row.invited_by is not null and not row.joined_paid and public.invite_real(me);
  if pays_me and gems_left > 0 then
    pay := least(public.invite_gems_for(1), gems_left);
    gems := gems + pay;
    gems_left := gems_left - pay;
  end if;

  for i in (row.invites_paid + 1)..joined loop
    if gems_left <= 0 then
      exit;
    end if;
    pay := least(public.invite_gems_for(i), gems_left);
    gems := gems + pay;
    gems_left := gems_left - pay;
  end loop;

  wins_look := joined >= public.invite_look_at() and not row.invite_look_paid;
  if wins_look then
    looks := array_append(looks, 'night');
  end if;

  -- Listed every time from the count; they cost nothing to give again.
  if joined >= public.invite_buddy_at() then
    buddies := array_append(buddies, 'hive');
  end if;
  if joined >= public.invite_frame_at() then
    frames := array_append(frames, 'bloom');
  end if;

  if gems > 0 or wins_look then
    cos := public.coin_catalog_normalize(row.coin_cosmetics);
    if wins_look and not (cos->'looks' @> '["night"]'::jsonb) then
      cos := jsonb_set(cos, '{looks}', (cos->'looks') || '["night"]'::jsonb);
    end if;
    perform set_config('did_i.invite_write', '1', true);
    update public.profiles set
      joined_paid = joined_paid or pays_me,
      -- Never lower it: joins counted before this file stay paid.
      invites_paid = greatest(invites_paid, joined),
      invite_gems_paid = row.invite_gems_paid + gems,
      invite_look_paid = invite_look_paid or wins_look,
      gem_balance = least(gem_balance + gems, 999999),
      coin_cosmetics = case when wins_look then cos else coin_cosmetics end
    where user_id = me;
    perform set_config('did_i.invite_write', '', true);
  end if;

  return jsonb_build_object('gems', gems, 'looks', to_jsonb(looks), 'joined', joined,
    'buddies', to_jsonb(buddies), 'frames', to_jsonb(frames));
end;
$$;

-- from supabase/readthrough-8.sql
create or replace function public.grant_weekly_gem(week_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  row public.profiles;
  key text := left(btrim(coalesce(week_key, '')), 12);
  now_week text := public.iso_gem_week();
  bal integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  -- The phone names the week by its own local date, the server by UTC, so
  -- around Sunday midnight they differ by one. Accept the weeks either side;
  -- gem_week still pays each week once.
  if key !~ '^\d{4}-W\d{2}$' or key not in (
    now_week,
    public.iso_gem_week((timezone('utc', now()))::date - 1),
    public.iso_gem_week((timezone('utc', now()))::date + 1)
  ) then
    return coalesce((select gem_balance from public.profiles where user_id = who), 0);
  end if;

  select * into row from public.profiles where user_id = who for update;
  if row is null then
    insert into public.profiles (user_id) values (who)
    on conflict (user_id) do nothing;
    select * into row from public.profiles where user_id = who for update;
  end if;

  -- 'YYYY-Wnn' sorts by time as text.
  if row.gem_week >= key then
    return row.gem_balance;
  end if;

  update public.profiles
  set gem_balance = least(row.gem_balance + 1, 999999), gem_week = key
  where user_id = who
  returning gem_balance into bal;

  return bal;
end;
$$;

-- from supabase/coin-race.sql
create or replace function public.credit_night_coins(night_iso text, add_coins integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  iso text := left(btrim(coalesce(night_iso, '')), 10);
  add integer := greatest(0, least(6, coalesce(add_coins, 0)));
  had integer;
  room integer;
  bal integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  -- Only tonight or the night before in any time zone, or a caller could walk
  -- back through every past date and collect coins for each.
  if iso !~ '^\d{4}-\d{2}-\d{2}$' or add < 1
     or iso::date < current_date - 2 or iso::date > current_date + 1 then
    return coalesce((select coin_balance from public.profiles where user_id = who), 0);
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
  insert into public.coin_night_grants (user_id, night_iso, coins) values (who, iso, 0)
  on conflict on constraint coin_night_grants_pkey do nothing;

  -- g.night_iso, not night_iso: the parameter has the same name as the column.
  select coalesce(g.coins, 0) into had
  from public.coin_night_grants g
  where g.user_id = who and g.night_iso = iso
  for update;

  had := coalesce(had, 0);

  room := greatest(0, 6 - had);
  add := least(add, room);
  if add < 1 then
    return coalesce((select coin_balance from public.profiles where user_id = who), 0);
  end if;

  update public.coin_night_grants g set coins = had + add where g.user_id = who and g.night_iso = iso;
  update public.profiles
  set coin_balance = least(coin_balance + add, 999999)
  where user_id = who
  returning coin_balance into bal;

  return bal;
end;
$$;

-- from supabase/gem-cap.sql
create or replace function public.claim_gem_purchases()
returns table (gems integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  got integer := 0;
  room integer;
  pack record;
  owe record;
  paid integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  -- Gems owed from a refund come off first, so they make room too.
  select 999999 - p.gem_balance + coalesce((
    select sum(g.gems_owed) from public.gem_purchases g where g.user_id = who and g.gems_owed > 0
  ), 0)::integer
  into room
  from public.profiles p where p.user_id = who
  for update;
  if room is null then
    return;
  end if;

  for pack in
    select g.id, g.gems from public.gem_purchases g
    where g.user_id = who and g.claimed_at is null and g.refunded_at is null
    order by g.made_at
    for update skip locked
  loop
    continue when got + pack.gems > room;
    update public.gem_purchases set claimed_at = now() where id = pack.id;
    got := got + pack.gems;
  end loop;

  if got < 1 then
    return;
  end if;

  for owe in
    select id, gems_owed from public.gem_purchases
    where user_id = who and gems_owed > 0
    order by refunded_at
    for update
  loop
    exit when got < 1;
    paid := least(got, owe.gems_owed);
    update public.gem_purchases set gems_owed = gems_owed - paid where id = owe.id;
    got := got - paid;
  end loop;

  if got < 1 then
    return;
  end if;

  update public.profiles
  set gem_balance = least(gem_balance + got, 999999)
  where user_id = who;

  return query select got;
end;
$$;

-- from supabase/we-slots.sql
create or replace function public.we_claim(card uuid, on_night date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  run integer := 0;
  paid integer := 0;
  step record;
begin
  if not exists (select 1 from public.we_members where card_id = card and user_id = who and state = 'in') then
    return 0;
  end if;
  if (select count(*) from public.we_members where card_id = card and state = 'in') < 2 then
    return 0;
  end if;
  if on_night < current_date - 2 or on_night > current_date + 1 then
    return 0;
  end if;
  select s.streak into run from public.we_streaks(card, on_night) s;

  for step in select * from (values (7, 5), (30, 15), (100, 40), (365, 100)) as s(at, coins) loop
    if run >= step.at then
      insert into public.we_streak_grants (card_id, user_id, milestone)
      values (card, who, step.at)
      on conflict do nothing;
      if found then
        paid := paid + step.coins;
      end if;
    end if;
  end loop;

  if paid > 0 then
    insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
    update public.profiles set coin_balance = least(coin_balance + paid, 999999) where user_id = who;
  end if;
  return paid;
end;
$$;

-- from supabase/readthrough-12.sql
create or replace function public.claim_gifts()
returns table (id uuid, kind text, item_id text, note text, from_id uuid, from_name text, gems integer, coins integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  cos jsonb;
  gem jsonb;
  coin_looks text[];
  accs text[];
  ids uuid[];
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  -- One lock order for the recipient and the givers it may pay back.
  perform 1 from public.profiles p
  where p.user_id = who
    or p.user_id in (select g.from_id from public.cheer_gifts g
      where g.to_id = who and g.claimed_at is null and g.returned_at is null)
  order by p.user_id
  for update;

  -- Read what they own before anything is added.
  select public.coin_catalog_normalize(p.coin_cosmetics), public.gem_owned_normalize(p.gem_cosmetics)
  into cos, gem
  from public.profiles p where p.user_id = who for update;
  cos := coalesce(cos, public.coin_catalog_normalize(null));
  gem := coalesce(gem, public.gem_owned_normalize(null));

  update public.cheer_gifts g
  set had = (
    case g.kind
      when 'look' then cos->'looks' @> jsonb_build_array(g.cheer_id)
        or gem->'looks' @> jsonb_build_array(g.cheer_id)
      when 'accessory' then cos->'accessories' @> jsonb_build_array(g.cheer_id)
      when 'cheer' then gem->'cheers' @> jsonb_build_array(g.cheer_id)
      when 'buddy' then gem->'buddies' @> jsonb_build_array(g.cheer_id)
      when 'frame' then gem->'frames' @> jsonb_build_array(g.cheer_id)
      else false
    end
  ) or exists (
    select 1 from public.cheer_gifts e
    where e.to_id = who and e.claimed_at is null and e.returned_at is null
      and e.kind = g.kind and e.cheer_id = g.cheer_id
      and (e.made_at, e.id) < (g.made_at, g.id)
  )
  where g.to_id = who and g.claimed_at is null and g.returned_at is null;

  -- Already had: claimed and returned at once, the giver paid back.
  with back as (
    update public.cheer_gifts g
    set claimed_at = now(), returned_at = now()
    where g.to_id = who and g.claimed_at is null and g.returned_at is null
      and g.had is true
    returning g.from_id, g.gems, g.coins
  )
  update public.profiles p
  set gem_balance = least(p.gem_balance + s.gems, 999999),
      coin_balance = least(p.coin_balance + s.coins, 999999)
  from (select b.from_id, sum(b.gems) as gems, sum(b.coins) as coins
        from back b where b.from_id is not null group by b.from_id) s
  where p.user_id = s.from_id;

  with took as (
    update public.cheer_gifts g
    set claimed_at = now()
    where g.to_id = who and g.claimed_at is null and g.returned_at is null
      and g.had is not null
    returning g.id
  )
  select array_agg(t.id) into ids from took t;

  if ids is null then
    return;
  end if;

  select array_agg(distinct g.cheer_id) into coin_looks
  from public.cheer_gifts g
  where g.id = any (ids) and g.kind = 'look' and g.coins > 0;

  if coin_looks is not null then
    select public.coin_catalog_normalize(p.coin_cosmetics) into cos
    from public.profiles p where p.user_id = who;
    if cos is not null then
      update public.profiles p
      set coin_cosmetics = jsonb_set(
        cos, '{looks}',
        (select to_jsonb(array_agg(distinct x))
         from (select jsonb_array_elements_text(cos->'looks') as x
               union select unnest(coin_looks)) u)
      )
      where p.user_id = who;
    end if;
  end if;

  -- Accessories are coin items, kept on the coin catalog like coin looks.
  select array_agg(distinct g.cheer_id) into accs
  from public.cheer_gifts g
  where g.id = any (ids) and g.kind = 'accessory';

  if accs is not null then
    select public.coin_catalog_normalize(p.coin_cosmetics) into cos
    from public.profiles p where p.user_id = who;
    if cos is not null then
      update public.profiles p
      set coin_cosmetics = jsonb_set(
        cos, '{accessories}',
        (select to_jsonb(array_agg(distinct x))
         from (select jsonb_array_elements_text(cos->'accessories') as x
               union select unnest(accs)) u)
      )
      where p.user_id = who;
    end if;
  end if;

  -- Everything else (gem items, specials, older free cheer gifts) goes on
  -- the server's gem list.
  update public.profiles p
  set gem_cosmetics = (
    select public.gem_owned_normalize(p.gem_cosmetics) || jsonb_build_object(
      'looks', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'looks') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.id = any (ids) and g.kind = 'look' and g.coins = 0) u),
      'cheers', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'cheers') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.id = any (ids) and g.kind = 'cheer') u),
      'buddies', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'buddies') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.id = any (ids) and g.kind = 'buddy') u),
      'frames', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'frames') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.id = any (ids) and g.kind = 'frame') u)
    )
  )
  where p.user_id = who
    and exists (select 1 from public.cheer_gifts g
      where g.id = any (ids)
        and not (g.kind = 'look' and g.coins > 0) and g.kind <> 'accessory');

  return query
    select g.id, g.kind, g.cheer_id, g.note, g.from_id,
      coalesce(nullif(btrim(p.display_name), ''), '') as from_name,
      g.gems, g.coins
    from public.cheer_gifts g
    left join public.profiles p on p.user_id = g.from_id
    where g.id = any (ids)
    order by g.made_at;
end;
$$;

-- from supabase/readthrough-5.sql
create or replace function public.return_gift(gift uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  g public.cheer_gifts;
begin
  update public.cheer_gifts c
  set returned_at = now()
  where c.id = gift and c.to_id = who and c.returned_at is null
    and c.claimed_at is not null and c.had is true
  returning * into g;
  if g is null then
    return;
  end if;
  update public.profiles
  set gem_balance = least(gem_balance + g.gems, 999999),
      coin_balance = least(coin_balance + g.coins, 999999)
  where user_id = g.from_id;
end;
$$;

-- from supabase/gifts.sql
create or replace function public.gifts_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  with gone as (
    delete from public.cheer_gifts g
    where g.claimed_at is null
      and ((g.from_id = new.blocker and g.to_id = new.blocked)
        or (g.from_id = new.blocked and g.to_id = new.blocker))
    returning g.from_id, g.gems, g.coins
  )
  update public.profiles p
  set gem_balance = least(p.gem_balance + s.gems, 999999),
      coin_balance = least(p.coin_balance + s.coins, 999999)
  from (select from_id, sum(gems) as gems, sum(coins) as coins from gone group by from_id) s
  where p.user_id = s.from_id;
  return new;
end;
$$;
