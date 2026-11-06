-- Checks for supabase/leave-keep.sql: finished nights survive leaving a Did we
-- or the maker ending it (and nothing after the leave comes back), a handoff
-- to a new parent is pushed, and a person a parent removes is told.
-- Run with: node scripts/test-sql.mjs supabase/tests/leave-keep.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  day0 date := current_date;
  card uuid;
  card2 uuid;
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

  -- Two cards, Ann and Ben on both.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we feed the cat?', 'any', 'all', 'daily', '{}', null, array[b]);
  card2 := public.we_make('Did we stretch?', 'any', 'all', 'daily', '{}', null, array[b]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  perform public.we_reply(card2, true);
  execute 'reset role';
  update public.we_cards set starts_on = day0 - 8 where id in (card, card2);
  update public.we_members set joined_at = day0 - 8, asked_at = day0 - 8 where card_id in (card, card2);

  -- Ben leaves the first card: left_at is stamped, the row stays.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_leave(card);
  execute 'reset role';
  if (select left_at from public.we_members where card_id = card and user_id = b) is null then
    raise exception 'FAIL: leaving did not stamp left_at';
  end if;
  if (select left_at from public.we_members where card_id = card and user_id = a) is not null then
    raise exception 'FAIL: someone still on the card got a left_at';
  end if;

  -- Pretend he left 3 days ago. The card was done 6 to 1 days back; Ben did
  -- 3 days back himself but not 4 or 5 (leaving settles those again without him).
  update public.we_members set left_at = now() - interval '3 days' where card_id = card and user_id = b;
  insert into public.we_done (card_id, night)
  values (card, day0 - 6), (card, day0 - 5), (card, day0 - 4), (card, day0 - 3), (card, day0 - 2), (card, day0 - 1)
  on conflict do nothing;
  insert into public.we_answers (card_id, user_id, night, status) values (card, b, day0 - 3, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if (select count(*) from public.my_we_nights() w where w.card_id = card and w.done
        and w.night in (day0 - 6, day0 - 3)) <> 2 then
    raise exception 'FAIL: nights before the leave were lost';
  end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night in (day0 - 5, day0 - 4)) then
    raise exception 'FAIL: leaving gave credit for a day he missed';
  end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night > day0 - 3) then
    raise exception 'FAIL: nights after the leave came back';
  end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = card and not w.done) then
    raise exception 'FAIL: a left card returned an open night';
  end if;
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card2) then
    raise exception 'FAIL: a card Ben is still on vanished';
  end if;
  -- A left member cannot answer the card any more.
  begin
    perform public.we_answer(card, day0, 'did');
    raise exception 'FAIL: a left member answered the card';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  execute 'reset role';
  if exists (select 1 from public.we_answers where card_id = card and user_id = b and night = day0) then
    raise exception 'FAIL: a left member answer was saved';
  end if;

  -- Ann asks him again, and he says no: his days stay through both.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_ask(card, b);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = day0 - 6 and w.done) then
    raise exception 'FAIL: a new ask wiped the days he kept';
  end if;
  perform public.we_reply(card, false);
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = day0 - 6 and w.done) then
    raise exception 'FAIL: saying no wiped the days he kept';
  end if;
  execute 'reset role';

  -- Ann, still on it, sees every night as before.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = day0 - 2 and w.done) then
    raise exception 'FAIL: a card Ann is on lost a night';
  end if;
  -- The maker ends the second card: ended_at is stamped.
  perform public.we_close(card2);
  execute 'reset role';
  if (select ended_at from public.we_cards where id = card2) is null then
    raise exception 'FAIL: closing a card did not stamp ended_at';
  end if;
  if (select ended_at from public.we_cards where id = card) is not null then
    raise exception 'FAIL: a card still open has an ended_at';
  end if;

  -- It ended 3 days ago; nights up to then stay for the people on it, none after.
  update public.we_cards set ended_at = now() - interval '3 days' where id = card2;
  insert into public.we_done (card_id, night)
  values (card2, day0 - 5), (card2, day0 - 3), (card2, day0 - 1)
  on conflict do nothing;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card2 and w.night = day0 - 5 and w.done)
     or not exists (select 1 from public.my_we_nights() w where w.card_id = card2 and w.night = day0 - 3 and w.done) then
    raise exception 'FAIL: an ended card lost its nights up to the end';
  end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = card2 and w.night > day0 - 3) then
    raise exception 'FAIL: nights after a card ended came back';
  end if;
  execute 'reset role';

  -- A card closed before this change has no stamp and stays out, as before.
  update public.we_cards set ended_at = null where id = card2;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if exists (select 1 from public.my_we_nights() w where w.card_id = card2) then
    raise exception 'FAIL: a card with no end stamp came back';
  end if;
  execute 'reset role';

  -- Family pushes. Ann is the parent; Ben, Cal and Dee are kids.
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role)
  values (fam, a, 'parent'), (fam, b, 'kid'), (fam, c, 'kid'), (fam, d, 'kid');
  delete from public.push_queue;

  -- A handoff: someone else made a parent is told; a change to yourself is not.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  update public.family_members set role = 'parent' where family_id = fam and user_id = b;
  if not exists (select 1 from public.push_queue where to_id = b and body = 'You are now a parent in Test.' and go = '/people') then
    raise exception 'FAIL: a new parent was not told';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  update public.family_members set role = 'parent' where family_id = fam and user_id = c;
  if exists (select 1 from public.push_queue where to_id = c) then
    raise exception 'FAIL: a change to yourself was pushed';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  update public.family_members set role = 'parent' where family_id = fam and user_id = b;
  if (select count(*) from public.push_queue where to_id = b) <> 1 then
    raise exception 'FAIL: a role that did not change was pushed';
  end if;
  update public.family_members set role = 'kid' where family_id = fam and user_id = b;
  update public.family_members set role = 'parent' where family_id = fam and user_id = b;
  if (select count(*) from public.push_queue where to_id = b) <> 1 then
    raise exception 'FAIL: making someone a parent again the same day pushed again';
  end if;

  -- A parent removing someone tells them; leaving yourself does not.
  delete from public.family_members where family_id = fam and user_id = d;
  if not exists (select 1 from public.push_queue where to_id = d and body = 'You are no longer in Test.' and go = '/people') then
    raise exception 'FAIL: a removed person was not told';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  delete from public.family_members where family_id = fam and user_id = c;
  if exists (select 1 from public.push_queue where to_id = c) then
    raise exception 'FAIL: leaving yourself pushed you';
  end if;
  if not exists (select 1 from public.push_queue where body = 'Cal left your family.') then
    raise exception 'FAIL: the leave push to the family is gone';
  end if;

  -- A parent blocking someone removes them without telling them.
  insert into public.family_members (family_id, user_id, role) values (fam, c, 'kid');
  delete from public.push_queue where to_id = c;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.blocks (blocker, blocked) values (a, c);
  delete from public.family_members where family_id = fam and user_id = c;
  if exists (select 1 from public.push_queue where to_id = c) then
    raise exception 'FAIL: a blocked person was told they were removed';
  end if;

  -- Deleting the whole family is not a removal.
  insert into public.family_members (family_id, user_id, role) values (fam, d, 'kid');
  delete from public.push_queue where to_id = d;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from public.families where id = fam;
  perform set_config('request.jwt.claims', '', true);
  if exists (select 1 from public.push_queue where body like 'You are no longer in%') then
    raise exception 'FAIL: deleting a family pushed a removal';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
