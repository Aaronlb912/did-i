-- Did you end to end: links, the sender's one week view, repeats.
-- Needs supabase/did-you-links.sql and supabase/send-answers.sql (with the
-- one week window) applied. Parts 1 and 2 only use older applied code; the
-- "older than a week" and "pruned" checks need the updated send-answers.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/did-you-flow.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  code text;
  sid uuid;
  sid2 uuid;
  n integer;
  ok boolean;
  ans text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok');

  -- Links: make, look up, claim once, end ------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  code := public.make_did_you_link('Did you stretch?');
  if length(code) <> 10 then raise exception 'FAIL: bad code %', code; end if;
  execute 'reset role';

  execute 'set local role anon';
  select count(*) into n from public.look_up_did_you_link(code);
  if n <> 1 then raise exception 'FAIL: a signed out visitor could not see the link'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.claim_did_you_link(code) then raise exception 'FAIL: first claim not counted'; end if;
  if public.claim_did_you_link(code) then raise exception 'FAIL: second claim counted'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.claim_did_you_link(code) then raise exception 'FAIL: maker counted on their own link'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  if public.end_did_you_link(code) then raise exception 'FAIL: a stranger ended the link'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  if not public.end_did_you_link(code) then raise exception 'FAIL: maker could not end the link'; end if;
  execute 'reset role';

  execute 'set local role anon';
  select count(*) into n from public.look_up_did_you_link(code);
  if n <> 0 then raise exception 'FAIL: an ended link still shows'; end if;
  if not public.did_you_link_stopped(code) then raise exception 'FAIL: ended link not reported as stopped'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.claim_did_you_link(code) then raise exception 'FAIL: claimed an ended link'; end if;
  execute 'reset role';

  -- Answers: repeats upsert, window is a week, rows are the keeper's ----
  insert into public.sends (from_id, to_id, question, repeat, state)
  values (a, b, 'Did you read?', 'daily', 'kept') returning id into sid;
  insert into public.sends (from_id, to_id, question, state)
  values (c, b, 'Not Ann''s', 'kept') returning id into sid2;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  -- The same night twice in one call, and a night from ten days ago.
  n := public.share_send_answers(current_date - 14, array[sid], jsonb_build_array(
    jsonb_build_object('send_id', sid, 'night', current_date, 'answer', 'nope', 'at', now() - interval '2 hours'),
    jsonb_build_object('send_id', sid, 'night', current_date, 'answer', 'did', 'at', now() - interval '1 hour'),
    jsonb_build_object('send_id', sid, 'night', current_date - 10, 'answer', 'did')));
  -- Later sync changes tonight's answer: one row, not two.
  perform public.share_send_answers(current_date - 7, array[sid], jsonb_build_array(
    jsonb_build_object('send_id', sid, 'night', current_date, 'answer', 'nope')));
  execute 'reset role';

  select count(*) into n from public.send_answers where send_id = sid and night = current_date;
  if n <> 1 then raise exception 'FAIL: % rows for one night', n; end if;
  select answer into ans from public.send_answers where send_id = sid and night = current_date;
  if ans <> 'nope' then raise exception 'FAIL: repeat answer did not update, got %', ans; end if;

  -- Ann sees tonight but not the ten day old answer.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.send_answers_for(array[sid]);
  if n <> 1 then raise exception 'FAIL: sender sees % nights, wanted 1 (the week only)', n; end if;
  -- Ann can not read the row of a send that is not hers.
  select count(*) into n from public.send_answers_for(array[sid2]);
  if n <> 0 then raise exception 'FAIL: read another sender''s send'; end if;
  execute 'reset role';

  -- Old rows are pruned on the keeper's next sync.
  insert into public.send_answers (send_id, night, answer) values (sid, current_date - 30, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.share_send_answers(current_date - 7, array[sid], '[]'::jsonb);
  execute 'reset role';
  select count(*) into n from public.send_answers where send_id = sid and night < current_date - 14;
  if n <> 0 then raise exception 'FAIL: answers older than two weeks stayed'; end if;

  -- Cy, who sent sid2, is not Ann: Ann can not turn off or write for it.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.set_send_share(sid2, false) then raise exception 'FAIL: touched a send that is not hers'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
