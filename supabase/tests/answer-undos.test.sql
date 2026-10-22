-- An undone answer can not be sent back by a phone that missed the undo;
-- a new tap and the answer from before still go through.
do $$
declare a uuid := gen_random_uuid(); n integer; s text;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Not yet at 20:00, then Did at 21:00, then undo of the Did puts Not yet back.
  perform public.put_answers('[{"l":"water","p":"2026-10-22","s":"skip","a":"2026-10-22T20:00:00.000Z"}]'::jsonb);
  perform public.put_answers('[{"l":"water","p":"2026-10-22","s":"yes","a":"2026-10-22T21:00:00.000Z"}]'::jsonb);
  perform public.note_answer_undo('water', '2026-10-22', '2026-10-22T21:00:00.000Z', '');
  delete from public.answer_log where user_id = a and lamp_id = 'water';
  perform public.put_answers('[{"l":"water","p":"2026-10-22","s":"skip","a":"2026-10-22T20:00:00.000Z"}]'::jsonb);
  select status into s from public.answer_log where user_id = a and lamp_id = 'water';
  if s is distinct from 'skip' then raise exception 'FAIL: the answer from before did not go back (%)', s; end if;

  -- The other phone sends the undone Did again: refused.
  perform public.put_answers('[{"l":"water","p":"2026-10-22","s":"yes","a":"2026-10-22T21:00:00.000Z"}]'::jsonb);
  select status into s from public.answer_log where user_id = a and lamp_id = 'water';
  if s <> 'skip' then raise exception 'FAIL: the undone Did came back'; end if;

  -- Same with no row left at all.
  delete from public.answer_log where user_id = a and lamp_id = 'water';
  n := public.put_answers('[{"l":"water","p":"2026-10-22","s":"yes","a":"2026-10-22T21:00:00.000Z"}]'::jsonb);
  if n <> 0 then raise exception 'FAIL: the undone Did was inserted again'; end if;

  -- A new Did later goes through.
  n := public.put_answers('[{"l":"water","p":"2026-10-22","s":"yes","a":"2026-10-22T21:30:00.000Z"}]'::jsonb);
  if n <> 1 then raise exception 'FAIL: a new tap was refused'; end if;

  -- Removing a question deletes rows with no note, so they can come back.
  perform public.put_answers('[{"l":"tea","p":"2026-10-22","s":"yes","a":"2026-10-22T19:00:00.000Z"}]'::jsonb);
  delete from public.answer_log where user_id = a and lamp_id = 'tea';
  n := public.put_answers('[{"l":"tea","p":"2026-10-22","s":"yes","a":"2026-10-22T19:00:00.000Z"}]'::jsonb);
  if n <> 1 then raise exception 'FAIL: a removed question''s answer could not come back'; end if;

  -- Only your own notes are readable.
  select count(*) into n from public.answer_undos;
  if n <> 1 then raise exception 'FAIL: expected 1 own undo, saw %', n; end if;
  execute 'reset role';
  raise exception 'SQL TESTS PASSED';
end $$;
