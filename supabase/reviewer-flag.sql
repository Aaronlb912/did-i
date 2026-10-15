-- App Review switch: reviewer sign-in shows only while this is on.
-- Run after readthrough-12.sql. Only the service role (dashboard / SQL
-- editor) writes. Turn on before Submit for Review, off after approval:
--   update public.app_flags set on_now = true,  updated_at = now() where name = 'reviewer_signin';
--   update public.app_flags set on_now = false, updated_at = now() where name = 'reviewer_signin';

create table if not exists public.app_flags (
  name text primary key,
  on_now boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint app_flags_name check (name in ('reviewer_signin'))
);

alter table public.app_flags enable row level security;
-- No policies and no grants: apps read through the function below only.
revoke all on public.app_flags from anon, authenticated;

insert into public.app_flags (name, on_now)
values ('reviewer_signin', false)
on conflict (name) do nothing;

create or replace function public.reviewer_signin_on()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select f.on_now from public.app_flags f where f.name = 'reviewer_signin'),
    false
  )
$$;

revoke all on function public.reviewer_signin_on() from public;
grant execute on function public.reviewer_signin_on() to anon, authenticated;
