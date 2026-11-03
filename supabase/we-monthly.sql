-- Did we, monthly cards and a changeable schedule. Run last in db:apply:all
-- (after did-we-safety.sql): it redefines functions from did-we.sql,
-- we-slots.sql, we-keep-done.sql, we-nights-done.sql and did-we-safety.sql.
-- Safe to run again.
--
-- A monthly card has one slot a month, the 1st. Each person has one answer
-- row per month, kept on the 1st. A Not yet does not end the month; a later
-- Did the same month still counts. Done together follows the card's mode.
--
-- The maker can change the schedule after making the card (every Saturday
-- becomes by the end of the month). Old schedules stay on the card in
-- schedule_was, each in force for the nights before it was left. Nothing is deleted, and
-- the edit never raises or lowers the streak: streak_carry is the streak
-- when it changed, and we_streaks adds it to the new run while that run is
-- unbroken from the first new slot.

-- Columns --------------------------------------------------------------

alter table public.we_cards drop constraint if exists we_cards_cadence_check;
alter table public.we_cards add constraint we_cards_cadence_check
  check (cadence in ('daily', 'weekly', 'monthly'));

alter table public.we_cards add column if not exists schedule_from date;
alter table public.we_cards add column if not exists prior_cadence text;
alter table public.we_cards add column if not exists prior_weekdays smallint[];
alter table public.we_cards add column if not exists schedule_was jsonb not null default '[]'::jsonb;
alter table public.we_cards add column if not exists streak_carry integer not null default 0;
alter table public.we_cards add column if not exists changed_by uuid references auth.users on delete set null;
alter table public.we_cards add column if not exists changed_at timestamptz;

alter table public.we_cards drop constraint if exists we_cards_prior_cadence_ok;
alter table public.we_cards add constraint we_cards_prior_cadence_ok
  check (prior_cadence is null or prior_cadence in ('daily', 'weekly', 'monthly'));
alter table public.we_cards drop constraint if exists we_cards_prior_weekdays_ok;
alter table public.we_cards add constraint we_cards_prior_weekdays_ok
  check (prior_weekdays is null or prior_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]);
alter table public.we_cards drop constraint if exists we_cards_streak_carry_ok;
alter table public.we_cards add constraint we_cards_streak_carry_ok
  check (streak_carry between 0 and 100000);

alter table public.we_cards drop constraint if exists we_cards_schedule_was_ok;
alter table public.we_cards add constraint we_cards_schedule_was_ok
  check (jsonb_typeof(schedule_was) = 'array' and jsonb_array_length(schedule_was) <= 50);

create index if not exists we_cards_changed_by_idx on public.we_cards (changed_by);

-- Every change of schedule, so a card cannot be flipped back and forth all
-- day (we_edit stops at 3 a day).
create table if not exists public.we_schedule_log (
  id bigserial primary key,
  card_id uuid not null references public.we_cards on delete cascade,
  by_user uuid not null references auth.users on delete cascade,
  at timestamptz not null default now()
);

create index if not exists we_schedule_log_card_idx on public.we_schedule_log (card_id, at);
create index if not exists we_schedule_log_user_idx on public.we_schedule_log (by_user);

alter table public.we_schedule_log enable row level security;
revoke all on public.we_schedule_log from anon;
revoke insert, update, delete on public.we_schedule_log from authenticated;

drop policy if exists "see schedule changes on cards you are on" on public.we_schedule_log;
create policy "see schedule changes on cards you are on" on public.we_schedule_log
  for select using (public.we_seen(card_id));

-- Slot math, with a monthly branch --------------------------------------

-- A monthly schedule starts on its first slot: the 1st of the month for a
-- card made monthly, the day it was switched to monthly for a card that
-- changed (that month is one slot, from that day). After that the slot is
-- the 1st of each month.

-- Is the card due on this night.
create or replace function public.we_due(starts date, how text, days smallint[], on_night date)
returns boolean
language sql
immutable
as $$
  select on_night >= starts and case
    when how = 'monthly' then on_night = starts or extract(day from on_night)::integer = 1
    else how = 'daily' or extract(dow from on_night)::smallint = any (days)
  end;
