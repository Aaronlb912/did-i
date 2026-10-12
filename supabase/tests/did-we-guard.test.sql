-- Checks for supabase/did-we-guard.sql and the guards in did-we.sql and
-- did-you-repeat.sql: a no holds, nudge and new-card limits, blocking,
-- unfriending, repeating Did yous, reports, private pushes.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/did-we-guard.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  card uuid;
  other uuid;
  night date := current_date;
  n integer;
  i integer;
  cards uuid[];
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (a, c, 'ok'), (b, c, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, b, 'kid');

  -- A no holds ------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we read?', 'all', 'waiting', 'daily', '{}', null, array[b]);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, false);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_ask(card, b);
    raise exception 'FAIL: asked again right after a no';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.we_make('Did we read more?', 'all', 'waiting', 'daily', '{}', null, array[b]);
    raise exception 'FAIL: a new card asked them the same day they said no';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';
  update public.we_members set said_no_at = now() - interval '8 days' where card_id = card and user_id = b;
  execute 'set local role authenticated';
  perform public.we_ask(card, b);
  execute 'reset role';
  if (select state from public.we_members where card_id = card and user_id = b) <> 'asked' then
    raise exception 'FAIL: could not ask again after the no ran out';
  end if;

  -- New cards a day --------------------------------------------------------
  execute 'set local role authenticated';
  select count(*) into n from public.we_cards where made_by = a;
  for i in 1 .. (public.we_max_new_daily() - n) loop
    perform public.we_make('Did we try ' || i || '?', 'all', 'waiting', 'daily', '{}', null, array[c]);
  end loop;
  begin
    perform public.we_make('Did we overdo it?', 'all', 'waiting', 'daily', '{}', null, array[c]);
    raise exception 'FAIL: made more new cards than a day allows';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- Nudges: blocked, and a nightly limit -----------------------------------
  update public.we_members set state = 'in', joined_at = now() where user_id = c and state = 'asked';
  insert into public.we_answers (card_id, user_id, night, status)
  select m.card_id, a, night, 'did' from public.we_members m where m.user_id = c and m.state = 'in';
  -- Read before switching to a: members only see their own member rows.
  select array_agg(m.card_id) into cards from public.we_members m where m.user_id = c and m.state = 'in';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := 0;
  foreach other in array cards loop
    begin
      perform public.we_nudge(other, c, night);
      n := n + 1;
    exception when raise_exception then
      if sqlerrm <> 'enough nudges tonight' then raise; end if;
    end;
  end loop;
  execute 'reset role';
  if n <> public.we_max_nudges_nightly() then
    raise exception 'FAIL: % nudges got through in a night', n;
  end if;

  -- Blocking leaves shared cards -------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.block_person(a);
  execute 'reset role';
  select count(*) into n from public.we_members m
  join public.we_members them on them.card_id = m.card_id and them.user_id = a and them.state = 'in'
  where m.user_id = c and m.state in ('in', 'asked');
  if n <> 0 then raise exception 'FAIL: still on % cards after blocking', n; end if;
  delete from public.blocks where blocker = c;

  -- Unfriending drops waiting asks (not family) ----------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  other := public.we_make('Did we run?', 'all', 'waiting', 'daily', '{}', null, array[c]);
  execute 'reset role';
  delete from public.friend_links where from_id = b and to_id = c;
  if exists (select 1 from public.we_members where card_id = other and user_id = c and state = 'asked') then
    raise exception 'FAIL: an ask outlived unfriending';
  end if;

  -- Repeating Did yous ----------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.sends (from_id, to_id, kind, question, repeat) values (b, a, 'todo', 'Did you?', 'weekly:9');
    raise exception 'FAIL: a bad repeat was stored';
  exception when check_violation then
    null;
  end;
  for i in 1 .. 3 loop
    insert into public.sends (from_id, to_id, kind, question, repeat) values (b, a, 'todo', 'Did you stretch ' || i || '?', 'daily');
  end loop;
  begin
    insert into public.sends (from_id, to_id, kind, question, repeat) values (b, a, 'todo', 'Did you stretch 4?', 'daily');
    raise exception 'FAIL: a fourth repeat in a day';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- Family auto adds, but never a repeat.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_auto_sends() x where x.repeat <> '';
  execute 'reset role';
  if n <> 0 then raise exception 'FAIL: a repeat skipped the inbox'; end if;

  -- Reports -------------------------------------------------------------
  execute 'set local role authenticated';
  perform public.report_send((select id from public.sends where to_id = a and from_id = b and state = 'sent' limit 1), 'test');
  perform public.report_we(card, '');
  execute 'reset role';
  select count(*) into n from public.reports where from_id = a;
  if n <> 2 then raise exception 'FAIL: % reports filed, wanted 2', n; end if;
  if not exists (select 1 from public.blocks where blocker = a and blocked = b) then
    raise exception 'FAIL: reporting did not block';
  end if;
  if exists (select 1 from public.sends where to_id = a and from_id = b and state = 'sent') then
    raise exception 'FAIL: a reported sender still had Did yous waiting';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.report_send((select id from public.sends where to_id = a limit 1), '');
    raise exception 'FAIL: reported a send that was not theirs';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- Private pushes -------------------------------------------------------
  update public.profiles set prefs = '{"pingsPrivate": true}'::jsonb where user_id = a;
  insert into public.push_queue (to_id, title, body, go) values (a, 'Ben asked you', 'Did we: secret', '/inbox');
  if exists (select 1 from public.push_queue where to_id = a and body like '%secret%') then
    raise exception 'FAIL: a private push showed the question';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
