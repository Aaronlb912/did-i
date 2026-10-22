-- Checks for supabase/app-send-keep-once.sql: two phones, one Keep.
-- Run with: node scripts/test-sql.mjs supabase/tests/app-send-keep-once.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  sid uuid;
  st text;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.app_sends (question) values ('Did you stretch?') returning id into sid;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  if not public.set_app_send_answer(sid, 'kept') then raise exception 'FAIL: first keep refused'; end if;
  if public.set_app_send_answer(sid, 'kept') then raise exception 'FAIL: a second keep landed too'; end if;
  -- A stale Pass from the other phone does not undo the Keep.
  if not public.set_app_send_answer(sid, 'passed') then raise exception 'FAIL: pass errored'; end if;
  select state into st from public.app_send_answers where app_send_id = sid and user_id = a;
  if st is distinct from 'kept' then raise exception 'FAIL: pass turned kept into %', st; end if;
  execute 'reset role';

  -- Passed first, then kept later: the Keep lands.
  delete from public.app_send_answers where app_send_id = sid;
  execute 'set local role authenticated';
  perform public.set_app_send_answer(sid, 'passed');
  if not public.set_app_send_answer(sid, 'kept') then raise exception 'FAIL: keep after pass refused'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end $$;