$$;

-- How many due nights there have been from the start through d.
create or replace function public.we_due_index(starts date, how text, days smallint[], d date)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when d < starts then 0
    when how = 'monthly' then
      (extract(year from d)::integer * 12 + extract(month from d)::integer)
      - (extract(year from starts)::integer * 12 + extract(month from starts)::integer) + 1
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
    when how = 'monthly' then
      case when date_trunc('month', d) = date_trunc('month', starts) then starts
        else (date_trunc('month', d))::date end
    when how = 'daily' then d
    else (select max(d - i) from generate_series(0, 6) i
          where d - i >= starts and extract(dow from d - i)::smallint = any (days))
  end;
$$;

-- The first due night after a day, within a week and a bit (a monthly card:
-- the 1st of next month, or its first slot). Null when none.
create or replace function public.we_slot_next(starts date, how text, days smallint[], d date)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when how = 'monthly' then
      case when d >= starts then (date_trunc('month', d) + interval '1 month')::date else starts end
    else (select min(d + i) from generate_series(1, 8) i
          where d + i >= starts and (how = 'daily' or extract(dow from d + i)::smallint = any (days)))
  end;
$$;

-- The night an answer given on a day belongs to: its slot, or, on a weekly
-- or monthly card before the first due night, the first one ("done it
-- already").
create or replace function public.we_target(starts date, how text, days smallint[], d date)
returns date
language sql
immutable
set search_path = public
as $$
  select case when how = 'daily' then public.we_slot(starts, how, days, d)
    else coalesce(public.we_slot(starts, how, days, d), public.we_slot_next(starts, how, days, d)) end;
$$;

-- The schedule in force ------------------------------------------------

-- Every schedule the card has had, oldest first: (starts, upto, how, days, lo),
-- in force for lo <= night < upto. schedule_was holds the old ones as
-- {until, cadence, weekdays}; the card's own columns are the last (upto far
-- off). Pure, so a caller that holds the card row reads it once.
create or replace function public.we_segs(c public.we_cards)
returns table (starts date, upto date, how text, days smallint[], lo date)
language sql
immutable
as $$
  with e as (
    select x.ord, (x.v ->> 'until')::date as upto, x.v ->> 'cadence' as how,
      coalesce(array(select jsonb_array_elements_text(x.v -> 'weekdays')::smallint), '{}'::smallint[]) as days
    from jsonb_array_elements(c.schedule_was) with ordinality x(v, ord)
  ),
  s as (
    select e.ord, coalesce(lag(e.upto) over (order by e.ord), c.starts_on) as b, e.upto, e.how, e.days
    from e
  )
  select case when s.how = 'monthly' and s.ord = 1 then date_trunc('month', s.b)::date else s.b end,
    s.upto, s.how, s.days, coalesce(lag(s.upto) over (order by s.ord), date '0001-01-01')
  from s
  union all
  select case
      when jsonb_array_length(c.schedule_was) = 0 and c.schedule_from is null then
        case when c.cadence = 'monthly' then date_trunc('month', c.starts_on)::date else c.starts_on end
      else coalesce(c.schedule_from, c.starts_on)
    end,
    date '9999-12-31', c.cadence, c.weekdays,
    coalesce((select max(e.upto) from e), date '0001-01-01');
$$;

-- (starts, how, days) in force on a night.
create or replace function public.we_sched(c public.we_cards, d date)
returns table (starts date, how text, days smallint[])
language sql
immutable
as $$
  select g.starts, g.how, g.days
  from public.we_segs(c) g
  where d < g.upto
  order by g.upto
  limit 1;
$$;

-- The same, by card id. Server only.
create or replace function public.we_sched(card uuid, d date)
returns table (starts date, how text, days smallint[])
language sql
stable
security definer
set search_path = public
as $$
  select s.starts, s.how, s.days
  from public.we_cards c, lateral public.we_sched(c, d) s
  where c.id = card;
