-- my_we_nights: a monthly card stays open until its month ends. Its row for
-- the slot day is paused while the month is still running and nobody has a
-- Did, so a Not yet on the 3rd does not break the streak on the 4th. A Did
-- still clears the day; a month that ends without one counts as missed.
-- Same as we-monthly.sql except the paused column.
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
  select s.card_id, s.folder, s.night, s.status,
    s.paused or (s.how = 'monthly' and not s.done and s.night >= date_trunc('month', current_date)::date),
    s.done
  from (
  select mine.id as card_id, mine.folder, dd.night, a.status, dd.how,
    coalesce(k.due_before = public.we_stale_nights() and k.heard_before = 0, false) as paused,
    case
      -- Turns rows are only your turn nights, so your did is the done.
      when mine.mode = 'turns' then coalesce(a.status = 'did', false)
      -- Settled nights read we_done, which only grows: today's member list
      -- would undo a finished night when someone joins or leaves later.
      when dd.night < current_date - 1 then exists (select 1 from public.we_done x where x.card_id = mine.id and x.night = dd.night)
      when mine.mode = 'any' then coalesce(d.dn, 0) >= 1
      when mine.mode = 'most' then coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) * 2 > t.total
      else coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) = t.total
    end as done
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
    and (mine.mode <> 'turns' or public.we_turn(mine.id, dd.night) = (select id from me))
  ) s;
$$;

revoke all on function public.my_we_nights() from public, anon;
grant execute on function public.my_we_nights() to authenticated;
