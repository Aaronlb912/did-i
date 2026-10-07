-- Anonymous usage milestones, to see where new people stop (first swipe,
-- night 3, night 7...). One row per install per milestone. No questions,
-- answers, names or account ids: install_id is a random id made on the phone.
-- Phones write only through note_milestone(); nobody can read the table but
-- the dashboard (service role). Run after friend-notes.sql.

create table if not exists public.milestones (
  install_id text not null,
  event text not null,
  platform text not null default '',
  version text not null default '',
  made_on date not null default (timezone('utc', now()))::date,
  made_at timestamptz not null default now(),
  primary key (install_id, event),
  constraint milestones_install_shape check (install_id ~ '^[a-z0-9]{16,40}$'),
  constraint milestones_event check (event in (
    'opened', 'added_first', 'first_swipe', 'night_1', 'night_3', 'night_7', 'night_14',
    'bought', 'friend', 'widget_used'
  )),
  constraint milestones_platform check (platform in ('', 'ios', 'android', 'web')),
  constraint milestones_version_len check (length(version) <= 20)
);

create index if not exists milestones_made_at_idx on public.milestones (made_at);

alter table public.milestones enable row level security;
revoke all on public.milestones from anon, authenticated;

-- The only way in. A repeat is ignored (one row per install and event), and
-- a day's total is capped so a script cannot flood the table.
create or replace function public.note_milestone(p_install text, p_event text, p_platform text, p_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.milestones where made_at > now() - interval '1 day') >= 50000 then
    return;
  end if;
  insert into public.milestones (install_id, event, platform, version)
  values (p_install, p_event, coalesce(p_platform, ''), left(coalesce(p_version, ''), 20))
  on conflict (install_id, event) do nothing;
end;
$$;

revoke all on function public.note_milestone(text, text, text, text) from public;
grant execute on function public.note_milestone(text, text, text, text) to anon, authenticated;

-- The funnel: how many installs reached each step, and the share of the
-- ones that opened. Dashboard only: select * from milestone_funnel();
-- A function, not a view, so it has no writable columns.
drop view if exists public.milestone_funnel;
create or replace function public.milestone_funnel()
returns table (step text, installs bigint, pct_of_opened numeric)
language sql
stable
security definer
set search_path = public
as $$
  select m.event, count(*),
    round(100.0 * count(*) / nullif((select count(*) from public.milestones where event = 'opened'), 0), 1)
  from public.milestones m
  group by m.event
  order by array_position(array['opened', 'added_first', 'first_swipe', 'night_1', 'night_3', 'night_7', 'night_14', 'widget_used', 'friend', 'bought'], m.event);
$$;

revoke all on function public.milestone_funnel() from public, anon, authenticated;
