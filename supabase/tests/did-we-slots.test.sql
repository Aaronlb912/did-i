-- Weekly slots for supabase/we-slots.sql and we-slot-repair.sql.
--
-- Run with: npm run db:test supabase/tests/did-we-slots.test.sql
-- Needs we-slots.sql and we-slot-repair.sql applied first (not yet run).
--
-- One DO block that always ends by raising, so every made-up person and
-- row is rolled back. A pass comes back as the error text 'SQL TESTS PASSED'.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
  card uuid;
  card2 uuid;
  card3 uuid;
  card4 uuid;
  card5 uuid;
  card6 uuid;
  due_night date := current_date - 1; -- a weekly card's one due night, yesterday
  dow smallint := extract(dow from current_date - 1)::smallint;
  j jsonb;
  n integer;
  coins_before integer;
  before_rows integer[];
  after_rows integer[];
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated'),
    (d, d || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cal'), (d, 'Dee')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (a, c, 'ok'), (a, d, 'ok');

  -- 1. Two people answer on different days of the same week --------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we call mom?', 'all', 'all', 'weekly', array[dow]::smallint[], null, array[b], due_night);
  card2 := public.we_make('Did we go for a walk?', 'all', 'all', 'weekly', array[dow]::smallint[], null, array[b, c], due_night);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  perform public.we_reply(card2, true);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card, due_night, 'did');
  if n <> 0 then raise exception 'FAIL: one did finished an all card (%)', n; end if;
  execute 'reset role';

  -- b answers today, a day after the due night: it counts for the due night.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card, current_date, 'did');
  if n <> 2 then raise exception 'FAIL: the second did the next day did not finish the night (%)', n; end if;
  execute 'reset role';
  if not exists (select 1 from public.we_done where card_id = card and night = due_night) then
    raise exception 'FAIL: no done row for the due night';
  end if;
  if exists (select 1 from public.we_done where card_id = card and night <> due_night) then
    raise exception 'FAIL: a done row landed on another night';
  end if;
  if exists (select 1 from public.we_answers where card_id = card and night = current_date) then
    raise exception 'FAIL: an answer was kept on a night the card is not due';
  end if;
  if (select count(*) from public.we_answers where card_id = card and night = due_night and status = 'did') <> 2 then
    raise exception 'FAIL: both dids should sit on the due night';
  end if;

  -- 2. Tonight reads the slot: done, streak 1, best 1 -------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select e into j from jsonb_array_elements(public.we_tonight(current_date)) e where e->>'id' = card::text;
  if (j->>'slot')::date <> due_night or (j->>'done')::boolean is not true then
    raise exception 'FAIL: tonight does not show the slot as done: %', j;
  end if;
  if (j->>'due')::boolean then
    raise exception 'FAIL: a done slot should not stay due on a later day';
  end if;
  if (j->>'streak')::integer <> 1 or (j->>'best')::integer <> 1 then
    raise exception 'FAIL: streak and best should be 1: %', j;
  end if;
  execute 'reset role';

  -- 3. Seven slots in a row: the claim pays once ------------------------------
  update public.we_cards set starts_on = due_night - 70 where id = card;
  insert into public.we_done (card_id, night)
  select card, due_night - 7 * i from generate_series(1, 6) i;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select e into j from jsonb_array_elements(public.we_tonight(current_date)) e where e->>'id' = card::text;
  if (j->>'streak')::integer <> 7 or (j->>'best')::integer <> 7 then
    raise exception 'FAIL: seven slots should read 7 and 7: %', j;
  end if;
  select coin_balance into coins_before from public.profiles where user_id = a;
  n := public.we_claim(card, current_date);
  if n <> 5 then raise exception 'FAIL: 7 slots should pay 5 coins, paid %', n; end if;
  n := public.we_claim(card, current_date);
  if n <> 0 then raise exception 'FAIL: the same milestone paid twice (%)', n; end if;
  -- A slot still open does not end the run; a slot missed does.
  select e into j from jsonb_array_elements(public.we_tonight(due_night + 8)) e where e->>'id' = card::text;
  if (j->>'streak')::integer <> 7 or (j->>'due')::boolean is not true or (j->>'done')::boolean then
    raise exception 'FAIL: an open slot after a done one should keep the streak and stay due: %', j;
  end if;
  select e into j from jsonb_array_elements(public.we_tonight(due_night + 15)) e where e->>'id' = card::text;
  if (j->>'streak')::integer <> 0 or (j->>'best')::integer <> 7 then
    raise exception 'FAIL: a missed slot should end the streak and keep best: %', j;
  end if;
  execute 'reset role';
  if (select coin_balance from public.profiles where user_id = a) <> least(coins_before + 5, 9999) then
    raise exception 'FAIL: coins do not match one payout';
  end if;

  -- 4. A third person who is in and never answers blocks an all card -----------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card2, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card2, due_night, 'did');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_answer(card2, current_date, 'did');
  execute 'reset role';
  if n <> 0 or exists (select 1 from public.we_done where card_id = card2) then
    raise exception 'FAIL: a third member who has not answered should block the night';
  end if;

  -- 5. They leave: the night is settled for the people who stay ---------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_leave(card2);
  execute 'reset role';
  if not exists (select 1 from public.we_done where card_id = card2 and night = due_night) then
    raise exception 'FAIL: leaving should settle the due night for those who stay';
  end if;

  -- 6. Joining does not take back a slot that was done before the current one ---
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_ask(card, d);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  execute 'reset role';
  if not exists (select 1 from public.we_done where card_id = card and night = due_night - 7) then
    raise exception 'FAIL: a join took back an earlier done night';
  end if;

  -- 7. A card due Monday (two days ago): both did, a third joins today.
  -- Monday stays done and the streak does not move.
  card4 := gen_random_uuid();
  insert into public.we_cards (id, made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (card4, a, 'Did we join late?', 'all', 'all', 'weekly', array[extract(dow from current_date - 2)::smallint], current_date - 30);
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card4, a, 'in', now() - interval '30 days'), (card4, b, 'in', now() - interval '30 days');
  insert into public.we_answers (card_id, user_id, night, status)
  values (card4, a, current_date - 2, 'did'), (card4, b, current_date - 2, 'did');
  insert into public.we_done (card_id, night) values (card4, current_date - 2);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select e into j from jsonb_array_elements(public.we_tonight(current_date)) e where e->>'id' = card4::text;
  n := (j->>'streak')::integer;
  perform public.we_ask(card4, c);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card4, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select e into j from jsonb_array_elements(public.we_tonight(current_date)) e where e->>'id' = card4::text;
  -- Today maps back to Monday: it cannot take back or soften a done Monday.
  begin
    perform public.we_answer(card4, current_date, null);
    raise exception 'FAIL: took back an older done slot';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.we_answer(card4, current_date, 'nope');
    raise exception 'FAIL: changed an older done slot to not yet';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';
  if not exists (select 1 from public.we_done where card_id = card4 and night = current_date - 2) then
    raise exception 'FAIL: a late join took back Monday';
  end if;
  if (j->>'streak')::integer <> n or n <> 1 then
    raise exception 'FAIL: the streak moved after a late join (% then %)', n, j->>'streak';
  end if;

  -- 8. Slots on a Monday and Thursday card (two due days, 3 and 4 days apart).
  if public.we_slot(due_night, 'weekly', array[dow, ((dow + 3) % 7)]::smallint[], due_night + 2) <> due_night
     or public.we_slot(due_night, 'weekly', array[dow, ((dow + 3) % 7)]::smallint[], due_night + 3) <> due_night + 3
     or public.we_slot_next(due_night, 'weekly', array[dow, ((dow + 3) % 7)]::smallint[], due_night) <> due_night + 3
     or public.we_slot_next(due_night, 'weekly', array[dow, ((dow + 3) % 7)]::smallint[], due_night + 3) <> due_night + 7
     or public.we_due_index(due_night, 'weekly', array[dow, ((dow + 3) % 7)]::smallint[], due_night + 7) <> 3 then
    raise exception 'FAIL: slots on a two day weekly card';
  end if;
  -- Daily cards do not look ahead: before the start there is no night.
  if public.we_target(due_night, 'daily', '{}', due_night - 1) is not null
     or public.we_target(due_night, 'weekly', array[dow]::smallint[], due_night - 1) <> due_night then
    raise exception 'FAIL: only a weekly card answers its first night early';
  end if;

  -- 9. The repair. P is a due night, N the one after, both before today.
  card3 := gen_random_uuid();
  insert into public.we_cards (id, made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (card3, a, 'Did we repair?', 'all', 'all', 'weekly', array[dow]::smallint[], due_night - 40);
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card3, a, 'in', now() - interval '60 days'), (card3, b, 'in', now() - interval '60 days');
  -- b did N "done it already" the day after P: written to N, given inside P's slot.
  insert into public.we_answers (card_id, user_id, night, status, answered_at)
  values
    (card3, a, due_night - 14, 'did', (due_night - 14)::timestamptz + interval '10 hours'),
    (card3, a, due_night - 7, 'did', (due_night - 7)::timestamptz + interval '10 hours'),
    (card3, b, due_night - 7, 'did', (due_night - 13)::timestamptz + interval '10 hours');
  -- Evening boundary: c's Did on N was given the evening before P in UTC, so it
  -- counts for P; d's was given on N itself and does not. N has no done row.
  card2 := gen_random_uuid();
  insert into public.we_cards (id, made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (card2, a, 'Did we cross midnight?', 'any', 'all', 'weekly', array[dow]::smallint[], due_night - 40);
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card2, c, 'in', now() - interval '60 days'), (card2, d, 'in', now() - interval '60 days');
  insert into public.we_answers (card_id, user_id, night, status, answered_at)
  values
    (card2, c, due_night - 7, 'did', (due_night - 15)::timestamptz + interval '23 hours'),
    (card2, d, due_night - 7, 'did', (due_night - 7)::timestamptz + interval '10 hours');
  -- A night with two Dids and no done row, never touched by step 1: left alone.
  card5 := gen_random_uuid();
  insert into public.we_cards (id, made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (card5, a, 'Did we leave one out?', 'all', 'all', 'weekly', array[dow]::smallint[], due_night - 40);
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card5, a, 'in', now() - interval '60 days'), (card5, b, 'in', now() - interval '60 days'),
         (card5, c, 'left', now() - interval '60 days');
  insert into public.we_answers (card_id, user_id, night, status)
  values (card5, a, due_night - 21, 'did'), (card5, b, due_night - 21, 'did');
  -- A card that reaches 7 slots only because of the repair: P is the 7th and
  -- N, the open one, is not settled.
  card6 := gen_random_uuid();
  insert into public.we_cards (id, made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (card6, a, 'Did we reach seven?', 'all', 'all', 'weekly', array[dow]::smallint[], due_night - 80);
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card6, a, 'in', now() - interval '90 days'), (card6, b, 'in', now() - interval '90 days');
  insert into public.we_done (card_id, night) select card6, due_night - 7 * i from generate_series(2, 7) i;
  insert into public.we_answers (card_id, user_id, night, status, answered_at)
  values
    (card6, a, due_night - 7, 'did', (due_night - 7)::timestamptz + interval '10 hours'),
    (card6, b, due_night, 'did', (due_night - 6)::timestamptz + interval '10 hours');

  execute 'reset role';
  delete from public.we_slot_repair_ran;
  if public.we_slot_repair() <= 0 then
    raise exception 'FAIL: the repair added nothing';
  end if;
  if not exists (select 1 from public.we_answers where card_id = card3 and user_id = b and night = due_night - 14 and status = 'did') then
    raise exception 'FAIL: b''s early did was not kept on its own night';
  end if;
  if not exists (select 1 from public.we_answers where card_id = card3 and user_id = b and night = due_night - 7) then
    raise exception 'FAIL: the repair removed an answer';
  end if;
  if not exists (select 1 from public.we_done where card_id = card3 and night = due_night - 14) then
    raise exception 'FAIL: the repair did not settle the night it fixed';
  end if;
  if exists (select 1 from public.we_done where card_id = card3 and night = due_night - 7) then
    raise exception 'FAIL: the repair settled a night it did not fix';
  end if;
  if not exists (select 1 from public.we_answers where card_id = card2 and user_id = c and night = due_night - 14)
     or exists (select 1 from public.we_answers where card_id = card2 and user_id = d and night = due_night - 14) then
    raise exception 'FAIL: the UTC boundary: one day early counts, on the night itself does not';
  end if;
  if exists (select 1 from public.we_done where card_id = card5) then
    raise exception 'FAIL: the repair settled a night with no new answer';
  end if;
  if not exists (select 1 from public.we_streak_grants where card_id = card6 and user_id = a and milestone = 7) then
    raise exception 'FAIL: the repair left a milestone it made unpaid';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_claim(card6, current_date);
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL: the repair caused a payout of % coins', n; end if;

  -- Once: a second run, even with the marker taken away, adds nothing; and a
  -- Did given after the first run is never copied.
  select array[
    (select count(*) from public.we_answers)::integer,
    (select count(*) from public.we_done)::integer,
    (select count(*) from public.we_done_pushed)::integer,
    (select count(*) from public.we_streak_grants)::integer
  ] into before_rows;
  if public.we_slot_repair() <> 0 then raise exception 'FAIL: the repair ran twice'; end if;
  delete from public.we_slot_repair_ran;
  insert into public.we_answers (card_id, user_id, night, status, answered_at)
  values (card3, b, due_night - 21, 'did', now());
  n := public.we_slot_repair();
  select array[
    (select count(*) from public.we_answers)::integer,
    (select count(*) from public.we_done)::integer,
    (select count(*) from public.we_done_pushed)::integer,
    (select count(*) from public.we_streak_grants)::integer
  ] into after_rows;
  if n <> 0 or after_rows[1] <> before_rows[1] + 1 or after_rows[2] <> before_rows[2]
     or after_rows[3] <> before_rows[3] or after_rows[4] <> before_rows[4] then
    raise exception 'FAIL: a second repair run changed something (% % %)', n, before_rows, after_rows;
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
