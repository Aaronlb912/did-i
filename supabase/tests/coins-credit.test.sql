-- A day's coins land (no ambiguous night_iso) and a balance can pass 9,999.
do $$
declare a uuid := gen_random_uuid(); bal integer;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a) on conflict (user_id) do nothing;
  alter table public.profiles disable trigger user;
  update public.profiles set coin_balance = 9998 where user_id = a;
  alter table public.profiles enable trigger user;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bal := public.credit_night_coins(current_date::text, 6);
  execute 'reset role';
  if bal <> 10004 then raise exception 'FAIL: got %', bal; end if;
  raise exception 'SQL TESTS PASSED';
end $$;
