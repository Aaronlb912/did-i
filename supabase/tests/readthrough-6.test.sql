-- Checks for supabase/readthrough-6.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/readthrough-6.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  fam uuid;
  tag uuid;
  card uuid;
  night date := current_date;
  n integer;
  st text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b) on conflict (user_id) do nothing;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok');

  -- 1. Gem purchases credit once.
  insert into public.gem_purchases (user_id, pack_id, gems, cents, store, store_ref)
  values (a, 'p', 10, 99, 'test', 'r1-' || a), (a, 'p', 5, 99, 'test', 'r2-' || a);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select gems into n from public.claim_gem_purchases();
  if n <> 15 then raise exception 'FAIL: claim credited % not 15', n; end if;
  select count(*) into n from public.claim_gem_purchases();
  if n <> 0 then raise exception 'FAIL: a second claim credited again'; end if;
  execute 'reset role';
  select gem_balance into n from public.profiles where user_id = a;
  if n <> 15 then raise exception 'FAIL: gem balance is % not 15', n; end if;

  -- 2. gift_cheer is gone.
  if exists (select 1 from pg_proc where proname = 'gift_cheer') then
    raise exception 'FAIL: gift_cheer still exists';
  end if;

  -- 3. One check-on push per pair per 20 hours, even after delete and re-add.
  update public.profiles set zone = 'UTC' where user_id = a;
  insert into public.devices (user_id, device_key, push_token) values (b, 'phone', 'tok');
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
  values (a, b, 'l1', 'walk', 0);
  n := public.queue_check_ons();
  if n <> 1 then raise exception 'FAIL: first check-on queued % pushes', n; end if;
  select count(*) into n from public.push_queue where to_id = b and from_id = a;
  if n <> 1 then raise exception 'FAIL: check-on push has no from_id'; end if;
  delete from public.check_ons where owner_id = a;
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
  values (a, b, 'l1', 'walk', 0);
  n := public.queue_check_ons();
  if n <> 0 then raise exception 'FAIL: re-added check-on pushed again'; end if;
  delete from public.check_ons where owner_id = a;
  delete from public.push_queue where to_id = b;

  -- 4. Ten phones. A known phone always upserts; an 11th replaces the oldest.
  delete from public.devices where user_id = a;
  insert into public.devices (user_id, device_key, last_seen_at)
  select a, 'd' || i, now() - make_interval(days => i) from generate_series(1, 10) i;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.devices (user_id, device_key, label) values (a, 'd5', 'again')
  on conflict (user_id, device_key) do update set label = excluded.label;
  select count(*) into n from public.devices where user_id = a;
  if n <> 10 then raise exception 'FAIL: re-register changed the count to %', n; end if;
  insert into public.devices (user_id, device_key) values (a, 'new');
  execute 'reset role';
  select count(*) into n from public.devices where user_id = a;
  if n <> 10 then raise exception 'FAIL: phones went past 10 (%)', n; end if;
  if exists (select 1 from public.devices where user_id = a and device_key = 'd10') then
    raise exception 'FAIL: the oldest phone was not replaced';
  end if;

  -- 5. Gem buddies only when owned; free and owned items pass.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.profiles set buddy_on = 'cat', look_on = 'moss' where user_id = a;
  select buddy_on || '/' || look_on into st from public.profiles where user_id = a;
  if st <> '/lime' then raise exception 'FAIL: unowned gem items were worn (%)', st; end if;
  update public.profiles set look_on = 'ink' where user_id = a;
  select look_on into st from public.profiles where user_id = a;
  if st <> 'ink' then raise exception 'FAIL: a coin look was blocked'; end if;
  execute 'reset role';
  update public.profiles set gem_cosmetics = public.gem_owned_add(gem_cosmetics, 'buddies', 'cat') where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.profiles set buddy_on = 'cat' where user_id = a;
  select buddy_on into st from public.profiles where user_id = a;
  if st <> 'cat' then raise exception 'FAIL: an owned buddy was blocked'; end if;
  execute 'reset role';

  -- 6. A Did we card of one pays no streak coins.
  insert into public.we_cards (made_by, question, starts_on) values (a, 'Did we stretch?', night - 10)
  returning id into card;
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card, a, 'in', now() - interval '10 days');
  insert into public.we_done (card_id, night)
  select card, night - i from generate_series(0, 8) i;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.we_claim(card, night);
  if n <> 0 then raise exception 'FAIL: a solo card paid % coins', n; end if;
  execute 'reset role';

  -- 7. 50 new family questions a day per maker.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam := public.make_family('Test');
  execute 'reset role';
  select id into tag from public.family_tags where family_id = fam limit 1;
  insert into public.family_lamps (family_id, tag_id, question, made_by)
  select fam, tag, 'Did you read ' || i || '?', a from generate_series(1, 50) i;
  begin
    insert into public.family_lamps (family_id, tag_id, question, made_by)
    values (fam, tag, 'One more?', a);
    raise exception 'FAIL: a 51st question today got in';
  exception when raise_exception then
    if sqlerrm not like 'too many family questions%' then raise; end if;
  end;

  -- 8. Claimed gifts are marked and granted; a second claim gets nothing.
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, gems)
  values (b, a, 'dog', 'buddy', 5);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_gifts();
  if n <> 1 then raise exception 'FAIL: claim_gifts returned % rows', n; end if;
  select count(*) into n from public.claim_gifts();
  if n <> 0 then raise exception 'FAIL: a gift was claimed twice'; end if;
  execute 'reset role';
  if not exists (select 1 from public.profiles
      where user_id = b and gem_cosmetics->'buddies' @> '["dog"]'::jsonb) then
    raise exception 'FAIL: the gift buddy was not granted';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
