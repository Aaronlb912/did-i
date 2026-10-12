-- Checks for supabase/share-links.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/share-links.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid;
  code text;
  again text;
  dcode text := 'abcdefgh23';
  out jsonb;
  n integer;
  row record;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), a, 'Did we walk the dog?')
  returning id into card;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card, a, 'in', a, now());

  -- Ann makes a link; asking again hands back the same one.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  code := public.we_make_link(card);
  if code !~ '^[a-z0-9]{12}$' then raise exception 'FAIL: bad we link code %', code; end if;
  again := public.we_make_link(card);
  if again <> code then raise exception 'FAIL: a second share made a new link'; end if;
  execute 'reset role';

  -- Bea is not on the card and cannot make a link for it.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.we_make_link(card);
    raise exception 'FAIL: someone off the card made a link';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  -- Anyone can look it up: question, maker, one person on it.
  select * into row from public.look_up_we_link(upper(code));
  if row.question <> 'Did we walk the dog?' or row.name <> 'Ann' or row.people <> 1 or row.full_up then
    raise exception 'FAIL: look up came back wrong: %', row;
  end if;

  -- Bea joins without adding Ann: on the card, not friends.
  out := public.we_join_link(code, false);
  if out->>'card' is distinct from card::text then raise exception 'FAIL: join did not return the card: %', out; end if;
  execute 'reset role';
  select count(*) into n from public.push_queue where to_id = a and body like '%joined your Did we%';
  if n <> 1 then raise exception 'FAIL: fresh join queued % pushes to the maker', n; end if;
  select count(*) into n from public.we_members where card_id = card and user_id = b and state = 'in';
  if n <> 1 then raise exception 'FAIL: Bea is not on the card'; end if;
  select count(*) into n from public.friend_links where (from_id = a and to_id = b) or (from_id = b and to_id = a);
  if n <> 0 then raise exception 'FAIL: joining without add made a friend'; end if;

  -- Joining again with add asks Ann to be friends; a public link never
  -- makes a friend on the spot.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.we_join_link(code, true);
  if (out->>'already')::boolean is not true then raise exception 'FAIL: second join was not already: %', out; end if;
  execute 'reset role';
  select count(*) into n from public.push_queue where to_id = a and body like '%joined your Did we%';
  if n <> 1 then raise exception 'FAIL: an already join queued another push'; end if;
  select count(*) into n from public.friend_links where from_id = b and to_id = a and state = 'asked';
  if n <> 1 then raise exception 'FAIL: add did not ask Ann to be friends'; end if;
  select count(*) into n from public.friend_links where state = 'ok' and a in (from_id, to_id) and b in (from_id, to_id);
  if n <> 0 then raise exception 'FAIL: a link made friends without Ann saying yes'; end if;

  -- Cal blocked Bea, who is on the card: Cal cannot join and is not told why beyond blocked.
  insert into public.blocks (blocker, blocked) values (c, b);
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.we_join_link(code, true);
  if out->>'miss' is distinct from 'blocked' then raise exception 'FAIL: blocked join went through: %', out; end if;
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = c or to_id = c;
  if n <> 0 then raise exception 'FAIL: a blocked join made a friend'; end if;
  delete from public.blocks where blocker = c;

  -- Ann turns her links off: the link is gone for everyone.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_end_links(card);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.look_up_we_link(code);
  if n <> 0 then raise exception 'FAIL: an ended link still looks up'; end if;
  out := public.we_join_link(code, false);
  if out->>'miss' is distinct from 'gone' then raise exception 'FAIL: an ended link let someone in: %', out; end if;
  execute 'reset role';

  -- A link stops working once its maker has left the card.
  update public.we_links set ended = false where card_id = card;
  update public.we_members set state = 'left' where card_id = card and user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.we_join_link(code, false);
  if out->>'miss' is distinct from 'gone' then raise exception 'FAIL: a link worked after its maker left: %', out; end if;
  execute 'reset role';
  update public.we_members set state = 'in' where card_id = card and user_id = a;

  -- An expired link is gone too.
  insert into public.we_links (code, card_id, made_by, ends_at) values ('zzzzzzzzzzzz', card, a, now() - interval '1 minute');
  select count(*) into n from public.look_up_we_link('zzzzzzzzzzzz');
  if n <> 0 then raise exception 'FAIL: an expired link still looks up'; end if;

  -- A Did you link: Cal adds Ann from it, and only when Cal asks to.
  insert into public.did_you_links (code, made_by, question) values (dcode, a, 'Did you drink water?');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.befriend_by_link(dcode) then raise exception 'FAIL: befriend by Did you link failed'; end if;
  execute 'reset role';
  select count(*) into n from public.friend_links where from_id = c and to_id = a and state = 'asked';
  if n <> 1 then raise exception 'FAIL: Did you link did not ask Ann to be friends'; end if;
  -- Ann asked Cal first: then the link is a yes both ways.
  delete from public.friend_links where from_id = c and to_id = a;
  insert into public.friend_links (from_id, to_id, state) values (a, c, 'asked');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.befriend_by_link(dcode);
  execute 'reset role';
  select count(*) into n from public.friend_links
  where state = 'ok' and ((from_id = a and to_id = c) or (from_id = c and to_id = a));
  if n <> 2 then raise exception 'FAIL: an ask both ways did not make friends'; end if;

  -- Cal keeps the Did you link: Ann hears. Ann keeping her own stays quiet.
  insert into public.did_you_link_claims (code, user_id) values (dcode, c);
  insert into public.did_you_link_claims (code, user_id) values (dcode, a);
  select count(*) into n from public.push_queue where to_id = a and body like '%kept your Did you: Did you drink water?';
  if n <> 1 then raise exception 'FAIL: keeping a Did you link queued % pushes to the maker', n; end if;

  -- Nobody calls the helper straight.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.link_befriend(b);
    raise exception 'FAIL: link_befriend is callable';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
