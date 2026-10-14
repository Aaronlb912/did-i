-- Readthrough 6. Run after readthrough-5.sql (npm run db:apply:all).
-- Each function here is the full latest body with one change; safe to rerun.

-- 1. Gem purchases: the credit is what this call marked claimed. Two calls at
-- once used to read the same sum and both add it.
create or replace function public.claim_gem_purchases()
returns table (gems integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  got integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  with took as (
    update public.gem_purchases g
    set claimed_at = now()
    where g.user_id = who and g.claimed_at is null
    returning g.gems
  )
  select coalesce(sum(t.gems), 0)::integer into got from took t;

  if got < 1 then
    return;
  end if;

  update public.profiles
  set gem_balance = least(gem_balance + got, 9999)
  where user_id = who;

  return query select got;
end;
$$;

revoke all on function public.claim_gem_purchases() from public, anon;
grant execute on function public.claim_gem_purchases() to authenticated;

-- 2. gift_cheer gave paid cheers for free. The app sends gifts through
-- send_gift; nothing calls this.
drop function if exists public.gift_cheer(uuid, text);

-- 3. Check-ons: one push per pair per 20 hours, so deleting and re-adding a
-- check-on, or moving it to another buddy and back, can not repeat it.
-- The job has no caller, so from_id is set here to the owner.
create or replace function public.queue_check_ons()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  made integer := 0;
begin
  with clock as (
    select c.id, c.owner_id, c.buddy_id, c.question, c.lamp_id, c.at_minute, c.days, c.sent_on,
      c.kind, c.month_day, c.on_date, c.starts_on, c.every_days,
      p.zone, (now() at time zone p.zone) as local
    from public.check_ons c
    join public.profiles p on p.user_id = c.owner_id
    where p.zone <> '' and p.zone in (select name from pg_timezone_names)
  ),
  due as (
    select k.id, k.owner_id, k.buddy_id, k.question, k.local::date as night
    from clock k
    -- Every so often: the newest Did before tonight and the gap the app
    -- learns (learnedGap in src/lib/recurrence.js): the median of the gaps
    -- between the last 6 Did nights, once there are at least 4. One indexed
    -- read of answer_log per every-so-often row, inside this statement.
    left join lateral (
      select max(n.night) as last_did,
        case when count(*) >= 4
          then nullif(round(percentile_cont(0.5) within group (order by n.gap))::int, 0)
        end as learned
      from (
        select d.night, d.night - lag(d.night) over (order by d.night) as gap
        from (
          select a.period_key::date as night from public.answer_log a
          where k.kind = 'every'
            and a.user_id = k.owner_id and a.lamp_id = k.lamp_id
            and a.status in ('yes', 'late')
            and a.period_key ~ '^\d{4}-\d{2}-\d{2}$'
            and a.period_key < k.local::date::text
          order by a.period_key desc
          limit 6
        ) d
      ) n
    ) g on true
    where (k.sent_on is null or k.sent_on < k.local::date)
      and extract(hour from k.local) * 60 + extract(minute from k.local) >= k.at_minute
      -- Asked tonight, per kind. Same rule as checkOnDue in src/lib/check-on.js.
      and case k.kind
        when 'night' then cardinality(k.days) = 0 or extract(dow from k.local)::smallint = any (k.days)
        when 'monthly' then extract(day from k.local)::int = least(
          case when k.month_day = 0 then 31 else k.month_day end,
          extract(day from (date_trunc('month', k.local) + interval '1 month - 1 day'))::int)
        when 'once' then k.local::date = k.on_date
        -- A deadline is asked every night from its start to the due date.
        when 'by' then k.local::date between coalesce(k.starts_on, k.on_date) and k.on_date
        -- Never done, or the learned gap (else every_days) since the newest Did.
        when 'every' then coalesce(k.local::date - g.last_did >= coalesce(g.learned, k.every_days), true)
        else false
      end
      -- Not answered: the key the app writes for this period. A deadline
      -- keeps one key for every night, so a Not yet only counts tonight.
      and not exists (
        select 1 from public.answer_log a
        where a.user_id = k.owner_id and a.lamp_id = k.lamp_id
          and a.period_key = case
            when k.kind = 'monthly' then to_char(k.local, 'YYYY-MM')
            when k.kind in ('once', 'by') then 'once:' || k.lamp_id
            else k.local::date::text
          end
          and (k.kind <> 'by' or a.status in ('yes', 'late')
            or (a.updated_at at time zone k.zone)::date = k.local::date)
      )
      -- This pair already got a check-on push in the last 20 hours. The go
      -- link is exact for check-ons (older rows have no from_id).
      and not exists (
        select 1 from public.push_queue q
        where q.to_id = k.buddy_id
          and q.go = left('/friend?id=' || k.owner_id::text || '&face=checkon', 80)
          and q.made_at > now() - interval '20 hours'
      )
      and public.push_wanted(k.buddy_id, 'friends')
      and exists (select 1 from public.devices d where d.user_id = k.buddy_id and d.push_token is not null)
      and (
        exists (
          select 1 from public.friend_links l
          where l.state = 'ok'
            and ((l.from_id = k.owner_id and l.to_id = k.buddy_id) or (l.from_id = k.buddy_id and l.to_id = k.owner_id))
        )
        or exists (
          select 1 from public.family_members a
          join public.family_members b on b.family_id = a.family_id
          where a.user_id = k.owner_id and b.user_id = k.buddy_id
        )
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = k.owner_id and b.blocked = k.buddy_id)
           or (b.blocker = k.buddy_id and b.blocked = k.owner_id)
      )
  ),
  marked as (
    update public.check_ons c set sent_on = d.night
    from due d
    where c.id = d.id
    returning c.owner_id, c.buddy_id, c.question
  ),
  -- Two check-ons between the same pair due in one run: one push.
  one as (
    select distinct on (m.owner_id, m.buddy_id) m.owner_id, m.buddy_id, m.question
    from marked m
    order by m.owner_id, m.buddy_id
  ),
  queued as (
    insert into public.push_queue (to_id, title, body, go, from_id)
    select m.buddy_id,
      left(coalesce(nullif(o.display_name, ''), public.push_text(m.buddy_id, 'a_friend')), 80),
      left(public.check_on_text(m.buddy_id,
        coalesce(nullif(o.display_name, ''), public.push_text(m.buddy_id, 'a_friend')),
        left(m.question, 120)), 200),
      left('/friend?id=' || m.owner_id::text || '&face=checkon', 80),
      m.owner_id
    from one m
    left join public.profiles o on o.user_id = m.owner_id
    returning 1
  )
  select count(*) into made from queued;
  return made;
