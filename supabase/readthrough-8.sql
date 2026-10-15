-- Readthrough 8. Apply after readthrough-7.sql, before drop-tonight.sql
-- (scripts/apply-all-sql.mjs). Safe to run again: every function is a full
-- recreate from the latest body in apply order with one change.

-- 1. Check-ons: one push per question per night. The pair-wide 20 hour
-- check blocked a second check-on with the same friend. Deleting and
-- re-adding a check-on, or moving it to another buddy and back, still can
-- not repeat a night: the key is the owner, the question and the night.
create table if not exists public.check_on_pushed (
  owner_id uuid not null references auth.users (id) on delete cascade,
  lamp_id text not null,
  night date not null,
  primary key (owner_id, lamp_id, night)
);

alter table public.check_on_pushed drop constraint if exists check_on_pushed_lamp_len;
alter table public.check_on_pushed add constraint check_on_pushed_lamp_len
  check (length(lamp_id) between 1 and 80);

alter table public.check_on_pushed enable row level security;
-- Only the job writes and reads it. No policies, no grants.
revoke all on public.check_on_pushed from public, anon, authenticated;

-- Full body from readthrough-6.sql; the pair check and the one-per-pair
-- step are replaced by check_on_pushed.
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
  pushed as (
    insert into public.check_on_pushed (owner_id, lamp_id, night)
    select m.owner_id, m.lamp_id, m.night from marked m
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

-- 2. family_lamps: deleting an account sets made_by to null through the
-- foreign key, and that update ran with the client's role, so the pin put
-- the deleted id back and the delete failed. Pin made_by on client updates
-- unless the update comes from that foreign key (trigger depth above 1). Full body from readthrough-7.sql otherwise.
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
      if pg_trigger_depth() <= 1 then
        new.made_by := old.made_by;
      end if;
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

-- 3a. check_ons: the app saves with upsert on (owner_id, lamp_id), and
-- PostgREST's DO UPDATE sets every sent column, so those two need update.
-- "check_ons change" still requires owner_id to be the caller.
grant update (owner_id, lamp_id, buddy_id, question, at_minute, days, kind, month_day, on_date, starts_on, every_days)
  on public.check_ons to authenticated;

-- 3b. The 20 cap fired on an upsert of a row that already exists (BEFORE
-- INSERT runs before the conflict check), so editing at 20 failed.
-- Full body from social-gentle.sql otherwise.
create or replace function public.cap_check_ons()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.check_ons
      where owner_id = new.owner_id and lamp_id = new.lamp_id) then
    return new;
  end if;
  if (select count(*) from public.check_ons where owner_id = new.owner_id) >= 20 then
    raise exception 'check-on cap';
  end if;
  return new;
end;
$$;
revoke all on function public.cap_check_ons() from public, anon, authenticated;

