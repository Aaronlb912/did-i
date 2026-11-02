-- Checks for supabase/family-leave-hide.sql.
--
-- Run with: npm run db:test supabase/tests/family-leave-hide.test.sql
--
-- One DO block that always ends by raising, so every row is rolled back.
-- A pass comes back as the error text 'SQL TESTS PASSED'.

do $$
declare
  a uuid := gen_random_uuid(); -- parent, stays
  b uuid := gen_random_uuid(); -- leaves
  fam uuid := gen_random_uuid();
  lamp uuid := gen_random_uuid();
  tag uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 10)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, b, 'kid');
  insert into public.family_tags (id, family_id) values (tag, fam);
  insert into public.family_lamps (id, family_id, tag_id, question, made_by) values (lamp, fam, tag, 'Did I feed the cat?', b);
  insert into public.family_answers (family_id, lamp_id, user_id, period_key) values (fam, lamp, a, '2026-11-01'), (fam, lamp, b, '2026-11-01');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.family_answers where family_id = fam;
  if n <> 2 then raise exception 'FAIL: a sees % answers before b leaves', n; end if;
  execute 'reset role';

  delete from public.family_members where family_id = fam and user_id = b;

  execute 'set local role authenticated';
  select count(*) into n from public.family_answers where family_id = fam and user_id = b;
  if n <> 0 then raise exception 'FAIL: a still sees b''s answers after b left'; end if;
  select count(*) into n from public.family_answers where family_id = fam and user_id = a;
  if n <> 1 then raise exception 'FAIL: a lost their own answer'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.family_lamps where id = lamp;
  execute 'reset role';
  select count(*) into n from public.family_lamps where id = lamp;
  if n <> 1 then raise exception 'FAIL: b dropped a family question after leaving'; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
