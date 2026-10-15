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
  test_night date := current_date;
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

  -- a reads only a's own member rows, never b's or c's.
  select count(*) into n from public.we_members where user_id <> a;
  if n <> 0 then raise exception 'FAIL: a read % member rows that were not a''s', n; end if;

  -- All card: b said nope, so a's did does not finish it.
  ok := public.we_answer(card, night, 'did') > 0;
  if ok then raise exception 'FAIL: an all card finished with a nope on it'; end if;

  -- Any card: one did is enough.
  n := public.we_answer(anycard, night, 'did');
  if n <> 2 then raise exception 'FAIL: an any card did not say this did finished it: %', n; end if;
  n := public.we_answer(anycard, night, 'did');
  if n <> 1 then raise exception 'FAIL: a repeat did said it finished again: %', n; end if;
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
  ok := public.we_answer(turncard, night, 'did') > 0;
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
  -- Two nights back is past the grace night.
  begin
    perform public.we_nudge(card, b, night - 2);
    raise exception 'FAIL: nudged for a closed night';
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
  begin
    perform public.we_reply(countcard, true);
    raise exception 'FAIL: said yes to an expired ask without an error';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm not like '%ask has closed%' then raise exception 'FAIL: wrong error for a closed ask: %', sqlerrm; end if;
  end;
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

  -- Only the maker edits or closes it; closing drops it for everyone.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_edit(turncard, 'b took it over', 'turns', 'all', 'daily', '{}', null);
    raise exception 'FAIL: b edited a card b did not make';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.we_close(turncard);
    raise exception 'FAIL: b closed a card b did not make';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_edit(turncard, '   ', 'turns', 'all', 'daily', '{}', null);
    raise exception 'FAIL: a blank question saved';
  exception when check_violation then
    null;
  end;
  perform public.we_edit(turncard, 'Did we dry the dishes?', 'turns', 'all', 'weekly', '{6}', null);
  perform public.we_close(turncard);
  execute 'reset role';
  if not (select archived from public.we_cards where id = turncard) then
    raise exception 'FAIL: close did not close';
  end if;
  if (select question from public.we_cards where id = turncard) <> 'Did we dry the dishes?' then
    raise exception 'FAIL: the edit did not save';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from jsonb_array_elements(public.we_tonight(night)) x where x->>'id' = turncard::text;
  if n <> 0 then raise exception 'FAIL: b still saw a closed card'; end if;
  execute 'reset role';

  -- Did we pushes follow their own switch, not Did yous from friends.
  update public.profiles set prefs = jsonb_build_object('pingsOff', jsonb_build_array('sends')) where user_id = b;
  if not public.push_wanted(b, 'we') then raise exception 'FAIL: sends off turned Did we off'; end if;
  update public.profiles set prefs = jsonb_build_object('pingsOff', jsonb_build_array('we')) where user_id = b;
  if public.push_wanted(b, 'we') then raise exception 'FAIL: the Did we switch did nothing'; end if;

  -- A card nobody answered for 3 due nights pauses, and a member can restart it.
  insert into public.we_cards (made_by, question, starts_on) values (a, 'Did we stretch?', night - 10)
  returning id into card;
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card, a, 'in', now() - interval '10 days'), (card, b, 'in', now() - interval '10 days');
  if not public.we_paused(card, night) then raise exception 'FAIL: 3 quiet nights did not pause'; end if;
  insert into public.we_answers (card_id, user_id, night, status) values (card, b, night - 2, 'nope');
  if public.we_paused(card, night) then raise exception 'FAIL: a nope 2 nights back still paused'; end if;
  if not public.we_paused(card, night + 3) then raise exception 'FAIL: 3 more quiet nights did not pause'; end if;
  delete from public.we_answers where card_id = card;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select (x->>'paused')::boolean into ok from jsonb_array_elements(public.we_tonight(night)) x where x->>'id' = card::text;
  if not ok then raise exception 'FAIL: we_tonight did not say paused'; end if;
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = test_night and w.paused) then
    raise exception 'FAIL: my_we_nights did not mark tonight paused';
  end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = test_night - 9 and w.paused) then
    raise exception 'FAIL: an early night was marked paused';
  end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_restart(card);
    raise exception 'FAIL: a stranger restarted a card';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_restart(card);
  select (x->>'paused')::boolean into ok from jsonb_array_elements(public.we_tonight(night)) x where x->>'id' = card::text;
  if ok then raise exception 'FAIL: restart did not unpause'; end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = test_night and w.paused) then
    raise exception 'FAIL: tonight still paused after restart';
  end if;
  execute 'reset role';

  -- An all card with only the maker on it is not done together.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we nap?', 'all', 'waiting', 'daily', '{}', null, '{}');
  if public.we_answer(card, night, 'did') <> 0 then raise exception 'FAIL: an all card finished with one person'; end if;

  -- The maker's night sets the start, kept to a day either side.
  card := public.we_make('Did we plan?', 'all', 'waiting', 'daily', '{}', null, '{}', night - 30);
  execute 'reset role';
  if (select starts_on from public.we_cards where id = card) <> current_date - 1 then
    raise exception 'FAIL: a far start was not clamped';
  end if;

  -- A closed card takes no answers.
  update public.we_cards set archived = true where id = card;
  execute 'set local role authenticated';
  begin
    perform public.we_answer(card, night, 'did');
    raise exception 'FAIL: answered a closed card';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- A turn kept for a night stays when someone new joins.
  turncard := public.we_make('Did we cook?', 'turns', 'all', 'daily', '{}', null, '{}');
  update public.we_cards set starts_on = night - 1 where id = turncard;
  -- Turns are kept once two people take them; one alone keeps nothing.
  perform public.we_pin_turns(turncard, night, night);
  if exists (select 1 from public.we_turns t where t.card_id = turncard) then
    raise exception 'FAIL: kept a turn with one person on the card';
  end if;
  insert into public.we_members (card_id, user_id, state, turn, joined_at) values (turncard, b, 'in', 5, now())
  on conflict (card_id, user_id) do update set state = 'in', turn = 5;
  perform public.we_pin_turns(turncard, night, night);
  turn_now := public.we_turn(turncard, night);
  -- The order changes (as a new join would): tonight stays with who had it.
  update public.we_members set turn = -1 where card_id = turncard and user_id <> turn_now;
  if public.we_turn(turncard, night) is distinct from turn_now then
    raise exception 'FAIL: tonight''s turn moved when someone joined';
  end if;

  -- Leaving settles tonight again: a stale done night goes.
  card := public.we_make('Did we tidy?', 'any', 'waiting', 'daily', '{}', null, '{}');
  insert into public.we_members (card_id, user_id, state, joined_at) values (card, b, 'in', now());
  insert into public.we_answers (card_id, user_id, night, status) values (card, b, night, 'did');
  insert into public.we_done (card_id, night) values (card, night);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_leave(card);
  execute 'reset role';
  if exists (select 1 from public.we_done d where d.card_id = card and d.night = test_night) then
    raise exception 'FAIL: done stayed after the only did left';
  end if;

  -- Marking a night done is server only: a stranger cannot call we_settle.
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_settle(card, night);
    raise exception 'FAIL: a stranger called we_settle';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  -- Someone leaving finishes an all card for the others, and is not credited.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we stretch?', 'all', 'waiting', 'daily', '{}', null, '{}');
  execute 'reset role';
  insert into public.we_members (card_id, user_id, state, joined_at) values (card, b, 'in', now()), (card, c, 'in', now());
  insert into public.we_answers (card_id, user_id, night, status) values (card, a, night, 'did'), (card, b, night, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_leave(card);
  execute 'reset role';
  if not exists (select 1 from public.we_done x where x.card_id = card and x.night = test_night) then
    raise exception 'FAIL: the leave did not finish the card for the two who did';
  end if;
  if exists (select 1 from public.we_done x where x.card_id = card and x.night = test_night and x.finisher is not null) then
    raise exception 'FAIL: the person who left was credited with the finish';
  end if;

  -- Taking an answer back still works after the card was closed.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we sweep?', 'any', 'waiting', 'daily', '{}', null, '{}');
  perform public.we_answer(card, night, 'did');
  execute 'reset role';
  update public.we_cards set archived = true where id = card;
  execute 'set local role authenticated';
  perform public.we_answer(card, night, null);
  execute 'reset role';
  if exists (select 1 from public.we_answers x where x.card_id = card and x.user_id = a and x.night = test_night) then
    raise exception 'FAIL: could not take an answer back on a closed card';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
