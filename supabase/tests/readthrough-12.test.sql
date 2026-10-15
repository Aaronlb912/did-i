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

  -- 1. A token signed in on a second account moves to it.
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
  if n <> 2 then raise exception 'FAIL: moving a token dropped a devices row'; end if;

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

  -- 3. A gift landing mid-claim (after the had marking) waits for the next
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
  select id into tag from public.family_tags where family_id = fam limit 1;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card, c, 'in', a, now());
  insert into public.push_queue (to_id, title, body) values (a, 'hi', 'waiting');
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
  -- Unassigned still works, and Bea still sees the family's questions.
  insert into public.family_lamps (family_id, tag_id, question, made_by)
  values (fam, tag, 'Did we tidy?', a);
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
