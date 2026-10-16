-- Checks for supabase/friend-ask-name.sql: no friend request without a name.
-- Run with: node scripts/test-sql.mjs supabase/tests/friend-ask-name.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  a_id text;
  c_id text;
  dcode text := 'nmnmnmnm23';
  card uuid;
  wcode text;
  out jsonb;
  n integer;
  row record;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, ''), (c, '')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set friend_id = public.new_friend_id() where user_id in (a, c) and friend_id is null;
  select friend_id into a_id from public.profiles where user_id = a;
  select friend_id into c_id from public.profiles where user_id = c;

  -- 1. Bea (no name) asks by friend ID: refused with 'need name'.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    out := public.ask_by_friend_id(a_id);
    raise exception 'FAIL: a nameless ask by friend id went through';
  exception when raise_exception then
    if sqlerrm <> 'need name' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  -- A straight insert from the client is refused too.
  begin
    insert into public.friend_links (from_id, to_id, state) values (b, a, 'asked');
    raise exception 'FAIL: a nameless insert went through';
  exception when raise_exception then
    if sqlerrm <> 'need name' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = b;
  if n <> 0 then raise exception 'FAIL: a nameless ask left a row'; end if;

  -- 2. With a name it works.
  update public.profiles set display_name = 'Bea' where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.ask_by_friend_id(a_id);
  if out->>'user_id' is distinct from a::text then raise exception 'FAIL: named ask did not go: %', out; end if;
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = b and to_id = a and state = 'asked';
  if n <> 1 then raise exception 'FAIL: named ask made % rows', n; end if;

  -- 3. A Did you link: Cal (no name) is refused, and nothing is made.
  insert into public.did_you_links (code, made_by, question) values (dcode, a, 'Did you stretch?');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.befriend_by_link(dcode);
    raise exception 'FAIL: a nameless befriend_by_link went through';
  exception when raise_exception then
    if sqlerrm <> 'need name' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  execute 'reset role';

  -- 4. Joining a Did we with add and no name: the join goes, the ask does not.
  insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), a, 'Did we read?')
  returning id into card;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card, a, 'in', a, now());
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  wcode := public.we_make_link(card);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.we_join_link(wcode, true);
  if out->>'card' is distinct from card::text then raise exception 'FAIL: nameless join failed: %', out; end if;
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = c;
  if n <> 0 then raise exception 'FAIL: a nameless join asked to be friends'; end if;

  -- 5. Cal with a name: the Did you link asks.
  update public.profiles set display_name = 'Cal' where user_id = c;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.befriend_by_link(dcode) then raise exception 'FAIL: named befriend_by_link failed'; end if;
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = c and to_id = a and state = 'asked';
  if n <> 1 then raise exception 'FAIL: named befriend_by_link made % rows', n; end if;

  -- 6. Ann's request list shows Cal's friend ID next to the name.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into row from public.friend_askers() f where f.user_id = c;
  if row.user_id is null or row.display_name <> 'Cal' then raise exception 'FAIL: friend_askers missed Cal: %', row; end if;
  if c_id is null or row.friend_id is distinct from c_id then
    raise exception 'FAIL: friend_askers friend id wrong: %', row;
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
