-- Checks that only a family parent can change a member from kid to adult:
-- a kid cannot change their own role or another kid's, a parent can, and the
-- Did we kid rule lifts for the member once they are an adult. No new SQL:
-- this covers "parents set roles" (people.sql) and the update (role) grant
-- (readthrough-7.sql).
--
-- Run with: node scripts/test-sql.mjs supabase/tests/family-kid-switch.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  k uuid := gen_random_uuid();
  j uuid := gen_random_uuid();
  f uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  card uuid;
  st text;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (k, k || '@test.invalid', 'authenticated', 'authenticated'),
    (j, j || '@test.invalid', 'authenticated', 'authenticated'),
    (f, f || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (k, 'Kit'), (j, 'Jo'), (f, 'Fay')
  on conflict (user_id) do update set display_name = excluded.display_name;
  -- a is the parent; k and j joined as kids; f is k's friend, not family.
  insert into public.friend_links (from_id, to_id, state) values (k, f, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role)
  values (fam, a, 'parent'), (fam, k, 'kid'), (fam, j, 'kid');

  -- A kid cannot change their own role or another kid's ----------------------
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.family_members set role = 'parent' where family_id = fam and user_id = k;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a kid changed their own role'; end if;
  update public.family_members set role = 'parent' where family_id = fam and user_id = j;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a kid changed another kid''s role'; end if;
  -- A kid's card with a non-family friend is refused.
  begin
    perform public.we_make('Did we read?', 'all', 'waiting', 'daily', '{}', null, array[f]);
    raise exception 'FAIL: a kid made a card with a non-family friend';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'kid card is family only' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  execute 'reset role';
  select role into st from public.family_members where family_id = fam and user_id = k;
  if st <> 'kid' then raise exception 'FAIL: role changed to % without a parent', st; end if;

  -- The parent changes the kid to an adult ------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.family_members set role = 'parent' where family_id = fam and user_id = k;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the parent could not change a kid to an adult'; end if;
  execute 'reset role';

  -- Now the same card with a friend goes through ------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we read?', 'all', 'waiting', 'daily', '{}', null, array[f]);
  if card is null then raise exception 'FAIL: an adult could not make a card with a friend'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