$$;

-- Slot math on a card row, for callers that hold one.
create or replace function public.we_due_in(c public.we_cards, d date)
returns boolean
language sql
immutable
as $$
  select public.we_due(s.starts, s.how, s.days, d) from public.we_sched(c, d) s;
$$;

create or replace function public.we_slot_in(c public.we_cards, d date)
returns date
language sql
immutable
as $$
  select public.we_slot(s.starts, s.how, s.days, d) from public.we_sched(c, d) s;
$$;

create or replace function public.we_target_in(c public.we_cards, d date)
returns date
language sql
immutable
as $$
  select public.we_target(s.starts, s.how, s.days, d) from public.we_sched(c, d) s;
$$;

-- How many due nights there have been through a day, across every schedule
-- the card has had.
create or replace function public.we_due_upto(c public.we_cards, d date)
returns integer
language sql
immutable
as $$
  select coalesce(sum(public.we_due_index(g.starts, g.how, g.days, least(d, g.upto - 1))), 0)::integer
  from public.we_segs(c) g;
$$;

-- Due on a night, for a person whose first night is since. A card that is
-- or was monthly counts the month's slot even when it is before since.
create or replace function public.we_due_from(c public.we_cards, since date, d date)
returns boolean
language sql
immutable
as $$
  select public.we_due(s.starts, s.how, s.days, d)
    and (d >= since or (s.how = 'monthly' and d >= date_trunc('month', since)::date))
  from public.we_sched(c, d) s;
$$;

-- The due nights from one day to another, with the schedule each is under.
-- Reads the card's schedules once, so a caller that walks many days does
-- not parse them per day.
create or replace function public.we_due_days(c public.we_cards, first_d date, last_d date)
returns table (night date, how text)
language sql
immutable
as $$
  select g.d::date, s.how
  from public.we_segs(c) s,
    generate_series(greatest(first_d, s.lo), least(last_d, s.upto - 1), interval '1 day') g(d)
  where public.we_due(s.starts, s.how, s.days, g.d::date);
$$;

revoke all on function public.we_due(date, text, smallint[], date),
  public.we_due_index(date, text, smallint[], date),
  public.we_slot(date, text, smallint[], date),
  public.we_slot_next(date, text, smallint[], date),
  public.we_target(date, text, smallint[], date),
  public.we_segs(public.we_cards), public.we_sched(public.we_cards, date),
  public.we_sched(uuid, date),
  public.we_due_in(public.we_cards, date), public.we_slot_in(public.we_cards, date),
  public.we_target_in(public.we_cards, date), public.we_due_upto(public.we_cards, date),
  public.we_due_from(public.we_cards, date, date),
  public.we_due_days(public.we_cards, date, date)
  from public, anon, authenticated;

-- Turns ---------------------------------------------------------------

-- Whose turn it is on a night, for a turns card. A kept turn wins while
-- that person is still on the card. Otherwise members take turns in the
-- order they were asked, and the count only moves on due nights: days on
-- a daily card, Saturdays on a weekly one, months on a monthly one, counted
-- across every schedule the card has had. Server only (lockdown.sql).
-- Copied from did-we.sql.
create or replace function public.we_turn(card uuid, on_night date)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select t.user_id from public.we_turns t
     join public.we_members m on m.card_id = t.card_id and m.user_id = t.user_id and m.state = 'in'
     where t.card_id = card and t.night = on_night),
    (with people as (
      select m.user_id, row_number() over (order by m.turn, m.asked_at) - 1 as spot
      from public.we_members m
      where m.card_id = card and m.state = 'in'
    )
    select p.user_id
    from people p, public.we_cards c
    where c.id = card
      and p.spot = public.we_due_upto(c, on_night - 1) % greatest((select count(*) from people), 1))
  )
$$;

revoke all on function public.we_turn(uuid, date) from public, anon, authenticated;

