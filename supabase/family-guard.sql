-- Family guards.
-- 1. A parent removing someone also changes the family code, so the removed
--    person cannot join again with the code they already had.
-- 2. A family holds at most 20 people, so a leaked code cannot fill it.
-- 3. "Last done by" on a shared question only names people still in the family.

create or replace function public.family_code_on_remove()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if who is not null and old.user_id <> who then
    update public.families set code = public.new_family_code() where id = old.family_id;
  end if;
  return old;
end;
$$;

revoke all on function public.family_code_on_remove() from public, anon, authenticated;

drop trigger if exists family_code_on_remove on public.family_members;
create trigger family_code_on_remove
  after delete on public.family_members
  for each row execute function public.family_code_on_remove();

create or replace function public.family_size_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.families where id = new.family_id for update;
  if (select count(*) from public.family_members m where m.family_id = new.family_id) >= 20 then
    raise exception 'too many people';
  end if;
  return new;
end;
$$;

revoke all on function public.family_size_cap() from public, anon, authenticated;

drop trigger if exists family_size_cap on public.family_members;
create trigger family_size_cap
  before insert on public.family_members
  for each row execute function public.family_size_cap();

create or replace function public.family_every_last(lamps uuid[])
returns table (lamp_id uuid, last_on text, last_by uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (a.lamp_id) a.lamp_id, a.period_key, a.user_id
  from public.family_answers a
  join public.family_lamps l on l.id = a.lamp_id
  where a.lamp_id = any (lamps[1:200])
    and l.cadence = 'every'
    and public.in_family(l.family_id)
    and a.family_id = l.family_id
    and a.status in ('yes', 'late')
    and exists (select 1 from public.family_members m where m.family_id = l.family_id and m.user_id = a.user_id)
  order by a.lamp_id, a.period_key desc, a.answered_at desc;
$$;

revoke all on function public.family_every_last(uuid[]) from public, anon;
grant execute on function public.family_every_last(uuid[]) to authenticated;
