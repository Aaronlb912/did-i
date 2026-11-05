-- Making a new family code clears rotation log rows older than a day.
--
-- Run with: npm run db:test supabase/tests/family-code-prune.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  fam uuid;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do update set display_name = excluded.display_name;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam := public.make_family('Test family');
  execute 'reset role';

  insert into public.family_code_rotations (family_id, made_at)
  values (fam, now() - interval '2 days'), (fam, now() - interval '3 days');

  execute 'set local role authenticated';
  perform public.rotate_family_code(fam);
  execute 'reset role';

  if exists (select 1 from public.family_code_rotations r where r.family_id = fam and r.made_at < now() - interval '1 day') then
    raise exception 'FAIL: an old rotation row stayed';
  end if;
  if (select count(*) from public.family_code_rotations r where r.family_id = fam) <> 1 then
    raise exception 'FAIL: the new rotation row is missing';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