-- 3c. Unfriend, block or leaving a family also drops check-ons between
-- people no longer linked. Same rule as the "check_ons add" policy.
-- Full body from send-answers.sql otherwise.
create or replace function public.prune_send_answers(who uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.send_answers a
  using public.sends s
  where s.id = a.send_id
    and (s.from_id = who or s.to_id = who)
    and (
      exists (
        select 1 from public.blocks b
        where (b.blocker = s.from_id and b.blocked = s.to_id)
           or (b.blocker = s.to_id and b.blocked = s.from_id)
      )
      or not (
        exists (
          select 1 from public.friend_links f
          where f.state = 'ok'
            and ((f.from_id = s.from_id and f.to_id = s.to_id) or (f.from_id = s.to_id and f.to_id = s.from_id))
        )
        or exists (
          select 1 from public.family_members m1
          join public.family_members m2 on m2.family_id = m1.family_id
          where m1.user_id = s.from_id and m2.user_id = s.to_id
        )
      )
    );

  delete from public.check_ons c
  where (c.owner_id = who or c.buddy_id = who)
    and (
      exists (
        select 1 from public.blocks b
        where (b.blocker = c.owner_id and b.blocked = c.buddy_id)
           or (b.blocker = c.buddy_id and b.blocked = c.owner_id)
      )
      or not (
        exists (
          select 1 from public.friend_links f
          where f.state = 'ok'
            and ((f.from_id = c.owner_id and f.to_id = c.buddy_id) or (f.from_id = c.buddy_id and f.to_id = c.owner_id))
        )
        or exists (
          select 1 from public.family_members m1
          join public.family_members m2 on m2.family_id = m1.family_id
          where m1.user_id = c.owner_id and m2.user_id = c.buddy_id
        )
      )
    );
$$;

revoke all on function public.prune_send_answers(uuid) from public, anon, authenticated;

-- 4. Weekly gem: the phone may send last week's key after this week's was
-- paid, which paid again and moved gem_week back. Pay only a newer week.
-- Full body from wallet.sql otherwise.
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
  set gem_balance = least(row.gem_balance + 1, 9999), gem_week = key
  where user_id = who
  returning gem_balance into bal;

  return bal;
end;
$$;

revoke all on function public.grant_weekly_gem(text) from public, anon;
grant execute on function public.grant_weekly_gem(text) to authenticated;

-- 5. delete_me does not refund unopened gifts.
-- See drop-tonight.sql, which runs last, for the current delete_me.

-- 6. Gifts already owned go back to the giver here, in the same
-- transaction, and are not returned to the phone. Before, the phone had to
-- call return_gift, and a gift it skipped was paid for and lost.
-- Full body from readthrough-6.sql otherwise.
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

-- 7. A family answer must be for a question in that family.
-- Policy from rls-subselect.sql plus the lamp check.
drop policy if exists "answer for yourself" on public.family_answers;
create policy "answer for yourself" on public.family_answers
  for all using ((select auth.uid()) = user_id and public.in_family(family_id))
  with check (
    (select auth.uid()) = user_id and public.in_family(family_id)
    and exists (select 1 from public.family_lamps l
      where l.id = family_answers.lamp_id and l.family_id = family_answers.family_id)
  );

-- 8. 'once:<uuid>' is 41 characters; the old limit was 24.
-- Same rule as hardening.sql (now 72 there too).
alter table public.family_answers drop constraint if exists family_answers_period_len;
alter table public.family_answers add constraint family_answers_period_len
  check (length(period_key) <= 72) not valid;
alter table public.family_answers validate constraint family_answers_period_len;

-- 9. Seasonal accessories come back every year. A catalog accessory with an
-- end date is on sale when today's month and day fall in its window, in
-- any year from its first. Everything else keeps its one-time dates.
-- A day of slack each way, for phones ahead of or behind UTC.
create or replace function public.shop_window_live(p_kind text, p_from date, p_until date, p_today date)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_until is null or p_kind <> 'accessory' then
      p_from <= p_today + 1 and (p_until is null or p_today - 1 < p_until)
    else
      p_from <= p_today + 1 and exists (
        select 1
        from generate_series(
          greatest(extract(year from p_today)::int - extract(year from p_from)::int - 1, 0),
          extract(year from p_today)::int - extract(year from p_from)::int) n
        where (p_from + make_interval(years => n))::date <= p_today + 1
          and p_today - 1 < (p_until + make_interval(years => n))::date
      )
  end;
$$;

revoke all on function public.shop_window_live(text, date, date, date) from public, anon;
grant execute on function public.shop_window_live(text, date, date, date) to authenticated;

-- Full body from shop-catalog.sql with the window check.
create or replace function public.shop_item_live(p_kind text, p_item_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.shop_catalog c
    where c.kind = p_kind and c.item_id = p_item_id
      and public.shop_window_live(c.kind, c.live_from, c.live_until, (timezone('utc', now()))::date)
  );
$$;

revoke all on function public.shop_item_live(text, text) from public, anon;
grant execute on function public.shop_item_live(text, text) to authenticated;

-- Full body from gifts.sql with the window check on gift_catalog.
create or replace function public.send_gift(other uuid, p_kind text, p_item_id text, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  k text := lower(btrim(coalesce(p_kind, '')));
  id text := lower(btrim(coalesce(p_item_id, '')));
  say text := left(btrim(coalesce(p_note, '')), 60);
  price public.gift_catalog;
  row public.profiles;
  name text;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who then
    raise exception 'bad person';
  end if;
  if public.blocked_with(other) then
    raise exception 'not friends';
  end if;
  if not (public.are_friends(other) or public.share_family(other)) then
    raise exception 'not friends';
  end if;

  if k = 'frame' then
    -- Gem frames only, priced in shop_catalog. Coin, earned, seasonal and
    -- free frames are never gifts.
    select 'frame', s.item_id, s.gems, 0, s.live_from, null::date into price
    from public.shop_catalog s
    where s.kind = 'frame' and s.item_id = id and s.gems > 0 and public.shop_item_live('frame', id);
  else
    select * into price from public.gift_catalog c
    where c.kind = k and c.item_id = id
      and public.shop_window_live(c.kind, c.live_from, c.live_until, (timezone('utc', now()))::date);
  end if;
  if price is null then
    raise exception 'bad item';
  end if;

  select * into row from public.profiles where user_id = who for update;
  if row is null then
    raise exception 'need gems';
  end if;
  if row.gem_balance < price.gems then
    raise exception 'need gems';
  end if;
  if row.coin_balance < price.coins then
    raise exception 'need coins';
  end if;

  -- Insert first, so the caps raise before anything is paid.
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, note, gems, coins)
  values (other, who, id, k, say, price.gems, price.coins);

  update public.profiles
  set gem_balance = gem_balance - price.gems,
      coin_balance = coin_balance - price.coins
  where user_id = who
  returning * into row;

  select coalesce(nullif(btrim(p.display_name), ''), 'Someone') into name
  from public.profiles p where p.user_id = who;
  if public.push_wanted(other, 'sends') then
    insert into public.push_queue (to_id, title, body, go)
    values (other,
      left(public.push_text(other, 'gift', jsonb_build_object('name', coalesce(name, public.push_text(other, 'someone')))), 80),
      public.push_text(other, 'open'), '/tonight');
  end if;

  return jsonb_build_object('gems', row.gem_balance, 'coins', row.coin_balance);
end;
$$;

revoke all on function public.send_gift(uuid, text, text, text) from public, anon;
grant execute on function public.send_gift(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
