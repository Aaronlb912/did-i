-- Old turns days are not re-dealt after a leave, and a parent can rotate the
-- family code.
--
-- Run with: npm run db:test supabase/tests/turns-and-code.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid;
  fam uuid;
  old_code text;
  new_code text;
  day0 date := current_date;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated'),
         (b, b || '@test.invalid', 'authenticated', 'authenticated'),
         (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cy')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (a, c, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we do the dishes?', 'turns', 'all', 'daily', '{}', null, array[b, c]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  execute 'reset role';

  update public.we_cards set starts_on = day0 - 10 where id = card;
  update public.we_members set joined_at = day0 - 10, asked_at = day0 - 10 where card_id = card;
  insert into public.we_turns (card_id, night, user_id) values (card, day0 - 4, b) on conflict do nothing;
  insert into public.we_answers (card_id, user_id, night, status) values (card, b, day0 - 6, 'nope') on conflict do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_leave(card);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if exists (select 1 from public.my_we_nights() w
             where w.card_id = card and w.night < day0 - 1 and w.night not in (day0 - 4, day0 - 6)) then
    raise exception 'FAIL: an old unpinned turns day was dealt to Ben after the leave';
  end if;
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = day0 - 4) then
    raise exception 'FAIL: a pinned turns day went missing';
  end if;
  if not exists (select 1 from public.my_we_nights() w where w.card_id = card and w.night = day0 - 6) then
    raise exception 'FAIL: an answered turns day went missing';
  end if;
  execute 'reset role';

  -- Family code rotation.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam := public.make_family('Test family');
  select f.code into old_code from public.families f where f.id = fam;
  new_code := public.rotate_family_code(fam);
  if new_code is null or new_code = old_code then
    raise exception 'FAIL: the code did not change';
  end if;
  if exists (select 1 from public.families f where f.code = old_code) then
    raise exception 'FAIL: the old code still works';
  end if;
  if not exists (select 1 from public.families f where f.id = fam and f.code = new_code) then
    raise exception 'FAIL: the new code is not saved';
  end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.rotate_family_code(fam);
    raise exception 'FAIL: a non-member rotated the code';
  exception when others then
    if sqlerrm not like 'parents only%' then raise; end if;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  for i in 1..4 loop
    perform public.rotate_family_code(fam);
  end loop;
  begin
    perform public.rotate_family_code(fam);
    raise exception 'FAIL: the sixth code in a day went through';
  exception when others then
    if sqlerrm not like 'too many new codes%' then raise; end if;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
