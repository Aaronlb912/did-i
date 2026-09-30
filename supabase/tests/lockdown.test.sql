-- Checks for supabase/lockdown.sql: friends can't read each other's profile
-- rows, nobody writes their own coin_cosmetics, server-only functions stay shut.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/lockdown.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n integer;
  cos jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.profiles where user_id = b;
  if n <> 0 then
    raise exception 'FAIL: a friend can read the whole profile row (balances, settings)';
  end if;
  select count(*) into n from public.profiles where user_id = a;
  if n <> 1 then
    raise exception 'FAIL: you cannot read your own profile';
  end if;
  select count(*) into n from public.known_people() where user_id = b and display_name = 'Ben';
  if n <> 1 then
    raise exception 'FAIL: friends lost their names';
  end if;

  update public.profiles
  set coin_cosmetics = '{"stamps":[],"badges":[],"looks":["ink","brass","night"]}'::jsonb
  where user_id = a;
  execute 'reset role';
  select coin_cosmetics into cos from public.profiles where user_id = a;
  if cos ? 'looks' and cos->'looks' @> '["ink"]'::jsonb then
    raise exception 'FAIL: a user wrote free coin looks into their profile';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.sweep_push_queue();
    raise exception 'FAIL: a user can run sweep_push_queue';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
