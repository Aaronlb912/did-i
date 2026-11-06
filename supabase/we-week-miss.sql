-- my_we_nights: a times a week Did we that ends a week short costs one day,
-- the week's last, not every undone day of it. Same as turns-and-code.sql
-- except the paused column: a per_week day not done and not its week's last
-- counts for nothing.

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
    s.paused or (public.we_open(s.how) and not s.done and s.pend >= current_date)
      or (split_part(s.how, ':', 1) = 'per_week' and not s.done and s.night <> s.pend),
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
    and (mine.mode <> 'turns'
      or (dd.night >= current_date - 1 and public.we_turn(mine.id, dd.night) = (select id from me))
      or (dd.night < current_date - 1
        and (a.status is not null
          or exists (select 1 from public.we_turns p
                     where p.card_id = mine.id and p.night = dd.night and p.user_id = (select id from me)))))
  ) r
  ) s;
$$;

revoke all on function public.my_we_nights() from public, anon;
grant execute on function public.my_we_nights() to authenticated;

