-- Checks for supabase/signin-carry.sql. Rolls back.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  lk text;
  acc text;
  accp integer;
  out jsonb;
  n integer;
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben') on conflict (user_id) do nothing;

  select item_id into lk from public.shop_catalog c
  where kind = 'look' and gems is null and public.shop_item_live('look', item_id) limit 1;
  select item_id, coins into acc, accp from public.shop_catalog c
  where kind = 'accessory' and coins between 1 and 100 and gems is null and public.shop_item_live('accessory', item_id)
  order by coins limit 1;
  if lk is null or acc is null then raise exception 'FAIL: no live look or accessory to test with'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  out := public.carry_signed_out(50, array[lk], array[]::text[]);
  if (out->>'carried')::boolean is not true then raise exception 'FAIL: first call did not carry'; end if;
  if (select coin_balance from public.profiles where user_id = a) <> 50 then raise exception 'FAIL: balance is not 50'; end if;
  if not (out->'looks' ? lk) then raise exception 'FAIL: look not granted'; end if;
  if (select coins from public.signin_carries where user_id = a) <> 50 then raise exception 'FAIL: coins not recorded'; end if;

  out := public.carry_signed_out(50, array[]::text[], array[acc]);
  if (out->>'carried')::boolean is not false then raise exception 'FAIL: second call carried'; end if;
  if (select coin_balance from public.profiles where user_id = a) <> 50 then raise exception 'FAIL: second call paid'; end if;
  if out->'accessories' ? acc then raise exception 'FAIL: second call granted an item'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.signin_carries;
  if n <> 0 then raise exception 'FAIL: saw another user row'; end if;
  out := public.carry_signed_out(10000, array['fake', 'lime'], array['nonesuch']);
  if (select coin_balance from public.profiles where user_id = b) <> 300 then raise exception 'FAIL: 10000 did not clamp to 300'; end if;
  if jsonb_array_length(out->'accessories') <> 0 then raise exception 'FAIL: fake accessory granted'; end if;
  if out->'looks' ? 'fake' then raise exception 'FAIL: fake look granted'; end if;

  -- An unlive item is skipped.
  reset role;
  insert into public.shop_catalog (kind, item_id, coins, live_from) values ('accessory', 'zz-unlive', 10, '2099-01-01');
  insert into public.shop_catalog (kind, item_id, coins) values ('look', 'zz-gem', null) on conflict do nothing;
  update public.shop_catalog set gems = 3 where kind = 'look' and item_id = 'zz-gem';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from public.signin_carries where user_id = a;
  update public.profiles set coin_balance = 0, coin_cosmetics = coin_cosmetics || jsonb_build_object('accessories', jsonb_build_array(acc)) where user_id = a;
  set local role authenticated;
  out := public.carry_signed_out(100, array['zz-gem'], array['zz-unlive', acc]);
  if out->'accessories' ? 'zz-unlive' then raise exception 'FAIL: unlive item granted'; end if;
  if out->'looks' ? 'zz-gem' then raise exception 'FAIL: gem look granted'; end if;
  if (select coin_balance from public.profiles where user_id = a) <> 100 then raise exception 'FAIL: owned item was charged'; end if;

  begin
    insert into public.signin_carries (user_id) values (gen_random_uuid());
    raise exception 'FAIL: direct insert was allowed';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin
    perform public.carry_signed_out(50, array[lk], array[]::text[]);
    raise exception 'FAIL: anon could call';
  exception when insufficient_privilege then
    null;
  end;

  raise exception 'SQL TESTS PASSED';
end $$;
