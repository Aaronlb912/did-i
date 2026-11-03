-- Checks for supabase/we-monthly.sql: monthly Did we cards, changing a
-- card's schedule, the streak carry and the 3 a day cap.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/we-monthly.test.sql
-- Needs we-monthly.sql applied first. One DO block that always ends by
-- raising, so every made-up person and row is rolled back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  e uuid := gen_random_uuid();
  p uuid := gen_random_uuid();
  k uuid := gen_random_uuid();
  f uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  card uuid;
  card3 uuid;
  card4 uuid;
  card5 uuid;
  card6 uuid;
  card7 uuid;
  card8 uuid;
  card9 uuid;
  card10 uuid;
  card13 uuid;
  card14 uuid;
  card15 uuid;
  card16 uuid;
  card18 uuid;
  card19 uuid;
  ls15 date;
  t1 uuid;
  t2 uuid;
  fn text;
  r text;
  m1 date := current_date - extract(day from current_date)::integer + 1;
  mm1 date;
  mm2 date;
  mm3 date;
  ls date;
  ls8 date;
  j jsonb;
  n integer;
  coins_before integer;
  coins_after integer;
begin
  mm1 := (m1 - interval '1 month')::date;
  mm2 := (m1 - interval '2 month')::date;
  mm3 := (m1 - interval '3 month')::date;

  insert into auth.users (id, email, aud, role)
  select u, u || '@test.invalid', 'authenticated', 'authenticated'
  from unnest(array[a, b, c, e, p, k, f]) u;
  insert into public.profiles (user_id, display_name)
  values (a, 'Ann'), (b, 'Ben'), (c, 'Cal'), (e, 'Eve'), (p, 'Pat'), (k, 'Kit'), (f, 'Fay')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state)
  values (a, b, 'ok'), (a, c, 'ok'), (e, b, 'ok'), (p, f, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, p, 'parent'), (fam, k, 'kid');

  -- 1. A monthly card is made; yearly is refused ---------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we call mom?', 'all', 'all', 'monthly', '{}', null, array[b]);
  begin
    perform public.we_make('Did we call dad?', 'all', 'all', 'yearly', '{}', null, array[b]);
    raise exception 'FAIL: a yearly card was made';
  exception when check_violation then
    null;
  end;
  card3 := public.we_make('Did we eat out?', 'most', 'all', 'monthly', '{}', null, array[b, c]);
  card4 := public.we_make('Did we pay up?', 'all', 'all', 'monthly', '{}', null, array[b]);
  card5 := public.we_make('Did we swap?', 'turns', 'all', 'monthly', '{}', null, array[b]);
  card6 := public.we_make('Did we save?', 'all', 'all', 'monthly', '{}', null, array[b]);
  card7 := public.we_make('Did we visit?', 'all', 'all', 'weekly', array[extract(dow from current_date)::smallint], null, array[b]);
  card8 := public.we_make('Did we write?', 'all', 'all', 'weekly', array[extract(dow from current_date)::smallint], null, array[b]);
  execute 'reset role';
  if (select cadence from public.we_cards where id = card) <> 'monthly' then
    raise exception 'FAIL: the card is not monthly';
  end if;

  foreach card in array array[card, card3, card4, card5, card6, card7, card8] loop
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.we_reply(card, true);
    execute 'reset role';
  end loop;
  card := (select id from public.we_cards where question = 'Did we call mom?' and made_by = a);
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card3, true);
  execute 'reset role';

  -- The card reads right in tonight.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select x into j from jsonb_array_elements(public.we_tonight(current_date)) x where x->>'id' = card::text;
  execute 'reset role';
  if j->>'cadence' <> 'monthly' or j->>'slot' <> m1::text then
    raise exception 'FAIL: tonight does not show the month slot (%)', j;
  end if;
  if (j->>'periodEnd')::date <> (m1 + interval '1 month' - interval '1 day')::date then
    raise exception 'FAIL: wrong period end (%)', j->>'periodEnd';
  end if;
  if j->>'makerName' <> 'Ann' or j->>'maker_name' <> 'Ann' then
    raise exception 'FAIL: no maker name (%)', j;
  end if;
  if (j->'people'->0->>'id') is null then
    raise exception 'FAIL: people carry no id';
  end if;
  if (j->>'due')::boolean is not true then
    raise exception 'FAIL: the month is open, so the card is due';
  end if;

  -- 2. A Did early in the month and again later is one row on the 1st -------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card, current_date, 'did');
  if n <> 0 then raise exception 'FAIL: one did finished an all card (%)', n; end if;
  n := public.we_answer(card, current_date - 1, 'did');
  execute 'reset role';
  if (select count(*) from public.we_answers where card_id = card and user_id = a) <> 1 then
    raise exception 'FAIL: two dids made more than one row';
  end if;
  if not exists (select 1 from public.we_answers where card_id = card and user_id = a and night = m1 and status = 'did') then
    raise exception 'FAIL: the did is not on the 1st';
  end if;

  -- 3. all and most finish when the dids come on different days -------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card, current_date - 1, 'did');
  execute 'reset role';
  if n <> 2 or not exists (select 1 from public.we_done where card_id = card and night = m1) then
    raise exception 'FAIL: all card not done after both dids (%)', n;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card3, current_date, 'did');
  if n <> 0 then raise exception 'FAIL: one of three finished a most card (%)', n; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card3, current_date - 1, 'did');
  execute 'reset role';
  if n <> 2 or not exists (select 1 from public.we_done where card_id = card3 and night = m1) then
    raise exception 'FAIL: most card not done with 2 of 3 (%)', n;
  end if;

  -- 4. A Not yet does not end the month; a later Did counts -----------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card4, current_date, 'nope');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card4, current_date, 'did');
  execute 'reset role';
  if n <> 0 or exists (select 1 from public.we_done where card_id = card4) then
    raise exception 'FAIL: a not yet and a did finished an all card';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card4, current_date - 1, 'did');
  execute 'reset role';
  if n <> 2 or not exists (select 1 from public.we_done where card_id = card4 and night = m1) then
    raise exception 'FAIL: a later did did not count after a not yet (%)', n;
  end if;

  -- 5. In turns mode the turn moves monthly ----------------------------------
  if public.we_turn(card5, m1) <> a then
    raise exception 'FAIL: the maker should have this month';
  end if;
  if public.we_turn(card5, (m1 + interval '1 month')::date) <> b then
    raise exception 'FAIL: the turn should move to the other person next month';
  end if;
  if public.we_turn(card5, (m1 + interval '2 month')::date) <> a then
    raise exception 'FAIL: the turn should come back round';
  end if;

  -- 6. Three months in a row is 3; a missed month resets it ----------------
  update public.we_cards set starts_on = mm3 where id = card6;
  insert into public.we_done (card_id, night) values (card6, mm2), (card6, mm1), (card6, m1);
  select streak into n from public.we_streaks(card6, current_date);
  if n <> 3 then raise exception 'FAIL: three months in a row should be 3, got %', n; end if;
  delete from public.we_done where card_id = card6 and night = mm1;
  select streak into n from public.we_streaks(card6, current_date);
  if n <> 1 then raise exception 'FAIL: a missed month should reset to 1, got %', n; end if;
  delete from public.we_done where card_id = card6 and night = m1;
  select streak into n from public.we_streaks(card6, current_date);
  if n <> 0 then raise exception 'FAIL: a missed month then an open one should be 0, got %', n; end if;
  insert into public.we_done (card_id, night) values (card6, mm1), (card6, m1);
  select streak into n from public.we_streaks(card6, current_date);
  if n <> 3 then raise exception 'FAIL: restored months should be 3, got %', n; end if;

  -- 7. Weekly to monthly mid-month, last old slot done ---------------------
  ls := current_date - 3;
  while extract(day from ls) = 1 or extract(day from ls - 7) = 1 or extract(day from ls - 14) = 1 loop
    ls := ls - 1;
  end loop;
  update public.we_cards
  set starts_on = ls - 40, weekdays = array[extract(dow from ls)::smallint]
  where id = card7;
  insert into public.we_done (card_id, night) values (card7, ls), (card7, ls - 7), (card7, ls - 14);
  select streak into n from public.we_streaks(card7, current_date);
  if n <> 3 then raise exception 'FAIL: weekly streak before the edit should be 3, got %', n; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card7, 'Did we visit?', 'all', 'all', 'monthly', '{}', null);
  execute 'reset role';
  if (select streak_carry from public.we_cards where id = card7) <> 3 then
    raise exception 'FAIL: carry should be the old streak, 3';
  end if;
  if (select prior_cadence from public.we_cards where id = card7) <> 'weekly'
     or (select schedule_from from public.we_cards where id = card7) <> current_date
     or (select changed_by from public.we_cards where id = card7) <> a then
    raise exception 'FAIL: the old schedule or the change was not kept';
  end if;
  if (select count(*) from public.we_schedule_log where card_id = card7) <> 1 then
    raise exception 'FAIL: the change was not logged';
  end if;
  if (select count(*) from public.we_done where card_id = card7 and night in (ls, ls - 7, ls - 14)) <> 3 then
    raise exception 'FAIL: old weekly nights are no longer done';
  end if;
  select streak into n from public.we_streaks(card7, current_date);
  if n <> 3 then raise exception 'FAIL: the edit changed the streak to %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card7, current_date, 'did');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card7, current_date, 'did');
  execute 'reset role';
  if n <> 2 or not exists (select 1 from public.we_done where card_id = card7 and night = current_date) then
    raise exception 'FAIL: the month did not finish (%)', n;
  end if;
  select streak into n from public.we_streaks(card7, current_date);
  if n <> 4 then raise exception 'FAIL: carry 3 plus this month should be 4, got %', n; end if;

  -- b can read the change log, nobody can write it.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if (select count(*) from public.we_schedule_log where card_id = card7) <> 1 then
    raise exception 'FAIL: a member cannot read the schedule log';
  end if;
  begin
    insert into public.we_schedule_log (card_id, by_user) values (card7, b);
    raise exception 'FAIL: a member wrote the schedule log';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  -- 8. Same, but a slot was missed before the open current one: carry 0 -----
  ls8 := current_date;
  update public.we_cards
  set starts_on = ls8 - 40, weekdays = array[extract(dow from ls8)::smallint]
  where id = card8;
  insert into public.we_done (card_id, night) values (card8, ls8 - 14), (card8, ls8 - 21);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card8, 'Did we write?', 'all', 'all', 'monthly', '{}', null);
  execute 'reset role';
  if (select streak_carry from public.we_cards where id = card8) <> 0 then
    raise exception 'FAIL: carry should be 0 when the last old slot was missed';
  end if;
  select streak into n from public.we_streaks(card8, current_date);
  if n <> 0 then raise exception 'FAIL: streak should be 0, got %', n; end if;

  -- 9. A Did given today before the edit counts toward this month -----------
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card9 := public.we_make('Did we stretch?', 'all', 'all', 'daily', '{}', null, array[b]);
  card10 := public.we_make('Did we plan?', 'all', 'all', 'daily', '{}', null, '{}');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card9, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card9, current_date, 'did');
  perform public.we_edit2(card9, 'Did we stretch?', 'all', 'all', 'monthly', '{}', null);
  -- Saving the same thing again moves nothing and counts nothing twice.
  perform public.we_edit2(card9, 'Did we stretch?', 'all', 'all', 'monthly', '{}', null);
  execute 'reset role';
  if (select count(*) from public.we_answers where card_id = card9 and user_id = e) <> 1
     or not exists (select 1 from public.we_answers where card_id = card9 and user_id = e and night = current_date and status = 'did') then
    raise exception 'FAIL: the did given before the edit is not on this month';
  end if;
  if (select count(*) from public.we_schedule_log where card_id = card9) <> 1 then
    raise exception 'FAIL: saving the same schedule counted as a change';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card9, current_date, 'did');
  execute 'reset role';
  if n <> 2 or not exists (select 1 from public.we_done where card_id = card9 and night = current_date) then
    raise exception 'FAIL: the month did not finish after the moved did (%)', n;
  end if;

  -- 10. The 4th change in a day is refused; a question-only edit is not ------
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card10, 'Did we plan?', 'all', 'all', 'weekly', array[1]::smallint[], null);
  perform public.we_edit2(card10, 'Did we plan?', 'all', 'all', 'weekly', array[2]::smallint[], null);
  perform public.we_edit2(card10, 'Did we plan?', 'all', 'all', 'monthly', '{}', null);
  begin
    perform public.we_edit2(card10, 'Did we plan?', 'all', 'all', 'daily', '{}', null);
    raise exception 'FAIL: a 4th schedule change in a day was allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'schedule_cap' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  perform public.we_edit2(card10, 'Did we plan more?', 'all', 'count', 'monthly', '{}', null);
  execute 'reset role';
  if (select question from public.we_cards where id = card10) <> 'Did we plan more?' then
    raise exception 'FAIL: a question-only edit was refused';
  end if;
  if (select cadence from public.we_cards where id = card10) <> 'monthly' then
    raise exception 'FAIL: the refused change went through';
  end if;

  -- 11. Only the maker edits; the old 7-argument call keeps a card monthly --
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_edit2(card, 'Hijack', 'all', 'all', 'daily', '{}', null);
    raise exception 'FAIL: a member edited a card they did not make';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'only the person who made it can change it' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit(card, 'Did we call mom now?', 'all', 'all', 'daily', '{}', null);
  execute 'reset role';
  if (select cadence from public.we_cards where id = card) <> 'monthly'
     or (select schedule_from from public.we_cards where id = card) is not null then
    raise exception 'FAIL: the old edit call turned a monthly card daily';
  end if;
  if (select question from public.we_cards where id = card) <> 'Did we call mom now?' then
    raise exception 'FAIL: the old edit call did not save the words';
  end if;

  -- 12. The coin claim pays once ---------------------------------------------
  update public.we_cards set streak_carry = 6 where id = card7;
  select coin_balance into coins_before from public.profiles where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_claim(card7, current_date);
  if n <> 5 then raise exception 'FAIL: a 7 streak should pay 5, got %', n; end if;
  n := public.we_claim(card7, current_date);
  if n <> 0 then raise exception 'FAIL: the same month paid twice (%)', n; end if;
  execute 'reset role';
  select coin_balance into coins_after from public.profiles where user_id = a;
  if coins_after - coins_before <> 5 then
    raise exception 'FAIL: coins went up by %', coins_after - coins_before;
  end if;

  -- 13. A kid's monthly card still holds only the kid's family --------------
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card13 := public.we_make('Did we brush?', 'all', 'waiting', 'monthly', '{}', null, array[k]);
  begin
    perform public.we_ask(card13, f);
    raise exception 'FAIL: a non-family friend joined a kid card';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'kid card is family only' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  execute 'reset role';

  -- 14. Daily to monthly part way through the month: the days before the
  -- switch stay daily and do not count for the month ----------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card14 := public.we_make('Did we tidy?', 'all', 'all', 'daily', '{}', null, array[b]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card14, true);
  execute 'reset role';
  update public.we_cards set starts_on = current_date - 5 where id = card14;
  insert into public.we_answers (card_id, user_id, night, status)
  select card14, u, d, 'did' from unnest(array[a, b]) u, unnest(array[current_date - 2, current_date - 1]) d;
  insert into public.we_done (card_id, night) values (card14, current_date - 2), (card14, current_date - 1);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card14, 'Did we tidy?', 'all', 'all', 'monthly', '{}', null);
  select x into j from jsonb_array_elements(public.we_tonight(current_date)) x where x->>'id' = card14::text;
  execute 'reset role';
  if exists (select 1 from public.we_done where card_id = card14 and night >= current_date) then
    raise exception 'FAIL: earlier daily dids finished the monthly period';
  end if;
  if (j->>'slot')::date <> current_date or (j->>'done')::boolean or (j->>'dids')::integer <> 0 then
    raise exception 'FAIL: the monthly period should start empty on the switch day (%)', j;
  end if;
  if j->>'changedByName' <> 'Ann' then
    raise exception 'FAIL: no changedByName (%)', j;
  end if;
  if (select count(*) from public.we_answers where card_id = card14 and night < current_date) <> 4 then
    raise exception 'FAIL: the old daily answers moved';
  end if;
  if (select how from public.we_sched(card14, current_date - 1)) <> 'daily' then
    raise exception 'FAIL: days before the switch no longer read daily';
  end if;

  -- 15. Weekly to monthly, then back to weekly the same day: history and
  -- turns do not change ----------------------------------------------------
  ls15 := current_date - 3;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card15 := public.we_make('Did we take turns?', 'turns', 'all', 'weekly', array[extract(dow from ls15)::smallint], null, array[b]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card15, true);
  execute 'reset role';
  update public.we_cards set starts_on = ls15 - 40 where id = card15;
  t1 := public.we_turn(card15, ls15);
  t2 := public.we_turn(card15, ls15 - 7);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card15, 'Did we take turns?', 'turns', 'all', 'monthly', '{}', null);
  perform public.we_edit2(card15, 'Did we take turns?', 'turns', 'all', 'weekly', array[extract(dow from ls15)::smallint], null);
  execute 'reset role';
  if (select how from public.we_sched(card15, ls15)) <> 'weekly'
     or (select how from public.we_sched(card15, ls15 - 7)) <> 'weekly' then
    raise exception 'FAIL: history before today no longer reads weekly';
  end if;
  if public.we_turn(card15, ls15) is distinct from t1 or public.we_turn(card15, ls15 - 7) is distinct from t2 then
    raise exception 'FAIL: turns changed after changing back';
  end if;
  if jsonb_array_length((select schedule_was from public.we_cards where id = card15)) <> 1
     or (select cadence from public.we_cards where id = card15) <> 'weekly' then
    raise exception 'FAIL: changing back the same day left history or the wrong cadence';
  end if;
  if (select count(*) from public.we_schedule_log where card_id = card15) <> 2 then
    raise exception 'FAIL: both changes should be logged';
  end if;

  -- 16. Daily to weekly on day A, weekly to monthly on a later day B ------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card16 := public.we_make('Did we plant?', 'all', 'all', 'daily', '{}', null, array[b]);
  execute 'reset role';
  update public.we_cards set starts_on = current_date - 20 where id = card16;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card16, 'Did we plant?', 'all', 'all', 'weekly', array[extract(dow from current_date - 1)::smallint], null);
  execute 'reset role';
  -- Move that first change back to day A, 5 days ago.
  update public.we_cards
  set schedule_from = current_date - 5,
      schedule_was = jsonb_build_array(jsonb_build_object('until', current_date - 5, 'cadence', 'daily', 'weekdays', '[]'::jsonb))
  where id = card16;
  update public.we_schedule_log set at = now() - interval '5 days' where card_id = card16;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card16, 'Did we plant?', 'all', 'all', 'monthly', '{}', null);
  execute 'reset role';
  if jsonb_array_length((select schedule_was from public.we_cards where id = card16)) <> 2
     or (select prior_cadence from public.we_cards where id = card16) <> 'weekly' then
    raise exception 'FAIL: two changes should leave two history entries';
  end if;
  if (select how from public.we_sched(card16, current_date - 6)) <> 'daily'
     or (select how from public.we_sched(card16, current_date - 20)) <> 'daily' then
    raise exception 'FAIL: days before A no longer read daily';
  end if;
  if (select how from public.we_sched(card16, current_date - 5)) <> 'weekly'
     or (select how from public.we_sched(card16, current_date - 1)) <> 'weekly'
     or (select how from public.we_sched(card16, current_date)) <> 'monthly' then
    raise exception 'FAIL: the weekly stretch or the monthly start reads wrong';
  end if;

  -- 18. The current slot is still open, the 2 slots before it are done:
  -- the streak is carried ---------------------------------------------------
  -- Made by hand: we_make stops at a number of new cards a day.
  insert into public.we_cards (made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (a, 'Did we walk?', 'all', 'all', 'weekly', array[extract(dow from current_date)::smallint], current_date - 40)
  returning id into card18;
  insert into public.we_cards (made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (a, 'Did we budget?', 'all', 'all', 'monthly', '{}', mm3)
  returning id into card19;
  insert into public.we_members (card_id, user_id, state, turn, asked_by, joined_at)
  select x, u, 'in', 0, a, now() from unnest(array[card18, card19]) x, unnest(array[a, b]) u;
  update public.we_cards set starts_on = current_date - 40 where id = card18;
  insert into public.we_done (card_id, night) values (card18, current_date - 7), (card18, current_date - 14);
  select streak into n from public.we_streaks(card18, current_date);
  if n <> 2 then raise exception 'FAIL: streak before the edit should be 2, got %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card18, 'Did we walk?', 'all', 'all', 'monthly', '{}', null);
  execute 'reset role';
  if (select streak_carry from public.we_cards where id = card18) <> 2 then
    raise exception 'FAIL: carry should be 2 with the current slot open';
  end if;
  select streak into n from public.we_streaks(card18, current_date);
  if n <> 2 then raise exception 'FAIL: the edit changed the streak to %', n; end if;

  -- 19. Monthly to weekly mid-month, nobody has said Did yet: kept ---------
  update public.we_cards set starts_on = mm3 where id = card19;
  insert into public.we_done (card_id, night) values (card19, mm2), (card19, mm1);
  select streak into n from public.we_streaks(card19, current_date);
  if n <> 2 then raise exception 'FAIL: monthly streak before the edit should be 2, got %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(card19, 'Did we budget?', 'all', 'all', 'weekly', array[extract(dow from current_date)::smallint], null);
  execute 'reset role';
  select streak into n from public.we_streaks(card19, current_date);
  if n <> 2 or (select streak_carry from public.we_cards where id = card19) <> 2 then
    raise exception 'FAIL: monthly to weekly lost the streak (%)', n;
  end if;

  -- 20. my_we_nights over a card with 10 history entries is quick ---------
  update public.we_cards
  set schedule_from = current_date - 1,
      cadence = 'monthly', weekdays = '{}',
      schedule_was = (select jsonb_agg(jsonb_build_object('until', current_date - 30 + i * 2,
        'cadence', case when i % 2 = 0 then 'daily' else 'weekly' end,
        'weekdays', case when i % 2 = 0 then '[]'::jsonb else '[1,3]'::jsonb end) order by i)
        from generate_series(0, 9) i)
  where id = card19;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('wm.t0', clock_timestamp()::text, true);
  perform count(*) from public.my_we_nights();
  raise notice 'my_we_nights with 10 history entries: % ms',
    round(extract(epoch from clock_timestamp() - current_setting('wm.t0')::timestamptz) * 1000, 1);

  -- 17. The helpers are server only ---------------------------------------
  foreach fn in array array[
    'public.we_turn(uuid, date)', 'public.we_pin_turns(uuid, date, date)', 'public.we_paused(uuid, date)',
    'public.we_streaks(uuid, date)', 'public.we_resettle(uuid)', 'public.we_sched(uuid, date)',
    'public.we_sched(public.we_cards, date)', 'public.we_segs(public.we_cards)',
    'public.we_due_in(public.we_cards, date)', 'public.we_slot_in(public.we_cards, date)',
    'public.we_target_in(public.we_cards, date)', 'public.we_due_upto(public.we_cards, date)',
    'public.we_due_from(public.we_cards, date, date)',
    'public.we_edit_apply(uuid, text, text, text, text, smallint[], smallint, boolean)'] loop
    foreach r in array array['anon', 'authenticated'] loop
      if has_function_privilege(r, fn, 'execute') then
        raise exception 'FAIL: % can run %', r, fn;
      end if;
    end loop;
  end loop;
  foreach fn in array array[
    'public.we_edit(uuid, text, text, text, text, smallint[], smallint)',
    'public.we_edit2(uuid, text, text, text, text, smallint[], smallint)',
    'public.we_answer(uuid, date, text)', 'public.we_tonight(date)',
    'public.we_nudge(uuid, uuid, date)', 'public.my_we_nights()'] loop
    if not has_function_privilege('authenticated', fn, 'execute') or has_function_privilege('anon', fn, 'execute') then
      raise exception 'FAIL: wrong grants on %', fn;
    end if;
  end loop;

  raise exception 'SQL TESTS PASSED';
end;
$$;
