-- Newest store version per platform, read by the phone app to offer an
-- update. Run after friend-ids.sql. Only the dashboard (service role) writes.

create table if not exists public.app_versions (
  platform text primary key,
  latest text not null,
  minimum text not null default '1.0.0',
  updated_at timestamptz not null default now(),
  constraint app_versions_platform check (platform in ('ios', 'android')),
  constraint app_versions_latest_shape check (latest ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$'),
  constraint app_versions_minimum_shape check (minimum ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$')
);

alter table public.app_versions enable row level security;
revoke all on public.app_versions from anon, authenticated;
grant select on public.app_versions to anon, authenticated;

drop policy if exists "read app versions" on public.app_versions;
create policy "read app versions" on public.app_versions
  for select to anon, authenticated
  using (true);

insert into public.app_versions (platform, latest, minimum)
values ('ios', '1.2.0', '1.0.0'), ('android', '1.2.0', '1.0.0')
on conflict (platform) do nothing;
