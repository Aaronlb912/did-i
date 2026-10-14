-- Checks set_app_send_answer (supabase/app-send-answer-upsert.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/app-send-answer-upsert.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  sid uuid;
  st text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.app_sends (question) values ('Did you drink water?') returning id into sid;

  -- Ann keeps it, then adds it: one row, now added.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.set_app_send_answer(sid, 'kept') then raise exception 'FAIL: kept refused'; end if;
  if not public.set_app_send_answer(sid, 'added') then raise exception 'FAIL: added refused'; end if;
  if public.set_app_send_answer(sid, 'bogus') then raise exception 'FAIL: bad state accepted'; end if;
  select state into st from public.app_send_answers where app_send_id = sid and user_id = a;
  if st is distinct from 'added' then raise exception 'FAIL: state is %, wanted added', st; end if;
  execute 'reset role';

  -- Bea answers for herself only; Ann's row stays added.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_app_send_answer(sid, 'passed');
  begin
    update public.app_send_answers set state = 'passed' where user_id = a;
    raise exception 'FAIL: update on app_send_answers is allowed';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  select state into st from public.app_send_answers where app_send_id = sid and user_id = a;
  if st is distinct from 'added' then raise exception 'FAIL: Bea changed Ann''s row to %', st; end if;
  select state into st from public.app_send_answers where app_send_id = sid and user_id = b;
  if st is distinct from 'passed' then raise exception 'FAIL: Bea''s row is %', st; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
