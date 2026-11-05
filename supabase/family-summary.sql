-- Nightly family summary push: "The Smiths: 3 of 4 done today."
-- Run after push.sql. At 9pm (or profiles.family_hour) in each person's own time zone, one push per
-- family they are in. Only members who share their streak are counted, so
-- someone with sharing off is never shown as not done. Turned off with the
-- 'family' switch (prefs.pingsOff, PING_KINDS in src/lib/prefs.js).

-- One row per person per night, so a cron run twice in the hour sends once.
create table if not exists public.family_summary_sent (
  user_id uuid not null references auth.users on delete cascade,
  night date not null,
  primary key (user_id, night)
);
alter table public.family_summary_sent enable row level security;
-- Nobody signed in reads or writes it; only the function below does.
drop policy if exists family_summary_sent_none on public.family_summary_sent;
create policy family_summary_sent_none on public.family_summary_sent
  for all to authenticated using (false) with check (false);

-- The hour of the family summary on the person's own clock, 0 to 23. Set
-- from Notifications; the row is theirs under "write own profile".
alter table public.profiles add column if not exists family_hour smallint not null default 21;
alter table public.profiles drop constraint if exists profiles_family_hour;
alter table public.profiles add constraint profiles_family_hour
  check (family_hour between 0 and 23);

create or replace function public.queue_family_summaries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  made integer := 0;
begin
  with due as (
    -- People whose local clock is in their chosen hour (9pm unless they
    -- picked another) and who have not had tonight's summary yet.
    select p.user_id, (now() at time zone p.zone)::date as night
    from public.profiles p
    where p.zone <> ''
      and p.zone in (select name from pg_timezone_names)
      and extract(hour from now() at time zone p.zone) = p.family_hour
      and public.push_wanted(p.user_id, 'family')
      and exists (select 1 from public.devices d where d.user_id = p.user_id and d.push_token is not null)
      and not exists (
        select 1 from public.family_summary_sent s
        where s.user_id = p.user_id and s.night = (now() at time zone p.zone)::date
      )
  ),
  marked as (
    insert into public.family_summary_sent (user_id, night)
    select user_id, night from due
    on conflict do nothing
    returning user_id, night
  ),
  lines as (
    select m.user_id, f.name,
      count(*) filter (where o.share_streak and o.done_on = m.night) as done,
      count(*) filter (where o.share_streak) as total
    from marked m
    join public.family_members me on me.user_id = m.user_id
    join public.families f on f.id = me.family_id
    join public.family_members fm on fm.family_id = f.id
    join public.profiles o on o.user_id = fm.user_id
    group by m.user_id, f.id, f.name
  ),
  queued as (
    insert into public.push_queue (to_id, title, body, go)
    select user_id,
      left(coalesce(nullif(name, ''), public.push_text(user_id, 'family')), 80),
      case when done = total then public.push_text(user_id, 'family_all', jsonb_build_object('total', total))
           else public.push_text(user_id, 'family_some', jsonb_build_object('n', done, 'total', total)) end,
      '/people'
    from lines
    where total >= 2 and done > 0
    returning 1
  )
  select count(*) into made from queued;
  return made;
end;
$$;

revoke all on function public.queue_family_summaries() from public;
revoke all on function public.queue_family_summaries() from anon;
revoke all on function public.queue_family_summaries() from authenticated;

-- Old rows are no use after a couple of nights.
create or replace function public.sweep_family_summary_sent()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (delete from public.family_summary_sent where night < current_date - 3 returning 1)
  select count(*)::integer from gone;
$$;
revoke all on function public.sweep_family_summary_sent() from public, anon, authenticated;

-- Every 15 minutes is enough to land inside each zone's 9pm hour; the
-- drain-push job sends what this queues.
select cron.unschedule('family-summary') where exists (select 1 from cron.job where jobname = 'family-summary');
select cron.schedule('family-summary', '*/15 * * * *', $cron$
  select public.queue_family_summaries();
  select public.sweep_family_summary_sent();
$cron$);
