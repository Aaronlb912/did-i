-- Did we, weekly slots. Run after did-we.sql, readthrough-5.sql,
-- readthrough-6.sql and sweep-guards.sql (it redefines functions from them,
-- so it is last in the apply order). Safe to run again.
--
-- A card has a slot for each of its due nights. The slot runs from that
-- night up to the day before the next due night. A daily card has one slot
-- a day, so nothing changes for it. On a weekly card a Did on any day of
-- the slot counts for the slot's due night, so two people who answer on
-- different days of the same week finish the same night.
--
-- Nothing here deletes or lowers anything: the streak only starts from the
-- current slot instead of tonight, and nights already done stay done.

-- Slot math ------------------------------------------------------------

-- How many due nights there have been from the start through d.
create or replace function public.we_due_index(starts date, how text, days smallint[], d date)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when d < starts then 0
    when how = 'daily' then d - starts + 1
    else ((d - starts + 1) / 7) * (select count(distinct w) from unnest(days) w)
      + (select count(distinct w) from unnest(days) w
         where ((w - extract(dow from starts)::integer + 7) % 7) < (d - starts + 1) % 7)
  end::integer;
$$;

-- The slot a day is in: the latest due night on or before it. Null before
-- the first due night.
create or replace function public.we_slot(starts date, how text, days smallint[], d date)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when d < starts then null
    when how = 'daily' then d
    else (select max(d - i) from generate_series(0, 6) i
          where d - i >= starts and extract(dow from d - i)::smallint = any (days))
  end;
$$;

-- The first due night after a day, within a week and a bit. Null when none.
create or replace function public.we_slot_next(starts date, how text, days smallint[], d date)
returns date
language sql
immutable
set search_path = public
as $$
  select min(d + i) from generate_series(1, 8) i
  where d + i >= starts and (how = 'daily' or extract(dow from d + i)::smallint = any (days));
$$;

-- The night an answer given on a day belongs to: its slot, or, on a weekly
-- card before the first due night, the first one ("done it already").
create or replace function public.we_target(starts date, how text, days smallint[], d date)
returns date
language sql
immutable
set search_path = public
as $$
  select case when how = 'daily' then public.we_slot(starts, how, days, d)
    else coalesce(public.we_slot(starts, how, days, d), public.we_slot_next(starts, how, days, d)) end;
$$;

-- Streak and best, counted in slots (done due nights in a row). The run ends
-- at the current slot when it is done, else at the one before it, so a slot
-- still open never breaks it. Server only: tonight and the coin claim read it.
create or replace function public.we_streaks(card uuid, as_of date)
returns table (streak integer, best integer)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select starts_on, cadence, weekdays from public.we_cards where id = card
  ),
  cs as (
    select public.we_slot(c.starts_on, c.cadence, c.weekdays, as_of) as night,
      public.we_due_index(c.starts_on, c.cadence, c.weekdays,
        public.we_slot(c.starts_on, c.cadence, c.weekdays, as_of)) as idx
    from c
  ),
  done as (
    select d.night, public.we_due_index(c.starts_on, c.cadence, c.weekdays, d.night) as idx
    from public.we_done d, c
    where d.card_id = card and d.night > as_of - 1100
      and public.we_due(c.starts_on, c.cadence, c.weekdays, d.night)
  ),
  ranked as (
    select night, idx, idx - row_number() over (order by night) as grp from done
  ),
  sizes as (
    select grp, count(*) as n, count(*) filter (where night <= (select night from cs)) as upto
    from ranked group by grp
  ),
  last_done as (
    select r.grp from ranked r, cs
    where r.night <= cs.night and r.idx >= cs.idx - 1
    order by r.night desc limit 1
  )
  select coalesce((select s.upto from sizes s join last_done l on l.grp = s.grp), 0)::integer,
         coalesce((select max(n) from sizes), 0)::integer;
$$;

revoke all on function public.we_streaks(uuid, date) from public, anon, authenticated;

