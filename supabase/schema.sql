-- Did I. Run this once in the Supabase SQL editor.
-- One row per person for the shelf, the profile, and one row per phone.

create table if not exists public.shelves (
  user_id uuid primary key references auth.users on delete cascade,
  doc jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  look_on text not null default 'lime',
  badge_cheer text not null default 'lime',
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  user_id uuid not null references auth.users on delete cascade,
  device_key text not null,
  label text not null default '',
  platform text not null default '',
  last_seen_at timestamptz not null default now(),
  primary key (user_id, device_key)
);

alter table public.shelves enable row level security;
alter table public.profiles enable row level security;
alter table public.devices enable row level security;

drop policy if exists "own shelf" on public.shelves;
create policy "own shelf" on public.shelves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own devices" on public.devices;
create policy "own devices" on public.devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Delete my account. Runs as the table owner so it can reach auth.users,
-- but it only ever deletes the caller.
create or replace function public.delete_me()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  delete from public.shelves where user_id = me;
  delete from public.profiles where user_id = me;
  delete from public.devices where user_id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;
