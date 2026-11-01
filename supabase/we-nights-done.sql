-- my_we_nights also says when a card is done for the night, so a card
-- someone else finished (an any or most card) clears your day too and
-- nobody has to swipe it again. Same done rule as we_is_done, worked out in
-- one pass instead of a call per night. Old apps ignore the new column.
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
      greatest(c.starts_on, coalesce(m.joined_at, m.asked_at)::date, current_date - 400) as since
    from public.we_cards c
    join public.we_members m on m.card_id = c.id and m.user_id = (select id from me) and m.state = 'in'
    where not c.archived
  ),
  -- Each card's due nights, from 3 weeks before yours start so the pause
  -- rule has its look-back, and whether anyone answered. One pass per card
  -- with a window, not a we_paused call per night.
  heard as (
    select mine.id, n::date as night,
      exists (select 1 from public.we_answers x where x.card_id = mine.id and x.night = n::date) as heard
    from mine
    cross join lateral generate_series(
      greatest(mine.starts_on, mine.since - 7 * public.we_stale_nights()), current_date + 1, interval '1 day') as n
    where public.we_due(mine.starts_on, mine.cadence, mine.weekdays, n::date)
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
  select mine.id, mine.folder, n::date, a.status,
    coalesce(k.due_before = public.we_stale_nights() and k.heard_before = 0, false),
    case
      -- Turns rows are only your turn nights, so your did is the done.
      when mine.mode = 'turns' then coalesce(a.status = 'did', false)
      when mine.mode = 'any' then coalesce(d.dn, 0) >= 1
      when mine.mode = 'most' then coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) * 2 > t.total
      else coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) = t.total
    end
  from mine
  cross join lateral generate_series(mine.since, current_date + 1, interval '1 day') as n
  left join marked k on k.id = mine.id and k.night = n::date
  left join members t on t.card_id = mine.id
  left join dids d on d.card_id = mine.id and d.night = n::date
  left join public.we_answers a
    on a.card_id = mine.id and a.user_id = (select id from me) and a.night = n::date
  where public.we_due(mine.since, mine.cadence, mine.weekdays, n::date)
    and (mine.mode <> 'turns' or public.we_turn(mine.id, n::date) = (select id from me));
$$;

revoke all on function public.my_we_nights() from public, anon;
grant execute on function public.my_we_nights() to authenticated;
