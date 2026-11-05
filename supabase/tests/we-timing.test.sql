-- Checks for supabase/we-timing.sql: every Did I timing option on Did we
-- cards (every_n, every, per_week, monthly on a day, once_on, deadline),
-- edits between them, and older apps' we_edit2.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/we-timing.test.sql
-- Needs we-timing.sql applied first. One DO block that always ends by
-- raising, so every made-up person and row is rolled back.

do $$
declare
  a uuid := gen_random_uuid();
  t date := current_date;
  m1 date := current_date - extract(day from current_date)::integer + 1;
  mm1 date;
  mm2 date;
  dd integer := extract(day from current_date)::integer;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid; c7 uuid; c8 uuid;
  st date;
  n integer;
  r record;
  j jsonb;
  k public.we_cards;
begin
  mm1 := (m1 - interval '1 month')::date;
  mm2 := (m1 - interval '2 month')::date;

  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do update set display_name = excluded.display_name;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  c1 := public.we_make2('Did we walk?', 'any', 'all', 'every_n', '{}', null, '{}', null, 3::smallint, null);
  c2 := public.we_make2('Did we clean?', 'any', 'all', 'every', '{}', null, '{}', null, 5::smallint, null);
  c3 := public.we_make2('Did we run?', 'any', 'all', 'per_week', '{}', null, '{}', null, 3::smallint, null);
  c4 := public.we_make2('Did we pay?', 'any', 'all', 'monthly', '{}', null, '{}', null, dd::smallint, null);
  c5 := public.we_make2('Did we vote?', 'any', 'all', 'once_on', '{}', null, '{}', null, null, t + 3);
  c6 := public.we_make2('Did we file?', 'any', 'all', 'deadline', '{}', null, '{}', null, null, t + 10);
  c7 := public.we_make2('Did we call?', 'any', 'all', 'monthly', '{}', null, '{}', null, null, null);
  c8 := public.we_make2('Did we mop?', 'any', 'all', 'every', '{}', null, '{}', null, 5::smallint, null);
  begin
    perform public.we_make2('Did we x?', 'any', 'all', 'per_week', '{}', null, '{}', null, 7::smallint, null);
    raise exception 'FAIL: per_week 7 should be refused';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.we_make('Did we x?', 'any', 'all', 'every', '{}', null, '{}');
    raise exception 'FAIL: old we_make should refuse every';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';
  update public.we_members set joined_at = t - 120 where user_id = a;

  -- 1. every_n:3 -----------------------------------------------------------
  update public.we_cards set starts_on = t - 30, every_anchor = t - 3 where id = c1;
  insert into public.we_done (card_id, night) values (c1, t - 3);
  select streak into n from public.we_streaks(c1, t);
  if n <> 1 then raise exception 'FAIL every_n: slot day unanswered should keep 1, got %', n; end if;
  insert into public.we_done (card_id, night) values (c1, t);
  select streak into n from public.we_streaks(c1, t);
  if n <> 2 then raise exception 'FAIL every_n: done today should be 2, got %', n; end if;
  delete from public.we_done where card_id = c1;
  update public.we_cards set every_anchor = t - 4 where id = c1;
  insert into public.we_done (card_id, night) values (c1, t - 4);
  select streak into n from public.we_streaks(c1, t);
  if n <> 0 then raise exception 'FAIL every_n: missed yesterday should be 0, got %', n; end if;
  insert into public.we_done (card_id, night) values (c1, t - 1);
  select streak into n from public.we_streaks(c1, t);
  if n <> 2 then raise exception 'FAIL every_n: both done should be 2, got %', n; end if;

  -- 2. every:5 windows -----------------------------------------------------
  update public.we_cards set starts_on = t - 30, every_anchor = t - 7 where id = c2;
  insert into public.we_done (card_id, night) values (c2, t - 7);
  select streak into n from public.we_streaks(c2, t);
  if n <> 1 then raise exception 'FAIL every: open window should keep 1, got %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.my_we_nights() x where x.card_id = c2 and x.night = t - 2;
  execute 'reset role';
  if not found or r.paused is not true then raise exception 'FAIL every: open window row should be paused'; end if;
  insert into public.we_done (card_id, night) values (c2, t - 2);
  select streak into n from public.we_streaks(c2, t);
  if n <> 2 then raise exception 'FAIL every: done window should be 2, got %', n; end if;
  delete from public.we_done where card_id = c2;
  update public.we_cards set every_anchor = t - 11 where id = c2;
  insert into public.we_done (card_id, night) values (c2, t - 11);
  select streak into n from public.we_streaks(c2, t);
  if n <> 0 then raise exception 'FAIL every: closed window not done should be 0, got %', n; end if;
  insert into public.we_done (card_id, night) values (c2, t - 6);
  select streak into n from public.we_streaks(c2, t);
  if n <> 2 then raise exception 'FAIL every: closed window done should be 2, got %', n; end if;

  -- 3. per_week:3 ----------------------------------------------------------
  update public.we_cards set starts_on = t - 14 where id = c3;
  -- Someone answered every day, so the 3 quiet days pause rule stays out.
  insert into public.we_answers (card_id, user_id, night, status)
  select c3, a, g::date, 'nope' from generate_series(t - 14, t - 2, interval '1 day') g;
  insert into public.we_done (card_id, night) values (c3, t - 14), (c3, t - 13), (c3, t - 12), (c3, t - 7), (c3, t - 6);
  select streak into n from public.we_streaks(c3, t);
  if n <> 0 then raise exception 'FAIL per_week: 2 of 3 last week should be 0, got %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.my_we_nights() x where x.card_id = c3 and x.night = t - 5;
  execute 'reset role';
  if not found or r.done is not false or r.paused is not false then
    raise exception 'FAIL per_week: a day in a 2 of 3 week should be a miss (done %, paused %)', r.done, r.paused;
  end if;
  insert into public.we_done (card_id, night) values (c3, t - 5);
  select streak into n from public.we_streaks(c3, t);
  if n <> 2 then raise exception 'FAIL per_week: two full weeks should be 2, got %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.my_we_nights() x where x.card_id = c3 and x.night = t - 4;
  if r.done is not true then raise exception 'FAIL per_week: a full week day should read done'; end if;
  select * into r from public.my_we_nights() x where x.card_id = c3 and x.night = t;
  if r.paused is not true then raise exception 'FAIL per_week: this week should be open'; end if;
  select x into j from jsonb_array_elements(public.we_tonight(t)) x where x ->> 'id' = c3::text;
  execute 'reset role';
  if (j ->> 'perWeek')::int <> 3 or (j ->> 'periodEnd')::date <> t + 6 or (j ->> 'weekDids')::int <> 0
     or (j ->> 'due')::boolean is not true or (j ->> 'streak')::int <> 2 then
    raise exception 'FAIL per_week: we_tonight %', j;
  end if;

  -- 4. monthly on today's day ---------------------------------------------
  update public.we_cards set starts_on = mm2 where id = c4;
  insert into public.we_done (card_id, night)
  values (c4, case when dd = 1 then mm2 else public.we_mslot(mm2, dd, mm2) end),
    (c4, case when dd = 1 then mm1 else public.we_mslot(mm2, dd, mm1) end);
  select streak into n from public.we_streaks(c4, t);
  if n <> 2 then raise exception 'FAIL monthly: today open should keep 2, got %', n; end if;
  select streak into n from public.we_streaks(c4, (m1 + interval '1 month')::date);
  if n <> 0 then raise exception 'FAIL monthly: month ended not done should be 0, got %', n; end if;
  insert into public.we_done (card_id, night) values (c4, t);
  select streak into n from public.we_streaks(c4, (m1 + interval '1 month')::date);
  if n <> 3 then raise exception 'FAIL monthly: month done should be 3, got %', n; end if;

  -- 5. once_on -------------------------------------------------------------
  select starts_on into st from public.we_cards where id = c5;
  if public.we_target(st, 'once_on:' || to_char(t + 3, 'YYYY-MM-DD'), '{}', t + 4) is not null then
    raise exception 'FAIL once_on: a day after should take no answer';
  end if;
  select * into k from public.we_cards where id = c5;
  select count(*) into n from public.we_due_days(k, t + 4, t + 90);
  if n <> 0 then raise exception 'FAIL once_on: nothing due after the day, got %', n; end if;
  select streak into n from public.we_streaks(c5, t + 1);
  if n <> 0 then raise exception 'FAIL once_on: before the day 0, got %', n; end if;
  select streak into n from public.we_streaks(c5, t + 5);
  if n <> 0 then raise exception 'FAIL once_on: missed day should be 0, got %', n; end if;
  insert into public.we_done (card_id, night) values (c5, t + 3);
  select streak into n from public.we_streaks(c5, t + 5);
  if n <> 1 then raise exception 'FAIL once_on: done day should be 1, got %', n; end if;

  -- 6. deadline ------------------------------------------------------------
  update public.we_cards set starts_on = t - 3 where id = c6;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.my_we_nights() x where x.card_id = c6 and x.night = t - 3;
  if not found or r.paused is not true then raise exception 'FAIL deadline: open period row should be paused'; end if;
  select x into j from jsonb_array_elements(public.we_tonight(t)) x where x ->> 'id' = c6::text;
  execute 'reset role';
  if (j ->> 'slot')::date <> t - 3 or (j ->> 'periodEnd')::date <> t + 10 or (j ->> 'due')::boolean is not true then
    raise exception 'FAIL deadline: we_tonight %', j;
  end if;
  select streak into n from public.we_streaks(c6, t + 11);
  if n <> 0 then raise exception 'FAIL deadline: past due_by not done should be 0, got %', n; end if;
  insert into public.we_done (card_id, night) values (c6, t - 3);
  select streak into n from public.we_streaks(c6, t + 11);
  if n <> 1 then raise exception 'FAIL deadline: done should be 1, got %', n; end if;

  -- 7. Edits: monthly -> every_n -> deadline keep past nights and streak ----
  update public.we_cards set starts_on = mm2 where id = c7;
  insert into public.we_done (card_id, night) values (c7, mm2), (c7, mm1), (c7, m1);
  select streak into n from public.we_streaks(c7, t);
  if n <> 3 then raise exception 'FAIL edit: monthly start should be 3, got %', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit3(c7, 'Did we call?', 'any', 'all', 'every_n', '{}', null, 3::smallint, null);
  execute 'reset role';
  select streak into n from public.we_streaks(c7, t);
  if n < 3 then raise exception 'FAIL edit: monthly -> every_n lost the streak, got %', n; end if;
  select * into k from public.we_cards where id = c7;
  if (select s.how from public.we_sched(k, mm1) s) <> 'monthly' then
    raise exception 'FAIL edit: last month should still be monthly';
  end if;
  if (select s.how from public.we_sched(k, t) s) <> 'every_n:3' then
    raise exception 'FAIL edit: today should be every_n:3';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.my_we_nights() x where x.card_id = c7 and x.night = mm1;
  if not found or r.done is not true then raise exception 'FAIL edit: last month''s done night is gone'; end if;
  perform public.we_edit3(c7, 'Did we call?', 'any', 'all', 'deadline', '{}', null, null, t + 20);
  execute 'reset role';
  select streak into n from public.we_streaks(c7, t);
  if n < 3 then raise exception 'FAIL edit: every_n -> deadline lost the streak, got %', n; end if;
  select * into k from public.we_cards where id = c7;
  if k.cadence <> 'deadline' or k.due_by <> t + 20 or k.every_days is not null then
    raise exception 'FAIL edit: deadline settings %, %, %', k.cadence, k.due_by, k.every_days;
  end if;
  if (select s.how from public.we_sched(k, mm1) s) <> 'monthly' then
    raise exception 'FAIL edit: last month changed after the second edit';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.my_we_nights() x where x.card_id = c7 and x.night = mm1;
  execute 'reset role';
  if not found or r.done is not true then raise exception 'FAIL edit: last month gone after deadline'; end if;

  -- 8. An old app's we_edit2 'daily' leaves a new cadence alone -------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit2(c8, 'Did we mop the floor?', 'any', 'all', 'daily', '{}', null);
  execute 'reset role';
  select * into k from public.we_cards where id = c8;
  if k.cadence <> 'every' or k.every_days <> 5 or k.question <> 'Did we mop the floor?' then
    raise exception 'FAIL we_edit2: card changed to % / %', k.cadence, k.every_days;
  end if;

  -- 9. A question-only edit of a card whose date or anchor is old ----------
  update public.we_cards set once_on = t - 5 where id = c5;
  update public.we_cards set every_anchor = t - 400 where id = c1;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_edit3(c5, 'Did we vote today?', 'any', 'all', 'once_on', '{}', null, null, t - 5);
  perform public.we_edit3(c1, 'Did we walk today?', 'any', 'all', 'every_n', '{}', null, 3::smallint, t - 400);
  execute 'reset role';
  select * into k from public.we_cards where id = c5;
  if k.question <> 'Did we vote today?' or k.once_on <> t - 5 then
    raise exception 'FAIL old date: question-only edit gave %, %', k.question, k.once_on;
  end if;
  select * into k from public.we_cards where id = c1;
  if k.question <> 'Did we walk today?' or k.every_anchor <> t - 400 then
    raise exception 'FAIL old anchor: question-only edit gave %, %', k.question, k.every_anchor;
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
