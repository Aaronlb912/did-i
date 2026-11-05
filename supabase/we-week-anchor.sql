-- per_week weeks always start on the card's starts_on weekday, even after an
-- edit moves the schedule start. we_period_end, we_streaks_week, we_week_dids
-- and we_tonight all read we_segs, so snapping the start back to a whole week
-- from starts_on anchors them. Everything else is as in we-timing.sql.

create or replace function public.we_segs(c public.we_cards)
returns table (starts date, upto date, how text, days smallint[], lo date)
language sql
immutable
set search_path = public
as $$
  select case when split_part(q.how, ':', 1) = 'per_week'
      then c.starts_on + ((greatest(q.st, c.starts_on) - c.starts_on) / 7) * 7 else q.st end,
    q.upto, q.how, q.days, q.lo
  from (
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
    coalesce((select max(e.upto) from e), date '0001-01-01')
  ) q(st, upto, how, days, lo);
$$;

revoke all on function public.we_segs(public.we_cards) from public, anon, authenticated;
