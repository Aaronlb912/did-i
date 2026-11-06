-- Checks for supabase/keep-did-app.sql: a first Not yet from a phone that missed
-- a Did never replaces it; a Not yet without the mark still wins.
-- Run with: node scripts/test-sql.mjs supabase/tests/keep-did-app.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  got record;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');

  -- Phone A: Did at 19:00.
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"yes","a":"2026-10-20T19:00:00Z","n":"","e":""}]');
  -- Phone B missed the sync: a later first Not yet is skipped.
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"skip","a":"2026-10-20T20:00:00Z","n":"","e":"","f":true}]');
  select status, answered_at into got from public.answer_log where user_id = a and lamp_id = 'q1';
  if got.status <> 'yes' then raise exception 'a first Not yet replaced a Did: %', got.status; end if;
  if got.answered_at <> '2026-10-20T19:00:00Z' then raise exception 'tap time moved'; end if;

  -- The same for Late.
  perform public.put_answers_as(a, '[{"l":"q2","p":"2026-10-20","s":"late","a":"2026-10-20T19:00:00Z","n":"","e":""}]');
  perform public.put_answers_as(a, '[{"l":"q2","p":"2026-10-20","s":"skip","a":"2026-10-20T20:00:00Z","n":"","e":"","f":true}]');
  select status into got from public.answer_log where user_id = a and lamp_id = 'q2';
  if got.status <> 'late' then raise exception 'a first Not yet replaced a Late: %', got.status; end if;

  -- A Not yet without the mark is a deliberate change and still wins.
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"skip","a":"2026-10-20T21:00:00Z","n":"","e":""}]');
  select status into got from public.answer_log where user_id = a and lamp_id = 'q1';
  if got.status <> 'skip' then raise exception 'a deliberate Not yet was refused: %', got.status; end if;

  -- A first Not yet on a night with no answer saves.
  perform public.put_answers_as(a, '[{"l":"q3","p":"2026-10-20","s":"skip","a":"2026-10-20T20:00:00Z","n":"","e":"","f":true}]');
  select status into got from public.answer_log where user_id = a and lamp_id = 'q3';
  if got.status is distinct from 'skip' then raise exception 'a first Not yet on an empty night was lost'; end if;

  -- A first Not yet over an older Not yet still updates (nothing to protect).
  perform public.put_answers_as(a, '[{"l":"q3","p":"2026-10-20","s":"skip","a":"2026-10-20T22:00:00Z","n":"","e":"","f":true}]');
  select answered_at into got from public.answer_log where user_id = a and lamp_id = 'q3';
  if got.answered_at <> '2026-10-20T22:00:00Z' then raise exception 'a newer Not yet over a Not yet was refused'; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
