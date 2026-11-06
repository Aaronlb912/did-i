-- Checks supabase/proof-ux.sql: a photo on a monthly answer late in the
-- month (its row is past the week the phone shares), none once the answer
-- turns to Not yet or sharing goes off, none after an unfriend.
-- Run with: node scripts/test-sql.mjs supabase/tests/proof-ux.test.sql

do $$
declare
  a uuid := gen_random_uuid(); -- asks
  b uuid := gen_random_uuid(); -- answers and adds the photo
  s1 uuid;
  s2 uuid;
  pid uuid;
  pid2 uuid;
begin
  insert into auth.users (id, email, aud, role)
  select u, u || '@test.invalid', 'authenticated', 'authenticated'
  from unnest(array[a, b]) as u;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok');
  insert into public.sends (from_id, to_id, question, state, wants_photo)
  values (a, b, 'Did you pay rent?', 'kept', true) returning id into s1;
  insert into public.sends (from_id, to_id, question, state)
  values (a, b, 'Did you stretch?', 'kept') returning id into s2;

  -- 1. A Did dated 20 days back (a monthly one) takes a photo, though no
  --    send_answers row is that old. A recent night still needs its Did.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  pid := public.add_proof(s1, null, current_date - 20);
  begin
    perform public.add_proof(s1, null, current_date);
    raise exception 'FAIL: a photo with no Did today went through';
  exception when others then
    if sqlerrm not like '%no Did%' then raise; end if;
  end;
  begin
    perform public.add_proof(s1, null, current_date - 40);
    raise exception 'FAIL: a photo 40 days back went through';
  exception when others then
    if sqlerrm not like '%bad night%' then raise; end if;
  end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.can_see_proof(pid) then raise exception 'FAIL: the asker can not see an old photo'; end if;
  execute 'reset role';

  -- 2. The answer turns to Not yet: the asker no longer sees it, the owner does.
  insert into public.send_answers (send_id, night, answer) values (s1, current_date - 20, 'nope');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.can_see_proof(pid) then raise exception 'FAIL: photo seen after the answer turned to Not yet'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.can_see_proof(pid) then raise exception 'FAIL: the owner lost their own photo'; end if;
  execute 'reset role';
  delete from public.send_answers where send_id = s1;

  -- 3. Sharing off hides it; back on shows it.
  update public.sends set share_answers = false where id = s1;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.can_see_proof(pid) then raise exception 'FAIL: photo seen with sharing off'; end if;
  execute 'reset role';
  update public.sends set share_answers = true where id = s1;

  -- 4. A recent Did that is undone (its row deleted) hides the photo.
  insert into public.send_answers (send_id, night, answer) values (s2, current_date, 'did');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  pid2 := public.add_proof(s2, null, current_date);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.can_see_proof(pid2) then raise exception 'FAIL: the asker can not see a photo on today''s Did'; end if;
  execute 'reset role';
  delete from public.send_answers where send_id = s2;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.can_see_proof(pid2) then raise exception 'FAIL: photo seen after its Did was undone'; end if;
  execute 'reset role';

  -- 5. After an unfriend the asker no longer sees it, though the send stays.
  set local session_replication_role = replica;
  delete from public.friend_links where (from_id = a and to_id = b) or (from_id = b and to_id = a);
  set local session_replication_role = origin;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.can_see_proof(pid) then raise exception 'FAIL: photo seen after an unfriend'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
