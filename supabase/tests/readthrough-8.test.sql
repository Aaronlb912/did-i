-- Checks for supabase/readthrough-8.sql and delete_me in drop-tonight.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/readthrough-8.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  fam uuid;
  fam2 uuid;
  tag uuid;
  lamp uuid;
  lamp2 uuid;
  n integer;
  st text;
  ok boolean;
  wk text := public.iso_gem_week();
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b), (c) on conflict (user_id) do nothing;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  -- 1. Two check-ons with the same friend both push; a re-added one does
  -- not push twice in a night.
  update public.profiles set zone = 'UTC' where user_id = a;
  insert into public.devices (user_id, device_key, push_token) values (b, 'p1', 'tok');
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
  values (a, b, 'q1', 'walk', 0), (a, b, 'q2', 'read', 0);
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b and from_id = a;
  if n <> 2 then raise exception 'FAIL: two check-ons with one friend gave % pushes', n; end if;
  delete from public.check_ons where owner_id = a and lamp_id = 'q1';
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute) values (a, b, 'q1', 'walk', 0);
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b and from_id = a;
  if n <> 2 then raise exception 'FAIL: a re-added check-on pushed again (%)', n; end if;
  if exists (select 1 from public.check_ons where owner_id = a and lamp_id = 'q1' and sent_on is null) then
    raise exception 'FAIL: sent_on not set on the re-added check-on';
  end if;
  select count(*) into n from public.check_on_pushed where owner_id = a;
  if n <> 2 then raise exception 'FAIL: check_on_pushed has % rows', n; end if;

  -- 3a. The app's upsert, as the owner: edit and add.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute)
  values (a, b, 'q2', 'read more', 600)
  on conflict (owner_id, lamp_id) do update set
    owner_id = excluded.owner_id, buddy_id = excluded.buddy_id, lamp_id = excluded.lamp_id,
    question = excluded.question, at_minute = excluded.at_minute;
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question)
  values (a, b, 'q3', 'sleep')
  on conflict (owner_id, lamp_id) do update set question = excluded.question;
  -- Can not move a row onto someone else.
  begin
    update public.check_ons set owner_id = c where owner_id = a and lamp_id = 'q3';
    raise exception 'FAIL: moved a check-on to another owner';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.check_ons set sent_on = null where owner_id = a;
    raise exception 'FAIL: the owner moved sent_on';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  if not exists (select 1 from public.check_ons where owner_id = a and lamp_id = 'q2'
      and question = 'read more' and at_minute = 600) then
    raise exception 'FAIL: upsert did not edit the check-on';
  end if;
  if not exists (select 1 from public.check_ons where owner_id = a and lamp_id = 'q3') then
    raise exception 'FAIL: upsert did not add the check-on';
  end if;

  -- 3b. Upsert of an existing check-on at the 20 cap still works; a 21st is refused.
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question)
  select a, b, 'cap' || i, 'walk' from generate_series(1, 17) i;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question)
  values (a, b, 'cap1', 'run')
  on conflict (owner_id, lamp_id) do update set question = excluded.question;
  begin
    insert into public.check_ons (owner_id, buddy_id, lamp_id, question) values (a, b, 'cap99', 'walk');
    raise exception 'FAIL: a 21st check-on got in';
  exception when raise_exception then
    if sqlerrm <> 'check-on cap' then raise; end if;
  end;
  execute 'reset role';

  -- 3c. Unfriend drops the check-ons between them.
  delete from public.friend_links where from_id = a and to_id = b;
  select count(*) into n from public.check_ons where owner_id = a and buddy_id = b;
  if n <> 0 then raise exception 'FAIL: % check-ons kept after unfriend', n; end if;

  -- 4. Weekly gem: once per week, and an older week after a newer one pays nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.grant_weekly_gem(wk);
  if n <> 1 then raise exception 'FAIL: weekly gem gave %', n; end if;
  n := public.grant_weekly_gem(wk);
  if n <> 1 then raise exception 'FAIL: weekly gem paid twice (%)', n; end if;
  execute 'reset role';
  update public.profiles set gem_week = '2999-W01' where user_id = c;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.grant_weekly_gem(wk);
  execute 'reset role';
  if n <> 1 then raise exception 'FAIL: an older week paid after a newer one (%)', n; end if;
  if (select gem_week from public.profiles where user_id = c) <> '2999-W01' then
    raise exception 'FAIL: gem_week moved back';
  end if;

  -- 6. A gift already owned goes back to the giver inside claim_gifts and
  -- is not returned; a new gift is.
  update public.profiles set coin_balance = 0,
    coin_cosmetics = jsonb_set(public.coin_catalog_normalize(coin_cosmetics), '{accessories}', '["bee"]')
  where user_id = b;
  update public.profiles set coin_balance = 0 where user_id = c;
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, coins)
  values (b, c, 'bee', 'accessory', 25), (b, c, 'fairy', 'accessory', 40);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*), bool_and(item_id = 'fairy') into n, ok from public.claim_gifts();
  execute 'reset role';
  if n <> 1 or not ok then raise exception 'FAIL: claim_gifts returned % gifts', n; end if;
  select coin_balance into n from public.profiles where user_id = c;
  if n <> 25 then raise exception 'FAIL: giver got % coins back, wanted 25', n; end if;
  if not exists (select 1 from public.cheer_gifts where to_id = b and cheer_id = 'bee'
      and returned_at is not null and claimed_at is not null) then
    raise exception 'FAIL: owned gift not marked returned';
  end if;
  -- return_gift on it now does nothing more.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.return_gift((select id from public.cheer_gifts where to_id = b and cheer_id = 'bee'));
  execute 'reset role';
  select coin_balance into n from public.profiles where user_id = c;
  if n <> 25 then raise exception 'FAIL: a returned gift paid twice (%)', n; end if;

  -- 7, 8. Family answers: own family's question only; once:<uuid> fits.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam := public.make_family('One');
  fam2 := public.make_family('Two');
  execute 'reset role';
  select id into tag from public.family_tags where family_id = fam limit 1;
  insert into public.family_lamps (family_id, tag_id, question, made_by) values (fam, tag, 'Walk?', a) returning id into lamp;
  select id into tag from public.family_tags where family_id = fam2 limit 1;
  insert into public.family_lamps (family_id, tag_id, question, made_by) values (fam2, tag, 'Read?', a) returning id into lamp2;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.family_answers (family_id, lamp_id, user_id, period_key)
  values (fam, lamp, a, 'once:' || lamp::text), (fam, lamp, a, current_date::text);
  begin
    insert into public.family_answers (family_id, lamp_id, user_id, period_key)
    values (fam, lamp2, a, current_date::text);
    raise exception 'FAIL: answered another family''s question under this family';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- 9. Seasonal accessories come back each year; dated drops and other kinds do not wrap.
  if not public.shop_window_live('accessory', '2026-10-01', '2026-11-01', '2027-10-15') then
    raise exception 'FAIL: witch not back next October';
  end if;
  if public.shop_window_live('accessory', '2026-10-01', '2026-11-01', '2027-06-15') then
    raise exception 'FAIL: witch on sale in June';
  end if;
  if not public.shop_window_live('accessory', '2026-12-26', '2027-01-06', '2028-01-03') then
    raise exception 'FAIL: sparkler not back over new year';
  end if;
  if public.shop_window_live('accessory', '2026-10-01', '2026-11-01', '2026-09-01') then
    raise exception 'FAIL: on sale before its first year';
  end if;
  if public.shop_window_live('look', '2026-10-01', '2026-11-01', '2027-10-15') then
    raise exception 'FAIL: a dated look came back';
  end if;
  if not public.shop_window_live('accessory', '2026-01-01', null, '2027-06-15') then
    raise exception 'FAIL: a plain accessory left the shop';
  end if;
  if not public.shop_item_live('accessory', 'bee') then
    raise exception 'FAIL: bee not live';
  end if;

  -- 2, 5. delete_me: unopened gifts go back; family questions keep working
  -- (made_by goes to null through the foreign key).
  insert into public.family_members (family_id, user_id, role) values (fam, b, 'kid') on conflict do nothing;
  update public.profiles set coin_balance = 0 where user_id = c;
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, coins)
  values (a, c, 'flag', 'accessory', 15);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.delete_me();
  execute 'reset role';
  if exists (select 1 from auth.users where id = a) then raise exception 'FAIL: account not deleted'; end if;
  select coin_balance into n from public.profiles where user_id = c;
  if n <> 15 then raise exception 'FAIL: giver got % back on delete, wanted 15', n; end if;

  -- A client update still can not change made_by.
  if not exists (select 1 from public.family_lamps where family_id = fam and made_by is null) then
    raise exception 'FAIL: made_by not cleared on delete';
  end if;
  select id into tag from public.family_tags where family_id = fam limit 1;
  insert into public.family_lamps (family_id, tag_id, question, made_by) values (fam, tag, 'Mine?', b) returning id into lamp;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.family_lamps set made_by = c, question = 'Edited?' where id = lamp;
  execute 'reset role';
  select made_by::text into st from public.family_lamps where id = lamp;
  if st <> b::text then raise exception 'FAIL: a client moved made_by'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.family_lamps set made_by = null where id = lamp;
  execute 'reset role';
  select made_by::text into st from public.family_lamps where id = lamp;
  if st is distinct from b::text then raise exception 'FAIL: a client nulled made_by'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
