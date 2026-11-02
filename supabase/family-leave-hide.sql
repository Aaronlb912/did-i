-- Someone who leaves a family, or is removed, takes their answers with them
-- from the family's view. The rows stay (rejoining brings them back), but a
-- member only sees answers from people still in the family, plus their own.
-- An ex-member also can no longer drop family questions they made.

create or replace function public.still_in_family(fam uuid, who uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fam and user_id = who
  );
$$;

revoke all on function public.still_in_family(uuid, uuid) from public, anon;
grant execute on function public.still_in_family(uuid, uuid) to authenticated;

drop policy if exists "see family answers" on public.family_answers;
create policy "see family answers" on public.family_answers
  for select using (public.in_family(family_id) and public.still_in_family(family_id, user_id));

drop policy if exists "drop a family question" on public.family_lamps;
create policy "drop a family question" on public.family_lamps
  for delete using (public.in_family(family_id) and (public.is_parent(family_id) or (select auth.uid()) = made_by));
