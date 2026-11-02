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
  day0 date := current_date;
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
  perform public.we_answer(anycard, day0, 'did');
  perform public.we_answer(allcard, day0, 'did');
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.my_we_nights() w where w.card_id = anycard and w.night = day0 and w.done) then
    raise exception 'FAIL: an any card Ann finished is not done for Ben';
  end if;
  if exists (select 1 from public.my_we_nights() w where w.card_id = allcard and w.night = day0 and w.done) then
    raise exception 'FAIL: an all card is done with one of two';
  end if;
  execute 'reset role';

  -- A settled night stays done even when today's members would not finish it.
  update public.we_cards set starts_on = day0 - 5 where id = allcard;
  update public.we_members set joined_at = day0 - 5, asked_at = day0 - 5 where card_id = allcard;
  insert into public.we_done (card_id, night) values (allcard, day0 - 3) on conflict do nothing;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.my_we_nights() w where w.card_id = allcard and w.night = day0 - 3 and w.done) then
    raise exception 'FAIL: a settled done night came back not done';
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
