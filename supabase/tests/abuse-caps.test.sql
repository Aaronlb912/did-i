-- Checks for supabase/abuse-caps.sql: friend asks, pushes, answers, waitlist.
-- Run with: node scripts/test-sql.mjs supabase/tests/abuse-caps.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  i integer;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Bea')
  on conflict (user_id) do update set display_name = excluded.display_name;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- 1. Ask, take it back, ask again: the fourth ask in a day is left out.
  for i in 1..4 loop
    insert into public.friend_links (from_id, to_id, state) values (a, b, 'asked');
    select count(*) into n from public.friend_links where from_id = a and to_id = b;
    if i <= 3 and n <> 1 then raise exception 'FAIL: ask % under the cap was left out', i; end if;
    if i = 4 and n <> 0 then raise exception 'FAIL: a fourth ask in a day went through'; end if;
    delete from public.friend_links where from_id = a and to_id = b;
  end loop;
  -- The person asked cannot read or clear the log.
  begin
    perform 1 from public.friend_ask_log;
    raise exception 'FAIL: a client could read friend_ask_log';
  exception when insufficient_privilege then null;
  end;

  -- 3. Answers: no straight writes from the client; put_answers still works.
  begin
    insert into public.answer_log (user_id, lamp_id, period_key) values (a, 'l1', '2026-10-17');
    raise exception 'FAIL: a client wrote answer_log directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.answer_log set note = 'x' where user_id = a;
    raise exception 'FAIL: a client updated answer_log directly';
  exception when insufficient_privilege then null;
  end;
  n := public.put_answers('[{"l":"l1","p":"2026-10-17","s":"yes","a":"2026-10-17T21:00:00Z"}]'::jsonb);
  if n <> 1 then raise exception 'FAIL: put_answers no longer writes (%)', n; end if;
  select count(*) into n from public.answer_log where user_id = a;
  if n <> 1 then raise exception 'FAIL: the answer did not land'; end if;
  -- Taking answers back still works.
  delete from public.answer_log where user_id = a and lamp_id = 'l1';
  select count(*) into n from public.answer_log where user_id = a;
  if n <> 0 then raise exception 'FAIL: a client could not delete its own answer'; end if;

  -- 4. Waitlist: closed to clients.
  begin
    insert into public.waitlist (email) values ('someone@test.invalid');
    raise exception 'FAIL: a client joined the waitlist';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- 2. Pushes: 30 an hour reach one person; the rest are left out.
  -- The asks above queued pushes to Bea too; start her hour from nothing.
  delete from public.push_queue where to_id = b;
  delete from public.push_to_counts where to_id = b;
  for i in 1..35 loop
    insert into public.push_queue (to_id, title, body) values (b, 'Did I', 'push ' || i);
  end loop;
  select count(*) into n from public.push_queue where to_id = b;
  if n <> 30 then raise exception 'FAIL: % pushes queued for one person in an hour, want 30', n; end if;
  -- Another person has their own count.
  insert into public.push_queue (to_id, title, body) values (a, 'Did I', 'hi');
  select count(*) into n from public.push_queue where to_id = a;
  if n <> 1 then raise exception 'FAIL: one person''s push cap blocked another'; end if;

  -- 3. Answers: past 200,000 rows a write is refused.
  insert into public.answer_log (user_id, lamp_id, period_key)
  select a, 'bulk', 'k' || g from generate_series(1, 200000) g;
  begin
    insert into public.answer_log (user_id, lamp_id, period_key) values (a, 'one', 'more');
    raise exception 'FAIL: an answer past 200,000 went in';
  exception when raise_exception then
    if sqlerrm <> 'too many answers' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  -- Rewriting an answer already there still works at the ceiling.
  update public.answer_log set note = 'kept' where user_id = a and lamp_id = 'bulk' and period_key = 'k1';

  raise exception 'SQL TESTS PASSED';
end;
$$;
