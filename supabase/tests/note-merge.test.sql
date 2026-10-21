-- Checks for supabase/note-merge.sql: a newer tap without the note keeps it.
-- Run with: node scripts/test-sql.mjs supabase/tests/note-merge.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  got record;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');

  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"yes","a":"2026-10-20T20:00:00Z","n":"took it","e":"2026-10-20T20:05:00Z"}]');
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"skip","a":"2026-10-20T20:10:00Z","n":"","e":""}]');
  select status, note into got from public.answer_log where user_id = a and lamp_id = 'q1';
  if got.status <> 'skip' then raise exception 'newer tap lost: %', got.status; end if;
  if got.note <> 'took it' then raise exception 'note blanked by a newer tap without it'; end if;

  -- An older tap still loses.
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"yes","a":"2026-10-20T19:00:00Z","n":"","e":""}]');
  select status into got from public.answer_log where user_id = a and lamp_id = 'q1';
  if got.status <> 'skip' then raise exception 'older tap overwrote a newer one'; end if;

  -- A newer clear still clears.
  perform public.put_answers_as(a, '[{"l":"q1","p":"2026-10-20","s":"skip","a":"2026-10-20T20:10:00Z","n":"","e":"2026-10-20T20:20:00Z"}]');
  select note into got from public.answer_log where user_id = a and lamp_id = 'q1';
  if got.note <> '' then raise exception 'a newer clear was ignored'; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
