-- A non-parent could add a question for themselves, then edit for_id to put
-- it on a sibling's day. Only a parent moves a family question onto someone
-- else now. Checked here and not in the policy, so a maker can still edit or
-- remove an old question whose for_id they did not set (null, or set while
-- they were a parent). Replaces family_lamps_block_guard in readthrough-12.sql.
create or replace function public.family_lamps_block_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.for_id is distinct from old.for_id and new.for_id is not null
     and public.blocked_with(new.for_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  if new.for_id is distinct from old.for_id
     and (select auth.uid()) is not null
     and new.for_id is distinct from (select auth.uid())
     and not public.is_parent(new.family_id) then
    raise exception 'only a parent assigns a family question' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.family_lamps_block_guard() from public, anon, authenticated;
