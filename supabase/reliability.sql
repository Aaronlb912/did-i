-- Reliability: old phones drop off the list, and a small error log for
-- failed syncs and pushes. Runs after push.sql (see scripts/apply-all-sql.mjs).

-- Phones not seen for 90 days ------------------------------------------------
-- Every time a phone checks in, that account's phones not seen for 90 days
-- are removed in one delete. No loop, no cron.
create index if not exists devices_user_seen_idx
  on public.devices (user_id, last_seen_at);

create or replace function public.prune_stale_devices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.devices
  where user_id = new.user_id
    and last_seen_at < now() - interval '90 days';
  return null;
end;
$$;

revoke all on function public.prune_stale_devices() from public;
revoke all on function public.prune_stale_devices() from anon;
revoke all on function public.prune_stale_devices() from authenticated;

drop trigger if exists prune_stale_devices on public.devices;
create trigger prune_stale_devices
  after insert or update of last_seen_at on public.devices
  for each row execute function public.prune_stale_devices();

-- Error log ------------------------------------------------------------------
-- No personal content: what kind of thing failed, a short code, the app
-- version and platform. Phones insert their own rows; nobody reads them but
-- the service role.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade default auth.uid(),
  kind text not null,
  code text not null default '',
  app_version text not null default '',
  platform text not null default '',
  created_at timestamptz not null default now(),
  constraint app_errors_kind check (kind = any (array['sync', 'push'])),
  constraint app_errors_len check (
    length(code) <= 80 and length(app_version) <= 20 and length(platform) <= 20
  )
);

create index if not exists app_errors_user_idx on public.app_errors (user_id, created_at);

alter table public.app_errors enable row level security;

drop policy if exists "insert own errors" on public.app_errors;
create policy "insert own errors" on public.app_errors
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.app_errors from anon;
revoke all on public.app_errors from authenticated;
grant insert (kind, code, app_version, platform) on public.app_errors to authenticated;

-- At most 20 rows per person per hour from the phone. A phone stuck offline
-- should not fill the table. The service role (push function, no auth.uid())
-- writes one row per person and code per run instead.
create or replace function public.cap_app_errors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is not null and (
    select count(*) from public.app_errors
    where user_id = new.user_id and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'error log cap';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_app_errors() from public;
revoke all on function public.cap_app_errors() from anon;
revoke all on function public.cap_app_errors() from authenticated;

drop trigger if exists cap_app_errors on public.app_errors;
create trigger cap_app_errors
  before insert on public.app_errors
  for each row execute function public.cap_app_errors();
