-- Checks send_gift charges once for one request id (supabase/gift-once.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/gift-once.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();
  k text;
  item text;
  cost integer;
  n integer;
  gems integer;
begin
  select g.kind, g.item_id, g.gems into k, item, cost
  from public.gift_catalog g
  where g.kind in ('cheer', 'buddy') and g.gems > 0
    and public.shop_window_live(g.kind, g.live_from, g.live_until, (timezone('utc', now()))::date)
  order by g.gems
  limit 1;
  if item is null then raise exception 'FAIL: no live gem gift to test with'; end if;

  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b) on conflict (user_id) do nothing;
  update public.profiles set gem_balance = cost * 4 where user_id = a;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  -- The same request id twice, as a retry after a lost answer.
  execute format('select public.send_gift(%L, %L, %L, %L, %L)', b, k, item, '', rid);
  execute format('select public.send_gift(%L, %L, %L, %L, %L)', b, k, item, '', rid);
  execute 'reset role';

  select gem_balance into gems from public.profiles where user_id = a;
  if gems <> cost * 3 then raise exception 'FAIL: charged wrong gems (%), expected %', gems, cost * 3; end if;
  select count(*) into n from public.cheer_gifts where from_id = a;
  if n <> 1 then raise exception 'FAIL: % gift rows, expected 1', n; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