-- After a join, a leave or an edit: settle every due night in the current
-- slot and the one before it (and early answers up to a week ahead), so done
-- is not left stale. A night older than last night that is already done is
-- left alone, so a new person joining cannot take back last week. Coins and claims
-- already paid stay paid.
create or replace function public.we_resettle(card uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.we_cards;
  d date;
  here date;
  first_night date;
begin
  select * into c from public.we_cards where id = card;
  if not found then
    return;
  end if;
  here := public.we_slot(c.starts_on, c.cadence, c.weekdays, current_date - 1);
  first_night := coalesce(public.we_slot(c.starts_on, c.cadence, c.weekdays, here - 1), here, current_date - 1);
  for d in
    select g::date from generate_series(first_night, current_date + 7, interval '1 day') g
    where public.we_due(c.starts_on, c.cadence, c.weekdays, g::date)
  loop
    -- Older than last night is add-only: it can become done, never undone.
    if d >= current_date - 1
       or not exists (select 1 from public.we_done x where x.card_id = card and x.night = d) then
      perform public.we_settle(card, d);
    end if;
  end loop;
end;
$$;

revoke all on function public.we_resettle(uuid) from public, anon, authenticated;

-- Answering ---------------------------------------------------------

-- Comes back 0: not done, 1: done, 2: this answer finished it. on_night is
-- the day the person answers on; the answer is kept on that day's slot.
-- Older apps send the card's next due night for "done it already", which
-- still lands on that night.
create or replace function public.we_answer(card uuid, on_night date, want_status text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  c public.we_cards;
  target date;
  was_done boolean;
begin
  if not exists (select 1 from public.we_members where card_id = card and user_id = who and state = 'in') then
    raise exception 'not on this card';
  end if;
  -- One change to a card at a time: two people answering in the same moment
  -- would each count only their own Did, and the night would stay not done.
  perform pg_advisory_xact_lock(hashtext('we_card:' || card::text));
  -- Tonight or the night before in any time zone. No reaching back to fill
  -- in a streak.
  if on_night < current_date - 2 then
    raise exception 'that night is closed';
  end if;
  select * into c from public.we_cards where id = card;
  if on_night > current_date + 1 then
    -- Done early: a card's next asked night may be answered up to a week
    -- ahead, never a night after it.
    if on_night > current_date + 7
       or not public.we_due(c.starts_on, c.cadence, c.weekdays, on_night)
       or exists (
         select 1 from generate_series(current_date + 2, on_night - 1, interval '1 day') g(d)
         where public.we_due(c.starts_on, c.cadence, c.weekdays, g.d::date)
       ) then
      raise exception 'that night is closed';
    end if;
    target := on_night;
  else
    -- A day that is not a due night only counts for the slot it is in, and
    -- only while it is tonight in some time zone.
    if not public.we_due(c.starts_on, c.cadence, c.weekdays, on_night) and on_night < current_date - 1 then
      raise exception 'that night is closed';
    end if;
    target := public.we_target(c.starts_on, c.cadence, c.weekdays, on_night);
    if target is null or target > current_date + 7 then
      raise exception 'that night is closed';
    end if;
  end if;
  -- A weekly day that maps back to an older slot cannot undo it: that would
  -- lower a streak after the fact.
  if target <> on_night and target < current_date - 1 and want_status is distinct from 'did'
     and exists (select 1 from public.we_done where card_id = card and night = target) then
    raise exception 'that night is closed';
  end if;
  -- A closed card, or a night it is not asked, takes no new answers. Taking
  -- one back (want_status null) still works after the card changed.
  if want_status is not null and (
    c.archived or not public.we_due(c.starts_on, c.cadence, c.weekdays, target)
  ) then
    raise exception 'that night is closed: not asked';
  end if;
  perform public.we_pin_turns(card, target, target);
  was_done := exists (select 1 from public.we_done where card_id = card and night = target);
  if want_status is null then
    delete from public.we_answers where card_id = card and user_id = who and night = target;
  else
    insert into public.we_answers (card_id, user_id, night, status)
    values (card, who, target, want_status)
    on conflict (card_id, user_id, night) do update
      set status = excluded.status, answered_at = now();
  end if;
  if not public.we_settle(card, target) then
    return 0;
  end if;
  return case when was_done then 1 else 2 end;
end;
$$;

revoke all on function public.we_answer(uuid, date, text) from public;
grant execute on function public.we_answer(uuid, date, text) to authenticated;

-- "Your turn." As before, but on a weekly card it can go out any day of a
-- slot that is not done yet, not only on the due night.
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
  if not exists (
    select 1 from public.we_cards c
    where c.id = card
      and (public.we_due(c.starts_on, c.cadence, c.weekdays, on_night)
        or (public.we_slot(c.starts_on, c.cadence, c.weekdays, on_night) is not null
          and not exists (select 1 from public.we_done x
                          where x.card_id = c.id
                            and x.night = public.we_slot(c.starts_on, c.cadence, c.weekdays, on_night))))
  ) then
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

-- Reading -----------------------------------------------------------

-- Every card you are on or asked to, for one night. Each person's answer
-- comes back only as far as the card's owner allows; yours always does.
-- slot is the due night answers are kept on. A weekly card stays due (open)
-- on the days after its due night until that slot is done. streak and best
-- are counted on the server (we_streaks).
create or replace function public.we_tonight(on_night date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  mine as (
    select m.card_id, m.state, m.folder, m.topics
    from public.we_members m, me
    where m.user_id = me.id
      and (m.state = 'in'
        or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days())))
  ),
  cards as (
    select c.*, mine.state as my_state, mine.folder as my_folder, mine.topics as my_topics,
      public.we_target(c.starts_on, c.cadence, c.weekdays, on_night) as slot,
      st.streak as my_streak, st.best as my_best
    from public.we_cards c
    join mine on mine.card_id = c.id
    cross join lateral public.we_streaks(case when mine.state = 'in' then c.id end, on_night) st
    where not c.archived
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'question', c.question,
    'mode', c.mode,
    'shows', c.shows,
    'cadence', c.cadence,
    'weekdays', c.weekdays,
    'goal', c.goal_nights,
    'askAfter', c.ask_after,
    'remind', c.remind,
    'note', c.note,
    'startsOn', c.starts_on,
    'mine', c.made_by = (select id from me),
    'myState', c.my_state,
    'folder', c.my_folder,
    'topics', c.my_topics,
    'slot', c.slot,
    'due', public.we_due(c.starts_on, c.cadence, c.weekdays, on_night)
      or coalesce(c.slot < on_night
        and public.we_due(c.starts_on, c.cadence, c.weekdays, c.slot)
        and not exists (select 1 from public.we_done d where d.card_id = c.id and d.night = c.slot), false),
    'paused', c.my_state = 'in' and public.we_paused(c.id, coalesce(c.slot, on_night)),
    'done', exists (select 1 from public.we_done d where d.card_id = c.id and d.night = c.slot),
    'turn', case when c.mode = 'turns' then public.we_turn(c.id, c.slot) end,
    'dids', (select count(*) from public.we_answers a
             join public.we_members m2 on m2.card_id = a.card_id and m2.user_id = a.user_id and m2.state = 'in'
             where a.card_id = c.id and a.night = c.slot and a.status = 'did'),
    'askedBy', (select coalesce(nullif(btrim(p.display_name), ''), '') from public.we_members m3
                join public.profiles p on p.user_id = m3.asked_by
                where m3.card_id = c.id and m3.user_id = (select id from me)),
    'streak', c.my_streak,
    'best', c.my_best,
    -- The last 400 done nights, newest first: the month look-back and a
    -- challenge's finish line read from this.
    -- The slot's finish: who said the last did, and their cheer.
    'finish', (select jsonb_build_object('by', d.finisher, 'cheer', d.finisher_cheer)
               from public.we_done d where d.card_id = c.id and d.night = c.slot),
    'doneNights', (select coalesce(jsonb_agg(d.night order by d.night desc), '[]'::jsonb)
                   from (select night from public.we_done d
                         where d.card_id = c.id order by night desc limit 400) d),
    'people', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.user_id,
        'name', coalesce(nullif(btrim(p.display_name), ''), '@' || coalesce(p.handle, '')),
        'buddy', coalesce(p.buddy_on, ''),
        'cheer', coalesce(p.badge_cheer, ''),
        'state', m.state,
        'turn', m.turn,
        'me', m.user_id = (select id from me),
        'status', case
          when m.user_id = (select id from me) then a.status
          when c.shows = 'all' then a.status
          when c.shows = 'waiting' and a.status = 'did' then 'did'
          else null
        end,
        'nudged', exists (select 1 from public.we_nudges n
                          where n.card_id = c.id and n.night = on_night
                            and n.from_id = (select id from me) and n.to_id = m.user_id)
      ) order by m.turn, m.asked_at), '[]'::jsonb)
      from public.we_members m
      left join public.profiles p on p.user_id = m.user_id
      left join public.we_answers a on a.card_id = m.card_id and a.user_id = m.user_id and a.night = c.slot
      where m.card_id = c.id and m.state in ('in', 'asked')
        -- On a count card the others only exist as a number.
        and (c.shows <> 'count' or m.user_id = (select id from me) or c.my_state = 'asked')
    )
  ) order by c.made_at), '[]'::jsonb)
  from cards c;
$$;

revoke all on function public.we_tonight(date) from public;
grant execute on function public.we_tonight(date) to authenticated;

-- Streak coins ------------------------------------------------------

-- The streak is the run of slots done together (we_streaks). Paid once per
-- person per milestone; a card needs two people in.
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
    update public.profiles set coin_balance = least(coin_balance + paid, 9999) where user_id = who;
  end if;
  return paid;
end;
$$;

revoke all on function public.we_claim(uuid, date) from public, anon;
grant execute on function public.we_claim(uuid, date) to authenticated;
