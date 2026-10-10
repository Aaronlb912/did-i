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
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_me() from public;
revoke all on function public.delete_me() from anon;
grant execute on function public.delete_me() to authenticated;

notify pgrst, 'reload schema';
