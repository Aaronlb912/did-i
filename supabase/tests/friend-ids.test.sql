-- Checks for supabase/friend-ids.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/friend-ids.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  a_id text;
  b_id text;
  out jsonb;
  n integer;
  i integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');

  -- New rows get an ID even when they try to pick their own.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.profiles (user_id, display_name, friend_id) values (a, 'Ann', '111111111111')
  on conflict (user_id) do update set display_name = excluded.display_name;
  a_id := public.my_friend_id();
  if a_id !~ '^[1-9][0-9]{11}$' then
    raise exception 'FAIL: friend id is not 12 digits: %', a_id;
  end if;
  update public.profiles set friend_id = '222222222222' where user_id = a;
  if public.my_friend_id() <> a_id then
    raise exception 'FAIL: a user changed their own friend id';
  end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  b_id := public.my_friend_id();
  if b_id = a_id then
    raise exception 'FAIL: two accounts share a friend id';
  end if;

  -- No phone on file, and the ask still goes through.
  out := public.ask_by_friend_id(substr(a_id, 1, 4) || ' ' || substr(a_id, 5, 4) || '-' || substr(a_id, 9));
  if out->>'display_name' <> 'Ann' then
    raise exception 'FAIL: asking by friend id did not find Ann: %', out;
  end if;
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = b and to_id = a and state = 'asked';
  if n <> 1 then
    raise exception 'FAIL: no friend request was made';
  end if;

  -- Your own ID and a wrong ID come back as a miss; a bad shape is refused.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(b_id);
  if out->>'miss' is distinct from 'nobody' then
    raise exception 'FAIL: asking yourself did not miss: %', out;
  end if;
  begin
    perform public.ask_by_friend_id('123');
    raise exception 'FAIL: a short id went through';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Twenty misses a day (one used above), then every try is refused.
  for i in 1..19 loop
    out := public.ask_by_friend_id('9' || lpad(i::text, 11, '0'));
    if out->>'miss' is distinct from 'nobody' then
      raise exception 'FAIL: wrong id % did not miss: %', i, out;
    end if;
  end loop;
  begin
    perform public.ask_by_friend_id(a_id);
    raise exception 'FAIL: the 21st try went through';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'too many tries' then
      raise exception 'FAIL: wrong message after the cap: %', sqlerrm;
    end if;
  end;
  execute 'reset role';
  select count(*) into n from public.friend_id_misses where user_id = b;
  if n <> 20 then
    raise exception 'FAIL: expected 20 misses on record, got %', n;
  end if;

  -- Blocked: looks the same as a wrong id.
  delete from public.friend_id_misses where user_id = b;
  delete from public.friend_links where from_id = b;
  insert into public.blocks (blocker, blocked) values (a, b);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(a_id);
  if out->>'miss' is distinct from 'nobody' then
    raise exception 'FAIL: a block showed a different answer: %', out;
  end if;
  -- Nobody reads another row to find an id.
  select count(*) into n from public.profiles where user_id = a;
  if n <> 0 then
    raise exception 'FAIL: could read another profile';
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
