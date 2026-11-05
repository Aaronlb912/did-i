-- Did we gets every Did I timing option. Run last in db:apply:all: it
-- redefines functions from we-monthly.sql, we-month-open.sql and
-- did-we-safety.sql. Safe to run again.
--
-- New cadences, each with its setting on the card:
--   every_n   every_days, every_anchor: one day each N days, due that day only.
--   every     every_days, every_anchor: N-day windows, any day in the window
--             counts, missed only once the window closes.
--   per_week  per_week: N done days in each week (weeks start on the card's
--             start weekday), missed only once the week closes.
--   monthly   month_day (null or 1 = the 1st, 0 = last day): open from that
--             day to month end.
--   once_on   once_on: one day, nothing after.
--   deadline  due_by: one period from the start to due_by.
--
-- The slot math keeps (starts, how, days, d); the setting rides in how, as
-- 'every_n:3', 'every:5', 'per_week:3', 'monthly:15', 'once_on:2026-12-01'
-- or 'deadline:2026-12-01'. Plain 'daily', 'weekly' and 'monthly' are as
-- before. schedule_was entries now also keep 'how' and 'anchor', so an old
-- schedule keeps its setting for the nights it was in force.

-- Columns --------------------------------------------------------------

alter table public.we_cards add column if not exists every_days smallint;
alter table public.we_cards add column if not exists every_anchor date;
alter table public.we_cards add column if not exists per_week smallint;
alter table public.we_cards add column if not exists month_day smallint;
alter table public.we_cards add column if not exists once_on date;
alter table public.we_cards add column if not exists due_by date;

alter table public.we_cards drop constraint if exists we_cards_cadence_check;
alter table public.we_cards add constraint we_cards_cadence_check
  check (cadence in ('daily', 'weekly', 'monthly', 'every_n', 'every', 'per_week', 'once_on', 'deadline'));
alter table public.we_cards drop constraint if exists we_cards_prior_cadence_ok;
alter table public.we_cards add constraint we_cards_prior_cadence_ok
  check (prior_cadence is null
    or prior_cadence in ('daily', 'weekly', 'monthly', 'every_n', 'every', 'per_week', 'once_on', 'deadline'));

alter table public.we_cards drop constraint if exists we_cards_every_days_ok;
alter table public.we_cards add constraint we_cards_every_days_ok
  check (every_days is null or every_days between 2 and 365);
alter table public.we_cards drop constraint if exists we_cards_per_week_ok;
alter table public.we_cards add constraint we_cards_per_week_ok
  check (per_week is null or per_week between 1 and 6);
alter table public.we_cards drop constraint if exists we_cards_month_day_ok;
alter table public.we_cards add constraint we_cards_month_day_ok
  check (month_day is null or month_day between 0 and 31);
alter table public.we_cards drop constraint if exists we_cards_due_by_ok;
alter table public.we_cards add constraint we_cards_due_by_ok
  check (due_by is null or due_by >= starts_on);
alter table public.we_cards drop constraint if exists we_cards_timing_set;
alter table public.we_cards add constraint we_cards_timing_set
  check ((cadence not in ('every_n', 'every') or every_days is not null)
    and (cadence <> 'per_week' or per_week is not null)
    and (cadence <> 'once_on' or once_on is not null)
    and (cadence <> 'deadline' or due_by is not null));

-- Helpers ---------------------------------------------------------------

-- The how string for a cadence and its setting.
create or replace function public.we_how(cad text, n_every smallint, n_week smallint, n_mday smallint, on_day date, by_day date)
returns text
language sql
immutable
set search_path = public
as $$
  select case cad
    when 'every_n' then 'every_n:' || n_every
    when 'every' then 'every:' || n_every
    when 'per_week' then 'per_week:' || n_week
    when 'monthly' then case when n_mday is null or n_mday = 1 then 'monthly' else 'monthly:' || n_mday end
    when 'once_on' then 'once_on:' || to_char(on_day, 'YYYY-MM-DD')
    when 'deadline' then 'deadline:' || to_char(by_day, 'YYYY-MM-DD')
    else cad
  end;
$$;

-- A schedule whose period runs over several days, so an unanswered day
-- inside it is not a miss yet.
create or replace function public.we_open(how text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select split_part(coalesce(how, ''), ':', 1) in ('monthly', 'every', 'per_week', 'deadline');
$$;

-- The day dd (0 = last) in the month that starts on m.
create or replace function public.we_mday(m date, dd integer)
returns date
language sql
immutable
set search_path = public
as $$
  select m + (least(case when dd = 0 then 31 else dd end,
    extract(day from (m + interval '1 month' - interval '1 day'))::integer) - 1);
$$;

-- A monthly:D card's slot in the month of d (its first month: not before
-- the start).
create or replace function public.we_mslot(starts date, dd integer, d date)
returns date
language sql
immutable
set search_path = public
as $$
  select case when date_trunc('month', d) = date_trunc('month', starts)
    then greatest(starts, public.we_mday(date_trunc('month', starts)::date, dd))
    else public.we_mday(date_trunc('month', d)::date, dd) end;
