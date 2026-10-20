-- A parent removing a kid changes the code; the kid cannot rejoin with the old one.
do $$
declare
  p uuid := gen_random_uuid();
  k uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  old_code text := 'TESTCODE01';
begin
  insert into auth.users (id, email, aud, role) values
    (p, p || '@test.invalid', 'authenticated', 'authenticated'),
    (k, k || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (p), (k) on conflict (user_id) do nothing;
  insert into public.families (id, name, code, made_by) values (fam, 'Fam', old_code, p);
  insert into public.family_members (family_id, user_id, role) values (fam, p, 'parent'), (fam, k, 'kid');

  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.family_members where family_id = fam and user_id = k;
  execute 'reset role';

  if exists (select 1 from public.family_members where family_id = fam and user_id = k) then
    raise exception 'FAIL: kid still in';
  end if;
  if (select code from public.families where id = fam) = old_code then
    raise exception 'FAIL: code did not change';
  end if;
  raise exception 'SQL TESTS PASSED';
end $$;
