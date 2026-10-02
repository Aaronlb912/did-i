-- Did I, part seven. Did I tonight: the public list of who showed up.
-- Run after blocks.sql. Safe to run again.
--
-- Nothing here is on by default. A person has to turn public_tonight on
-- before anybody outside their friends and family can see them, and
-- turning it off takes their shared lines down with it.
--
-- Reads never touch the profiles table directly. They go through
-- tonight_wall(), which is checked once per call instead of once per row.

-- 1. The switch --------------------------------------------------------

alter table public.profiles
  add column if not exists public_tonight boolean not null default false;

-- The only shape the list asks for: opted in, finished on this night.
create index if not exists profiles_tonight_idx
  on public.profiles (done_on desc) where public_tonight;

-- 2. A line somebody chose to show ------------------------------------

create table if not exists public.tonight (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  night date not null,
  label text not null,
  made_at timestamptz not null default now()
);

alter table public.tonight drop constraint if exists tonight_label_len;
alter table public.tonight add constraint tonight_label_len
  check (length(btrim(label)) between 1 and 60);

create index if not exists tonight_who_idx on public.tonight (user_id, night);
create index if not exists tonight_night_idx on public.tonight (night, made_at);

-- The same thing twice reads as a mistake, not as two things done.
create unique index if not exists tonight_no_repeat
  on public.tonight (user_id, night, lower(btrim(label)));

-- Three lines a night. Enough to say what you did, not enough to a wall
-- of one person.
create or replace function public.cap_tonight()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.tonight
      where user_id = new.user_id and night = new.night) >= 3 then
    raise exception 'three a night';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_tonight on public.tonight;
create trigger cap_tonight
  before insert on public.tonight
  for each row execute function public.cap_tonight();

alter table public.tonight enable row level security;
revoke all on public.tonight from anon;

-- Own rows only. Everybody else reads through tonight_wall().
drop policy if exists "own tonight lines" on public.tonight;
create policy "own tonight lines" on public.tonight
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. A cheer, which is a tally and not a message ----------------------

create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  night date not null,
  made_at timestamptz not null default now(),
  constraint cheers_not_self check (from_id <> to_id)
);

-- One cheer per person per night is the cap. No trigger needed.
create unique index if not exists cheers_once
  on public.cheers (from_id, to_id, night);

create index if not exists cheers_to_idx on public.cheers (to_id, night);

alter table public.cheers enable row level security;
revoke all on public.cheers from anon;
revoke insert, update, delete on public.cheers from authenticated;

-- You can see the ones you sent. Counts for everybody else arrive with
-- the list. Writing goes through cheer_on(), which checks the target is
-- actually on the list.
drop policy if exists "see my cheers" on public.cheers;
create policy "see my cheers" on public.cheers
  for select using ((select auth.uid()) in (from_id, to_id));

-- 4. Reporting a line -------------------------------------------------
--
-- A line is text a stranger typed, so it needs a way down that does not
-- wait for somebody to read a table. Two different people reporting one
-- takes it off everybody's screen. The report rows stay for review.

-- Set null, not cascade: the nightly sweep drops old lines, and the
-- report has to outlive the thing it was about.
alter table public.reports
  add column if not exists line_id uuid references public.tonight on delete set null;

create index if not exists reports_line_idx on public.reports (line_id)
  where line_id is not null;

-- One report each, so one person cannot bury a line on their own.
create unique index if not exists reports_line_once
  on public.reports (from_id, line_id) where line_id is not null;

create or replace function public.report_tonight(line uuid, why text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  owner uuid;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  select user_id into owner from public.tonight where id = line;
  if owner is null or owner = who then
    return;
  end if;
  -- Bare, not a column list: the index behind it is partial, and Postgres
  -- will not infer a partial index as an arbiter from column names.
  insert into public.reports (from_id, about_id, line_id, reason)
  values (who, owner, line, left(coalesce(why, ''), 500))
  on conflict do nothing;
end;
$$;

revoke all on function public.report_tonight(uuid, text) from public;
revoke all on function public.report_tonight(uuid, text) from anon;
grant execute on function public.report_tonight(uuid, text) to authenticated;

-- 5. Reading the list -------------------------------------------------

create or replace function public.tonight_wall(wanted date)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  streak integer,
  lines jsonb,
  cheers integer,
  cheered boolean,
  you boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  -- One pass over blocks instead of a check per candidate row.
  hidden as (
    select b.blocked as who from public.blocks b where b.blocker = (select id from me)
    union
    select b.blocker as who from public.blocks b where b.blocked = (select id from me)
  ),
  folks as (
    select p.user_id, p.handle, p.display_name, p.streak
    from public.profiles p
    where p.public_tonight
      and p.done_on = wanted
      and p.user_id not in (select who from hidden)
    order by p.streak desc, p.user_id
    limit 50
  )
  select
    f.user_id,
    f.handle,
    f.display_name,
    f.streak,
    -- Two people reporting a line is enough to take it down. Your own
    -- lines stay visible to you so you know what is still up.
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.label) order by w.made_at)
       from public.tonight w
       where w.user_id = f.user_id
         and w.night = wanted
         and (
           f.user_id = (select id from me)
           or (select count(*) from public.reports r where r.line_id = w.id) < 2
         )),
      '[]'::jsonb
    ) as lines,
    coalesce(
      (select count(*) from public.cheers c
       where c.to_id = f.user_id and c.night = wanted),
      0
    )::integer as cheers,
    exists (
      select 1 from public.cheers c
      where c.to_id = f.user_id and c.night = wanted
        and c.from_id = (select id from me)
    ) as cheered,
    f.user_id = (select id from me) as you
  from folks f;
