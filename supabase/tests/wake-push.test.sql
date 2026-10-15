-- Checks for supabase/wake-push.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/wake-push.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid;
  fam uuid;
  key text;
  tonight text := (now() at time zone 'UTC')::date::text;
  n integer;
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, zone) values (a, 'UTC'), (b, 'UTC'), (c, 'UTC')
    on conflict (user_id) do update set zone = 'UTC';
  insert into public.shelves (user_id, doc) values (a, '{"boards":[{"id":"ba","lamps":[{"id":"qa"}]}]}')
    on conflict (user_id) do update set doc = excluded.doc;
  insert into public.devices (user_id, device_key, push_token) values
    (a, 'a-phone', 'tok-a-phone'), (a, 'a-pad', 'tok-a-pad'), (a, 'a-web', null),
    (b, 'b-phone', 'tok-b-phone'), (c, 'c-phone', 'tok-c-phone');

  -- Own answer from the app on a-phone (its header): a-pad wakes, a-phone does not,
  -- a device with no token does not, nobody else does.
  perform set_config('request.headers', json_build_object('x-didi-device', 'a-phone')::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.put_answers(jsonb_build_array(jsonb_build_object('l', 'qa', 'p', tonight, 's', 'yes', 'a', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))));
  execute 'reset role';
  perform set_config('request.headers', '', true);
  select count(*) into n from public.wake_queue where due and user_id = a and device_key = 'a-pad';
  if n <> 1 then raise exception 'FAIL: own other device not woken'; end if;
  if exists (select 1 from public.wake_queue where device_key in ('a-phone', 'a-web', 'b-phone', 'c-phone')) then
    raise exception 'FAIL: wrong device woken for an own answer';
  end if;
  -- Clients cannot see or touch the queue.
  execute 'set local role authenticated';
  begin
    perform 1 from public.wake_queue;
    raise exception 'FAIL: client read wake_queue';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.take_wake_batch(10);
    raise exception 'FAIL: client took the wake batch';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- Coalesced: taken once, then held for 10 seconds.
  select count(*) into n from public.take_wake_batch(500) t where t.user_id = a;
  if n <> 1 then raise exception 'FAIL: batch gave % rows for A, want 1', n; end if;
  perform public.wake_devices(array[a], null);
  select count(*) into n from public.take_wake_batch(500) t where t.user_id = a;
  if n <> 0 then raise exception 'FAIL: woke again inside 10 seconds'; end if;
  update public.wake_queue set sent_at = now() - interval '11 seconds' where user_id = a;
  select count(*) into n from public.take_wake_batch(500) t where t.user_id = a;
  if n <> 2 then raise exception 'FAIL: held wakes not sent after the gap (%)', n; end if;
  -- Hourly cap.
  update public.wake_queue set due = true, sent_at = now() - interval '1 minute', hour_sent = 20, hour_at = now() where user_id = a;
  select count(*) into n from public.take_wake_batch(500) t where t.user_id = a;
  if n <> 0 then raise exception 'FAIL: hourly cap not kept'; end if;
  delete from public.wake_queue;

  -- An answer key write leaves out the key's own device.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  key := public.make_answer_key('a-pad');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  perform public.key_answer(key, 'qa', tonight, 'nope', to_char((now() + interval '1 second') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  execute 'reset role';
  perform set_config('didi.device', '', true);
  if not exists (select 1 from public.wake_queue where user_id = a and device_key = 'a-phone' and due) then
    raise exception 'FAIL: key write did not wake the other device';
  end if;
  if exists (select 1 from public.wake_queue where device_key = 'a-pad') then
    raise exception 'FAIL: key write woke its own device';
  end if;
  delete from public.wake_queue;

  -- Did we: same people as live_ping. A and B in, C not. B answers.
  insert into public.we_cards (made_by, question) values (a, 'Did we walk?') returning id into card;
  insert into public.we_members (card_id, user_id, state) values (card, a, 'in'), (card, b, 'in');
  insert into public.we_answers (card_id, user_id, night, status) values (card, b, current_date, 'did');
  if (select count(*) from public.wake_queue where user_id = a) <> 2 then
    raise exception 'FAIL: Did we partner not woken on both devices';
  end if;
  if exists (select 1 from public.wake_queue where user_id in (b, c)) then
    raise exception 'FAIL: answerer or outsider woken for Did we';
  end if;
  -- Every woken person got the live ping too.
  if exists (
    select 1 from public.wake_queue w
    where not exists (select 1 from realtime.messages m where m.topic = 'didi:' || w.user_id)
  ) then
    raise exception 'FAIL: wake audience is wider than live_ping';
  end if;
  delete from public.wake_queue;

  -- Family: A and B in, C not.
  insert into public.families (code, made_by) values ('t' || substr(md5(random()::text), 1, 10), a) returning id into fam;
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, b, 'parent');
  -- live_family_answers picks the audience (social-live.test.sql checks it);
  -- here the ping it sends must wake exactly that audience.
  perform public.live_ping(array[a], 'family', fam);
  if exists (select 1 from public.wake_queue where user_id in (b, c)) then
    raise exception 'FAIL: family wake reached someone not pinged';
  end if;
  if (select count(*) from public.wake_queue where user_id = a) <> 2 then
    raise exception 'FAIL: family ping did not wake A';
  end if;
  delete from public.wake_queue;

  -- A new Did you (kind ask) has its own push; no wake.
  perform public.live_ping(array[c], 'ask', gen_random_uuid());
  if exists (select 1 from public.wake_queue) then
    raise exception 'FAIL: ask ping woke a device';
  end if;

  -- A forgotten device leaves the queue.
  perform public.wake_devices(array[a], null);
  delete from public.devices where user_id = a and device_key = 'a-pad';
  if exists (select 1 from public.wake_queue where device_key = 'a-pad') then
    raise exception 'FAIL: wake row outlived its device';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
