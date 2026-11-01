-- my_we_nights says when a Did we is done for the night, even when someone
-- else's answer finished it (an any card one person swiped).
--
-- Run with: npm run db:test supabase/tests/we-nights-done.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  anycard uuid;
  allcard uuid;
  night date := current_date;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated'),
         (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  anycard := public.we_make('Did we feed the cat?', 'any', 'all', 'daily', '{}', null, array[b]);
  allcard := public.we_make('Did we stretch?', 'all', 'all', 'daily', '{}', null, array[b]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(anycard, true);
  perform public.we_reply(allcard, true);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_answer(anycard, night, 'did');
  perform public.we_answer(allcard, night, 'did');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.my_we_nights() w where w.card_id = anycard and w.night = night and w.done) then
    raise exception 'FAIL: an any card Ann finished is not done for Ben';
  end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = allcard and w.night = night and w.done) then
    raise exception 'FAIL: an all card is done with one of two';
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