$$;

-- Slot math, with the new cadences --------------------------------------

create or replace function public.we_due(starts date, how text, days smallint[], on_night date)
returns boolean
language sql
immutable
set search_path = public
as $$
  select on_night >= starts and case split_part(how, ':', 1)
    when 'monthly' then case when split_part(how, ':', 2) = ''
      then on_night = starts or extract(day from on_night)::integer = 1
      else on_night = public.we_mslot(starts, split_part(how, ':', 2)::integer, on_night) end
    when 'every_n' then (on_night - starts) % split_part(how, ':', 2)::integer = 0
    when 'every' then (on_night - starts) % split_part(how, ':', 2)::integer = 0
    when 'per_week' then true
    when 'once_on' then on_night = split_part(how, ':', 2)::date
    when 'deadline' then on_night = starts
    when 'daily' then true
    else extract(dow from on_night)::smallint = any (days)
  end;
$$;

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
    when split_part(how, ':', 1) = 'monthly' then
      (extract(year from d)::integer * 12 + extract(month from d)::integer)
      - (extract(year from starts)::integer * 12 + extract(month from starts)::integer)
      + case when d >= public.we_mslot(starts, split_part(how, ':', 2)::integer, d) then 1 else 0 end
    when split_part(how, ':', 1) in ('every_n', 'every') then (d - starts) / split_part(how, ':', 2)::integer + 1
    when split_part(how, ':', 1) = 'once_on' then
      case when d >= split_part(how, ':', 2)::date and split_part(how, ':', 2)::date >= starts then 1 else 0 end
    when split_part(how, ':', 1) = 'deadline' then 1
    when how in ('daily', 'per_week') or split_part(how, ':', 1) = 'per_week' then d - starts + 1
    else ((d - starts + 1) / 7) * (select count(distinct w) from unnest(days) w)
      + (select count(distinct w) from unnest(days) w
         where ((w - extract(dow from starts)::integer + 7) % 7) < (d - starts + 1) % 7)
  end::integer;
$$;

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
    when split_part(how, ':', 1) = 'monthly' then
      case
        when d >= public.we_mslot(starts, split_part(how, ':', 2)::integer, d)
          then public.we_mslot(starts, split_part(how, ':', 2)::integer, d)
        when date_trunc('month', d) > date_trunc('month', starts)
          then public.we_mslot(starts, split_part(how, ':', 2)::integer, (date_trunc('month', d) - interval '1 month')::date)
      end
    when split_part(how, ':', 1) in ('every_n', 'every') then
      starts + ((d - starts) / split_part(how, ':', 2)::integer) * split_part(how, ':', 2)::integer
    when split_part(how, ':', 1) = 'once_on' then
      case when d >= split_part(how, ':', 2)::date and split_part(how, ':', 2)::date >= starts
        then split_part(how, ':', 2)::date end
    when split_part(how, ':', 1) = 'deadline' then starts
    when how = 'daily' or split_part(how, ':', 1) = 'per_week' then d
    else (select max(d - i) from generate_series(0, 6) i
          where d - i >= starts and extract(dow from d - i)::smallint = any (days))
  end;
$$;

create or replace function public.we_slot_next(starts date, how text, days smallint[], d date)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when how = 'monthly' then
      case when d >= starts then (date_trunc('month', d) + interval '1 month')::date else starts end
    when split_part(how, ':', 1) = 'monthly' then
      case
        when d < starts then public.we_mslot(starts, split_part(how, ':', 2)::integer, starts)
        when public.we_mslot(starts, split_part(how, ':', 2)::integer, d) > d
          then public.we_mslot(starts, split_part(how, ':', 2)::integer, d)
        else public.we_mday((date_trunc('month', d) + interval '1 month')::date, split_part(how, ':', 2)::integer)
      end
    when split_part(how, ':', 1) in ('every_n', 'every') then
      case when d < starts then starts
        else starts + ((d - starts) / split_part(how, ':', 2)::integer + 1) * split_part(how, ':', 2)::integer end
    when split_part(how, ':', 1) = 'per_week' then greatest(d + 1, starts)
    when split_part(how, ':', 1) = 'once_on' then
      case when split_part(how, ':', 2)::date > d and split_part(how, ':', 2)::date >= starts
        then split_part(how, ':', 2)::date end
    when split_part(how, ':', 1) = 'deadline' then case when starts > d then starts end
    else (select min(d + i) from generate_series(1, 8) i
          where d + i >= starts and (how = 'daily' or extract(dow from d + i)::smallint = any (days)))
  end;