-- Keep whose turn each due night from first_night to last_night is, before
-- an answer or a change to who is on the card. Copied from did-we.sql.
create or replace function public.we_pin_turns(card uuid, first_night date, last_night date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.we_turns (card_id, night, user_id)
  select c.id, g.d::date, public.we_turn(c.id, g.d::date)
  from public.we_cards c, generate_series(first_night, last_night, interval '1 day') g(d)
  where c.id = card and c.mode = 'turns'
    -- One person is not taking turns yet; keeping those nights would hand
    -- them all to the maker once the next person joins.
    and (select count(*) from public.we_members m where m.card_id = c.id and m.state = 'in') >= 2
    and public.we_due_in(c, g.d::date)
    and public.we_turn(c.id, g.d::date) is not null
  on conflict do nothing;
$$;

revoke all on function public.we_pin_turns(uuid, date, date) from public, anon, authenticated;

-- Paused on a night: the 3 due nights before it (since the start or the last
-- restart) all had no answer from anyone. A monthly card never has 3 due
-- nights in the look-back, so it never pauses. Copied from did-we.sql.
create or replace function public.we_paused(card uuid, on_night date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with due as (
    select g.night
    from public.we_cards c,
      public.we_due_days(c, on_night - 7 * public.we_stale_nights(), on_night - 1) g
    where c.id = card
      and g.night >= greatest(c.starts_on, coalesce(c.restarted_on, c.starts_on))
    order by g.night desc
    limit public.we_stale_nights()
  )
  select (select count(*) from due) = public.we_stale_nights()
    and not exists (select 1 from public.we_answers a join due on due.night = a.night where a.card_id = card);
$$;

revoke all on function public.we_paused(uuid, date) from public, anon, authenticated;

-- Streaks ---------------------------------------------------------------

-- Streak and best, counted in slots (done due nights in a row). The run ends
-- at the current slot when it is done, else at the one before it, so a slot
-- still open never breaks it. After a change of schedule only nights from
-- the cut on count, and streak_carry (the streak when it changed) is added
-- while the run is unbroken from the first new slot. Server only: tonight
-- and the coin claim read it. Copied from we-slots.sql.
create or replace function public.we_streaks(card uuid, as_of date)
returns table (streak integer, best integer)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select s.starts, s.how, s.days, k.streak_carry,
      case when k.schedule_from <= as_of then k.schedule_from end as lo
    from public.we_cards k, lateral public.we_sched(k, as_of) s
    where k.id = card
  ),
  cs as (
    select public.we_slot(c.starts, c.how, c.days, as_of) as night,
      coalesce(public.we_due_index(c.starts, c.how, c.days,
        public.we_slot(c.starts, c.how, c.days, as_of)), 0) as idx
    from c
  ),
  done as (
    select d.night, public.we_due_index(c.starts, c.how, c.days, d.night) as idx
    from public.we_done d, c
    where d.card_id = card and d.night > as_of - 1100
      and (c.lo is null or d.night >= c.lo)
      and public.we_due(c.starts, c.how, c.days, d.night)
  ),
  ranked as (
    select night, idx, idx - row_number() over (order by night) as grp from done
  ),
  sizes as (
    select grp, count(*) as n, min(idx) as first_idx,
      count(*) filter (where night <= (select night from cs)) as upto
    from ranked group by grp
  ),
  last_done as (
    select r.grp from ranked r, cs
    where r.night <= cs.night and r.idx >= cs.idx - 1
    order by r.night desc limit 1
  ),
  run as (
    select s.upto, s.first_idx from sizes s join last_done l on l.grp = s.grp
  ),
  got as (
    select coalesce((select upto from run), 0)
      + case
          when (select lo from c) is not null and coalesce((select streak_carry from c), 0) > 0
            and ((select first_idx from run) = 1
              or (not exists (select 1 from run) and (select idx from cs) <= 1))
          then (select streak_carry from c)
          else 0
        end as streak
  )
  select got.streak::integer,
    greatest(coalesce((select max(n) from sizes), 0), got.streak,
      case when (select lo from c) is not null then coalesce((select streak_carry from c), 0) else 0 end)::integer
  from got;
$$;

revoke all on function public.we_streaks(uuid, date) from public, anon, authenticated;

-- After a join, a leave or an edit: settle every due night in the current
-- slot and the one before it (and early answers up to a week ahead), so done
-- is not left stale. Before today is add-only. Copied from we-keep-done.sql.
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
  here := public.we_slot_in(c, current_date - 1);
  first_night := coalesce(public.we_slot_in(c, here - 1), here, current_date - 1);
  for d in
    select g.night from public.we_due_days(c, first_night, current_date + 7) g
  loop
    -- Before today is add-only: it can become done, never undone.
    if d >= current_date
       or not exists (select 1 from public.we_done x where x.card_id = card and x.night = d) then
      perform public.we_settle(card, d);
    end if;
  end loop;
end;
$$;

revoke all on function public.we_resettle(uuid) from public, anon, authenticated;

-- Answering ---------------------------------------------------------

-- Comes back 0: not done, 1: done, 2: this answer finished it. on_night is
-- the day the person answers on; the answer is kept on that day's slot (a
-- monthly card: the 1st). Copied from did-we-safety.sql, with its 'card
-- ended' guard.
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
       or not public.we_due_in(c, on_night)
       or exists (
         select 1 from generate_series(current_date + 2, on_night - 1, interval '1 day') g(d)
         where public.we_due_in(c, g.d::date)
       ) then
      raise exception 'that night is closed';
    end if;
    target := on_night;
  else
    -- A day that is not a due night only counts for the slot it is in, and
    -- only while it is tonight in some time zone.
    if not public.we_due_in(c, on_night) and on_night < current_date - 1 then
      raise exception 'that night is closed';
    end if;
    target := public.we_target_in(c, on_night);
    if target is null or target > current_date + 7 then
      raise exception 'that night is closed';
    end if;
  end if;
  -- A weekly or monthly day that maps back to an older slot cannot undo it:
  -- that would lower a streak after the fact.
  if target <> on_night and target < current_date - 1 and want_status is distinct from 'did'
     and exists (select 1 from public.we_done where card_id = card and night = target) then
    raise exception 'that night is closed';
  end if;
  -- A closed card, or a night it is not asked, takes no new answers. Taking
  -- one back (want_status null) still works after the card changed.
  if want_status is not null and c.archived then
    raise exception 'card ended';
  end if;
  if want_status is not null and not public.we_due_in(c, target) then
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

