-- A daily Did we both did yesterday stays done when a third person joins today.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (a, c, 'ok');

  insert into public.we_cards (id, made_by, question, mode, shows, cadence, weekdays, starts_on)
  values (card, a, 'Did we walk?', 'all', 'all', 'daily', '{}', current_date - 30);
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card, a, 'in', now() - interval '30 days'), (card, b, 'in', now() - interval '30 days');
  insert into public.we_answers (card_id, user_id, night, status)
  values (card, a, current_date - 1, 'did'), (card, b, current_date - 1, 'did');
  insert into public.we_done (card_id, night) values (card, current_date - 1);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_ask(card, c);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  execute 'reset role';

  if not exists (select 1 from public.we_done where card_id = card and night = current_date - 1) then
    raise exception 'FAIL: a join took back last night';
  end if;
  raise exception 'SQL TESTS PASSED';
end $$;
