-- Checks for supabase/answer-merge.sql: an older tap with a newer note keeps
-- the newer answer from another phone.
-- Run with: node scripts/test-sql.mjs supabase/tests/answer-merge.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  got record;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');

  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"yes","a":"2026-10-20T21:00:00Z","n":"","e":""}]');
  -- Phone B never pulled the Did: its Not yet from 20:00 gets a note at 22:00.
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"skip","a":"2026-10-20T20:00:00Z","n":"tired","e":"2026-10-20T22:00:00Z","m":3}]');
  select status, answered_at, note, amount into got from public.answer_log where user_id = a and lamp_id = 'q1';
  if got.status <> 'yes' then raise exception 'an older tap with a newer note put its answer back: %', got.status; end if;
  if got.answered_at <> '2026-10-20T21:00:00Z' then raise exception 'tap time moved back'; end if;
  if got.note <> 'tired' then raise exception 'the newer note was lost'; end if;
  if got.amount <> 3 then raise exception 'the amount did not go with the note'; end if;

  -- A newer tap still wins and keeps the note.
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"skip","a":"2026-10-20T23:00:00Z","n":"","e":""}]');
  select status, note into got from public.answer_log where user_id = a and lamp_id = 'q1';
  if got.status <> 'skip' or got.note <> 'tired' then raise exception 'newer tap: % %', got.status, got.note; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
