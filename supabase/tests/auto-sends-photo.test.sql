-- Checks auto_sends_waiting carries wants_photo (supabase/auto-sends-photo.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/auto-sends-photo.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  p uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  ask boolean;
  plain boolean;
begin
  insert into auth.users (id, email, aud, role)
  select u, u || '@test.invalid', 'authenticated', 'authenticated' from unnest(array[a, p]) as u;
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (p, 'Pat')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, p, 'parent');

  insert into public.sends (from_id, to_id, kind, question, wants_photo) values (p, a, 'todo', 'with photo', true);
  insert into public.sends (from_id, to_id, kind, question) values (p, a, 'todo', 'no photo');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select w.wants_photo into ask from public.auto_sends_waiting() w where w.question = 'with photo';
  select w.wants_photo into plain from public.auto_sends_waiting() w where w.question = 'no photo';
  if ask is not true then raise exception 'FAIL: wants_photo missing for the ask (%)', ask; end if;
  if plain is not false then raise exception 'FAIL: wants_photo should be false (%)', plain; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end $$;
