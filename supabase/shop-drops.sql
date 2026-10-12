-- One push the morning a shop drop goes live, for people who asked for it.
-- Run after push.sql. Safe to run again.
--
-- The switch is prefs.dropPings (off by default, set in the app's Shop as
-- "Tell me when a drop goes live"). Drop dates mirror the `from` dates in
-- src/lib/purse.js; scripts/check.mjs fails if one is missing here.

create table if not exists public.shop_drop_days (
  day date primary key
);
alter table public.shop_drop_days enable row level security;
drop policy if exists shop_drop_days_none on public.shop_drop_days;
create policy shop_drop_days_none on public.shop_drop_days
  for all to authenticated using (false) with check (false);
revoke all on public.shop_drop_days from anon, authenticated;

insert into public.shop_drop_days (day) values
  ('2026-10-09'),
  ('2026-10-23'),
  ('2026-11-06'),
  ('2026-11-20')
on conflict do nothing;

-- One row per person per drop: the cap, so a rerun never sends twice.
create table if not exists public.shop_drop_sent (
  user_id uuid not null references auth.users on delete cascade,
  day date not null references public.shop_drop_days on delete cascade,
  primary key (user_id, day)
);
create index if not exists shop_drop_sent_day_idx on public.shop_drop_sent (day);
alter table public.shop_drop_sent enable row level security;
drop policy if exists shop_drop_sent_none on public.shop_drop_sent;
create policy shop_drop_sent_none on public.shop_drop_sent
  for all to authenticated using (false) with check (false);
revoke all on public.shop_drop_sent from anon, authenticated;

-- People whose own clock is in the 9am hour of a drop day, who turned the
-- switch on and have a phone to push to. One batched insert for everyone due.
create or replace function public.queue_drop_pushes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  made integer := 0;
begin
  with due as (
    select p.user_id, (now() at time zone p.zone)::date as day
    from public.profiles p
    where p.zone <> ''
      and p.zone in (select name from pg_timezone_names)
      and (p.prefs ->> 'dropPings') = 'true'
      and extract(hour from now() at time zone p.zone) = 9
      and (now() at time zone p.zone)::date in (select d.day from public.shop_drop_days d)
      and exists (select 1 from public.devices d where d.user_id = p.user_id and d.push_token is not null)
  ),
  marked as (
    insert into public.shop_drop_sent (user_id, day)
    select user_id, day from due
    on conflict do nothing
    returning user_id
  ),
  queued as (
    insert into public.push_queue (to_id, body, go)
    select user_id, left(public.push_text(user_id, 'drop_live'), 200), '/shop'
    from marked
    returning 1
  )
  select count(*) into made from queued;
  return made;
end;
$$;

revoke all on function public.queue_drop_pushes() from public, anon, authenticated;

-- Every 15 minutes lands inside each zone's 9am hour; drain-push sends it.
select cron.unschedule('shop-drop-push') where exists (select 1 from cron.job where jobname = 'shop-drop-push');
select cron.schedule('shop-drop-push', '*/15 * * * *', $cron$
  select public.queue_drop_pushes();
$cron$);
