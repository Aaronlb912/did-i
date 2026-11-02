-- Wearing a coin look or coin frame needs owning it. Free defaults stay allowed.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/equip-owned.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  got text;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set coin_balance = 100, look_on = 'lime', frame_on = '' where user_id = a;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- A coin look nobody bought does not stick.
  update public.profiles set look_on = 'ink' where user_id = a;
  select look_on into got from public.profiles where user_id = a;
  if got <> 'lime' then
    raise exception 'FAIL: wore a coin look that was not bought: %', got;
  end if;
  -- A coin frame nobody bought does not stick.
  update public.profiles set frame_on = 'thin' where user_id = a;
  select frame_on into got from public.profiles where user_id = a;
  if got <> '' then
    raise exception 'FAIL: wore a coin frame that was not bought: %', got;
  end if;

  perform public.buy_with_coins('look', 'ink');
  update public.profiles set look_on = 'ink' where user_id = a;
  select look_on into got from public.profiles where user_id = a;
  if got <> 'ink' then
    raise exception 'FAIL: could not wear a bought coin look: %', got;
  end if;
  perform public.buy_with_coins('frame', 'thin');
  update public.profiles set frame_on = 'thin' where user_id = a;
  select frame_on into got from public.profiles where user_id = a;
  if got <> 'thin' then
    raise exception 'FAIL: could not wear a bought coin frame: %', got;
  end if;

  -- The free default is always allowed.
  update public.profiles set look_on = 'lime' where user_id = a;
  select look_on into got from public.profiles where user_id = a;
  if got <> 'lime' then
    raise exception 'FAIL: could not go back to lime: %', got;
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
