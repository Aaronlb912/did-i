-- Checks for supabase/push-private-edit.sql: an edited waiting push stays private.
-- Run with: node scripts/test-sql.mjs supabase/tests/push-private-edit.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  push bigint;
  said text;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name, prefs) values (a, 'Ann', '{"pingsPrivate": true}'::jsonb)
  on conflict (user_id) do update set prefs = excluded.prefs;
  insert into public.push_queue (to_id, body) values (a, 'Did you take your meds?') returning id into push;
  select body into said from public.push_queue where id = push;
  if said like '%meds%' then raise exception 'FAIL: insert kept the words'; end if;
  update public.push_queue set body = 'Did you call the bank?' where id = push;
  select body into said from public.push_queue where id = push;
  if said like '%bank%' then raise exception 'FAIL: edit put the words back: %', said; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
