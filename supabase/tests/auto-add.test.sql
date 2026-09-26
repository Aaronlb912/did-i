-- Cross-account checks for supabase/auto-add.sql.
--
-- Run with: npm run db:test supabase/tests/auto-add.test.sql
--
-- Everything happens inside one DO block that always ends by raising, so
-- the made-up people and rows below are rolled back every time, pass or
-- fail. A pass comes back as the error text 'SQL TESTS PASSED'.

do $$
declare
  a uuid := gen_random_uuid(); -- gets the did yous
  b uuid := gen_random_uuid(); -- a friend
  c uuid := gen_random_uuid(); -- family
  d uuid := gen_random_uuid(); -- nobody to a
  fam uuid := gen_random_uuid();
  n integer;
  q text;
  ok boolean;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated'),
    (d, d || '@test.invalid', 'authenticated', 'authenticated');

  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, d, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, c, 'kid');

  -- As b, the friend --------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.sends (from_id, to_id, kind, question) values (b, a, 'todo', 'friend one');

  -- b cannot turn the switch on for a.
  begin
    insert into public.auto_adds (owner_id, friend_id) values (a, b);
    raise exception 'FAIL: b wrote a switch for a';
  exception when insufficient_privilege or check_violation then
    null;
  end;

  execute 'reset role';

  -- As d, a stranger to a ---------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.sends (from_id, to_id, kind, question) values (d, a, 'todo', 'stranger');
    raise exception 'FAIL: a stranger sent a did you';
  exception when insufficient_privilege or check_violation then
    null;
  end;

  -- d cannot claim a switch with a either.
  begin
    insert into public.auto_adds (owner_id, friend_id) values (d, a);
    raise exception 'FAIL: d switched on someone who is not a friend';
  exception when insufficient_privilege or check_violation then
    null;
  end;

  execute 'reset role';

  -- As c, family ------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.sends (from_id, to_id, kind, question) values (c, a, 'todo', 'family one');

  -- c cannot claim a's did yous.
  select count(*) into n from public.claim_auto_sends();
  if n <> 0 then
    raise exception 'FAIL: c claimed % rows that were not theirs', n;
  end if;

  execute 'reset role';

  -- As a, the one getting them -------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Family goes straight on. The friend waits while the switch is off.
  select count(*), min(question) into n, q from public.claim_auto_sends();
  if n <> 1 or q <> 'family one' then
    raise exception 'FAIL: first claim gave % rows (%), wanted only the family one', n, q;
  end if;

  select count(*) into n from public.sends where to_id = a and state = 'sent';
  if n <> 1 then
    raise exception 'FAIL: % waiting after the family claim, wanted 1', n;
  end if;

  -- A second claim finds nothing owed.
  select count(*) into n from public.claim_auto_sends();
  if n <> 0 then
    raise exception 'FAIL: second claim gave % rows', n;
  end if;

  -- Switch b on and the waiting one comes through.
  insert into public.auto_adds (owner_id, friend_id) values (a, b);
  select count(*), min(question) into n, q from public.claim_auto_sends();
  if n <> 1 or q <> 'friend one' then
    raise exception 'FAIL: claim after the switch gave % rows (%)', n, q;
  end if;

  -- a cannot turn on someone who is not a friend.
  begin
    insert into public.auto_adds (owner_id, friend_id) values (a, d);
    raise exception 'FAIL: a switched on a stranger';
  exception when insufficient_privilege or check_violation then
    null;
  end;

  -- a sees only their own switches.
  select count(*) into n from public.auto_adds;
  if n <> 1 then
    raise exception 'FAIL: a sees % switches, wanted 1', n;
  end if;

  execute 'reset role';

  -- As b again: the sender cannot see the switch -------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.auto_adds;
  if n <> 0 then
    raise exception 'FAIL: b can see % of a''s switches', n;
  end if;

  execute 'reset role';

  -- Signed out sees nothing and cannot claim ------------------------------
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';

  begin
    select count(*) into n from public.auto_adds;
    raise exception 'FAIL: anon read auto_adds';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.claim_auto_sends();
    raise exception 'FAIL: anon ran claim_auto_sends';
  exception when insufficient_privilege then
    null;
  end;

  execute 'reset role';

  -- Blocking b drops the friendship and the switch with it ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.block_person(b, '');
  execute 'reset role';

  select exists (select 1 from public.auto_adds where owner_id = a and friend_id = b) into ok;
  if ok then
    raise exception 'FAIL: the switch outlived the block';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
