-- Checks for supabase/readthrough-5.sql: invite gems credited and the Night
-- look on the coin catalog, gift returns only for doubles, wrong family codes
-- counted on join, one "done together" push a night, block drops waiting
-- pushes, avatar links pinned to this project.
-- Run with: node scripts/test-sql.mjs supabase/tests/readthrough-5.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  f uuid;
  gift uuid;
  card uuid;
  night date := current_date;
  out jsonb;
  fam uuid;
  n integer;
  bal integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok');

  -- 1. Invites: enough friends for gems and the Night look.
  perform set_config('did_i.invite_write', '1', true);
  for n in 1..public.invite_look_at() loop
    f := gen_random_uuid();
    insert into auth.users (id, email, aud, role)
    values (f, f || '@test.invalid', 'authenticated', 'authenticated');
    insert into public.profiles (user_id, invited_by) values (f, a)
    on conflict (user_id) do update set invited_by = excluded.invited_by;
  end loop;
  perform set_config('did_i.invite_write', '', true);
  select gem_balance into bal from public.profiles where user_id = a;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.claim_invites();
  execute 'reset role';
  if (out->>'gems')::int < 1 then raise exception 'FAIL: no invite gems: %', out; end if;
  if (select gem_balance from public.profiles where user_id = a) <> least(bal + (out->>'gems')::int, 9999) then
    raise exception 'FAIL: invite gems not credited to gem_balance';
  end if;
  if not (out->'looks' @> '["night"]') then raise exception 'FAIL: Night look not won: %', out; end if;
  if not (select public.coin_catalog_normalize(coin_cosmetics)->'looks' @> '["night"]'::jsonb
          from public.profiles where user_id = a) then
    raise exception 'FAIL: Night look missing from the coin catalog';
  end if;

  -- 2. Gifts: a new item can not be returned; a double can.
  update public.profiles set gem_balance = 20,
    gem_cosmetics = '{"cheers": ["rain"]}'::jsonb where user_id = a;
  update public.profiles set gem_cosmetics = '{"cheers": ["rain"]}'::jsonb where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.send_gift(b, 'cheer', 'rain', '');
  perform public.send_gift(b, 'cheer', 'tape', '');
  execute 'reset role';
  select gem_balance into bal from public.profiles where user_id = a;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select g.id into gift from public.claim_gifts() g where g.item_id = 'tape';
  perform public.return_gift(gift);
  execute 'reset role';
  if (select gem_balance from public.profiles where user_id = a) <> bal then
    raise exception 'FAIL: a new item was returned and refunded';
  end if;
  if not (select public.gem_owned_normalize(gem_cosmetics)->'cheers' @> '["tape"]'::jsonb
          from public.profiles where user_id = b) then
    raise exception 'FAIL: claimed gift not added';
  end if;

  select id into gift from public.cheer_gifts where to_id = b and cheer_id = 'rain';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.return_gift(gift);
  perform public.return_gift(gift);
  execute 'reset role';
  if (select gem_balance from public.profiles where user_id = a) <> bal + 2 then
    raise exception 'FAIL: a double should pay back 2 gems once';
  end if;

  -- 3. Family join: a wrong code returns null and counts as a miss.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam := public.join_family('ZZZZZZ');
  execute 'reset role';
  if fam is not null then raise exception 'FAIL: wrong code joined a family'; end if;
  select count(*) into n from public.family_code_misses where user_id = b;
  if n <> 1 then raise exception 'FAIL: join miss not counted (%)', n; end if;
  insert into public.family_code_misses (user_id)
  select b from generate_series(1, 19);
  execute 'set local role authenticated';
  begin
    perform public.join_family('ZZZZZZ');
    raise exception 'FAIL: 21st try was allowed';
  exception when raise_exception then
    if sqlerrm not like 'too many tries%' then raise; end if;
  end;
  execute 'reset role';

  -- 4. Did we: Did, undo, Did sends one push.
  insert into public.we_cards (made_by, question, starts_on) values (a, 'Did we test?', night - 1)
  returning id into card;
  insert into public.we_members (card_id, user_id, state) values (card, a, 'in');
  delete from public.push_queue where to_id in (a, b);
  insert into public.we_answers (card_id, user_id, night, status) values (card, a, night, 'did')
  on conflict do nothing;
  perform public.we_settle(card, night);
  delete from public.we_answers where card_id = card;
  perform public.we_settle(card, night);
  insert into public.we_answers (card_id, user_id, night, status) values (card, a, night, 'did');
  perform public.we_settle(card, night);
  if (select count(*) from public.we_done_pushed where card_id = card) <> 1 then
    raise exception 'FAIL: we_done_pushed not kept';
  end if;
  if (select count(*) from public.push_queue where to_id = a and title = 'Did we') > 1 then
    raise exception 'FAIL: done together pushed twice';
  end if;

  -- 5. Block drops waiting pushes between the two, both ways.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.push_queue (to_id, body) values (b, 'from a');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.push_queue (to_id, body) values (a, 'from b');
  insert into public.push_queue (to_id, body) values (b, 'to self');
  if (select from_id from public.push_queue where body = 'from b') <> b then
    raise exception 'FAIL: from_id not filled';
  end if;
  if (select from_id from public.push_queue where body = 'to self') is not null then
    raise exception 'FAIL: a push to yourself has a sender';
  end if;
  execute 'set local role authenticated';
  perform public.block_person(a, '');
  execute 'reset role';
  if exists (select 1 from public.push_queue where body in ('from a', 'from b')) then
    raise exception 'FAIL: waiting pushes survived the block';
  end if;
  if not exists (select 1 from public.push_queue where body = 'to self') then
    raise exception 'FAIL: block dropped an unrelated push';
  end if;

  -- 6. Avatars: another project's storage is refused.
  begin
    update public.profiles
    set avatar_url = 'https://otherproject.supabase.co/storage/v1/object/public/avatars/' || a || '/x.jpg'
    where user_id = a;
    raise exception 'FAIL: another project avatar link saved';
  exception when check_violation then
    null;
  end;
  update public.profiles
  set avatar_url = 'https://lsvvxslgizihbktqoybt.supabase.co/storage/v1/object/public/avatars/' || a || '/x.jpg'
  where user_id = a;

  raise exception 'SQL TESTS PASSED';
end;
$$;
