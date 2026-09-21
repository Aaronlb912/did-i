-- Did I, part five. Stopping one person.
-- Run after people.sql and hardening.sql. Safe to run again.
--
-- A block is one sided and quiet. The other person is not told. They can
-- still open their app; they simply cannot reach you, and you stop seeing
-- them. Blocking also tears down whatever is already between you, so
-- there is no leftover friendship or waiting nudge.

create table if not exists public.blocks (
  blocker uuid not null references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  made_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked);

alter table public.blocks enable row level security;

drop policy if exists "see my blocks" on public.blocks;
create policy "see my blocks" on public.blocks
  for select using ((select auth.uid()) = blocker);

drop policy if exists "block someone" on public.blocks;
create policy "block someone" on public.blocks
  for insert with check ((select auth.uid()) = blocker);

drop policy if exists "unblock someone" on public.blocks;
create policy "unblock someone" on public.blocks
  for delete using ((select auth.uid()) = blocker);

revoke all on public.blocks from anon;

-- A report is a record. It does not do anything on its own, and it is
-- deliberately not readable by the person who filed it, so nobody can
-- use it to check whether someone is still around.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references auth.users on delete set null,
  about_id uuid references auth.users on delete set null,
  reason text not null default '',
  made_at timestamptz not null default now()
);

create index if not exists reports_about_idx on public.reports (about_id, made_at desc);
create index if not exists reports_from_idx on public.reports (from_id);

alter table public.reports enable row level security;

drop policy if exists "file a report" on public.reports;
create policy "file a report" on public.reports
  for insert with check ((select auth.uid()) = from_id);

revoke all on public.reports from anon;

alter table public.reports drop constraint if exists reports_reason_len;
alter table public.reports add constraint reports_reason_len check (length(reason) <= 500);

-- Blocked either way means not friends, which closes sends as well,
-- because sending already required being friends.
create or replace function public.blocked_with(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = (select auth.uid()) and blocked = other)
       or (blocker = other and blocked = (select auth.uid()))
  );
$$;

revoke all on function public.blocked_with(uuid) from public;
grant execute on function public.blocked_with(uuid) to authenticated;

create or replace function public.are_friends(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friend_links
    where state = 'ok'
      and ((from_id = (select auth.uid()) and to_id = other)
        or (from_id = other and to_id = (select auth.uid())))
  ) and not public.blocked_with(other);
$$;

-- You cannot ask someone who blocked you, and they cannot ask you.
drop policy if exists "ask a friend" on public.friend_links;
create policy "ask a friend" on public.friend_links
  for insert with check (
    (select auth.uid()) = from_id and not public.blocked_with(to_id)
  );

-- A blocked person drops out of every list you read.
drop function if exists public.known_people();

create or replace function public.known_people()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  share_streak boolean,
  streak integer,
  done_on date
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select case when l.from_id = (select id from me) then l.to_id else l.from_id end as who
    from public.friend_links l
    where l.state = 'ok' and (select id from me) in (l.from_id, l.to_id)
    union
    select theirs.user_id
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select id from me)
  )
  select p.user_id, p.handle, p.display_name, p.share_streak, p.streak, p.done_on
  from public.profiles p
  join mine on mine.who = p.user_id
  where p.user_id <> (select id from me)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = (select id from me) and b.blocked = p.user_id)
         or (b.blocker = p.user_id and b.blocked = (select id from me))
    );
$$;

-- Someone you blocked should not be findable by handle either.
create or replace function public.find_handle(wanted text)
returns table (user_id uuid, handle text, display_name text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, p.handle, p.display_name
  from public.profiles p
  where p.handle is not null
    and lower(p.handle) = lower(btrim(wanted))
    and p.user_id <> (select auth.uid())
    and not public.blocked_with(p.user_id)
  limit 1;
$$;

-- Block, and clear out what is already between you.
create or replace function public.block_person(other uuid, why text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if other = me then
    raise exception 'you cannot block yourself';
  end if;

  insert into public.blocks (blocker, blocked) values (me, other)
  on conflict do nothing;

  delete from public.friend_links
  where (from_id = me and to_id = other) or (from_id = other and to_id = me);

  delete from public.sends
  where state = 'sent'
    and ((from_id = me and to_id = other) or (from_id = other and to_id = me));

  if btrim(coalesce(why, '')) <> '' then
    insert into public.reports (from_id, about_id, reason) values (me, other, left(why, 500));
  end if;
end;
$$;

create or replace function public.unblock_person(other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.blocks
  where blocker = (select auth.uid()) and blocked = other;
end;
$$;

-- The list, with enough to recognise who it is.
create or replace function public.my_blocks()
returns table (user_id uuid, handle text, display_name text, made_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select b.blocked, p.handle, p.display_name, b.made_at
  from public.blocks b
  left join public.profiles p on p.user_id = b.blocked
  where b.blocker = (select auth.uid())
  order by b.made_at desc;
$$;

revoke all on function public.block_person(uuid, text) from public;
revoke all on function public.unblock_person(uuid) from public;
revoke all on function public.my_blocks() from public;
grant execute on function public.block_person(uuid, text) to authenticated;
grant execute on function public.unblock_person(uuid) to authenticated;
grant execute on function public.my_blocks() to authenticated;