$$;

-- The night an answer given on a day belongs to. every_n: that day when it
-- is due, else the next one (done early). once_on and deadline: nothing
-- after the day. monthly:D before the day: this month's slot (early).
create or replace function public.we_target(starts date, how text, days smallint[], d date)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when how = 'daily' or split_part(how, ':', 1) = 'per_week' then public.we_slot(starts, how, days, d)
    when split_part(how, ':', 1) = 'every_n' then
      case when public.we_due(starts, how, days, d) then d else public.we_slot_next(starts, how, days, d) end
    when split_part(how, ':', 1) = 'once_on' then
      case when d <= split_part(how, ':', 2)::date and split_part(how, ':', 2)::date >= starts
        then split_part(how, ':', 2)::date end
    when split_part(how, ':', 1) = 'deadline' then
      case when d <= split_part(how, ':', 2)::date then starts end
    when split_part(how, ':', 1) = 'monthly' and split_part(how, ':', 2) <> '' then
      case when date_trunc('month', public.we_slot(starts, how, days, d)) = date_trunc('month', d)
        then public.we_slot(starts, how, days, d) else public.we_slot_next(starts, how, days, d) end
    else coalesce(public.we_slot(starts, how, days, d), public.we_slot_next(starts, how, days, d))
  end;
$$;

-- The last day a slot's period is open. A per_week slot is a day; this is
-- the end of its week. Daily, weekly, every_n, once_on: the slot itself.
create or replace function public.we_period_end(starts date, how text, days smallint[], slot date)
returns date
language sql
immutable
set search_path = public
as $$
  select case split_part(how, ':', 1)
    when 'monthly' then (date_trunc('month', slot) + interval '1 month' - interval '1 day')::date
    when 'every' then slot + split_part(how, ':', 2)::integer - 1
    when 'per_week' then starts + ((slot - starts) / 7) * 7 + 6
    when 'deadline' then split_part(how, ':', 2)::date
    else slot
  end;
$$;

-- The schedule in force ------------------------------------------------

-- As in we-monthly.sql, with the setting in how. History entries keep how
-- and anchor (every_n / every count from their anchor).
create or replace function public.we_segs(c public.we_cards)
returns table (starts date, upto date, how text, days smallint[], lo date)
language sql
immutable
set search_path = public
as $$
  with e as (
    select x.ord, (x.v ->> 'until')::date as upto, coalesce(x.v ->> 'how', x.v ->> 'cadence') as how,
      (x.v ->> 'anchor')::date as anchor,
      coalesce(array(select jsonb_array_elements_text(x.v -> 'weekdays')::smallint), '{}'::smallint[]) as days
    from jsonb_array_elements(c.schedule_was) with ordinality x(v, ord)
  ),
  s as (
    select e.ord, coalesce(lag(e.upto) over (order by e.ord), c.starts_on) as b, e.upto, e.how, e.days, e.anchor
    from e
  )
  select case
      when s.how = 'monthly' and s.ord = 1 then date_trunc('month', s.b)::date
      when split_part(s.how, ':', 1) in ('every_n', 'every') then coalesce(s.anchor, s.b)
      else s.b end,
    s.upto, s.how, s.days, coalesce(lag(s.upto) over (order by s.ord), date '0001-01-01')
  from s
  union all
  select case
      when c.cadence in ('every_n', 'every') then coalesce(c.every_anchor, c.schedule_from, c.starts_on)
      when jsonb_array_length(c.schedule_was) = 0 and c.schedule_from is null then
        case when c.cadence = 'monthly' and coalesce(c.month_day, 1) = 1
          then date_trunc('month', c.starts_on)::date else c.starts_on end
      else coalesce(c.schedule_from, c.starts_on)
    end,
    date '9999-12-31',
    public.we_how(c.cadence, c.every_days, c.per_week, c.month_day, c.once_on, c.due_by),
    c.weekdays,
    coalesce((select max(e.upto) from e), date '0001-01-01');
$$;

-- Due on a night, for a person whose first night is since. A multi-day
-- period that was open on since still counts its slot.
create or replace function public.we_due_from(c public.we_cards, since date, d date)
returns boolean
language sql
immutable
set search_path = public
as $$
  select public.we_due(s.starts, s.how, s.days, d)
    and (d >= since
      or (public.we_open(s.how) and split_part(s.how, ':', 1) <> 'per_week'
        and coalesce(d >= public.we_slot(s.starts, s.how, s.days, since), false)))
  from public.we_sched(c, d) s;
