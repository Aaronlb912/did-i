-- Checks for supabase/readthrough-9.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/readthrough-9.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  n integer;
  i integer;
  ok boolean;
  src text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b), (c) on conflict (user_id) do nothing;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');
  update public.profiles set zone = 'UTC' where user_id = a;
  insert into public.devices (user_id, device_key, push_token) values (b, 'p9', 'tok');

  -- 1a. Two legit check-ons both push.
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
  values (a, b, 'q1', 'walk', 0), (a, b, 'q2', 'read', 0);
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b and from_id = a;
  if n <> 2 then raise exception 'FAIL: two check-ons gave % pushes', n; end if;

  -- Delete and re-add under new ids: one more push, then nothing.
  for i in 1..5 loop
    delete from public.check_ons where owner_id = a and lamp_id = 'loop' || (i - 1);
    insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
    values (a, b, 'loop' || i, 'walk', 0);
    perform public.queue_check_ons();
  end loop;
  select count(*) into n from public.push_queue where to_id = b and from_id = a;
  if n <> 3 then raise exception 'FAIL: delete and re-add gave % pushes, wanted 3', n; end if;

  -- Four real check-ons to one friend all push: the cap is the pair's rows.
  insert into public.friend_links (from_id, to_id, state) values (c, b, 'ok');
  update public.profiles set zone = 'UTC' where user_id = c;
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
  values (c, b, 'r1', 'a', 0), (c, b, 'r2', 'b', 0), (c, b, 'r3', 'c', 0), (c, b, 'r4', 'd', 0);
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b and from_id = c;
  if n <> 4 then raise exception 'FAIL: four check-ons gave % pushes, wanted 4', n; end if;

  -- Normal edit through the app's upsert still works.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
  values (a, b, 'q2', 'read more', 600)
  on conflict (owner_id, lamp_id) do update set
    owner_id = excluded.owner_id, buddy_id = excluded.buddy_id, lamp_id = excluded.lamp_id,
    question = excluded.question, at_minute = excluded.at_minute;
  execute 'reset role';
  if not exists (select 1 from public.check_ons where owner_id = a and lamp_id = 'q2' and question = 'read more') then
    raise exception 'FAIL: upsert edit did not save';
  end if;

  -- 1b. made_at is the server's on insert.
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, made_at)
  values (a, b, 'old', 'x', now() - interval '3 days');
  if exists (select 1 from public.check_ons where owner_id = a and lamp_id = 'old'
      and made_at < now() - interval '1 hour') then
    raise exception 'FAIL: client made_at kept';
  end if;

  -- 30 adds a day, deleted ones included. 8 so far.
  ok := false;
  begin
    for i in 1..30 loop
      insert into public.check_ons (owner_id, buddy_id, lamp_id, question) values (a, b, 'churn', 'x');
      delete from public.check_ons where owner_id = a and lamp_id = 'churn';
    end loop;
  exception when others then
    ok := sqlerrm like '%too many check-ons today%';
  end;
  if not ok then raise exception 'FAIL: daily check-on add cap did not fire'; end if;
  select count(*) into n from public.check_on_adds where owner_id = a;
  if n <> 8 then raise exception 'FAIL: check_on_adds has % rows after rollback, wanted 8', n; end if;

  -- 2. claim_gifts locks givers in order and still pays back the owned one.
  select pg_get_functiondef('public.claim_gifts()'::regprocedure) into src;
  if src !~ 'order by p\.user_id\s+for update' then
    raise exception 'FAIL: claim_gifts does not lock in user_id order';
  end if;
  update public.profiles set coin_balance = 0,
    coin_cosmetics = jsonb_set(public.coin_catalog_normalize(coin_cosmetics), '{accessories}', '["bee"]')
  where user_id = b;
  update public.profiles set coin_balance = 0 where user_id in (a, c);
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, coins)
  values (b, c, 'bee', 'accessory', 25), (b, a, 'bee', 'accessory', 30), (b, c, 'fairy', 'accessory', 40);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*), bool_and(item_id = 'fairy') into n, ok from public.claim_gifts();
  execute 'reset role';
  if n <> 1 or not ok then raise exception 'FAIL: claim_gifts returned % gifts', n; end if;
  select coin_balance into n from public.profiles where user_id = c;
  if n <> 25 then raise exception 'FAIL: giver c got % back, wanted 25', n; end if;
  select coin_balance into n from public.profiles where user_id = a;
  if n <> 30 then raise exception 'FAIL: giver a got % back, wanted 30', n; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
