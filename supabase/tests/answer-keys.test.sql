-- Checks for supabase/answer-keys.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/answer-keys.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  ka text;
  ka2 text;
  kb text;
  tonight text := (now() at time zone 'UTC')::date::text;
  stamp text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  later text := to_char((now() + interval '1 second') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  got text;
  n integer;
  i integer;
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, zone) values (a, 'UTC'), (b, 'UTC')
    on conflict (user_id) do update set zone = 'UTC';
  insert into public.shelves (user_id, doc) values
    (a, '{"boards":[{"id":"ba","lamps":[{"id":"qa"}]}]}'),
    (b, '{"boards":[{"id":"bb","lamps":[{"id":"qb"}]}]}')
    on conflict (user_id) do update set doc = excluded.doc;
  insert into public.devices (user_id, device_key) values (a, 'phone-a'), (a, 'tab-a'), (b, 'phone-b');

  -- Keys are made only by a signed-in owner for their own device.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  ka := public.make_answer_key('phone-a');
  if ka !~ '^[0-9a-f]{64}$' then raise exception 'FAIL: key shape'; end if;
  begin
    perform public.make_answer_key('phone-b');
    raise exception 'FAIL: A made a key for a device that is not theirs';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  -- The owner lists keys but never sees a hash.
  select count(*) into n from public.answer_keys;
  if n <> 1 then raise exception 'FAIL: A sees % keys, want 1', n; end if;
  begin
    perform key_hash from public.answer_keys;
    raise exception 'FAIL: hash is readable';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  kb := public.make_answer_key('phone-b');
  select count(*) into n from public.answer_keys;
  if n <> 1 then raise exception 'FAIL: B sees A''s keys'; end if;
  execute 'set local role anon';
  -- Anon (a widget) may call key_answer and nothing else.
  begin
    perform public.make_answer_key('phone-b');
    raise exception 'FAIL: anon made a key';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.put_answers_as(b, '[]'::jsonb);
    raise exception 'FAIL: anon called put_answers_as';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform 1 from public.answer_keys;
    raise exception 'FAIL: anon read answer_keys';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- The only server copy is a hash.
  if exists (select 1 from public.answer_keys where encode(key_hash, 'hex') in (ka, kb)) then
    raise exception 'FAIL: key stored in the clear';
  end if;

  execute 'set local role anon';
  -- A's key writes A's question.
  got := public.key_answer(ka, 'qa', tonight, 'did', stamp);
  if got <> 'ok' then raise exception 'FAIL: own write gave %', got; end if;
  -- A's key cannot write B's question, whatever the lamp id.
  got := public.key_answer(ka, 'qb', tonight, 'did', stamp);
  if got <> 'question' then raise exception 'FAIL: A''s key on B''s question gave %', got; end if;
  -- A junk key does nothing.
  got := public.key_answer(repeat('0', 64), 'qa', tonight, 'did', stamp);
  if got <> 'key' then raise exception 'FAIL: junk key gave %', got; end if;
  -- A closed night is refused.
  got := public.key_answer(ka, 'qa', ((now() at time zone 'UTC')::date - 3)::text, 'did', stamp);
  if got <> 'closed' then raise exception 'FAIL: closed night gave %', got; end if;
  -- A stamp from the future is refused.
  got := public.key_answer(ka, 'qa', tonight, 'did', to_char((now() + interval '1 hour') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  if got <> 'bad' then raise exception 'FAIL: future stamp gave %', got; end if;
  execute 'reset role';

  select count(*) into n from public.answer_log where user_id = b;
  if n <> 0 then raise exception 'FAIL: B has % answers from A''s key', n; end if;
  if (select status from public.answer_log where user_id = a and lamp_id = 'qa' and period_key = tonight) <> 'yes'
     or (select board_id from public.answer_log where user_id = a and lamp_id = 'qa' and period_key = tonight) <> 'ba' then
    raise exception 'FAIL: own write landed wrong';
  end if;

  -- Same rule as the app: a Not yet never replaces a Did, even a newer one
  -- from a widget that had not redrawn. Not yet then Did is late.
  execute 'set local role anon';
  got := public.key_answer(ka, 'qa', tonight, 'nope', later);
  if got <> 'same' then raise exception 'FAIL: nope over a did gave %', got; end if;
  execute 'reset role';
  if (select status from public.answer_log where user_id = a and lamp_id = 'qa' and period_key = tonight) <> 'yes' then
    raise exception 'FAIL: a later Not yet replaced the Did';
  end if;
  execute 'set local role anon';
  got := public.key_answer(ka, 'qa', tonight, 'undo', stamp);
  if got <> 'ok' then raise exception 'FAIL: undo of the did gave %', got; end if;
  execute 'reset role';
  if not exists (select 1 from public.answer_undos where user_id = a and lamp_id = 'qa' and period_key = tonight
                 and public.stamp_ts(answered_at) = public.stamp_ts(stamp)) then
    raise exception 'FAIL: a key undo was not noted';
  end if;
  execute 'set local role anon';
  got := public.key_answer(ka, 'qa', tonight, 'nope', later);
  if got <> 'ok' then raise exception 'FAIL: nope on an open question gave %', got; end if;
  got := public.key_answer(ka, 'qa', tonight, 'did', to_char((now() + interval '2 seconds') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  execute 'reset role';
  if (select status from public.answer_log where user_id = a and lamp_id = 'qa' and period_key = tonight) <> 'late' then
    raise exception 'FAIL: Did after Not yet is not late';
  end if;

  -- Undo takes back only the exact tap.
  execute 'set local role anon';
  got := public.key_answer(ka, 'qa', tonight, 'undo', stamp);
  if got <> 'same' then raise exception 'FAIL: undo of an older stamp gave %', got; end if;
  got := public.key_answer(ka, 'qa', tonight, 'undo', to_char((now() + interval '2 seconds') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  if got <> 'ok' then raise exception 'FAIL: undo gave %', got; end if;
  execute 'reset role';
  if exists (select 1 from public.answer_log where user_id = a and lamp_id = 'qa') then
    raise exception 'FAIL: undo left the row';
  end if;

  -- A new key for the device ends the old one.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  ka2 := public.make_answer_key('phone-a');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  got := public.key_answer(ka, 'qa', tonight, 'did', stamp);
  if got <> 'key' then raise exception 'FAIL: replaced key still works (%)', got; end if;
  execute 'reset role';

  -- Sign out here ends this device's keys.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.revoke_answer_keys('phone-a');
  if n <> 1 then raise exception 'FAIL: revoke ended % keys', n; end if;
  -- B cannot end A's keys.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.revoke_answer_keys(null);
  if n <> 1 then raise exception 'FAIL: B''s revoke-all ended % keys, want only B''s 1', n; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  got := public.key_answer(ka2, 'qa', tonight, 'did', stamp);
  if got <> 'key' then raise exception 'FAIL: revoked key works (%)', got; end if;
  execute 'reset role';

  -- Forgetting a phone ends its keys.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  ka := public.make_answer_key('tab-a');
  execute 'reset role';
  delete from public.devices where user_id = a and device_key = 'tab-a';
  if exists (select 1 from public.answer_keys where user_id = a and device_key = 'tab-a' and revoked_at is null) then
    raise exception 'FAIL: forgotten device kept a live key';
  end if;

  -- Rate limit: 30 writes per key per 10 minutes.
  insert into public.devices (user_id, device_key) values (a, 'tab-a');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  ka := public.make_answer_key('tab-a');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  for i in 1..30 loop
    perform public.key_answer(ka, 'qa', tonight, 'did', stamp);
  end loop;
  got := public.key_answer(ka, 'qa', tonight, 'did', stamp);
  if got <> 'slow' then raise exception 'FAIL: 31st write gave %', got; end if;
  execute 'reset role';

  -- At most 10 live keys per account.
  for i in 1..12 loop
    insert into public.devices (user_id, device_key) values (a, 'cap-' || i);
  end loop;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    for i in 1..12 loop
      perform public.make_answer_key('cap-' || i);
    end loop;
    raise exception 'FAIL: more than 10 live keys';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  execute 'reset role';

  -- The account going takes its keys.
  delete from auth.users where id = a;
  if exists (select 1 from public.answer_keys where user_id = a) then
    raise exception 'FAIL: keys outlived the account';
  end if;

  -- put_answers exactly as a 1.3.5 phone calls it (src/lib/answer-log.js
  -- rowsOf): same signature, integer back, newer stamp wins, older does not,
  -- a row without m keeps the stored amount. B never asked for a key.
  insert into public.devices (user_id, device_key) values (b, 'old-b') on conflict do nothing;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.put_answers(jsonb_build_array(jsonb_build_object(
    'b', 'bb', 'l', 'qb', 'p', tonight, 's', 'yes', 'a', '2026-01-01T10:00:00.000Z', 'n', 'note', 'e', '', 'm', 3)));
  if n <> 1 then raise exception 'FAIL: 1.3.5 put_answers returned %', n; end if;
  n := public.put_answers(jsonb_build_array(jsonb_build_object(
    'b', 'bb', 'l', 'qb', 'p', tonight, 's', 'skip', 'a', '2025-12-31T10:00:00.000Z', 'n', '', 'e', '', 'm', null)));
  if n <> 0 then raise exception 'FAIL: an older 1.3.5 answer won'; end if;
  n := public.put_answers(jsonb_build_array(jsonb_build_object(
    'b', 'bb', 'l', 'qb', 'p', tonight, 's', 'skip', 'a', '2026-01-02T10:00:00.000Z', 'n', '', 'e', '')));
  if n <> 1 then raise exception 'FAIL: a newer 1.3.5 answer lost'; end if;
  if (select amount from public.answer_log where user_id = b and lamp_id = 'qb') <> 3
     or (select status from public.answer_log where user_id = b and lamp_id = 'qb') <> 'skip' then
    raise exception 'FAIL: 1.3.5 merge rules changed';
  end if;
  -- Not signed in still fails the same way.
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.put_answers('[]'::jsonb);
    raise exception 'FAIL: put_answers ran with no user';
  exception when others then
    if sqlerrm <> 'not signed in' then raise; end if;
  end;

  raise exception 'SQL TESTS PASSED';
end;
$$;