$$;

-- The due nights with the schedule and the last day each one's period is
-- open (per_week: the end of its week).
create or replace function public.we_due_spans(c public.we_cards, first_d date, last_d date)
returns table (night date, how text, pend date)
language sql
immutable
set search_path = public
as $$
  select g.d::date, s.how, public.we_period_end(s.starts, s.how, s.days, g.d::date)
  from public.we_segs(c) s,
    generate_series(greatest(first_d, s.lo), least(last_d, s.upto - 1), interval '1 day') g(d)
  where public.we_due(s.starts, s.how, s.days, g.d::date);
$$;

revoke all on function public.we_how(text, smallint, smallint, smallint, date, date),
  public.we_open(text), public.we_mday(date, integer), public.we_mslot(date, integer, date),
  public.we_due(date, text, smallint[], date),
  public.we_due_index(date, text, smallint[], date),
  public.we_slot(date, text, smallint[], date),
  public.we_slot_next(date, text, smallint[], date),
  public.we_target(date, text, smallint[], date),
  public.we_period_end(date, text, smallint[], date),
  public.we_segs(public.we_cards),
  public.we_due_from(public.we_cards, date, date),
  public.we_due_spans(public.we_cards, date, date)
  from public, anon, authenticated;

-- Streaks ---------------------------------------------------------------

-- Slot cadences: as in we-monthly.sql, except a slot whose period has
-- closed with a gap before the next slot (every_n, once_on, deadline,
-- monthly:D) must be done for the run to go on.
create or replace function public.we_streaks_slot(card uuid, as_of date)
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
  c0 as (
    select c.*, public.we_slot(c.starts, c.how, c.days, as_of) as sl from c
  ),
  c1 as (
    select c0.*, (c0.sl is not null and c0.how <> 'weekly'
      and as_of > public.we_period_end(c0.starts, c0.how, c0.days, c0.sl)) as closed
    from c0
  ),
  cs as (
    select case when c1.closed then as_of else c1.sl end as night,
      coalesce(public.we_due_index(c1.starts, c1.how, c1.days, c1.sl), 0)
        + case when c1.closed then 1 else 0 end as idx
    from c1
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

-- per_week: counted in weeks with at least N done days. The current week
-- only adds once it has them; until it closes it never breaks the run.
create or replace function public.we_streaks_week(card uuid, as_of date)
returns table (streak integer, best integer)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select s.starts, split_part(s.how, ':', 2)::integer as n, k.streak_carry,
      case when k.schedule_from <= as_of then k.schedule_from end as lo
    from public.we_cards k, lateral public.we_sched(k, as_of) s
    where k.id = card
  ),
  cw as (select (as_of - c.starts) / 7 as w from c),
  weeks as (
    select (d.night - c.starts) / 7 as w
    from public.we_done d, c
    where d.card_id = card and d.night >= c.starts and d.night <= as_of
      and d.night > as_of - 1100 and (c.lo is null or d.night >= c.lo)
    group by 1, c.n
    having count(*) >= c.n
  ),
  ranked as (select w, w - row_number() over (order by w) as grp from weeks),
  sizes as (select grp, count(*) as n, min(w) as first_w from ranked group by grp),
  last_done as (
    select r.grp from ranked r, cw where r.w >= cw.w - 1 order by r.w desc limit 1
  ),
  run as (select s.n, s.first_w from sizes s join last_done l on l.grp = s.grp),
  got as (
    select coalesce((select n from run), 0)
      + case
          when (select lo from c) is not null and coalesce((select streak_carry from c), 0) > 0
            and ((select first_w from run) = 0
              or (not exists (select 1 from run) and (select w from cw) <= 0))
          then (select streak_carry from c)
          else 0
        end as streak
  )
  select got.streak::integer,
    greatest(coalesce((select max(n) from sizes), 0), got.streak,
      case when (select lo from c) is not null then coalesce((select streak_carry from c), 0) else 0 end)::integer
  from got;
$$;

