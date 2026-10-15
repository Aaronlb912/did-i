-- Checks for supabase/readthrough-12.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/readthrough-12.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  tag uuid;
  card uuid;
  card2 uuid;
  card3 uuid;
  lamp uuid;
  lamp2 uuid;
  n integer;
  ok boolean;
  st text;
  s integer;
  d date;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b), (c) on conflict (user_id) do nothing;

  -- 1. A token signed in on a second account moves to it, and never sits on
  -- two rows, even two of the same account's.
  insert into public.devices (user_id, device_key, push_token) values (a, 'k0', 'tok12');
  insert into public.devices (user_id, device_key, push_token) values (a, 'k1', 'tok12');
  insert into public.devices (user_id, device_key, push_token) values (b, 'k2', 'tok12');
  select count(*) into n from public.devices where user_id = a and push_token is not null;
  if n <> 0 then raise exception 'FAIL: A kept the token B signed in with'; end if;
  select count(*) into n from public.devices where user_id = b and push_token = 'tok12';
  if n <> 1 then raise exception 'FAIL: B did not get the token'; end if;
  update public.devices set push_token = 'tok12' where user_id = a and device_key = 'k1';
  select count(*) into n from public.devices where user_id = b and push_token is not null;
  if n <> 0 then raise exception 'FAIL: an update did not move the token back'; end if;
  select count(*) into n from public.devices where user_id in (a, b);
  if n <> 3 then raise exception 'FAIL: moving a token dropped a devices row'; end if;
  select count(*) into n from public.devices where push_token = 'tok12';
  if n <> 1 then raise exception 'FAIL: one token sits on % rows', n; end if;

  -- 2. known_people hides streak and done_on when share_streak is off.
  insert into public.friend_links (from_id, to_id, state) values (a, c, 'ok');
  update public.profiles set share_streak = false, streak = 5, done_on = current_date where user_id = c;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select k.streak, k.done_on into s, d from public.known_people() k where k.user_id = c;
  execute 'reset role';
  if s is not null or d is not null then raise exception 'FAIL: hidden streak showed % %', s, d; end if;
  update public.profiles set share_streak = true where user_id = c;
  execute 'set local role authenticated';
  select k.streak, k.done_on into s, d from public.known_people() k where k.user_id = c;
  execute 'reset role';
  if s is distinct from 5 or d is distinct from current_date then raise exception 'FAIL: shared streak hidden'; end if;

  -- 3. Caps: cap_cheer_gifts allows 5 in a day per recipient, cap_gifts_out
  -- 10 out a day per giver; neither checks auth. Two gifts to b from fresh
  -- givers stay under both.
  -- A gift landing mid-claim (after the had marking) waits for the next
  -- claim, where it is a duplicate and paid back.
  execute $f$
    create function pg_temp.rt12_late() returns trigger
    language plpgsql security definer set search_path = public as $b$
    begin
      if current_setting('rt12.late', true) = 'go' then
        perform set_config('rt12.late', 'done', true);
        insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, gems)
        values (current_setting('rt12.to')::uuid, current_setting('rt12.from')::uuid, 'owl', 'buddy', 5);
      end if;
      return null;
    end;
    $b$
  $f$;
  execute 'create trigger rt12_late after update on public.cheer_gifts
    for each statement execute function pg_temp.rt12_late()';
  update public.profiles set gem_balance = 0 where user_id = c;
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, gems) values (b, a, 'owl', 'buddy', 5);
  perform set_config('rt12.to', b::text, true);
  perform set_config('rt12.from', c::text, true);
  perform set_config('rt12.late', 'go', true);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_gifts();
  execute 'reset role';
  execute 'drop trigger rt12_late on public.cheer_gifts';
  if current_setting('rt12.late', true) <> 'done' then raise exception 'FAIL: late gift never landed'; end if;
  if n <> 1 then raise exception 'FAIL: first claim opened % gifts, wanted 1', n; end if;
  select count(*) into n from public.cheer_gifts where to_id = b and from_id = c and claimed_at is null;
  if n <> 1 then raise exception 'FAIL: the late gift was opened with had null'; end if;
  execute 'set local role authenticated';
  select count(*) into n from public.claim_gifts();
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL: the duplicate was handed over'; end if;
  select gem_balance into n from public.profiles where user_id = c;
  if n <> 5 then raise exception 'FAIL: the late duplicate paid back % gems', n; end if;

  -- 4. Did we note helpers say nothing to someone off the card.
  insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), a, 'Did we walk?') returning id into card;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at)
  values (card, a, 'in', a, now()), (card, b, 'in', a, now());
  insert into public.we_answers (card_id, user_id, night, status) values (card, b, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.we_note_in(card, b) or public.we_note_did(card, b, current_date) then
    raise exception 'FAIL: a stranger read a Did we card';
  end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not (public.we_note_in(card, b) and public.we_note_did(card, b, current_date)) then
    raise exception 'FAIL: a member lost the Did we note checks';
  end if;
  execute 'reset role';

  -- 5. Bea (kid) blocks Ann (parent).
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, b, 'kid');
  -- A direct families insert has no folder; create_family (people.sql) adds one.
  insert into public.family_tags (family_id, title) values (fam, 'Test') returning id into tag;
  insert into public.family_lamps (family_id, tag_id, question, made_by, for_id)
  values (fam, tag, 'Did you brush?', a, b) returning id into lamp;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card, c, 'in', a, now());
  -- A waiting ask from Bea to Ann on a card only Bea is on.
  insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), b, 'Did we run?') returning id into card3;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card3, b, 'in', b, now());
  insert into public.we_members (card_id, user_id, state, asked_by, asked_at) values (card3, a, 'asked', b, now());
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.block_person(a, '');
  execute 'reset role';

  -- 5b. Bea is out of the shared card; Ann and Cal keep it.
  select state into st from public.we_members where card_id = card and user_id = b;
  if st <> 'left' then raise exception 'FAIL: blocker still on the shared card (%)', st; end if;
  select count(*) into n from public.we_members where card_id = card and state = 'in';
  if n <> 2 then raise exception 'FAIL: the others lost the card (% in)', n; end if;
  if (select archived from public.we_cards where id = card) then raise exception 'FAIL: card closed'; end if;
  select state into st from public.we_members where card_id = card3 and user_id = a;
  if st <> 'left' then raise exception 'FAIL: a waiting ask survived the block (%)', st; end if;
  if (select said_no_at from public.we_members where card_id = card3 and user_id = a) is not null then
    raise exception 'FAIL: the block counted as a no';
  end if;

  -- 5a. Ann can not assign Bea a family question.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  ok := false;
  begin
    insert into public.family_lamps (family_id, tag_id, question, made_by, for_id)
    values (fam, tag, 'Did you read?', a, b);
  exception when insufficient_privilege or check_violation then
    ok := true;
  end;
  if not ok then raise exception 'FAIL: blocked parent assigned a question'; end if;
  -- Unassigned still works, and so does editing the words of a question
  -- Bea already had; moving one to Bea does not.
  insert into public.family_lamps (family_id, tag_id, question, made_by)
  values (fam, tag, 'Did we tidy?', a) returning id into lamp2;
  update public.family_lamps set question = 'Did you floss?' where id = lamp;
  if not found then raise exception 'FAIL: an edit to an assigned question was refused'; end if;
  ok := false;
  begin
    update public.family_lamps set for_id = b where id = lamp2;
  exception when insufficient_privilege then
    ok := true;
  end;
  if not ok then raise exception 'FAIL: blocked parent moved a question to the kid'; end if;
  -- we_ask refuses the pair (we_can_ask checks blocked_with).
  ok := false;
  begin
    perform public.we_ask(card, b);
  exception when others then
    ok := sqlerrm = 'can only ask friends or family';
  end;
  if not ok then raise exception 'FAIL: we_ask let a blocked pair through'; end if;
  execute 'reset role';

  -- 5c and 5d. Pushes across the block are dropped; server pushes are not.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), a, 'Did we cook?') returning id into card2;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card2, a, 'in', a, now());
  insert into public.we_members (card_id, user_id, state, asked_by, asked_at) values (card2, b, 'asked', a, now());
  select count(*) into n from public.push_queue where to_id = b;
  if n <> 0 then raise exception 'FAIL: a Did we ask pushed across a block'; end if;
  insert into public.push_queue (to_id, from_id, title, body) values (b, a, 'hi', 'from a');
  insert into public.push_queue (to_id, from_id, title, body) values (a, b, 'hi', 'from b');
  select count(*) into n from public.push_queue where (to_id = b and from_id = a) or (to_id = a and from_id = b);
  if n <> 0 then raise exception 'FAIL: % pushes crossed the block', n; end if;
  perform set_config('request.jwt.claims', '', true);
  insert into public.push_queue (to_id, title, body) values (b, 'Did I', 'nightly');
  select count(*) into n from public.push_queue where to_id = b and from_id is null;
  if n <> 1 then raise exception 'FAIL: a server push was dropped'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
