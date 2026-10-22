-- The only person in a family can leave it; the empty family closes.
do $$
declare
  p uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, aud, role) values
    (p, p || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (p) on conflict (user_id) do nothing;
  insert into public.families (id, name, code, made_by) values (fam, 'Fam', 'TESTCODE02', p);
  insert into public.family_members (family_id, user_id, role) values (fam, p, 'parent');

  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.family_members where family_id = fam and user_id = p;
  execute 'reset role';
  set constraints all immediate;

  if exists (select 1 from public.families where id = fam) then
    raise exception 'FAIL: empty family still there';
  end if;
  raise exception 'SQL TESTS PASSED';
end $$;