create or replace function public.we_streaks(card uuid, as_of date)
returns table (streak integer, best integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  how text;
begin
  select s.how into how from public.we_cards k, lateral public.we_sched(k, as_of) s where k.id = card;
  if split_part(coalesce(how, ''), ':', 1) = 'per_week' then
    return query select * from public.we_streaks_week(card, as_of);
  else
    return query select * from public.we_streaks_slot(card, as_of);
  end if;
end;
$$;

revoke all on function public.we_streaks_slot(uuid, date), public.we_streaks_week(uuid, date),
  public.we_streaks(uuid, date)
  from public, anon, authenticated;

-- per_week: done days in the week a day is in.
create or replace function public.we_week_dids(card uuid, d date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.we_cards k, lateral public.we_sched(k, d) s, public.we_done x
  where k.id = card and split_part(s.how, ':', 1) = 'per_week'
    and x.card_id = card
    and x.night between public.we_period_end(s.starts, s.how, s.days, d) - 6
      and public.we_period_end(s.starts, s.how, s.days, d);
$$;

revoke all on function public.we_week_dids(uuid, date) from public, anon, authenticated;

-- Reading -----------------------------------------------------------

-- Copied from we-monthly.sql. Adds everyDays, everyAnchor, perWeek,
-- monthDay, onceOn, dueBy, how (the schedule in force tonight, encoded),
-- periodStart and periodEnd (the open period tonight's slot is in) and
-- weekDids (per_week: done days this week; done is true once it reaches
-- perWeek, due is false then).
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
  cards0 as (
    select c.*, mine.state as my_state, mine.folder as my_folder, mine.topics as my_topics,
      t.slot,
      public.we_due_in(c, on_night) as due_now,
      public.we_due_in(c, t.slot) as slot_due,
      sc.how as how_now, sc.starts as starts_now, sc.days as days_now,
      (select coalesce(nullif(btrim(mp.display_name), ''), '@' || coalesce(mp.handle, ''))
         from public.profiles mp where mp.user_id = c.made_by) as maker_name,
      (select coalesce(nullif(btrim(cp.display_name), ''), '@' || coalesce(cp.handle, ''))
         from public.profiles cp where cp.user_id = c.changed_by) as changed_by_name,
      st.streak as my_streak, st.best as my_best
    from public.we_cards c
    join mine on mine.card_id = c.id
    cross join lateral (select public.we_target_in(c, on_night) as slot) t
    left join lateral public.we_sched(c, on_night) sc on true
    cross join lateral public.we_streaks(case when mine.state = 'in' then c.id end, on_night) st
    where not c.archived
  ),
  cards as (
    select c.*,
      split_part(coalesce(c.how_now, ''), ':', 1) = 'per_week' as weekly_n,
      case when split_part(coalesce(c.how_now, ''), ':', 1) = 'per_week'
        then public.we_week_dids(c.id, on_night) end as week_dids
    from cards0 c
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'question', c.question,
    'mode', c.mode,
    'shows', c.shows,
    'cadence', c.cadence,
    'weekdays', c.weekdays,
    'everyDays', c.every_days,
    'everyAnchor', c.every_anchor,
    'perWeek', c.per_week,
    'monthDay', c.month_day,
    'onceOn', c.once_on,
    'dueBy', c.due_by,
    'how', c.how_now,
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
    'periodStart', case
      when c.slot is null then null
      when c.weekly_n then public.we_period_end(c.starts_now, c.how_now, c.days_now, c.slot) - 6
      else c.slot end,
    'periodEnd', case when c.slot is null then null
      else public.we_period_end(c.starts_now, c.how_now, c.days_now, c.slot) end,
    'weekDids', c.week_dids,
    'makerName', c.maker_name,
    'maker_name', c.maker_name,
    'mine', c.made_by = (select id from me),
    'myState', c.my_state,
    'folder', c.my_folder,
    'topics', c.my_topics,
    'slot', c.slot,
    'due', case when c.weekly_n then c.due_now and c.week_dids < c.per_week
      else c.due_now
        or coalesce(c.slot < on_night
          and c.slot_due
          and not exists (select 1 from public.we_done d where d.card_id = c.id and d.night = c.slot), false) end,
    'paused', c.my_state = 'in' and public.we_paused(c.id, coalesce(c.slot, on_night)),
    'done', exists (select 1 from public.we_done d where d.card_id = c.id and d.night = c.slot)
      or (c.weekly_n and c.week_dids >= c.per_week),
    'turn', case when c.mode = 'turns' then public.we_turn(c.id, c.slot) end,
    'dids', (select count(*) from public.we_answers a
             join public.we_members m2 on m2.card_id = a.card_id and m2.user_id = a.user_id and m2.state = 'in'
             where a.card_id = c.id and a.night = c.slot and a.status = 'did'),
    'askedBy', (select coalesce(nullif(btrim(p.display_name), ''), '') from public.we_members m3
                join public.profiles p on p.user_id = m3.asked_by
                where m3.card_id = c.id and m3.user_id = (select id from me)),
    'streak', c.my_streak,
    'best', c.my_best,
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
        and (c.shows <> 'count' or m.user_id = (select id from me) or c.my_state = 'asked')
    )
  ) order by c.made_at), '[]'::jsonb)
  from cards c;
$$;

revoke all on function public.we_tonight(date) from public, anon;
grant execute on function public.we_tonight(date) to authenticated;

