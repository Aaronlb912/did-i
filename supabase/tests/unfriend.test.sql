-- Checks for supabase/unfriend.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/unfriend.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  card uuid;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok');
  insert into public.sends (from_id, to_id, question, state) values
    (a, b, 'Did you call mom?', 'sent'),
    (b, a, 'Did you stretch?', 'sent'),
    (a, b, 'Did you drink water?', 'kept');
  insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), a, 'Did we walk?') returning id into card;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at)
  values (card, a, 'in', a, now()), (card, b, 'in', a, now());

  -- Already friends shows through a link.
  insert into public.did_you_links (code, made_by, question) values ('abcdefgh23', a, 'call mom?');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.link_maker_is_friend('ABCDEFGH23') then raise exception 'FAIL: friend link not seen as a friend'; end if;
  if public.we_shared_count(a) <> 1 then raise exception 'FAIL: shared Did we count is wrong'; end if;

  -- Bea removes Ann and leaves the Did we they share.
  perform public.drop_friend(a);
  if public.we_leave_shared(a) <> 1 then raise exception 'FAIL: did not leave the shared Did we'; end if;
  if public.link_maker_is_friend('abcdefgh23') then raise exception 'FAIL: still friends after removing'; end if;
  execute 'reset role';

  select count(*) into n from public.sends where state = 'sent' and ((from_id = a and to_id = b) or (from_id = b and to_id = a));
  if n <> 0 then raise exception 'FAIL: waiting Did yous survived the unfriend: %', n; end if;
  select count(*) into n from public.sends where state = 'kept' and from_id = a and to_id = b;
  if n <> 1 then raise exception 'FAIL: a kept Did you was removed'; end if;
  select count(*) into n from public.we_members where card_id = card and user_id = b and state = 'in';
  if n <> 0 then raise exception 'FAIL: Bea is still on the shared Did we'; end if;
  select count(*) into n from public.we_members where card_id = card and user_id = a and state = 'in';
  if n <> 1 then raise exception 'FAIL: Ann lost the Did we'; end if;

  -- Family: Ann and Bea are only family now. Bea leaves; the waiting Did you
  -- and Did we ask between them go, a kept one stays.
  declare
    fam uuid;
    card2 uuid;
  begin
    insert into public.families (id, name, code) values (gen_random_uuid(), 'Test', 'TST' || substr(md5(random()::text), 1, 5)) returning id into fam;
    insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, b, 'kid');
    insert into public.sends (from_id, to_id, question, state) values (a, b, 'Did you read?', 'sent'), (a, b, 'Did you nap?', 'kept');
    insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), a, 'Did we cook?') returning id into card2;
    insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card2, a, 'in', a, now());
    insert into public.we_members (card_id, user_id, state, asked_by) values (card2, b, 'asked', a);
    delete from public.family_members where family_id = fam and user_id = b;
    select count(*) into n from public.sends where from_id = a and to_id = b and state = 'sent';
    if n <> 0 then raise exception 'FAIL: a waiting Did you survived leaving the family'; end if;
    select count(*) into n from public.sends where from_id = a and to_id = b and state = 'kept' and question = 'Did you nap?';
    if n <> 1 then raise exception 'FAIL: a kept Did you went with the family'; end if;
    select count(*) into n from public.we_members where card_id = card2 and user_id = b;
    if n <> 0 then raise exception 'FAIL: a Did we ask survived leaving the family'; end if;
  end;

  raise exception 'SQL TESTS PASSED';
end;
$$;
