-- Did we, weekly slots: one-time repair. NOT in the apply-all order. Apply
-- this file after we-slots.sql, then run it once by hand:
--
--   select public.we_slot_repair();
--
-- It records that it ran (we_slot_repair_ran) and does nothing after that.
-- It only adds rows: it never changes or deletes any.
--
-- Weekly cards, last 120 days. A Did written to a past due night N, on a day
-- inside the slot of the due night before it (P), was a "done it already"
-- from before slots. It is also kept as that person's Did on P when N has no
-- done row and they have no answer on P. There is no time zone for a person,
-- so the answered_at date may be one day before P. answered_at can be
-- overwritten when someone later changes their answer (a known limit), and a
-- Did given on N itself in the evening may look a day later in UTC and is not
-- copied. Only answers made before this run are looked at.
--
-- Then only the nights that just got a new answer are settled, with no push.
-- For those cards, a milestone the streak reached only because of the repair
-- is marked as paid for every member, so the repair itself pays nothing. A
-- milestone the streak already met before the repair stays claimable. Known
-- limit: members who joined or left since then get the same marks.
-- It comes back with the number of rows it added.

create table if not exists public.we_slot_repair_ran (
  only_row boolean primary key default true check (only_row),
  ran_at timestamptz not null default now()
);

alter table public.we_slot_repair_ran enable row level security;
revoke all on public.we_slot_repair_ran from public, anon, authenticated;

create or replace function public.we_slot_repair()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  added integer := 0;
  got integer;
begin
  if exists (select 1 from public.we_slot_repair_ran) then
    return 0;
  end if;

  create temp table if not exists we_repair_fixed (card_id uuid, user_id uuid, night date) on commit drop;
  truncate we_repair_fixed;

  with ins as (
    insert into public.we_answers (card_id, user_id, night, status, answered_at)
    select a.card_id, a.user_id, p.night, 'did', a.answered_at
    from public.we_answers a
    join public.we_cards c on c.id = a.card_id and c.cadence = 'weekly'
    cross join lateral (
      select public.we_slot(c.starts_on, c.cadence, c.weekdays, a.night - 1) as night
    ) p
    where a.status = 'did'
      and a.night < current_date
      and public.we_due(c.starts_on, c.cadence, c.weekdays, a.night)
      and p.night is not null
      and p.night >= current_date - 120
      and a.answered_at < now()
      and (a.answered_at at time zone 'utc')::date between p.night - 1 and a.night - 1
      and not exists (select 1 from public.we_done d where d.card_id = a.card_id and d.night = a.night)
      and not exists (
        select 1 from public.we_answers x
        where x.card_id = a.card_id and x.user_id = a.user_id and x.night = p.night
      )
    on conflict do nothing
    returning card_id, user_id, night
  )
  insert into we_repair_fixed select card_id, user_id, night from ins;
  get diagnostics got = row_count;
  added := added + got;

  create temp table if not exists we_repair_before (card_id uuid, streak integer) on commit drop;
  truncate we_repair_before;
  insert into we_repair_before
  select k.card_id, st.streak
  from (select distinct card_id from we_repair_fixed) k
  cross join lateral public.we_streaks(k.card_id, current_date) st;

  insert into public.we_done (card_id, night)
  select f.card_id, f.night
  from (select distinct card_id, night from we_repair_fixed) f
  where not exists (select 1 from public.we_done d where d.card_id = f.card_id and d.night = f.night)
    and public.we_is_done(f.card_id, f.night)
  on conflict do nothing;
  get diagnostics got = row_count;
  added := added + got;

  -- Marked as announced, so a later settle does not push about old nights.
  insert into public.we_done_pushed (card_id, night)
  select d.card_id, d.night
  from public.we_done d
  where exists (select 1 from we_repair_fixed f where f.card_id = d.card_id and f.night = d.night)
  on conflict do nothing;
  get diagnostics got = row_count;
  added := added + got;

  -- No lump of coins for what the repair itself made.
  insert into public.we_streak_grants (card_id, user_id, milestone)
  select k.card_id, m.user_id, s.at
  from (select distinct card_id from we_repair_fixed) k
  cross join lateral public.we_streaks(k.card_id, current_date) st
  join public.we_members m on m.card_id = k.card_id and m.state = 'in'
  cross join (values (7), (30), (100), (365)) s(at)
  join we_repair_before b on b.card_id = k.card_id
  where st.streak >= s.at and b.streak < s.at
  on conflict do nothing;
  get diagnostics got = row_count;
  added := added + got;

  insert into public.we_slot_repair_ran default values;
  return added;
end;
$$;

revoke all on function public.we_slot_repair() from public, anon, authenticated;