end;
$$;

revoke all on function public.queue_check_ons() from public, anon, authenticated;

create index if not exists push_queue_to_made_idx on public.push_queue (to_id, made_at);

-- 4. Ten phones per person. The app upserts on (user_id, device_key), so a
-- phone already listed always gets through. A new phone over the cap
-- replaces the one seen longest ago instead of failing, so a reinstall (or
-- the stable-id move in cloud-sync.js, which adds before it deletes) keeps
-- working. Rows still never pass 10.
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
      order by x.last_seen_at desc, x.device_key
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

-- 5. Wearing a paid item you do not own. Only gem items are checked: the
-- server list (gem_cosmetics, filled by buy_with_gems and claim_gifts) is
-- the one the app already trusts for them (applyGemOwnedToBook). Coin looks
-- and coin frames may be owned on the phone only from before coin buys were
-- on the server, and badge_cheer ids are also coin cheer stages, so those
-- are left alone. Free, earned and referral items are not priced in gems,
-- so they always pass.
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

-- 6. Did we streak coins need two people in. A card of one farmed them.
create or replace function public.we_claim(card uuid, on_night date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  c public.we_cards;
  run integer := 0;
  d date;
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
  select * into c from public.we_cards where id = card;
  d := on_night;
  if not exists (select 1 from public.we_done where card_id = card and night = d) then
    d := d - 1;
  end if;
  while d >= c.starts_on and run < 400 loop
    if public.we_due(c.starts_on, c.cadence, c.weekdays, d) then
      exit when not exists (select 1 from public.we_done where card_id = card and night = d);
      run := run + 1;
    end if;
    d := d - 1;
  end loop;

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
    update public.profiles set coin_balance = least(coin_balance + paid, 9999) where user_id = who;
  end if;
  return paid;
end;
$$;

revoke all on function public.we_claim(uuid, date) from public, anon;
grant execute on function public.we_claim(uuid, date) to authenticated;

-- 7. Family questions: 200 live per family, 50 new per maker a day.
-- made_on is the app's date, so the day count uses a server stamp.
alter table public.family_lamps add column if not exists made_at timestamptz not null default now();
create index if not exists family_lamps_made_by_at_idx on public.family_lamps (made_by, made_at);

create or replace function public.cap_family_lamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  before insert on public.family_lamps
  for each row execute function public.cap_family_lamps();

-- 8. Gifts: mark claimed first, then grant only the rows this call took.
-- Before, a block between the grant and the claim refunded the giver and
-- the receiver kept the item. Full body from readthrough-5.sql otherwise.
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

  with took as (
    update public.cheer_gifts g
    set claimed_at = now()
    where g.to_id = who and g.claimed_at is null and g.returned_at is null
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

revoke all on function public.claim_gifts() from public, anon;
grant execute on function public.claim_gifts() to authenticated;

notify pgrst, 'reload schema';
