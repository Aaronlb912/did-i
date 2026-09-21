-- One-time fix: policies that still call auth.uid() bare per row.
-- Safe to run again. Does not touch functions beyond shares_family.

create or replace function public.shares_family(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  );
$$;

revoke all on function public.shares_family(uuid) from public;
grant execute on function public.shares_family(uuid) to authenticated;

drop policy if exists "read known profiles" on public.profiles;
create policy "read known profiles" on public.profiles
  for select using (
    (select auth.uid()) = user_id
    or public.are_friends(user_id)
    or public.shares_family(user_id)
  );

drop policy if exists "write own profile" on public.profiles;
create policy "write own profile" on public.profiles
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "see my links" on public.friend_links;
create policy "see my links" on public.friend_links
  for select using ((select auth.uid()) in (from_id, to_id));

drop policy if exists "ask a friend" on public.friend_links;
create policy "ask a friend" on public.friend_links
  for insert with check ((select auth.uid()) = from_id);

drop policy if exists "answer a link" on public.friend_links;
create policy "answer a link" on public.friend_links
  for update using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id);

drop policy if exists "drop a link" on public.friend_links;
create policy "drop a link" on public.friend_links
  for delete using ((select auth.uid()) in (from_id, to_id));

drop policy if exists "leave or remove" on public.family_members;
create policy "leave or remove" on public.family_members
  for delete using ((select auth.uid()) = user_id or public.is_parent(family_id));

drop policy if exists "add a family question" on public.family_lamps;
create policy "add a family question" on public.family_lamps
  for insert with check (
    (select auth.uid()) = made_by
    and (
      public.is_parent(family_id)
      or (public.in_family(family_id) and for_id = (select auth.uid()))
    )
  );

drop policy if exists "edit a family question" on public.family_lamps;
create policy "edit a family question" on public.family_lamps
  for update using (public.is_parent(family_id) or (select auth.uid()) = made_by)
  with check (public.is_parent(family_id) or (select auth.uid()) = made_by);

drop policy if exists "drop a family question" on public.family_lamps;
create policy "drop a family question" on public.family_lamps
  for delete using (public.is_parent(family_id) or (select auth.uid()) = made_by);

drop policy if exists "answer for yourself" on public.family_answers;
create policy "answer for yourself" on public.family_answers
  for all using ((select auth.uid()) = user_id and public.in_family(family_id))
  with check ((select auth.uid()) = user_id and public.in_family(family_id));

drop policy if exists "see my sends" on public.sends;
create policy "see my sends" on public.sends
  for select using ((select auth.uid()) in (from_id, to_id));

drop policy if exists "send to a friend" on public.sends;
create policy "send to a friend" on public.sends
  for insert with check ((select auth.uid()) = from_id and public.are_friends(to_id));

drop policy if exists "keep or pass a send" on public.sends;
create policy "keep or pass a send" on public.sends
  for update using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id);

drop policy if exists "take back a send" on public.sends;
create policy "take back a send" on public.sends
  for delete using ((select auth.uid()) in (from_id, to_id));
