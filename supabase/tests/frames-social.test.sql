-- Friends see your look and frame (friends-week.sql), and gem frames are
-- gifts (gifts.sql). A stranger sees neither.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/frames-social.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  bal jsonb;
  n integer;
  failed boolean;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Bea'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set gem_balance = 10, coin_balance = 200 where user_id = a;
  -- a and b are friends; c is a stranger to both.
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  -- Bea writes her look and frame like the phone does on sync.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.profiles set look_on = 'plum', frame_on = 'aurora' where user_id = b;
  -- Not a frame id: refused.
  failed := false;
  begin
    update public.profiles set frame_on = 'nope-frame' where user_id = b;
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL: an unknown frame id was saved'; end if;
  failed := false;
  begin
    update public.profiles set look_on = 'Plum <b>' where user_id = b;
  exception when check_violation then failed := true;
  end;
  if not failed then raise exception 'FAIL: a bad look id was saved'; end if;
  execute 'reset role';

  -- Ann, her friend, sees both.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.known_people() k
  where k.user_id = b and k.look_on = 'plum' and k.frame_on = 'aurora';
  if n <> 1 then raise exception 'FAIL: a friend does not see the look and frame'; end if;
  execute 'reset role';

  -- Cal, a stranger, sees neither: not in known_people, no profile row.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.known_people() k where k.user_id = b;
  if n <> 0 then raise exception 'FAIL: a stranger sees the friend card'; end if;
  select count(*) into n from public.profiles p where p.user_id = b;
  if n <> 0 then raise exception 'FAIL: a stranger reads the profile row'; end if;
  execute 'reset role';

  -- Gifts: a gem frame costs its shop_catalog gems.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bal := public.send_gift(b, 'frame', 'glow', 'For you');
  if (bal->>'gems')::int <> 7 then
    raise exception 'FAIL: a gem frame gift should cost 3 gems, left %', bal;
  end if;
  -- Coin, earned, seasonal and free frames are not gifts.
  foreach bal in array array['"thin"', '"ember"', '"web"', '"first"']::jsonb[] loop
    failed := false;
    begin
      perform public.send_gift(b, 'frame', bal #>> '{}', '');
    exception when raise_exception then
      if sqlerrm <> 'bad item' then raise exception 'FAIL: wrong message: %', sqlerrm; end if;
      failed := true;
    end;
    if not failed then raise exception 'FAIL: frame % was sent as a gift', bal; end if;
  end loop;
  -- A stranger cannot get one.
  failed := false;
  begin
    perform public.send_gift(c, 'frame', 'neon', '');
  exception when raise_exception then failed := true;
  end;
  if not failed then raise exception 'FAIL: a frame gift went to a stranger'; end if;
  select count(*) into n from public.profiles where user_id = a and gem_balance = 7;
  if n <> 1 then raise exception 'FAIL: refused frame gifts still charged'; end if;
  execute 'reset role';

  -- Bea opens the app: the frame lands on her server gem list.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_gifts() g where g.kind = 'frame' and g.item_id = 'glow';
  if n <> 1 then raise exception 'FAIL: the frame gift did not arrive'; end if;
  if not (public.read_gem_owned()->'frames' @> '["glow"]') then
    raise exception 'FAIL: the gifted frame is not owned: %', public.read_gem_owned();
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
