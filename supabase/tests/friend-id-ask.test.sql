-- Checks for supabase/friend-id-ask.sql: asking someone who asked you makes
-- you friends, and an ask the daily cap drops says 'cap'.
-- Run with: node scripts/test-sql.mjs supabase/tests/friend-id-ask.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  a_id text;
  c_id text;
  out jsonb;
  n integer;
  i integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Bea'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set friend_id = public.new_friend_id() where user_id in (a, c) and friend_id is null;
  select friend_id into a_id from public.profiles where user_id = a;
  select friend_id into c_id from public.profiles where user_id = c;

  -- 1. Ann asked Bea. Bea asks Ann by friend ID: friends both ways.
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'asked');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(a_id);
  execute 'reset role';
  if (out->>'friends') is distinct from 'true' then raise exception 'FAIL: no friends flag: %', out; end if;
  select count(*) into n from public.friend_links
  where ((from_id = a and to_id = b) or (from_id = b and to_id = a)) and state = 'ok';
  if n <> 2 then raise exception 'FAIL: % ok links, want 2', n; end if;

  -- 2. Bea asks Cal and takes it back until the cap drops one: 'cap', no row.
  for i in 1..6 loop
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    out := public.ask_by_friend_id(c_id);
    execute 'reset role';
    exit when out->>'miss' = 'cap';
    delete from public.friend_links where from_id = b and to_id = c;
  end loop;
  if out->>'miss' is distinct from 'cap' then raise exception 'FAIL: cap never said so: %', out; end if;
  select count(*) into n from public.friend_links where from_id = b and to_id = c;
  if n <> 0 then raise exception 'FAIL: capped ask left a row'; end if;

  -- 3. Asking again while one is waiting still says asked, not cap.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(a_id);
  out := public.ask_by_friend_id(a_id);
  execute 'reset role';
  if out ? 'miss' then raise exception 'FAIL: repeat ask missed: %', out; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
