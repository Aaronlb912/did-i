-- Did yous that skip the inbox and land on tonight.
--
-- Family: always. A friend: only once the person getting them says that
-- friend can add to their tonight. The switch lives here, one row per
-- friend, and only its owner can read or change it. The sender is never
-- told whether the switch is on.
--
-- Apply after blocks.sql and friend-cheers.sql.

create table if not exists public.auto_adds (
  owner_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  made_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  check (owner_id <> friend_id)
);

create index if not exists auto_adds_friend_idx on public.auto_adds (friend_id);

alter table public.auto_adds enable row level security;
revoke all on public.auto_adds from anon;

drop policy if exists "see my auto adds" on public.auto_adds;
create policy "see my auto adds" on public.auto_adds
  for select using ((select auth.uid()) = owner_id);

drop policy if exists "let a friend add" on public.auto_adds;
create policy "let a friend add" on public.auto_adds
  for insert with check ((select auth.uid()) = owner_id and public.are_friends(friend_id));

drop policy if exists "stop a friend adding" on public.auto_adds;
create policy "stop a friend adding" on public.auto_adds
  for delete using ((select auth.uid()) = owner_id);

-- A switch per friend. Friends are capped well under this already.
create or replace function public.cap_auto_adds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  held integer;
begin
  select count(*) into held from public.auto_adds where owner_id = new.owner_id;
  if held >= 200 then
    raise exception 'too many auto adds';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_auto_adds on public.auto_adds;
create trigger cap_auto_adds
  before insert on public.auto_adds
  for each row execute function public.cap_auto_adds();

-- Someone in your family can send you a did you too, not only a friend.
-- Blocking still closes it.
drop policy if exists "send to a friend" on public.sends;
create policy "send to a friend" on public.sends
  for insert with check (
    (select auth.uid()) = from_id
    and (public.are_friends(to_id) or (public.shares_family(to_id) and not public.blocked_with(to_id)))
  );

-- Marks every waiting did you that is allowed straight onto tonight as
-- kept, and hands back what to add. Writes nothing when nothing is owed.
-- did-you-repeat.sql later widens what this returns; drop first so a full
-- re-apply in order does not stop here.
drop function if exists public.claim_auto_sends();
create function public.claim_auto_sends()
returns table (send_id uuid, sender_id uuid, question text, note text, from_family boolean)
language sql
security definer
set search_path = public
as $$
  update public.sends s
  set state = 'kept'
  where s.to_id = (select auth.uid())
    and s.state = 'sent'
    and s.kind = 'todo'
    and not public.blocked_with(s.from_id)
    and (
      public.shares_family(s.from_id)
      or (
        public.are_friends(s.from_id)
        and exists (
          select 1 from public.auto_adds a
          where a.owner_id = s.to_id and a.friend_id = s.from_id
        )
      )
    )
  returning s.id, s.from_id, s.question, s.note, public.shares_family(s.from_id);
$$;

revoke all on function public.claim_auto_sends() from public;
revoke all on function public.claim_auto_sends() from anon;
grant execute on function public.claim_auto_sends() to authenticated;

-- Dropping or blocking a friend takes their switch with it.
create or replace function public.drop_auto_add()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.auto_adds
  where (owner_id = old.from_id and friend_id = old.to_id)
     or (owner_id = old.to_id and friend_id = old.from_id);
  return old;
end;
$$;

drop trigger if exists drop_auto_add on public.friend_links;
create trigger drop_auto_add
  after delete on public.friend_links
  for each row execute function public.drop_auto_add();
