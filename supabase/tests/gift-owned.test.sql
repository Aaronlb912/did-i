-- Checks send_gift refuses items they already have (supabase/gift-owned.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/gift-owned.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  k text;
  item text;
  cost integer;
  list text;
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
  list := case k when 'cheer' then 'cheers' else 'buddies' end;

  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b), (c) on conflict (user_id) do nothing;
  update public.profiles set gem_balance = cost * 4 where user_id in (a, c);
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (c, b, 'ok');

  -- Callers cannot probe what someone owns.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.owns_item(b, k, item);
    raise exception 'FAIL: owns_item callable by a user';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- 1. Not owned: the gift goes and the gems are taken.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.send_gift(b, k, item, '');
  execute 'reset role';
  select gem_balance into gems from public.profiles where user_id = a;
  if gems <> cost * 3 then raise exception 'FAIL: first gift took wrong gems (%)', gems; end if;

  -- 2. The same gift already waiting (from someone else): refused, no gems taken.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.send_gift(b, k, item, '');
    raise exception 'FAIL: sent a gift that was already waiting';
  exception when others then
    if sqlerrm not like '%already owned%' then raise; end if;
  end;
  execute 'reset role';
  select gem_balance into gems from public.profiles where user_id = c;
  if gems <> cost * 4 then raise exception 'FAIL: pending refusal took gems (%)', gems; end if;

  -- 3. Owned on the profile, nothing waiting: refused, no gems taken.
  delete from public.cheer_gifts where to_id = b;
  update public.profiles
  set gem_cosmetics = public.gem_owned_add(gem_cosmetics, list, item)
  where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.send_gift(b, k, item, '');
    raise exception 'FAIL: sent a gift they already own';
  exception when others then
    if sqlerrm not like '%already owned%' then raise; end if;
  end;
  execute 'reset role';
  select gem_balance into gems from public.profiles where user_id = c;
  if gems <> cost * 4 then raise exception 'FAIL: owned refusal took gems (%)', gems; end if;
  select count(*) into n from public.cheer_gifts where to_id = b;
  if n <> 0 then raise exception 'FAIL: owned refusal left % gift rows', n; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
