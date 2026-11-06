-- Checks for supabase/family-share.sql: taking someone out of a family takes
-- them off the kid's cards and voids their asks, the maker can take a member
-- off a card, widening a card to every answer is stamped and pushed once,
-- an old ask reads as expired, and a kid's link shows no name signed out.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/family-share.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  p uuid := gen_random_uuid();
  k uuid := gen_random_uuid();
  s uuid := gen_random_uuid();
  f uuid := gen_random_uuid();
  g uuid := gen_random_uuid();
  h uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  card1 uuid;
  card2 uuid;
  card3 uuid;
  card7 uuid;
  card8 uuid;
  crd jsonb;
  left_before integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (p, p || '@test.invalid', 'authenticated', 'authenticated'),
    (k, k || '@test.invalid', 'authenticated', 'authenticated'),
    (s, s || '@test.invalid', 'authenticated', 'authenticated'),
    (f, f || '@test.invalid', 'authenticated', 'authenticated'),
    (g, g || '@test.invalid', 'authenticated', 'authenticated'),
    (h, h || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name)
  values (p, 'Pat'), (k, 'Kit'), (s, 'Sam'), (f, 'Fay'), (g, 'Gus'), (h, 'Hal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  -- p and s are parents or kids in one family with k; f, g, h are p's friends.
  insert into public.friend_links (from_id, to_id, state)
  values (p, f, 'ok'), (p, g, 'ok'), (p, h, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role)
  values (fam, p, 'parent'), (fam, k, 'kid'), (fam, s, 'kid');

  -- Sam makes a card with Kit, and Pat makes one that asks both ------------
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card1 := public.we_make('Did we walk?', 'all', 'waiting', 'daily', '{}', null, array[k]);
  -- A card with only Sam on it: no kid, never touched.
  card3 := public.we_make('Did we stretch?', 'all', 'waiting', 'daily', '{}', null, '{}');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card1, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card2 := public.we_make('Did we read?', 'all', 'waiting', 'daily', '{}', null, array[k, s]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card2, true);
  execute 'reset role';

  -- Pat takes Sam out of the family ----------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  delete from public.family_members where family_id = fam and user_id = s;

  if (select state from public.we_members where card_id = card1 and user_id = s) <> 'left' then
    raise exception 'FAIL: a removed person stayed on the kid card';
  end if;
  if (select made_by from public.we_cards where id = card1) is distinct from k then
    raise exception 'FAIL: the card did not pass to the kid after its maker was removed';
  end if;
  if (select state from public.we_members where card_id = card1 and user_id = k) <> 'in' then
    raise exception 'FAIL: the kid came off their own card';
  end if;
  if (select state from public.we_members where card_id = card2 and user_id = s) <> 'left' then
    raise exception 'FAIL: a waiting ask to a kid card stayed after removal';
  end if;
  if (select state from public.we_members where card_id = card3 and user_id = s) <> 'in' then
    raise exception 'FAIL: a card with no kid on it was changed';
  end if;

  -- The ask cannot be taken up after removal -------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_reply(card2, true);
    raise exception 'FAIL: accepted an ask to a kid card after removal';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';
  -- Even a waiting ask that was put back by hand fails the kid rule.
  update public.we_members set state = 'asked', asked_at = now() where card_id = card2 and user_id = s;
  execute 'set local role authenticated';
  begin
    perform public.we_reply(card2, true);
    raise exception 'FAIL: we_reply let a non-family person onto a kid card';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'kid card is family only' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  execute 'reset role';

  -- Maker takes a member off ------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card7 := public.we_make('Did we drink water?', 'all', 'waiting', 'daily', '{}', null, array[f, g, h]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card7, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card7, true);
  -- Not the maker: refused.
  begin
    perform public.we_drop(card7, f);
    raise exception 'FAIL: a member took someone off a card they did not make';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'only the person who made it can change it' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  execute 'reset role';

  -- Widening to every answer is stamped, and the others hear once ----------
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit3(card7, 'Did we drink water?', 'all', 'all', 'daily', '{}', null, null, null);
  execute 'reset role';
  if (select shows_by from public.we_cards where id = card7) is distinct from p
     or (select shows_at from public.we_cards where id = card7) is null then
    raise exception 'FAIL: widening to every answer was not stamped';
  end if;
  if (select count(*) from public.push_queue where to_id = g and body like '%set it to show every answer%') <> 1 then
    raise exception 'FAIL: the other member was not told once';
  end if;
  if exists (select 1 from public.push_queue where to_id = p and body like '%set it to show every answer%') then
    raise exception 'FAIL: the person who changed it was told';
  end if;
  execute 'set local role authenticated';
  perform public.we_edit3(card7, 'Did we drink water?', 'all', 'waiting', 'daily', '{}', null, null, null);
  perform public.we_edit3(card7, 'Did we drink water?', 'all', 'all', 'daily', '{}', null, null, null);
  execute 'reset role';
  if (select count(*) from public.push_queue where to_id = g and body like '%set it to show every answer%') <> 1 then
    raise exception 'FAIL: widening again the same day told them again';
  end if;
  execute 'set local role authenticated';
  select c.value into crd from jsonb_array_elements(public.we_tonight(current_date)) c where c.value ->> 'id' = card7::text;
  if crd ->> 'showsAt' is null or crd ->> 'showsByName' <> 'Pat' then
    raise exception 'FAIL: we_tonight does not say who widened it';
  end if;

  -- Off count to waiting is stamped and told with its own words ------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card8 := public.we_make('Did we call mum?', 'all', 'count', 'daily', '{}', null, array[g]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card8, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit3(card8, 'Did we call mum?', 'all', 'waiting', 'daily', '{}', null, null, null);
  execute 'reset role';
  if (select shows_by from public.we_cards where id = card8) is distinct from p then
    raise exception 'FAIL: widening off count was not stamped';
  end if;
  if (select count(*) from public.push_queue where to_id = g and body like '%set it to show who did it%') <> 1 then
    raise exception 'FAIL: widening off count did not tell the other member once';
  end if;

  -- An ask older than 14 days reads as expired, and can be sent again ------
  execute 'reset role';
  update public.we_members set asked_at = now() - interval '15 days' where card_id = card7 and user_id = h;
  execute 'set local role authenticated';
  select c.value into crd from jsonb_array_elements(public.we_tonight(current_date)) c where c.value ->> 'id' = card7::text;
  if (select (x ->> 'expired')::boolean from jsonb_array_elements(crd -> 'people') x where x ->> 'id' = h::text) is not true then
    raise exception 'FAIL: a 15 day old ask is not marked expired';
  end if;
  if (select (x ->> 'expired')::boolean from jsonb_array_elements(crd -> 'people') x where x ->> 'id' = g::text) is not false then
    raise exception 'FAIL: a member is marked expired';
  end if;
  perform public.we_ask(card7, h);
  select c.value into crd from jsonb_array_elements(public.we_tonight(current_date)) c where c.value ->> 'id' = card7::text;
  if (select (x ->> 'expired')::boolean from jsonb_array_elements(crd -> 'people') x where x ->> 'id' = h::text) is not false then
    raise exception 'FAIL: asking again did not clear expired';
  end if;

  -- Pat takes Fay off, and a waiting ask is voided too ---------------------
  execute 'reset role';
  insert into public.friend_links (from_id, to_id, state) values (f, g, 'ok');
  select count(*) into left_before from public.push_queue where to_id = p and body like '% left: %';
  execute 'set local role authenticated';
  perform public.we_drop(card7, f);
  perform public.we_drop(card7, h);
  execute 'reset role';
  if (select count(*) from public.push_queue where to_id = p and body like '% left: %') <> left_before then
    raise exception 'FAIL: the person who took someone off was told they left';
  end if;
  if exists (select 1 from public.push_queue where to_id = f and body like '% left: %') then
    raise exception 'FAIL: the person taken off was told they left';
  end if;
  if (select count(*) from public.push_queue where to_id = g and body like '% left: %') <> 1 then
    raise exception 'FAIL: the others were not told once that Fay left';
  end if;
  if (select state from public.we_members where card_id = card7 and user_id = f) <> 'left'
     or (select state from public.we_members where card_id = card7 and user_id = h) <> 'left' then
    raise exception 'FAIL: the maker could not take people off';
  end if;
  if (select left_at from public.we_members where card_id = card7 and user_id = f) is null then
    raise exception 'FAIL: taking someone off did not keep their days (left_at)';
  end if;
  if (select state from public.we_members where card_id = card7 and user_id = g) <> 'in' then
    raise exception 'FAIL: taking Fay off took Gus off too';
  end if;
  -- Fay can be asked again.
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_ask(card7, f);
  execute 'reset role';
  if (select state from public.we_members where card_id = card7 and user_id = f) <> 'asked' then
    raise exception 'FAIL: someone taken off could not be asked again';
  end if;

  -- A kid's link shows no name or photo signed out --------------------------
  insert into public.we_links (code, card_id, made_by) values ('kidlinkhide1', card1, k);
  update public.profiles set avatar_url = 'https://lsvvxslgizihbktqoybt.supabase.co/storage/v1/object/public/avatars/' || k::text || '/kit.png' where user_id = k;
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role anon';
  if exists (select 1 from public.look_up_we_link('kidlinkhide1') l where l.name is not null or l.avatar_url is not null) then
    raise exception 'FAIL: a kid link showed a name or photo signed out';
  end if;
  if not exists (select 1 from public.look_up_we_link('kidlinkhide1') l where l.question is not null) then
    raise exception 'FAIL: a kid link stopped showing its question';
  end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.look_up_we_link('kidlinkhide1') l where l.name = 'Kit') then
    raise exception 'FAIL: a signed in person lost the name on a kid link';
  end if;
  execute 'reset role';
  -- A signed in person outside the kid's family sees no name or photo either.
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if exists (select 1 from public.look_up_we_link('kidlinkhide1') l where l.name is not null or l.avatar_url is not null) then
    raise exception 'FAIL: a kid link showed a name or photo to someone outside the family';
  end if;
  execute 'reset role';
  -- An adult's link still shows the name signed out.
  insert into public.we_links (code, card_id, made_by) values ('adultlink123', card7, p);
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role anon';
  if not exists (select 1 from public.look_up_we_link('adultlink123') l where l.name = 'Pat') then
    raise exception 'FAIL: an adult link lost its name signed out';
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
