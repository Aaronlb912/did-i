-- Phones on Account > Sync and phones: the model the app reports when it
-- checks in ("Pixel 8 · Android 15") and a name the owner picks. Run after
-- schema.sql and hardening.sql. Rows stay under "own devices" (owner only).

alter table public.devices add column if not exists model text not null default '';
alter table public.devices add column if not exists name text not null default '';

alter table public.devices drop constraint if exists devices_model_len;
alter table public.devices add constraint devices_model_len check (length(model) <= 80);

-- The rename sheet caps at 40; the server holds the same line.
alter table public.devices drop constraint if exists devices_name_len;
alter table public.devices add constraint devices_name_len check (length(name) <= 40);

drop policy if exists "own devices" on public.devices;
create policy "own devices" on public.devices
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