-- my_we_nights: copied from we-month-open.sql. Any multi-day period
-- (monthly, every, deadline, per_week week) stays paused while it is open
-- and not done, so an unanswered day inside it is not a miss. A per_week
-- day is done once its week has enough done days.
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
      (c.cadence in ('monthly', 'every', 'deadline')
        or exists (select 1 from jsonb_array_elements(c.schedule_was) e(v)
                   where e.v ->> 'cadence' in ('monthly', 'every', 'deadline'))) as ever_open,
      greatest(c.starts_on, coalesce(m.joined_at, m.asked_at)::date, current_date - 400) as since
    from public.we_cards c
    join public.we_members m on m.card_id = c.id and m.user_id = (select id from me) and m.state = 'in'
    where not c.archived
  ),
  heard as (
    select mine.id, dd.night,
      exists (select 1 from public.we_answers x where x.card_id = mine.id and x.night = dd.night) as heard
    from mine
    join public.we_cards cc on cc.id = mine.id
    cross join lateral public.we_due_days(
      cc, greatest(mine.starts_on, mine.since - 7 * public.we_stale_nights()), current_date + 1) as dd
  ),
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
  select s.card_id, s.folder, s.night, s.status,
    s.paused or (public.we_open(s.how) and not s.done and s.pend >= current_date),
    s.done
  from (
  select r.card_id, r.folder, r.night, r.status, r.how, r.pend, r.paused,
    r.day_done or (split_part(r.how, ':', 1) = 'per_week'
      and (select count(*) from public.we_done x
           where x.card_id = r.card_id and x.night between r.pend - 6 and r.pend)
        >= split_part(r.how, ':', 2)::integer) as done
  from (
  select mine.id as card_id, mine.folder, dd.night, a.status, dd.how, dd.pend,
    coalesce(k.due_before = public.we_stale_nights() and k.heard_before = 0, false) as paused,
    case
      when mine.mode = 'turns' then coalesce(a.status = 'did', false)
      when dd.night < current_date - 1 then exists (select 1 from public.we_done x where x.card_id = mine.id and x.night = dd.night)
      when mine.mode = 'any' then coalesce(d.dn, 0) >= 1
      when mine.mode = 'most' then coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) * 2 > t.total
      else coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) = t.total
    end as day_done
  from mine
  join public.we_cards cc on cc.id = mine.id
  cross join lateral public.we_due_spans(
    cc, case when mine.ever_open then greatest(mine.starts_on - 31, mine.since - 366) else mine.since end,
    current_date + 1) as dd
  left join marked k on k.id = mine.id and k.night = dd.night
  left join members t on t.card_id = mine.id
  left join dids d on d.card_id = mine.id and d.night = dd.night
  left join public.we_answers a
    on a.card_id = mine.id and a.user_id = (select id from me) and a.night = dd.night
  where (dd.night >= mine.since
      or (public.we_open(dd.how) and split_part(dd.how, ':', 1) <> 'per_week' and dd.pend >= mine.since))
    and (mine.mode <> 'turns' or public.we_turn(mine.id, dd.night) = (select id from me))
  ) r
  ) s;
$$;

revoke all on function public.my_we_nights() from public, anon;
grant execute on function public.my_we_nights() to authenticated;

-- Making ------------------------------------------------------------

-- Checks a cadence's setting. Raises on a bad one.
create or replace function public.we_timing_ok(cad text, want_n smallint, want_on date, from_day date)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if cad in ('every_n', 'every') and (want_n is null or want_n not between 2 and 365) then
    raise exception 'pick every 2 to 365 days';
  end if;
  if cad in ('every_n', 'every') and want_on is not null
     and want_on not between from_day - 366 and from_day + 366 then
    raise exception 'pick a start within a year';
  end if;
  if cad = 'per_week' and (want_n is null or want_n not between 1 and 6) then
    raise exception 'pick 1 to 6 times a week';
  end if;
  if cad = 'monthly' and want_n is not null and want_n not between 0 and 31 then
    raise exception 'pick a day of the month';
  end if;
  if cad in ('once_on', 'deadline') and (want_on is null or want_on < from_day or want_on > from_day + 730) then
    raise exception 'pick a date in the next two years';
  end if;
end;
$$;

revoke all on function public.we_timing_ok(text, smallint, date, date) from public, anon, authenticated;

