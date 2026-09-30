-- Cross-account checks for supabase/did-we.sql.
--
-- Run with: npm run db:test supabase/tests/did-we.test.sql
--
-- One DO block that always ends by raising, so every made-up person and
-- row is rolled back. A pass comes back as the error text 'SQL TESTS PASSED'.

do $$
declare
  turn_now uuid;
  turn_next uuid;
  a uuid := gen_random_uuid(); -- makes the cards
  b uuid := gen_random_uuid(); -- a's friend
  c uuid := gen_random_uuid(); -- a's family
  d uuid := gen_random_uuid(); -- a stranger
  fam uuid := gen_random_uuid();
  card uuid;
  anycard uuid;
  turncard uuid;
  countcard uuid;
  night date := current_date;
  j jsonb;
  n integer;
  ok boolean;
  s text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated'),
    (d, d || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cal'), (d, 'Dee')
  on conflict (user_id) do update set display_name = excluded.display_name;

  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, c, 'kid');

  -- As a ----------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    perform public.we_make('stranger card', 'all', 'waiting', 'daily', '{}', null, array[d]);
    raise exception 'FAIL: a asked a stranger';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  card := public.we_make('Did we walk the dog?', 'all', 'waiting', 'daily', '{}', null, array[b, c]);
  anycard := public.we_make('Did we feed the cat?', 'any', 'all', 'daily', '{}', null, array[b]);
  turncard := public.we_make('Did we do the dishes?', 'turns', 'all', 'daily', '{}', null, array[b]);
  countcard := public.we_make('Did we all stretch?', 'all', 'count', 'daily', '{}', null, array[b]);

  begin
    insert into public.we_answers (card_id, user_id, night, status) values (card, a, night, 'did');
    raise exception 'FAIL: wrote an answer straight into the table';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.we_answer(card, night - 30, 'did');
    raise exception 'FAIL: answered a night long gone';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  execute 'reset role';

  -- As d, the stranger ----------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.we_cards;
  if n <> 0 then raise exception 'FAIL: a stranger sees % cards', n; end if;
  if jsonb_array_length(public.we_tonight(night)) <> 0 then
    raise exception 'FAIL: a stranger got cards from we_tonight';
  end if;
  begin
    perform public.we_answer(card, night, 'did');
    raise exception 'FAIL: a stranger answered';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  execute 'reset role';

  -- As b: sees the ask, joins, answers nope ------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  j := public.we_tonight(night);
  if jsonb_array_length(j) <> 4 then raise exception 'FAIL: b sees % asks, wanted 4', jsonb_array_length(j); end if;
  begin
    perform public.we_answer(card, night, 'did');
    raise exception 'FAIL: b answered before saying yes';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  perform public.we_reply(card, true);
  perform public.we_reply(anycard, true);
  perform public.we_reply(turncard, true);
  perform public.we_reply(countcard, true);
  perform public.we_answer(card, night, 'nope');
  perform public.we_answer(countcard, night, 'nope');

  execute 'reset role';

  -- As c: joins, says did ------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  perform public.we_answer(card, night, 'did');
  execute 'reset role';

  -- As a: what a is allowed to see ----------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  j := public.we_tonight(night);
  -- Waiting card: c's did shows, b's nope does not.
  select p->>'status' into s from jsonb_array_elements(public.we_tonight(night)) x,
    jsonb_array_elements(x->'people') p
  where x->>'id' = card::text and p->>'id' = b::text;
  if s is not null then raise exception 'FAIL: a saw b''s nope on a waiting card'; end if;
  select count(*) into n from jsonb_array_elements(public.we_tonight(night)) x,
    jsonb_array_elements(x->'people') p
  where x->>'id' = card::text and p->>'id' = c::text and p->>'status' = 'did';
  if n <> 1 then raise exception 'FAIL: a did not see c''s did'; end if;

  -- Count card: nobody else is named.
  select count(*) into n from jsonb_array_elements(public.we_tonight(night)) x,
    jsonb_array_elements(x->'people') p
  where x->>'id' = countcard::text and (p->>'me')::boolean = false;
  if n <> 0 then raise exception 'FAIL: a count card named % others', n; end if;

  -- a cannot read b's answers from the table.
  select count(*) into n from public.we_answers where user_id <> a;
  if n <> 0 then raise exception 'FAIL: a read % answers that were not a''s', n; end if;

  -- All card: b said nope, so a's did does not finish it.
  ok := public.we_answer(card, night, 'did');
  if ok then raise exception 'FAIL: an all card finished with a nope on it'; end if;

  -- Any card: one did is enough.
  ok := public.we_answer(anycard, night, 'did');
  if not ok then raise exception 'FAIL: an any card did not finish on one did'; end if;
  select x->'finish' into j from jsonb_array_elements(public.we_tonight(night)) x where x->>'id' = anycard::text;
  if j->>'by' is distinct from a::text then
    raise exception 'FAIL: the finish did not say who finished it: %', j;
  end if;

  -- Turns card: only tonight's person counts.
  -- we_turn is server-only, so read it outside the user's role.
  execute 'reset role';
  turn_now := public.we_turn(turncard, night);
  turn_next := public.we_turn(turncard, night + 1);
  execute 'set local role authenticated';
  if turn_now is null then raise exception 'FAIL: no turn tonight'; end if;
  ok := public.we_answer(turncard, night, 'did');
  if ok <> (turn_now = a) then
    raise exception 'FAIL: turns card ignored whose turn it was';
  end if;
  if turn_now = turn_next then
    raise exception 'FAIL: the turn did not move to the next night';
  end if;

  -- Nudge b once, not twice.
  perform public.we_nudge(card, b, night);
  begin
    perform public.we_nudge(card, b, night);
    raise exception 'FAIL: nudged twice in a night';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Streak coins: a seven night run on the any card pays once.
  execute 'reset role';
  insert into public.we_done (card_id, night)
  select anycard, g::date from generate_series(night - 6, night, interval '1 day') g
  on conflict do nothing;
  update public.we_cards set starts_on = night - 10 where id = anycard;
  execute 'set local role authenticated';
  n := public.we_claim(anycard, night);
  if n <> 5 then raise exception 'FAIL: a seven night run paid %, wanted 5', n; end if;
  n := public.we_claim(anycard, night);
  if n <> 0 then raise exception 'FAIL: the same milestone paid twice'; end if;

  -- Leaving hands the card on and keeps it open.
  perform public.we_leave(card);
  execute 'reset role';
  if (select made_by from public.we_cards where id = card) = a then
    raise exception 'FAIL: the card stayed with someone who left';
  end if;
  if (select archived from public.we_cards where id = card) then
    raise exception 'FAIL: the card closed while people were still on it';
  end if;

  -- Filing is personal: a's folder is not b's.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_file(anycard, 'Home', 'pets');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select x->>'folder' into s from jsonb_array_elements(public.we_tonight(night)) x where x->>'id' = anycard::text;
  if s <> '' then raise exception 'FAIL: b saw a''s folder: %', s; end if;
  execute 'reset role';
  if (select folder from public.we_members where card_id = anycard and user_id = a) <> 'Home' then
    raise exception 'FAIL: a''s folder did not save';
  end if;

  -- An ask past two weeks is gone: not shown, cannot be joined, can be sent again.
  update public.we_members set state = 'asked', asked_at = now() - interval '20 days'
  where card_id = countcard and user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from jsonb_array_elements(public.we_tonight(night)) x where x->>'id' = countcard::text;
  if n <> 0 then raise exception 'FAIL: an expired ask still showed'; end if;
  select count(*) into n from public.we_cards where id = countcard;
  if n <> 0 then raise exception 'FAIL: an expired ask could still read the card'; end if;
  perform public.we_reply(countcard, true);
  execute 'reset role';
  if (select state from public.we_members where card_id = countcard and user_id = b) <> 'asked' then
    raise exception 'FAIL: joined on an expired ask';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_ask(countcard, b);
  execute 'reset role';
  if (select asked_at from public.we_members where card_id = countcard and user_id = b) < now() - interval '1 day' then
    raise exception 'FAIL: an expired ask could not be sent again';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
