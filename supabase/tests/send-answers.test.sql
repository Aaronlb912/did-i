-- Checks share_send_answers, set_send_share and send_answers_for
-- (supabase/send-answers.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/send-answers.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  sid uuid;
  n integer;
  ans text;
  rows jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok');

  -- Ann sends Bea a daily Did you and Bea keeps it.
  insert into public.sends (from_id, to_id, question, repeat, state)
  values (a, b, 'Did you read?', 'daily', 'kept') returning id into sid;
  rows := jsonb_build_array(
    jsonb_build_object('send_id', sid, 'night', current_date - 1, 'answer', 'did', 'at', now() - interval '1 day'),
    jsonb_build_object('send_id', sid, 'night', current_date, 'answer', 'nope')
  );

  -- Ann can not write answers for Bea, and the table is closed to everyone.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.share_send_answers(current_date - 7, array[sid], rows);
  if n <> 0 then raise exception 'FAIL: the sender wrote the answers'; end if;
  begin
    perform 1 from public.send_answers;
    raise exception 'FAIL: send_answers is readable';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- Bea shares two nights; Ann sees both, newest first.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.share_send_answers(current_date - 7, array[sid], rows);
  if n <> 2 then raise exception 'FAIL: recipient wrote % rows, wanted 2', n; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select answer into ans from public.send_answers_for(array[sid]) limit 1;
  if ans is distinct from 'nope' then raise exception 'FAIL: sender sees % not tonight''s answer', ans; end if;
  select count(*) into n from public.send_answers_for(array[sid]);
  if n <> 2 then raise exception 'FAIL: sender sees % nights', n; end if;
  -- Ann can not switch Bea's sharing.
  if public.set_send_share(sid, false) then raise exception 'FAIL: sender turned off sharing'; end if;
  execute 'reset role';

  -- A stranger sees nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.send_answers_for(array[sid]);
  if n <> 0 then raise exception 'FAIL: a stranger saw answers'; end if;
  execute 'reset role';

  -- Bea takes back tonight's answer: only last night is left.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.share_send_answers(current_date - 7, array[sid], jsonb_build_array(rows -> 0));
  execute 'reset role';
  select count(*) into n from public.send_answers where send_id = sid;
  if n <> 1 then raise exception 'FAIL: a taken back answer stayed'; end if;

  -- Bea turns sharing off: past answers go, new ones are not kept.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.set_send_share(sid, false) then raise exception 'FAIL: recipient could not turn sharing off'; end if;
  n := public.share_send_answers(current_date - 7, array[sid], rows);
  if n <> 0 then raise exception 'FAIL: wrote answers with sharing off'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.send_answers_for(array[sid]);
  if n <> 0 then raise exception 'FAIL: sender saw answers with sharing off'; end if;
  execute 'reset role';

  -- On again, then Bea blocks Ann: Ann sees nothing and Bea writes nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_send_share(sid, true);
  perform public.share_send_answers(current_date - 7, array[sid], rows);
  -- Question deleted on her shelf: the next sync leaves it out and its answers go.
  perform public.share_send_answers(current_date - 7, array[]::uuid[], '[]'::jsonb);
  execute 'reset role';
  select count(*) into n from public.send_answers where send_id = sid;
  if n <> 0 then raise exception 'FAIL: answers kept for a deleted question'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.share_send_answers(current_date - 7, array[sid], rows);
  execute 'reset role';
  select count(*) into n from public.send_answers where send_id = sid;
  if n = 0 then raise exception 'FAIL: no answers stored before the block'; end if;
  insert into public.blocks (blocker, blocked) values (b, a);
  -- The block deletes the stored answers, so an unblock cannot bring them back.
  select count(*) into n from public.send_answers where send_id = sid;
  if n <> 0 then raise exception 'FAIL: answers kept after a block'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.send_answers_for(array[sid]);
  if n <> 0 then raise exception 'FAIL: a blocked sender saw answers'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.share_send_answers(current_date - 7, array[sid], rows);
  if n <> 0 then raise exception 'FAIL: wrote answers to a blocked sender'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
