-- Joining a family by code: see which family it is first, then join.
-- Run after people.sql (it replaces join_family) and friend-ids.sql.

-- Wrong codes typed, so nobody can walk through codes to find families.
create table if not exists public.family_code_misses (
  user_id uuid not null references auth.users on delete cascade,
  made_at timestamptz not null default now()
);

create index if not exists family_code_misses_user_idx on public.family_code_misses (user_id, made_at);

alter table public.family_code_misses enable row level security;
revoke all on public.family_code_misses from anon, authenticated;

-- Shared by the look-up and the join: 20 wrong codes a day.
create or replace function public.family_code_tries_left(who uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select (select count(*) from public.family_code_misses m
          where m.user_id = who and m.made_at > now() - interval '1 day') < 20;
$$;

revoke all on function public.family_code_tries_left(uuid) from public, anon, authenticated;

-- Which family a code belongs to, before joining. Name and how many people
-- are in it, nothing about who. A miss returns instead of raising, so the
-- miss row is kept and counts toward the limit.
create or replace function public.look_up_family(want_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  fam public.families;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if not public.family_code_tries_left(who) then
    raise exception 'too many tries';
  end if;
  select * into fam from public.families where code = upper(btrim(coalesce(want_code, '')));
  if fam is null then
    insert into public.family_code_misses (user_id) values (who);
    return jsonb_build_object('miss', 'nofamily');
  end if;
  return jsonb_build_object(
    'id', fam.id,
    'name', coalesce(fam.name, ''),
    'members', (select count(*) from public.family_members m where m.family_id = fam.id),
    'already', exists (select 1 from public.family_members m where m.family_id = fam.id and m.user_id = who)
  );
end;
$$;

revoke all on function public.look_up_family(text) from public, anon;
grant execute on function public.look_up_family(text) to authenticated;

-- Same join as before, now under the same wrong-code limit.
create or replace function public.join_family(want_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  fam uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if not public.family_code_tries_left(me) then
    raise exception 'too many tries';
  end if;
  select id into fam from public.families where code = upper(btrim(coalesce(want_code, '')));
  if fam is null then
    raise exception 'no family with that code';
  end if;
  insert into public.family_members (family_id, user_id, role)
  values (fam, me, 'kid')
  on conflict (family_id, user_id) do nothing;
  return fam;
end;
$$;

revoke all on function public.join_family(text) from public, anon;
grant execute on function public.join_family(text) to authenticated;