revoke all on function public.we_answer(uuid, date, text) from public, anon;
grant execute on function public.we_answer(uuid, date, text) to authenticated;

-- "Your turn." It can go out any day of a slot that is not done yet, not
-- only on the due night. Copied from we-slots.sql.
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
      and (public.we_due_in(c, on_night)
        or (public.we_slot_in(c, on_night) is not null
          and not exists (select 1 from public.we_done x
                          where x.card_id = c.id
                            and x.night = public.we_slot_in(c, on_night))))
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

revoke all on function public.we_nudge(uuid, uuid, date) from public, anon;
grant execute on function public.we_nudge(uuid, uuid, date) to authenticated;

-- Reading -----------------------------------------------------------

-- Every card you are on or asked to, for one night. Copied from
-- we-slots.sql; adds scheduleFrom, changedBy, changedAt, priorCadence,
-- periodEnd (the last day of the month on a monthly card, else the slot's
-- own day) and makerName / maker_name (the maker's name, as in people).
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
      t.slot,
      public.we_due_in(c, on_night) as due_now,
      public.we_due_in(c, t.slot) as slot_due,
      (select s.how from public.we_sched(c, on_night) s) as how_now,
      (select coalesce(nullif(btrim(mp.display_name), ''), '@' || coalesce(mp.handle, ''))
         from public.profiles mp where mp.user_id = c.made_by) as maker_name,
      (select coalesce(nullif(btrim(cp.display_name), ''), '@' || coalesce(cp.handle, ''))
         from public.profiles cp where cp.user_id = c.changed_by) as changed_by_name,
      st.streak as my_streak, st.best as my_best
    from public.we_cards c
    join mine on mine.card_id = c.id
    cross join lateral (select public.we_target_in(c, on_night) as slot) t
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
    'scheduleFrom', c.schedule_from,
    'changedBy', c.changed_by,
    'changedAt', c.changed_at,
    'priorCadence', c.prior_cadence,
    'changedByName', c.changed_by_name,
    'periodEnd', case when c.how_now = 'monthly'
      then (on_night - extract(day from on_night)::integer + 1 + interval '1 month' - interval '1 day')::date
      else c.slot end,
    'makerName', c.maker_name,
    'maker_name', c.maker_name,
    'mine', c.made_by = (select id from me),
    'myState', c.my_state,
    'folder', c.my_folder,
    'topics', c.my_topics,
    'slot', c.slot,
    'due', c.due_now
      or coalesce(c.slot < on_night
        and c.slot_due
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
    -- The slot's finish: who said the last did, and their cheer.
    'finish', (select jsonb_build_object('by', d.finisher, 'cheer', d.finisher_cheer)
               from public.we_done d where d.card_id = c.id and d.night = c.slot),
    -- The last 400 done nights, newest first: the month look-back and a
    -- challenge's finish line read from this.
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

revoke all on function public.we_tonight(date) from public, anon;
grant execute on function public.we_tonight(date) to authenticated;

-- my_we_nights: a monthly card has one row a month, on the 1st (from the
-- 1st of the month the person joined in). Copied from we-nights-done.sql.
drop function if exists public.my_we_nights();
create or replace function public.my_we_nights()
returns table (card_id uuid, folder text, night date, status text, paused boolean, done boolean)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select c.id, c.cadence, c.weekdays, c.mode, c.starts_on, c.restarted_on, coalesce(m.folder, '') as folder,
      (c.cadence = 'monthly' or c.schedule_was @> '[{"cadence": "monthly"}]'::jsonb) as ever_monthly,
      greatest(c.starts_on, coalesce(m.joined_at, m.asked_at)::date, current_date - 400) as since
    from public.we_cards c
    join public.we_members m on m.card_id = c.id and m.user_id = (select id from me) and m.state = 'in'
    where not c.archived
  ),
  -- Each card's due nights, from 3 weeks before yours start so the pause
  -- rule has its look-back, and whether anyone answered. One pass per card
  -- with a window, not a we_paused call per night.
  heard as (
    select mine.id, dd.night,
      exists (select 1 from public.we_answers x where x.card_id = mine.id and x.night = dd.night) as heard
    from mine
    join public.we_cards cc on cc.id = mine.id
    cross join lateral public.we_due_days(
      cc, greatest(mine.starts_on, mine.since - 7 * public.we_stale_nights()), current_date + 1) as dd
  ),
  -- The 3 due nights before each one (the window size is we_stale_nights).
  -- A restart starts a new count.
  marked as (
    select h.id, h.night,
      count(*) filter (where h.heard) over w as heard_before,
      count(*) over w as due_before
    from heard h
    join mine on mine.id = h.id
    window w as (
      partition by h.id, h.night >= coalesce(mine.restarted_on, mine.starts_on)
      order by h.night
      rows between 3 preceding and 1 preceding
    )
  ),
  -- People on each card now, and dids per night from people still on it.
  members as (
    select m.card_id, count(*) as total
    from public.we_members m
    where m.state = 'in' and m.card_id in (select id from mine)
    group by m.card_id
  ),
  dids as (
    select a.card_id, a.night, count(*) as dn
    from public.we_answers a
    join public.we_members m on m.card_id = a.card_id and m.user_id = a.user_id and m.state = 'in'
    where a.status = 'did' and a.card_id in (select id from mine) and a.night >= current_date - 401
    group by a.card_id, a.night
  )
  select mine.id, mine.folder, dd.night, a.status,
    coalesce(k.due_before = public.we_stale_nights() and k.heard_before = 0, false),
    case
      -- Turns rows are only your turn nights, so your did is the done.
      when mine.mode = 'turns' then coalesce(a.status = 'did', false)
      -- Settled nights read we_done, which only grows: today's member list
      -- would undo a finished night when someone joins or leaves later.
      when dd.night < current_date - 1 then exists (select 1 from public.we_done x where x.card_id = mine.id and x.night = dd.night)
      when mine.mode = 'any' then coalesce(d.dn, 0) >= 1
      when mine.mode = 'most' then coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) * 2 > t.total
      else coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) = t.total
    end
  from mine
  join public.we_cards cc on cc.id = mine.id
  cross join lateral public.we_due_days(
    cc, case when mine.ever_monthly then date_trunc('month', mine.since)::date else mine.since end,
    current_date + 1) as dd
  left join marked k on k.id = mine.id and k.night = dd.night
  left join members t on t.card_id = mine.id
  left join dids d on d.card_id = mine.id and d.night = dd.night
  left join public.we_answers a
    on a.card_id = mine.id and a.user_id = (select id from me) and a.night = dd.night
  where (dd.how = 'monthly' or dd.night >= mine.since)
    and (mine.mode <> 'turns' or public.we_turn(mine.id, dd.night) = (select id from me));
