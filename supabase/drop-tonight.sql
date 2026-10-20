-- Drop the old public "Did I tonight" list. The app stopped using it on
-- 2026-09-26; tonight.sql and dit-board.sql are gone from the repo.
-- Run last in db:apply:all. Safe to run again.
--
-- Not applied by hand yet. reports.line_id stays as a plain column: the
-- report rows outlive the lines they were about, and only the foreign key
-- to public.tonight goes with the table.

-- 1. Functions that read or write the old tables ----------------------

drop function if exists public.tonight_wall(date);
drop function if exists public.tonight_tally(date);
drop function if exists public.sync_tonight(date, text[]);
drop function if exists public.set_public_tonight(boolean);
drop function if exists public.cheer_on(uuid, date);
drop function if exists public.report_tonight(uuid, text);
drop function if exists public.sweep_tonight();

-- If the nightly sweep was scheduled, unschedule it before it fails.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid) from cron.job where command ilike '%sweep_tonight%';
  end if;
end $$;

-- 2. The tables, their triggers and their trigger functions ----------

drop table if exists public.tonight cascade;
drop table if exists public.cheers cascade;
drop function if exists public.cap_tonight();
drop function if exists public.queue_cheer_push();

-- 3. The opt-in switch on profiles -----------------------------------

drop index if exists public.profiles_tonight_idx;
alter table public.profiles drop column if exists public_tonight;

-- 4. Account deletion -------------------------------------------------
--
-- tonight.sql used to own delete_me(), and it ran after people.sql, so its
-- copy (which cleared the old tables but skipped the family hand-off) was
-- the live one. This is people.sql's version back, without the old tables.
-- Everything else cascades from auth.users.

create or replace function public.delete_me()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := (select auth.uid());
  fam uuid;
  heir uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  -- Gifts waiting for you go back to whoever paid for them.
  with back as (
    update public.cheer_gifts g
    set returned_at = now()
    where g.to_id = me and g.claimed_at is null and g.returned_at is null
      and g.from_id is not null and g.from_id <> me
    returning g.from_id, g.gems, g.coins
  )
  update public.profiles p
  set gem_balance = least(p.gem_balance + s.gems, 999999),
      coin_balance = least(p.coin_balance + s.coins, 999999)
  from (select from_id, sum(gems) as gems, sum(coins) as coins from back group by from_id) s
  where p.user_id = s.from_id;
  -- Hand each family to somebody else, or close it if you were the only one.
  for fam in
    select family_id from public.family_members where user_id = me and role = 'parent'
  loop
    select user_id into heir
    from public.family_members
    where family_id = fam and user_id <> me
    order by role = 'parent' desc, joined_at
    limit 1;
    if heir is null then
      delete from public.families where id = fam;
    else
      update public.family_members set role = 'parent'
      where family_id = fam and user_id = heir;
    end if;
  end loop;
  delete from public.family_members where user_id = me;
  delete from public.shelves where user_id = me;
  delete from public.profiles where user_id = me;
  delete from public.devices where user_id = me;
  -- Photo files stay public until removed. Supabase may block direct deletes
  -- on storage.objects (storage.protect_delete); then the app's Storage API
  -- call is the only way, so a refusal here must not stop the account delete.
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
    where bucket_id = 'avatars' and (storage.foldername(name))[1] = me::text;
  exception when others then
    raise warning 'delete_me: avatar files left for %: %', me, sqlerrm;
  end;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_me() from public;
revoke all on function public.delete_me() from anon;
grant execute on function public.delete_me() to authenticated;

notify pgrst, 'reload schema';
