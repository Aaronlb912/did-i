-- Checks for supabase/friend-decline-hold.sql: a declined ask holds new asks
-- for 7 days and still answers like a fresh ask.
-- Run with: node scripts/test-sql.mjs supabase/tests/friend-decline-hold.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  b_id text;
  out jsonb;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Bea')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set friend_id = public.new_friend_id() where user_id = b and friend_id is null;
  select friend_id into b_id from public.profiles where user_id = b;

  -- 1. Ann asks Bea.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(b_id);
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = a and to_id = b and state = 'asked';
  if n <> 1 then raise exception 'FAIL: first ask left % rows', n; end if;

  -- 2. Bea declines (deletes the request).
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.friend_links where from_id = a and to_id = b;
  execute 'reset role';

  -- 3. Ann asks again: asked-like answer, no row.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(b_id);
  execute 'reset role';
  if out ? 'miss' or (out->>'user_id') is distinct from b::text then raise exception 'FAIL: held ask answered: %', out; end if;
  select count(*) into n from public.friend_links where from_id = a and to_id = b;
  if n <> 0 then raise exception 'FAIL: held ask made a request'; end if;

  -- 4. 8 days later Ann can ask again.
  update public.friend_declines set at = now() - interval '8 days' where decliner = b and asker = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(b_id);
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = a and to_id = b and state = 'asked';
  if n <> 1 then raise exception 'FAIL: ask after 8 days left % rows', n; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
