-- Checks for supabase/did-we-safety.sql: a kid's card holds only the kid's
-- family (both ways), delete_me leaves cards the normal way, and an ended
-- card says so.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/did-we-safety.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  k uuid := gen_random_uuid();
  f uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  card uuid;
  card2 uuid;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (k, k || '@test.invalid', 'authenticated', 'authenticated'),
    (f, f || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (k, 'Kit'), (f, 'Fay')
  on conflict (user_id) do update set display_name = excluded.display_name;
  -- a is k's parent; f is a friend of both, not family.
  insert into public.friend_links (from_id, to_id, state) values (a, f, 'ok'), (k, f, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, k, 'kid');

  -- Kid rule: a card with a friend cannot take the kid --------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we read?', 'all', 'waiting', 'daily', '{}', null, array[f]);
  begin
    perform public.we_ask(card, k);
    raise exception 'FAIL: asked a kid onto a card with a non-family friend';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'kid card is family only' then raise exception 'FAIL: wrong refusal: %', sqlerrm; end if;
  end;
  begin
    perform public.we_make('Did we walk?', 'all', 'waiting', 'daily', '{}', null, array[f, k]);
    raise exception 'FAIL: made a card with a kid and a non-family friend';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Kid rule: a card with the kid cannot take a non-family friend ---------
  card2 := public.we_make('Did we brush?', 'all', 'waiting', 'daily', '{}', null, array[k]);
  begin
    perform public.we_ask(card2, f);
    raise exception 'FAIL: asked a non-family friend onto a kid card';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  -- Kid rule: a share link cannot bring a non-family friend onto a kid card
  insert into public.we_links (code, card_id, made_by) values ('kidlinktest1', card2, a);
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_join_link('kidlinktest1');
    raise exception 'FAIL: joined a kid card by link without being family';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'kid card is family only' then raise exception 'FAIL: link refusal said %', sqlerrm; end if;
  end;
  execute 'reset role';

  -- Ended card ------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_close(card2);
  begin
    perform public.we_answer(card2, current_date, 'did');
    raise exception 'FAIL: answered an ended card';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'card ended' then raise exception 'FAIL: ended card said %', sqlerrm; end if;
  end;

  -- delete_me leaves cards: the friend takes over ---------------------------
  perform public.delete_me();
  execute 'reset role';
  if (select made_by from public.we_cards where id = card) is distinct from f then
    raise exception 'FAIL: the card did not pass to the one still on it';
  end if;
  if (select archived from public.we_cards where id = card) then
    raise exception 'FAIL: the card ended with someone still on it';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