$$;

revoke all on function public.tonight_wall(date) from public;
revoke all on function public.tonight_wall(date) from anon;
grant execute on function public.tonight_wall(date) to authenticated;

-- How many showed up, which the capped list cannot tell you on its own.
create or replace function public.tonight_tally(wanted date)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::integer
  from public.profiles p
  where p.public_tonight and p.done_on = wanted;
$$;

revoke all on function public.tonight_tally(date) from public;
revoke all on function public.tonight_tally(date) from anon;
grant execute on function public.tonight_tally(date) to authenticated;

-- 6. Writing ----------------------------------------------------------

-- Turning the switch off takes the shared lines with it, so nothing of
-- yours is left sitting on somebody else's screen.
create or replace function public.set_public_tonight(on_it boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  insert into public.profiles (user_id, public_tonight, updated_at)
  values (who, coalesce(on_it, false), now())
  on conflict (user_id) do update
    set public_tonight = coalesce(on_it, false), updated_at = now();
  if not coalesce(on_it, false) then
    delete from public.tonight where user_id = who;
  end if;
end;
$$;

revoke all on function public.set_public_tonight(boolean) from public;
revoke all on function public.set_public_tonight(boolean) from anon;
grant execute on function public.set_public_tonight(boolean) to authenticated;

create or replace function public.cheer_on(other uuid, wanted date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  fresh boolean;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other = who then
    return false;
  end if;
  if public.blocked_with(other) then
    return false;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.user_id = other and p.public_tonight and p.done_on = wanted
  ) then
    return false;
  end if;
  insert into public.cheers (from_id, to_id, night)
  values (who, other, wanted)
  on conflict (from_id, to_id, night) do nothing;
  fresh := found;
  return fresh;
end;
$$;

revoke all on function public.cheer_on(uuid, date) from public;
revoke all on function public.cheer_on(uuid, date) from anon;
grant execute on function public.cheer_on(uuid, date) to authenticated;

-- 7. A cheer that actually reaches the phone --------------------------
--
-- The person is already on a public list under this name, so naming the
-- cheerer gives nothing away. One cheer per person per night is the cap,
-- so this cannot turn into a stream.

create or replace function public.queue_cheer_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  if not public.push_wanted(new.to_id, 'cheers') then
    return new;
  end if;
  select coalesce(nullif(p.display_name, ''), '@' || coalesce(p.handle, ''), 'Someone')
  into who
  from public.profiles p where p.user_id = new.from_id;

  insert into public.push_queue (to_id, title, body, go)
  values (new.to_id, coalesce(who, public.push_text(new.to_id, 'someone')), public.push_text(new.to_id, 'cheered'), '/everyone');
  return new;
end;
$$;

-- Only if push is already live. The list works without this.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'push_queue'
  ) then
    drop trigger if exists queue_cheer_push on public.cheers;
    create trigger queue_cheer_push
      after insert on public.cheers
      for each row execute function public.queue_cheer_push();
  end if;
end $$;

-- 8. Housekeeping ------------------------------------------------------

-- Nobody looks at last month's list. Schedule alongside the push sweep.
create or replace function public.sweep_tonight()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  gone integer;
begin
  delete from public.tonight where night < current_date - 14;
  get diagnostics gone = row_count;
  delete from public.cheers where night < current_date - 14;
  return gone;
end;
$$;

revoke all on function public.sweep_tonight() from public;
revoke all on function public.sweep_tonight() from anon;
revoke all on function public.sweep_tonight() from authenticated;

-- Account deletion has to reach the new tables too.
create or replace function public.delete_me()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  delete from public.tonight where user_id = me;
  delete from public.cheers where from_id = me or to_id = me;
  delete from public.shelves where user_id = me;
  delete from public.profiles where user_id = me;
  delete from public.devices where user_id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;

-- PostgREST picks up new functions on its own, but not always right away.
notify pgrst, 'reload schema';
