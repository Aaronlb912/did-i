-- Checks for supabase/we-month-open.sql: my_we_nights keeps a monthly card
-- open until its month ends, so a Not yet on the slot day is paused.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/we-month-open.test.sql
-- Needs we-month-open.sql applied first. One DO block that always ends by
-- raising, so every made-up person and row is rolled back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  card uuid;
  card2 uuid;
  card3 uuid;
  m1 date := current_date - extract(day from current_date)::integer + 1;
  mm1 date;
  r record;
  n integer;
begin
  mm1 := (m1 - interval '1 month')::date;

  insert into auth.users (id, email, aud, role)
  select u, u || '@test.invalid', 'authenticated', 'authenticated'
  from unnest(array[a, b]) u;
  insert into public.profiles (user_id, display_name)
  values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state)
  values (a, b, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we call mom?', 'all', 'all', 'monthly', '{}', null, array[b]);
  card2 := public.we_make('Did we eat out?', 'all', 'all', 'monthly', '{}', null, array[b]);
  card3 := public.we_make('Did we save?', 'all', 'all', 'monthly', '{}', null, array[b]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  perform public.we_reply(card2, true);
  perform public.we_reply(card3, true);
  execute 'reset role';

  -- 1. A Not yet on this month's slot is paused: the month is still open ----
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card, current_date, 'nope');
  select * into r from public.my_we_nights() x where x.card_id = card and x.night = m1;
  execute 'reset role';
  if not found then raise exception 'FAIL: no row for this month''s slot'; end if;
  if r.paused is not true or r.done is not false then
    raise exception 'FAIL: a Not yet this month should be paused and not done (paused %, done %)', r.paused, r.done;
  end if;

  -- 2. A Did from both people is done, and not paused -----------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(card2, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform public.we_answer(card2, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select * into r from public.my_we_nights() x where x.card_id = card2 and x.night = m1;
  execute 'reset role';
  if r.done is not true or r.paused is not false then
    raise exception 'FAIL: a finished month should be done and not paused (paused %, done %)', r.paused, r.done;
  end if;

  -- 3. Last month's slot, nobody said Did, counts as missed -----------------
  update public.we_cards set starts_on = mm1 where id = card3;
  update public.we_members set joined_at = mm1 where card_id = card3 and user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into r from public.my_we_nights() x where x.card_id = card3 and x.night = mm1;
  execute 'reset role';
  if not found then raise exception 'FAIL: no row for last month''s slot'; end if;
  if r.paused is not false or r.done is not false then
    raise exception 'FAIL: a missed month should count (paused %, done %)', r.paused, r.done;
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