$$;

revoke all on function public.my_we_nights() from public, anon;
grant execute on function public.my_we_nights() to authenticated;

-- Changing the schedule ---------------------------------------------

-- The maker changes the rules, the words or the schedule. A change of
-- cadence or weekdays is capped at 3 a day (we_schedule_log) and never
-- moves the streak: it is carried (see we_streaks). An answer given today
-- on a slot that is not done yet moves to the new schedule's slot.
-- p_monthly: the caller knows monthly (we_edit2). The 7-argument we_edit
-- is for older apps, which send daily with no days for a card they cannot
-- show as monthly; that keeps the card monthly.
create or replace function public.we_edit_apply(
  card uuid,
  want_question text,
  want_mode text,
  want_shows text,
  want_cadence text,
  want_weekdays smallint[],
  want_goal smallint,
  p_monthly boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  c public.we_cards;
  c2 public.we_cards;
  new_cad text := want_cadence;
  new_days smallint[] := coalesce(want_weekdays, '{}');
  changed boolean;
  first_new date;
  carry integer := 0;
  old_t date;
  new_t date;
  was jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('we_card:' || card::text));
  select * into c from public.we_cards where id = card and made_by = who and not archived;
  if not found then
    raise exception 'only the person who made it can change it';
  end if;
  if not p_monthly and new_cad = 'monthly' then
    raise exception 'update the app to make this monthly';
  end if;
  if not p_monthly and c.cadence = 'monthly' and new_cad = 'daily' and new_days = '{}' then
    new_cad := 'monthly';
  end if;
  if new_cad = 'monthly' then
    new_days := '{}';
  end if;
  changed := new_cad is distinct from c.cadence
    or (new_cad = 'weekly' and
      (select coalesce(array_agg(distinct w order by w), '{}'::smallint[]) from unnest(new_days) w)
      is distinct from
      (select coalesce(array_agg(distinct w order by w), '{}'::smallint[]) from unnest(c.weekdays) w));

  perform public.we_pin_turns(card, current_date - 1, current_date + 1);

  if not changed then
    update public.we_cards
    set question = btrim(want_question),
        mode = want_mode,
        shows = want_shows,
        goal_nights = want_goal
    where id = card;
    perform public.we_resettle(card);
    return;
  end if;

  if (select count(*) from public.we_schedule_log l where l.card_id = card and l.at >= current_date) >= 3 then
    raise exception 'schedule_cap';
  end if;

  if c.schedule_from = current_date then
    -- Another change the same day (or changing back): today's earlier change
    -- leaves no history and the carry stays as it was.
    update public.we_cards
    set question = btrim(want_question),
        mode = want_mode,
        shows = want_shows,
        goal_nights = want_goal,
        cadence = new_cad,
        weekdays = new_days,
        changed_by = who,
        changed_at = now()
    where id = card;
  else
    -- The streak so far (an open slot does not break it) is carried. If the
    -- new schedule's first slot is already done, the new run counts it, so
    -- the carry leaves it out.
    select s.streak into carry from public.we_streaks(card, current_date) s;
    first_new := public.we_target(current_date, new_cad, new_days, current_date);
    if first_new is not null and exists (select 1 from public.we_done where card_id = card and night = first_new) then
      carry := greatest(coalesce(carry, 0) - 1, 0);
    end if;
    -- The schedule being left joins the history (newest last, 50 kept).
    was := c.schedule_was || jsonb_build_array(jsonb_build_object(
      'until', current_date, 'cadence', c.cadence, 'weekdays', to_jsonb(c.weekdays)));
    if jsonb_array_length(was) > 50 then
      select coalesce(jsonb_agg(t.x order by t.o), '[]'::jsonb) into was
      from jsonb_array_elements(was) with ordinality t(x, o)
      where t.o > jsonb_array_length(was) - 50;
    end if;
    update public.we_cards
    set question = btrim(want_question),
        mode = want_mode,
        shows = want_shows,
        goal_nights = want_goal,
        cadence = new_cad,
        weekdays = new_days,
        schedule_was = was,
        prior_cadence = c.cadence,
        prior_weekdays = c.weekdays,
        schedule_from = current_date,
        streak_carry = coalesce(carry, 0),
        changed_by = who,
        changed_at = now()
    where id = card;
  end if;

  insert into public.we_schedule_log (card_id, by_user) values (card, who);

  -- A Did given today on a slot that is not done moves to the new slot, so
  -- it counts there. Nothing moves when the old slot is done (it stays
  -- done) or when both schedules use the same slot. Running it again finds
  -- nothing left to move.
  select * into c2 from public.we_cards where id = card;
  old_t := public.we_target_in(c, current_date);
  new_t := public.we_target_in(c2, current_date);
  if old_t is not null and new_t is not null and old_t <> new_t
     and not exists (select 1 from public.we_done where card_id = card and night = old_t) then
    with moved as (
      delete from public.we_answers a
      where a.card_id = card and a.night = old_t and a.answered_at >= current_date
      returning a.user_id, a.status, a.answered_at
    )
    insert into public.we_answers (card_id, user_id, night, status, answered_at)
    select card, m.user_id, new_t, m.status, m.answered_at from moved m
    on conflict (card_id, user_id, night) do update
      set status = case when public.we_answers.status = 'did' or excluded.status = 'did' then 'did' else excluded.status end;
  end if;

  perform public.we_resettle(card);
end;
$$;

revoke all on function public.we_edit_apply(uuid, text, text, text, text, smallint[], smallint, boolean)
  from public, anon, authenticated;

-- The 7-argument call older apps make.
create or replace function public.we_edit(
  card uuid,
  want_question text,
  want_mode text,
  want_shows text,
  want_cadence text,
  want_weekdays smallint[],
  want_goal smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.we_edit_apply(card, want_question, want_mode, want_shows, want_cadence, want_weekdays, want_goal, false);
end;
$$;

revoke all on function public.we_edit(uuid, text, text, text, text, smallint[], smallint) from public, anon;
grant execute on function public.we_edit(uuid, text, text, text, text, smallint[], smallint) to authenticated;

-- The same call for apps that know monthly.
create or replace function public.we_edit2(
  card uuid,
  want_question text,
  want_mode text,
  want_shows text,
  want_cadence text,
  want_weekdays smallint[],
  want_goal smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.we_edit_apply(card, want_question, want_mode, want_shows, want_cadence, want_weekdays, want_goal, true);
end;
$$;

revoke all on function public.we_edit2(uuid, text, text, text, text, smallint[], smallint) from public, anon;
grant execute on function public.we_edit2(uuid, text, text, text, text, smallint[], smallint) to authenticated;