-- Copied from did-we-safety.sql's we_make, with want_n (every_n / every:
-- days, per_week: times a week, monthly: day of the month, 0 = last) and
-- want_on (once_on: the day, deadline: the last day, every_n / every: the
-- anchor, default the start).
create or replace function public.we_make2(
  want_question text,
  want_mode text default 'all',
  want_shows text default 'waiting',
  want_cadence text default 'daily',
  want_weekdays smallint[] default '{}',
  want_goal smallint default null,
  ask uuid[] default '{}',
  want_starts date default null,
  want_n smallint default null,
  want_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  card uuid;
  other uuid;
  spot smallint := 1;
  cad text := coalesce(want_cadence, 'daily');
  starts date := public.we_near_night(want_starts);
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from public.we_cards c
      join public.we_members m on m.card_id = c.id and m.user_id = who and m.state = 'in'
      where not c.archived) >= public.we_max_cards() then
    raise exception 'too many shared questions';
  end if;
  if (select count(*) from public.we_cards c
      where c.made_by = who and c.made_at > now() - interval '1 day') >= public.we_max_new_daily() then
    raise exception 'too many new today';
  end if;
  if coalesce(array_length(ask, 1), 0) >= public.we_max_members() then
    raise exception 'too many people';
  end if;
  perform public.we_timing_ok(cad, want_n, want_on, starts);

  insert into public.we_cards (made_by, question, mode, shows, cadence, weekdays, goal_nights, starts_on,
    every_days, every_anchor, per_week, month_day, once_on, due_by)
  values (
    who,
    btrim(want_question),
    coalesce(want_mode, 'all'),
    coalesce(want_shows, 'waiting'),
    cad,
    case when cad in ('daily', 'weekly', 'monthly') then coalesce(want_weekdays, '{}') else '{}' end,
    want_goal,
    starts,
    case when cad in ('every_n', 'every') then want_n end,
    case when cad in ('every_n', 'every') then coalesce(want_on, starts) end,
    case when cad = 'per_week' then want_n end,
    case when cad = 'monthly' then want_n end,
    case when cad = 'once_on' then want_on end,
    case when cad = 'deadline' then want_on end
  )
  returning id into card;

  insert into public.we_members (card_id, user_id, state, turn, asked_by, joined_at)
  values (card, who, 'in', 0, who, now());

  foreach other in array ask loop
    if not public.we_can_ask(other) then
      raise exception 'can only ask friends or family';
    end if;
    if not public.we_kid_ok(card, other) then
      raise exception 'kid card is family only';
    end if;
    if public.we_said_no_lately(other) then
      raise exception 'they said no lately';
    end if;
    insert into public.we_members (card_id, user_id, state, turn, asked_by)
    values (card, other, 'asked', spot, who)
    on conflict do nothing;
    spot := spot + 1;
  end loop;

  return card;
end;
$$;

revoke all on function public.we_make2(text, text, text, text, smallint[], smallint, uuid[], date, smallint, date) from public, anon;
grant execute on function public.we_make2(text, text, text, text, smallint[], smallint, uuid[], date, smallint, date) to authenticated;

