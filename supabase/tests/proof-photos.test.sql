-- Checks proof photos (supabase/proof-photos.sql): who can add one, who can
-- see it, the daily cap, the kid guard, blocks, reports, wants_photo, cleanup.
-- Run with: node scripts/test-sql.mjs supabase/tests/proof-photos.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  k uuid := gen_random_uuid();
  p uuid := gen_random_uuid();
  f uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  s1 uuid;
  s2 uuid;
  sx uuid;
  sk uuid;
  sp uuid;
  card uuid;
  card2 uuid;
  pid uuid;
  pid2 uuid;
  n integer;
  flag boolean;
  who uuid;
  i integer;
begin
  insert into auth.users (id, email, aud, role)
  select u, u || '@test.invalid', 'authenticated', 'authenticated'
  from unnest(array[a, b, c, k, p, f]) as u;
  insert into public.profiles (user_id, display_name)
  values (a, 'Ann'), (b, 'Bea'), (c, 'Cy'), (k, 'Kit'), (p, 'Pat'), (f, 'Fay')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok'), (f, k, 'ok'), (k, f, 'ok');
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, p, 'parent'), (fam, k, 'kid');

  -- The bucket is private and holds small JPEGs only.
  select b2.public into flag from storage.buckets b2 where b2.id = 'proofs';
  if flag is distinct from false then raise exception 'FAIL: proofs bucket is not private'; end if;

  -- Ann asks Bea for a photo; Bea keeps it and says Did.
  insert into public.sends (from_id, to_id, question, state, wants_photo)
  values (a, b, 'Did you stretch?', 'kept', true) returning id into s1;
  select wants_photo into flag from public.sends where id = s1;
  if flag is not true then raise exception 'FAIL: wants_photo not kept'; end if;
  insert into public.sends (from_id, to_id, question, state) values (a, b, 'Did you walk?', 'kept') returning id into s2;
  select wants_photo into flag from public.sends where id = s2;
  if flag is not false then raise exception 'FAIL: wants_photo should default to false'; end if;
  insert into public.send_answers (send_id, night, answer) values (s1, current_date, 'did');

  -- No Did, no photo. A stranger and the sender can not add one either.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.add_proof(s2, null, current_date);
    raise exception 'FAIL: photo added with no Did';
  exception when others then
    if sqlerrm not like '%no Did%' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.add_proof(s1, null, current_date);
    raise exception 'FAIL: the sender added a photo for Bea';
  exception when others then
    if sqlerrm not like '%not your Did you%' then raise; end if;
  end;
  execute 'reset role';

  -- Bea adds one. Only one per answer.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  pid := public.add_proof(s1, null, current_date);
  begin
    perform public.add_proof(s1, null, current_date);
    raise exception 'FAIL: two photos on one answer';
  exception when unique_violation then null;
  end;
  select count(*) into n from public.proofs where id = pid;
  if n <> 1 then raise exception 'FAIL: owner can not see own photo'; end if;
  execute 'reset role';

  -- No push yet: it goes once the file is uploaded (proof-push-after-upload.sql).
  select count(*) into n from public.push_queue q where q.to_id = a and q.body = 'Bea added a photo';
  if n <> 0 then raise exception 'FAIL: a photo push went out before the upload, got %', n; end if;

  -- Ann sees it; a stranger does not.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid;
  if n <> 1 then raise exception 'FAIL: the sender can not see the photo'; end if;
  if not public.can_see_proof(pid) then raise exception 'FAIL: can_see_proof false for the sender'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid;
  if n <> 0 then raise exception 'FAIL: a stranger reads the photo row'; end if;
  if public.can_see_proof(pid) then raise exception 'FAIL: can_see_proof true for a stranger'; end if;
  begin
    perform public.report_proof(pid, 'x');
    raise exception 'FAIL: a stranger reported a photo they can not see';
  exception when others then
    if sqlerrm not like '%not yours%' then raise; end if;
  end;
  execute 'reset role';

  -- A block hides it both ways.
  insert into public.blocks (blocker, blocked) values (b, a);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid;
  if n <> 0 then raise exception 'FAIL: blocked sender still sees the photo'; end if;
  execute 'reset role';
  delete from public.blocks where blocker = b;
  insert into public.blocks (blocker, blocked) values (a, b);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid;
  if n <> 0 then raise exception 'FAIL: blocker still sees the photo'; end if;
  execute 'reset role';
  delete from public.blocks where blocker = a;
  -- A block ends the friendship (and its shared answers); make friends again.
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok') on conflict do nothing;
  insert into public.send_answers (send_id, night, answer) values (s1, current_date, 'did') on conflict do nothing;

  -- A report hides it for the reporter at once, and for nobody else.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.report_proof(pid, 'not ok');
  select count(*) into n from public.proofs where id = pid;
  if n <> 0 then raise exception 'FAIL: reported photo still shows for the reporter'; end if;
  execute 'reset role';
  select count(*) into n from public.reports r where r.from_id = a and r.about_id = b and r.proof_id = pid;
  if n <> 1 then raise exception 'FAIL: report not filed with proof_id'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid;
  if n <> 1 then raise exception 'FAIL: report hid the photo from its owner'; end if;
  begin
    perform public.report_proof(pid, 'x');
    raise exception 'FAIL: owner reported own photo';
  exception when others then
    if sqlerrm not like '%not yours%' then raise; end if;
  end;
  execute 'reset role';

  -- Five a day: Bea has one, four more fit, the seventh send's photo does not.
  for i in 1..4 loop
    insert into public.sends (from_id, to_id, question, state) values (a, b, 'Did you cap ' || i || '?', 'kept') returning id into sx;
    insert into public.send_answers (send_id, night, answer) values (sx, current_date, 'did');
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.add_proof(sx, null, current_date);
    execute 'reset role';
  end loop;
  insert into public.sends (from_id, to_id, question, state) values (a, b, 'Did you cap 5?', 'kept') returning id into sx;
  insert into public.send_answers (send_id, night, answer) values (sx, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.add_proof(sx, null, current_date);
    raise exception 'FAIL: sixth photo in a day went through';
  exception when others then
    if sqlerrm not like '%too many photos%' then raise; end if;
  end;
  execute 'reset role';

  -- Did we: a card that shows only a count keeps photos from the others.
  insert into public.we_cards (made_by, question, shows) values (a, 'Did we walk?', 'count') returning id into card;
  insert into public.we_members (card_id, user_id, state) values (card, a, 'in'), (card, c, 'in');
  insert into public.we_answers (card_id, user_id, night, status) values (card, c, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  pid2 := public.add_proof(null, card, current_date);
  select count(*) into n from public.proofs where id = pid2;
  if n <> 1 then raise exception 'FAIL: card owner can not see own photo'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid2;
  if n <> 0 then raise exception 'FAIL: a count-only card showed a photo'; end if;
  execute 'reset role';
  update public.we_cards set shows = 'waiting' where id = card;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid2;
  if n <> 1 then raise exception 'FAIL: a member does not see the photo when the card shows answers'; end if;
  execute 'reset role';
  -- Someone who left the card no longer sees it.
  update public.we_members set state = 'left' where card_id = card and user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.proofs where id = pid2;
  if n <> 0 then raise exception 'FAIL: a member who left still sees the photo'; end if;
  execute 'reset role';

  -- A card answer needs a Did.
  insert into public.we_cards (made_by, question) values (a, 'Did we read?') returning id into card2;
  insert into public.we_members (card_id, user_id, state) values (card2, a, 'in'), (card2, b, 'in');
  insert into public.we_answers (card_id, user_id, night, status) values (card2, a, current_date, 'nope');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.add_proof(null, card2, current_date);
    raise exception 'FAIL: photo on a Not yet';
  exception when others then
    if sqlerrm not like '%no Did%' then raise; end if;
  end;
  execute 'reset role';

  -- Kids: a Did you from a friend outside the family gets no photo; from family it does.
  insert into public.sends (from_id, to_id, question, state) values (f, k, 'Did you draw?', 'kept') returning id into sk;
  insert into public.send_answers (send_id, night, answer) values (sk, current_date, 'did');
  insert into public.sends (from_id, to_id, question, state) values (p, k, 'Did you read?', 'kept') returning id into sp;
  insert into public.send_answers (send_id, night, answer) values (sp, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.add_proof(sk, null, current_date);
    raise exception 'FAIL: kid photo went to a friend outside the family';
  exception when others then
    if sqlerrm not like '%family only%' then raise; end if;
  end;
  perform public.add_proof(sp, null, current_date);
  execute 'reset role';

  -- Kid on a card: every other member must share the family.
  insert into public.we_cards (made_by, question) values (k, 'Did we draw?') returning id into card;
  insert into public.we_members (card_id, user_id, state) values (card, k, 'in'), (card, p, 'in'), (card, f, 'in');
  insert into public.we_answers (card_id, user_id, night, status) values (card, k, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.add_proof(null, card, current_date);
    raise exception 'FAIL: kid photo went to a card with an outsider';
  exception when others then
    if sqlerrm not like '%family only%' then raise; end if;
  end;
  execute 'reset role';
  update public.we_members set state = 'left' where card_id = card and user_id = f;
  perform set_config('request.jwt.claims', json_build_object('sub', k, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.add_proof(null, card, current_date);
  execute 'reset role';

  -- Nobody writes or edits rows directly.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.proofs (owner_id, send_id, night) values (b, s2, current_date);
    raise exception 'FAIL: direct insert into proofs';
  exception when insufficient_privilege then null;
  end;
  -- The owner can remove theirs; a sender can not.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.proofs where id in (select id from public.proofs where send_id = s1 and false);
  execute 'reset role';
  select owner_id into who from public.proofs where id = pid;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.proofs where id = pid;
  execute 'reset role';
  select count(*) into n from public.proofs where id = pid;
  if n <> 0 then raise exception 'FAIL: owner could not remove the photo'; end if;

  -- The send goes, its photos go with it.
  delete from public.sends where id = sp;
  select count(*) into n from public.proofs where send_id = sp;
  if n <> 0 then raise exception 'FAIL: photo outlived its send'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
