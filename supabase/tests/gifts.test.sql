-- Checks for supabase/gifts.sql: who can gift, paying, caps, claiming,
-- returning a double, reports and blocks.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/gifts.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  bal jsonb;
  gift uuid;
  n integer;
  i integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated'),
    (d, d || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cal'), (d, 'Dee')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set gem_balance = 40, coin_balance = 100 where user_id = a;
  -- a and b are friends; a and c share a family; d is a stranger.
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, c, 'kid');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  bal := public.send_gift(b, 'cheer', 'rain', 'You got this');
  if (bal->>'gems')::int <> 38 then
    raise exception 'FAIL: a cheer gift should cost 2 gems, left %', bal;
  end if;
  bal := public.send_gift(c, 'look', 'ink', '');
  if (bal->>'coins')::int <> 70 then
    raise exception 'FAIL: a coin look gift should cost 30 coins, left %', bal;
  end if;

  begin
    perform public.send_gift(d, 'cheer', 'rain', '');
    raise exception 'FAIL: gifted a stranger';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.send_gift(b, 'cheer', 'launch', '');
    raise exception 'FAIL: gifted a cheer that is not for sale';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.send_gift(b, 'cheer', 'lime', '');
    raise exception 'FAIL: gifted a free cheer';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.send_gift(b, 'buddy', 'cat', repeat('x', 200));
  exception when others then
    raise exception 'FAIL: a long note should be cut, not refused: %', sqlerrm;
  end;
  if exists (select 1 from public.cheer_gifts where from_id = a and length(note) > 60) then
    raise exception 'FAIL: note longer than 60';
  end if;

  -- Inbound cap: five a day for b (rain, cat so far).
  for i in 1..3 loop
    perform public.send_gift(b, 'cheer', 'tape', '');
  end loop;
  select gem_balance into n from public.profiles where user_id = a;
  begin
    perform public.send_gift(b, 'cheer', 'boom', '');
    raise exception 'FAIL: sixth gift to one person in a day went through';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  if (select gem_balance from public.profiles where user_id = a) <> n then
    raise exception 'FAIL: a capped gift still took gems';
  end if;

  -- Only the two people can see a gift.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if exists (select 1 from public.cheer_gifts) then
    raise exception 'FAIL: a stranger can see gifts';
  end if;
  begin
    perform public.send_gift(d, 'cheer', 'rain', '');
    raise exception 'FAIL: gifted yourself';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- c claims the coin look; it lands in c's coin catalog.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_gifts();
  if n <> 1 then
    raise exception 'FAIL: c should claim 1 gift, got %', n;
  end if;
  select count(*) into n from public.claim_gifts();
  if n <> 0 then
    raise exception 'FAIL: a gift was claimed twice';
  end if;
  execute 'reset role';
  if not (select public.coin_catalog_normalize(coin_cosmetics)->'looks' @> '["ink"]'::jsonb
          from public.profiles where user_id = c) then
    raise exception 'FAIL: gifted coin look missing from the coin catalog';
  end if;

  -- b claims, returns the rain cheer as a double; a gets 2 gems back once.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select g.id into gift from public.claim_gifts() g where g.item_id = 'rain';
  if gift is null then
    raise exception 'FAIL: b did not get the rain cheer';
  end if;
  execute 'reset role';
  select gem_balance into n from public.profiles where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.return_gift(gift);
  perform public.return_gift(gift);
  execute 'reset role';
  if (select gem_balance from public.profiles where user_id = a) <> n + 2 then
    raise exception 'FAIL: returning a double should pay back 2 gems once';
  end if;

  -- Somebody else cannot return it.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select gem_balance into n from public.profiles where user_id = a;
  perform public.return_gift(gift);
  execute 'reset role';
  if (select gem_balance from public.profiles where user_id = a) <> n then
    raise exception 'FAIL: the giver returned their own gift';
  end if;

  -- Blocking drops unopened gifts and pays the giver back.
  update public.profiles set gem_balance = 10 where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.send_gift(c, 'buddy', 'owl', '');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.block_person(a, '');
  execute 'reset role';
  if exists (select 1 from public.cheer_gifts where to_id = c and claimed_at is null) then
    raise exception 'FAIL: blocking left an unopened gift';
  end if;
  if (select gem_balance from public.profiles where user_id = a) <> 10 then
    raise exception 'FAIL: blocking did not pay the giver back';
  end if;
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.send_gift(c, 'buddy', 'owl', '');
    raise exception 'FAIL: gifted someone who blocked you';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- Reporting a note blocks the sender.
  update public.profiles set gem_balance = 10 where user_id = a;
  delete from public.cheer_gifts where to_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.send_gift(b, 'look', 'moss', 'rude words');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select g.id into gift from public.claim_gifts() g;
  perform public.report_gift(gift);
  execute 'reset role';
  if not exists (select 1 from public.blocks where blocker = b and blocked = a) then
    raise exception 'FAIL: reporting a gift did not block';
  end if;

  -- A special gift waits for the new claim; the old claim leaves it alone.
  perform public.give_special(c || '@test.invalid', a || '@test.invalid', 'cheer', 'launch', 'Thanks for testing');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_cheer_gifts();
  if n <> 0 then
    raise exception 'FAIL: the old claim took the launch cheer';
  end if;
  select count(*) into n from public.claim_gifts() g where g.item_id = 'launch' and g.note = 'Thanks for testing';
  if n <> 1 then
    raise exception 'FAIL: the launch cheer did not arrive';
  end if;
  begin
    perform public.give_special(c || '@test.invalid', a || '@test.invalid', 'cheer', 'launch', '');
    raise exception 'FAIL: a signed-in user called give_special';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
