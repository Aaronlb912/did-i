-- Checks for supabase/morning-cap.sql.
-- Run with: npm run db:test supabase/tests/morning-cap.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  ten jsonb;
  eleven jsonb;
  n integer;
begin
  insert into auth.users (id, email, aud, role, created_at)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated', now());

  select jsonb_agg(jsonb_build_object('id', 'm' || i, 'question', 'q' || i, 'cadence', 'once', 'onceOn', '2026-10-18', 'morning', true))
  into ten from generate_series(1, 10) i;
  eleven := ten || jsonb_build_array(jsonb_build_object('id', 'm11', 'question', 'q11', 'cadence', 'once', 'onceOn', '2026-10-18', 'morning', true));

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Ten on one day are kept.
  insert into public.shelves (user_id, doc)
  values (a, jsonb_build_object('boards', jsonb_build_array(jsonb_build_object('id', 'b', 'lamps', ten))));
  select jsonb_array_length(doc->'boards'->0->'lamps') into n from public.shelves where user_id = a;
  if n <> 10 then raise exception 'FAIL: ten morning questions became %', n; end if;

  -- An eleventh is dropped, a plain question beside it stays.
  update public.shelves set doc = jsonb_build_object('boards', jsonb_build_array(jsonb_build_object('id', 'b', 'lamps',
    eleven || jsonb_build_array(jsonb_build_object('id', 'p', 'question', 'plain', 'cadence', 'daily'))))) where user_id = a;
  select jsonb_array_length(doc->'boards'->0->'lamps') into n from public.shelves where user_id = a;
  if n <> 11 then raise exception 'FAIL: expected 10 morning + 1 plain, got %', n; end if;
  if exists (select 1 from public.shelves s, jsonb_array_elements(s.doc->'boards'->0->'lamps') l where s.user_id = a and l->>'id' = 'm11') then
    raise exception 'FAIL: the 11th morning question was kept';
  end if;

  -- Split over two boards, the cap still holds for the day.
  update public.shelves set doc = jsonb_build_object('boards', jsonb_build_array(
    jsonb_build_object('id', 'b', 'lamps', ten),
    jsonb_build_object('id', 'c', 'lamps', jsonb_build_array(eleven->10)))) where user_id = a;
  select jsonb_array_length(doc->'boards'->1->'lamps') into n from public.shelves where user_id = a;
  if n <> 0 then raise exception 'FAIL: the 11th on a second board was kept'; end if;

  -- Ten more on another day are kept.
  update public.shelves set doc = jsonb_build_object('boards', jsonb_build_array(jsonb_build_object('id', 'b', 'lamps',
    ten || (select jsonb_agg(jsonb_set(x, '{onceOn}', '"2026-10-19"')) from jsonb_array_elements(ten) x)))) where user_id = a;
  select jsonb_array_length(doc->'boards'->0->'lamps') into n from public.shelves where user_id = a;
  if n <> 20 then raise exception 'FAIL: ten on each of two days became %', n; end if;

  execute 'reset role';
  raise exception 'SQL TESTS PASSED';
end;
$$;
