-- Checks that gem looks, cheers and buddies are bought and owned on the
-- server (buy_with_gems, read_gem_owned, gift claims), not on the phone.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/gem-owned.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  out jsonb;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set gem_balance = 4 where user_id = a;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  out := public.buy_with_gems('look', 'plum');
  if (out->>'gems')::int <> 2 or not (out->'looks' @> '["plum"]') then
    raise exception 'FAIL: buying plum should cost 2 gems and own it: %', out;
  end if;
  out := public.buy_with_gems('look', 'plum');
  if (out->>'gems')::int <> 2 then
    raise exception 'FAIL: buying something you own charged again: %', out;
  end if;

  begin
    perform public.buy_with_gems('buddy', 'cat');
    raise exception 'FAIL: a 5 gem buddy went through with 2 gems';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'need gems' then raise exception 'FAIL: wrong message: %', sqlerrm; end if;
  end;
  begin
    perform public.buy_with_gems('look', 'ink');
    raise exception 'FAIL: a coin look was bought with gems';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.buy_with_gems('cheer', 'launch');
    raise exception 'FAIL: the launch cheer was bought';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Writing the list or the balance straight to the profile does nothing.
  update public.profiles
  set gem_cosmetics = '{"looks":["rose"],"cheers":["rain"],"buddies":["cat"]}', gem_balance = 99
  where user_id = a;
  out := public.read_gem_owned();
  if out->'looks' <> '["plum"]'::jsonb or out->'cheers' <> '[]'::jsonb or (out->>'gems')::int <> 2 then
    raise exception 'FAIL: a profile write changed what you own: %', out;
  end if;
  execute 'reset role';

  -- Gifts and special items land on the list when claimed.
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind) values (a, b, 'launch', 'cheer');
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, gems) values (a, b, 'owl', 'buddy', 5);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_gifts();
  if n <> 2 then
    raise exception 'FAIL: expected 2 gifts claimed, got %', n;
  end if;
  out := public.read_gem_owned();
  if not (out->'cheers' @> '["launch"]') or not (out->'buddies' @> '["owl"]') then
    raise exception 'FAIL: claimed gifts are not on the server list: %', out;
  end if;
  execute 'reset role';

  -- Nobody signed out can read or buy.
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role anon';
  begin
    perform public.buy_with_gems('look', 'rose');
    raise exception 'FAIL: anon could call buy_with_gems';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
