-- Readthrough 9. Apply after readthrough-8.sql, before drop-tonight.sql
-- (scripts/apply-all-sql.mjs). Safe to run again: every function is a full
-- recreate from the latest body in apply order with one change.

-- 1a. Check-ons: the per-question key could be dodged by deleting and
-- re-adding a check-on under a new lamp_id, pushing a buddy every run.
-- At most 3 check-on pushes per owner, buddy and night. Older rows have no
-- buddy_id and do not count.
alter table public.check_on_pushed add column if not exists buddy_id uuid;
create index if not exists check_on_pushed_pair_idx
  on public.check_on_pushed (owner_id, buddy_id, night);

-- Full body from readthrough-8.sql; pushed now caps the pair per night.
create or replace function public.queue_check_ons()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  made integer := 0;
begin
  -- Old keys: a night is never due again after a few days.
  delete from public.check_on_pushed where night < current_date - 3;

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
    returning c.owner_id, c.buddy_id, c.question, c.lamp_id, d.night
  ),
  -- This question already pushed this night (deleted and re-added, or
  -- moved to another buddy and back): sent_on is set, no second push.
  -- And no more pushes to one buddy from one owner in a night than
  -- greatest(3, the check-ons the owner has with that buddy).
  pushed as (
    insert into public.check_on_pushed (owner_id, lamp_id, night, buddy_id)
    select r.owner_id, r.lamp_id, r.night, r.buddy_id
    from (
      select m.owner_id, m.lamp_id, m.night, m.buddy_id,
        row_number() over (partition by m.owner_id, m.buddy_id, m.night order by m.lamp_id) as rn
      from marked m
      where not exists (
        select 1 from public.check_on_pushed x
        where x.owner_id = m.owner_id and x.lamp_id = m.lamp_id and x.night = m.night)
    ) r
    where r.rn + (select count(*) from public.check_on_pushed x
      where x.owner_id = r.owner_id and x.buddy_id = r.buddy_id and x.night = r.night)
      <= greatest(3, (select count(*) from public.check_ons c
        where c.owner_id = r.owner_id and c.buddy_id = r.buddy_id))
    on conflict do nothing
    returning owner_id, lamp_id, night
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
    from marked m
    join pushed p on p.owner_id = m.owner_id and p.lamp_id = m.lamp_id and p.night = m.night
    left join public.profiles o on o.user_id = m.owner_id
    returning 1
  )
  select count(*) into made from queued;
  return made;
end;
$$;

revoke all on function public.queue_check_ons() from public, anon, authenticated;

-- 1b. check_ons: at most 30 adds per owner per day, deleted ones included.
-- Each new row is logged in check_on_adds (only this trigger writes it),
-- and made_at is stamped by the server.
create table if not exists public.check_on_adds (
  owner_id uuid not null references auth.users (id) on delete cascade,
  made_at timestamptz not null default now()
);
create index if not exists check_on_adds_owner_idx on public.check_on_adds (owner_id, made_at);
alter table public.check_on_adds enable row level security;
-- Only the trigger writes and reads it. No policies, no grants.
revoke all on public.check_on_adds from public, anon, authenticated;

-- Full body from readthrough-8.sql plus the stamp and the daily cap.
create or replace function public.cap_check_ons()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Lock first so two adds at once can not both count under the caps.
  perform pg_advisory_xact_lock(hashtext('check_on_adds:' || new.owner_id::text));
  if exists (select 1 from public.check_ons
      where owner_id = new.owner_id and lamp_id = new.lamp_id) then
    return new;
  end if;
  new.made_at := now();
  if (select count(*) from public.check_ons where owner_id = new.owner_id) >= 20 then
    raise exception 'check-on cap';
  end if;
  delete from public.check_on_adds where owner_id = new.owner_id and made_at < now() - interval '1 day';
  if (select count(*) from public.check_on_adds
      where owner_id = new.owner_id and made_at > now() - interval '1 day') >= 30 then
    raise exception 'too many check-ons today';
  end if;
  insert into public.check_on_adds (owner_id) values (new.owner_id);
  return new;
end;
$$;
revoke all on function public.cap_check_ons() from public, anon, authenticated;

-- 2. claim_gifts: lock the recipient and every giver it will pay back in
-- user_id order before any update, so two claims that pay each other back
-- can not deadlock. Full body from readthrough-8.sql otherwise.
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
  set gem_balance = least(p.gem_balance + s.gems, 9999),
      coin_balance = least(p.coin_balance + s.coins, 9999)
  from (select b.from_id, sum(b.gems) as gems, sum(b.coins) as coins
        from back b where b.from_id is not null group by b.from_id) s
  where p.user_id = s.from_id;

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