-- The older call: daily, weekly or monthly on the 1st. Keeps its old
-- weekdays behaviour (a daily card keeps what it was sent).
create or replace function public.we_make(
  want_question text,
  want_mode text default 'all',
  want_shows text default 'waiting',
  want_cadence text default 'daily',
  want_weekdays smallint[] default '{}',
  want_goal smallint default null,
  ask uuid[] default '{}',
  want_starts date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if want_cadence in ('every_n', 'every', 'per_week', 'once_on', 'deadline') then
    raise exception 'update the app to use this schedule';
  end if;
  return public.we_make2(want_question, want_mode, want_shows, want_cadence, want_weekdays, want_goal,
    ask, want_starts, null, null);
end;
$$;

revoke all on function public.we_make(text, text, text, text, smallint[], smallint, uuid[], date) from public, anon;
grant execute on function public.we_make(text, text, text, text, smallint[], smallint, uuid[], date) to authenticated;

-- Changing the schedule ---------------------------------------------

-- Copied from we-monthly.sql's we_edit_apply, with the settings. p_new: the
-- caller knows the new cadences (we_edit3). Older apps send daily with no
-- days for a card they cannot show; that keeps the card's cadence and
-- setting.
create or replace function public.we_edit_apply2(
  card uuid,
  want_question text,
  want_mode text,
  want_shows text,
  want_cadence text,
  want_weekdays smallint[],
  want_goal smallint,
  p_monthly boolean,
  p_new boolean,
  want_n smallint,
  want_on date
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
  keep boolean := false;
  n_every smallint;
  n_anchor date;
  n_week smallint;
  n_mday smallint;
  n_once date;
  n_due date;
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
  if not p_new and new_cad in ('every_n', 'every', 'per_week', 'once_on', 'deadline') then
    raise exception 'update the app to use this schedule';
  end if;
  if not p_new and new_cad = 'daily' and new_days = '{}'
     and (c.cadence in ('every_n', 'every', 'per_week', 'once_on', 'deadline')
       or (not p_monthly and c.cadence = 'monthly')) then
    keep := true;
  end if;
  -- An app that knows monthly but not the day keeps the card's day.
  if not p_new and new_cad = 'monthly' and c.cadence = 'monthly' then
    keep := true;
  end if;

  if keep then
    new_cad := c.cadence;
    new_days := c.weekdays;
    n_every := c.every_days; n_anchor := c.every_anchor; n_week := c.per_week;
    n_mday := c.month_day; n_once := c.once_on; n_due := c.due_by;
  else
    -- A schedule the card already has is not re-checked: an old date or anchor
    -- must not block editing only the question.
    if not (new_cad = c.cadence and (
         (new_cad in ('every_n', 'every') and want_n is not distinct from c.every_days
            and want_on is not distinct from c.every_anchor)
      or (new_cad = 'once_on' and want_on is not distinct from c.once_on)
      or (new_cad = 'deadline' and want_on is not distinct from c.due_by))) then
      perform public.we_timing_ok(new_cad, want_n, want_on, current_date);
    end if;
    if new_cad <> 'weekly' then
      new_days := '{}';
    end if;
    if new_cad in ('every_n', 'every') then
      n_every := want_n;
      n_anchor := coalesce(want_on,
        case when c.cadence = new_cad and c.every_days = want_n then c.every_anchor end,
        current_date);
    end if;
    n_week := case when new_cad = 'per_week' then want_n end;
    n_mday := case when new_cad = 'monthly' then want_n end;
    n_once := case when new_cad = 'once_on' then want_on end;
    n_due := case when new_cad = 'deadline' then want_on end;
  end if;

  changed := new_cad is distinct from c.cadence
    or (new_cad = 'weekly' and
      (select coalesce(array_agg(distinct w order by w), '{}'::smallint[]) from unnest(new_days) w)
      is distinct from
      (select coalesce(array_agg(distinct w order by w), '{}'::smallint[]) from unnest(c.weekdays) w))
    or (n_every, n_anchor, n_week, n_mday, n_once, n_due)
      is distinct from (c.every_days, c.every_anchor, c.per_week, c.month_day, c.once_on, c.due_by);

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
    update public.we_cards
    set question = btrim(want_question),
        mode = want_mode,
        shows = want_shows,
        goal_nights = want_goal,
        cadence = new_cad,
        weekdays = new_days,
        every_days = n_every, every_anchor = n_anchor, per_week = n_week,
        month_day = n_mday, once_on = n_once, due_by = n_due,
        changed_by = who,
        changed_at = now()
    where id = card;
  else
    select s.streak into carry from public.we_streaks(card, current_date) s;
    first_new := public.we_target(
      case when new_cad in ('every_n', 'every') then n_anchor else current_date end,
      public.we_how(new_cad, n_every, n_week, n_mday, n_once, n_due), new_days, current_date);
    if first_new is not null and exists (select 1 from public.we_done where card_id = card and night = first_new) then
      carry := greatest(coalesce(carry, 0) - 1, 0);
    end if;
    was := c.schedule_was || jsonb_build_array(jsonb_build_object(
      'until', current_date, 'cadence', c.cadence, 'weekdays', to_jsonb(c.weekdays),
      'how', public.we_how(c.cadence, c.every_days, c.per_week, c.month_day, c.once_on, c.due_by),
      'anchor', c.every_anchor));
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
        every_days = n_every, every_anchor = n_anchor, per_week = n_week,
        month_day = n_mday, once_on = n_once, due_by = n_due,
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

revoke all on function public.we_edit_apply2(uuid, text, text, text, text, smallint[], smallint, boolean, boolean, smallint, date)
  from public, anon, authenticated;

-- we_edit and we_edit2 still call this.
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
begin
  perform public.we_edit_apply2(card, want_question, want_mode, want_shows, want_cadence, want_weekdays,
    want_goal, p_monthly, false, null, null);
end;
$$;

revoke all on function public.we_edit_apply(uuid, text, text, text, text, smallint[], smallint, boolean)
  from public, anon, authenticated;

create or replace function public.we_edit3(
  card uuid,
  want_question text,
  want_mode text,
  want_shows text,
  want_cadence text,
  want_weekdays smallint[],
  want_goal smallint,
  want_n smallint,
  want_on date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.we_edit_apply2(card, want_question, want_mode, want_shows, want_cadence, want_weekdays,
    want_goal, true, true, want_n, want_on);
end;
$$;

revoke all on function public.we_edit3(uuid, text, text, text, text, smallint[], smallint, smallint, date) from public, anon;
grant execute on function public.we_edit3(uuid, text, text, text, text, smallint[], smallint, smallint, date) to authenticated;
