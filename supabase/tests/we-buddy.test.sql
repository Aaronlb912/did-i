-- Checks for supabase/we-buddy.sql: the "{name} did it. Your turn?" push.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/we-buddy.test.sql
-- Needs we-buddy.sql applied first. One DO block that always ends by
-- raising, so every made-up person and row is rolled back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card1 uuid;
  card2 uuid;
  card3 uuid;
  card4 uuid;
  card5 uuid;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  select u, u || '@test.invalid', 'authenticated', 'authenticated'
  from unnest(array[a, b, c]) u;
  insert into public.profiles (user_id, display_name)
  values (a, 'Ann'), (b, 'Ben'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state)
  values (a, b, 'ok'), (a, c, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card1 := public.we_make('Did we stretch?', 'all', 'all', 'daily', '{}', null, array[b, c]);
  card2 := public.we_make('Did we walk?', 'any', 'all', 'daily', '{}', null, array[b]);
  card3 := public.we_make('Did we read?', 'all', 'all', 'daily', '{}', null, array[b]);
  card4 := public.we_make('Did we cook?', 'all', 'all', 'daily', '{}', null, array[b]);
  card5 := public.we_make('Did we tidy?', 'all', 'all', 'daily', '{}', null, array[b]);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card1, true);
  perform public.we_reply(card2, true);
  perform public.we_reply(card3, true);
  perform public.we_reply(card4, true);
  perform public.we_reply(card5, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card1, true);
  execute 'reset role';

  delete from public.push_queue where to_id in (a, b, c);

  -- 1. One Did sends one push to each other open member ------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card1, current_date, 'did');
  execute 'reset role';
  select count(*) into n from public.push_queue where to_id in (b, c) and body = 'Ann did it. Your turn?';
  if n <> 2 then
    raise exception 'FAIL: expected 2 pushes, got %', n;
  end if;
  if exists (select 1 from public.push_queue where to_id = a) then
    raise exception 'FAIL: the person who did it got a push';
  end if;

  -- 2. Someone else's Did does not push the one who already did it, and
  --    the card, still open, does not push again for the same night.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card1, current_date, 'did');
  execute 'reset role';
  if exists (select 1 from public.push_queue where to_id = a) then
    raise exception 'FAIL: someone who already did it got a push';
  end if;
  select count(*) into n from public.push_queue where body like '%did it. Your turn?';
  if n <> 2 then
    raise exception 'FAIL: a second Did pushed again (%)', n;
  end if;

  -- 3. A card that is done sends nothing ---------------------------------
  delete from public.push_queue where to_id in (a, b, c);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card2, current_date, 'did');
  execute 'reset role';
  if exists (select 1 from public.push_queue where body like '%did it. Your turn?') then
    raise exception 'FAIL: a done card pushed';
  end if;

  -- 4. Did, Not yet, Did again sends only the first ----------------------
  delete from public.push_queue where to_id in (a, b, c);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card3, current_date, 'did');
  perform public.we_answer(card3, current_date, 'nope');
  perform public.we_answer(card3, current_date, 'did');
  execute 'reset role';
  select count(*) into n from public.push_queue where to_id = b and body = 'Ann did it. Your turn?';
  if n <> 1 then
    raise exception 'FAIL: expected 1 push after Did, Not yet, Did, got %', n;
  end if;

  -- 5. The we kind off sends nothing -------------------------------------
  delete from public.push_queue where to_id in (a, b, c);
  update public.profiles set prefs = jsonb_build_object('pingsOff', jsonb_build_array('we')) where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card4, current_date, 'did');
  execute 'reset role';
  if exists (select 1 from public.push_queue where to_id = b) then
    raise exception 'FAIL: pings off still pushed';
  end if;
  update public.profiles set prefs = '{}'::jsonb where user_id = b;

  -- 6. A blocked pair gets nothing ---------------------------------------
  delete from public.push_queue where to_id in (a, b, c);
  insert into public.blocks (blocker, blocked) values (b, a);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card5, current_date, 'did');
  execute 'reset role';
  if exists (select 1 from public.push_queue where to_id = b) then
    raise exception 'FAIL: a blocked pair got a push';
  end if;

  -- Table is closed to clients, and the trigger function is not callable.
  if has_table_privilege('authenticated', 'public.we_buddy_pings', 'select')
     or has_table_privilege('anon', 'public.we_buddy_pings', 'select') then
    raise exception 'FAIL: we_buddy_pings is open to clients';
  end if;
  if has_function_privilege('authenticated', 'public.we_buddy_push()', 'execute') then
    raise exception 'FAIL: we_buddy_push is callable';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
