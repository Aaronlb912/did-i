-- Checks supabase/consent-guards.sql: friend links, family members, the
-- wallet guard on friend_cheers, family question moves, and put_answers
-- newer-wins across local and UTC stamps.
-- Run with: node scripts/test-sql.mjs supabase/tests/consent-guards.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  link uuid;
  fam uuid;
  fam2 uuid;
  code text;
  tag uuid;
  lamp uuid;
  n integer;
  st text;
  who uuid;
  got jsonb;
  ans text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b) on conflict do nothing;

  -- 1. Ann can not insert a friendship straight to 'ok'.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.friend_links (from_id, to_id, state) values (a, c, 'ok');
    raise exception 'FAIL: inserted an ok link from the client';
  exception when insufficient_privilege then null;
  end;
  -- A normal ask works.
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'asked') returning id into link;
  execute 'reset role';

  -- 2. Bea can not rewrite who asked, or set state back.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.friend_links set from_id = c where id = link;
    raise exception 'FAIL: the asked person changed from_id';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.friend_links set state = 'asked' where id = link;
    raise exception 'FAIL: a link went asked to asked';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  -- A plain yes from the client is allowed.
  update public.friend_links set state = 'ok' where id = link;
  execute 'reset role';
  select state into st from public.friend_links where id = link;
  if st <> 'ok' then raise exception 'FAIL: a plain yes did not stick'; end if;

  -- Normal flow through say_yes (definer) still works.
  delete from public.friend_links where id = link;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'asked') returning id into link;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.say_yes(link);
  execute 'reset role';
  select count(*) into n from public.friend_links
  where state = 'ok' and ((from_id = a and to_id = b) or (from_id = b and to_id = a));
  if n <> 2 then raise exception 'FAIL: say_yes made % ok links, wanted 2', n; end if;
  -- Once ok, the client can not flip it.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.friend_links set state = 'asked' where id = link;
    raise exception 'FAIL: an ok link went back to asked';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- 3. Ann makes a family; Bea joins by code. Ann can not add Cal herself.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam := public.make_family('Test');
  begin
    insert into public.family_members (family_id, user_id, role) values (fam, c, 'kid');
    raise exception 'FAIL: a parent added someone without asking';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  select f.code into code from public.families f where f.id = fam;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.join_family(code);
  execute 'reset role';
  select count(*) into n from public.family_members where family_id = fam;
  if n <> 2 then raise exception 'FAIL: family has % members, wanted 2', n; end if;

  -- 4. Cheers: a new profile can not start with any; buying still works.
  delete from public.profiles where user_id = c;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.profiles (user_id, friend_cheers) values (c, 20);
  execute 'reset role';
  select friend_cheers into n from public.profiles where user_id = c;
  if n <> 0 then raise exception 'FAIL: a new profile started with % cheers', n; end if;

  update public.profiles set gem_balance = 3, friend_cheers = 0 where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.profiles set friend_cheers = 20 where user_id = a;
  got := public.buy_friend_cheers();
  execute 'reset role';
  if (got->>'cheers')::int <> 5 or (got->>'gems')::int <> 2 then
    raise exception 'FAIL: buy_friend_cheers gave %', got;
  end if;

  -- 5. Ann (parent of fam) can not move her question to Cal's family.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam2 := public.make_family('Other');
  execute 'reset role';
  select id into tag from public.family_tags where family_id = fam limit 1;
  insert into public.family_lamps (family_id, tag_id, question, made_by)
  values (fam, tag, 'Did you read?', a) returning id into lamp;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.family_lamps set family_id = fam2 where id = lamp;
    raise exception 'FAIL: moved a question to a family she is not in';
  exception when insufficient_privilege then null;
  end;
  update public.family_lamps set question = 'Did you read a book?' where id = lamp;
  execute 'reset role';
  select question into ans from public.family_lamps where id = lamp;
  if ans <> 'Did you read a book?' then raise exception 'FAIL: a normal edit did not stick'; end if;

  -- 6. put_answers: newer wins across formats.
  if public.stamp_ts('2026-10-14T22:00:00') <> '2026-10-14T22:00:00Z'::timestamptz then
    raise exception 'FAIL: zoneless stamp not read as UTC';
  end if;
  if public.stamp_ts('') <> '-infinity'::timestamptz or public.stamp_ts('junk') <> '-infinity'::timestamptz then
    raise exception 'FAIL: empty or junk stamp not earliest';
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  -- Old app, local stamp.
  perform public.put_answers(jsonb_build_array(jsonb_build_object(
    'l', 'q1', 'p', '2026-10-14', 's', 'skip', 'a', '2026-10-14T22:00:00')));
  -- New app, UTC, an hour later: wins.
  n := public.put_answers(jsonb_build_array(jsonb_build_object(
    'l', 'q1', 'p', '2026-10-14', 's', 'yes', 'a', '2026-10-14T23:00:00.000Z')));
  if n <> 1 then raise exception 'FAIL: a newer UTC answer lost'; end if;
  -- An older local stamp loses to the newer UTC one.
  n := public.put_answers(jsonb_build_array(jsonb_build_object(
    'l', 'q1', 'p', '2026-10-14', 's', 'skip', 'a', '2026-10-14T22:30:00')));
  if n <> 0 then raise exception 'FAIL: an older local answer beat a newer UTC one'; end if;
  -- Same instant written two ways is not newer.
  n := public.put_answers(jsonb_build_array(jsonb_build_object(
    'l', 'q1', 'p', '2026-10-14', 's', 'skip', 'a', '2026-10-14T23:00:00+00:00')));
  if n <> 0 then raise exception 'FAIL: the same time in another format counted as newer'; end if;
  -- A later note wins.
  n := public.put_answers(jsonb_build_array(jsonb_build_object(
    'l', 'q1', 'p', '2026-10-14', 's', 'yes', 'a', '2026-10-14T23:00:00.000Z',
    'n', 'read', 'e', '2026-10-15T01:00:00.000Z')));
  if n <> 1 then raise exception 'FAIL: a later note lost'; end if;
  execute 'reset role';
  select status into st from public.answer_log where user_id = a and lamp_id = 'q1';
  if st <> 'yes' then raise exception 'FAIL: kept % not the newest answer', st; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
