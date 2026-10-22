-- Checks for supabase/social-pushes.sql.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/social-pushes.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  fam uuid := gen_random_uuid();
  card uuid;
  s uuid;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (a, c, 'ok');

  -- A Did you kept in the app tells the sender; a pass does not.
  insert into public.sends (from_id, to_id, question) values (a, b, 'Did you call mom?') returning id into s;
  update public.sends set state = 'kept' where id = s;
  if not exists (select 1 from public.push_queue where to_id = a and body = 'Ben kept your Did you: Did you call mom?') then
    raise exception 'FAIL: a kept Did you was not pushed';
  end if;
  insert into public.sends (from_id, to_id, question) values (a, c, 'Did you stretch?') returning id into s;
  update public.sends set state = 'passed' where id = s;
  if exists (select 1 from public.push_queue where to_id = a and body like 'Cal%') then
    raise exception 'FAIL: a pass was pushed';
  end if;

  -- The maker ending a Did we tells the people on it.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we walk?', 'all', 'waiting', 'daily', '{}', null, array[b, c]);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_close(card);
  execute 'reset role';
  if not exists (select 1 from public.push_queue where to_id = b and body = 'Ann ended the Did we: Did we walk?') then
    raise exception 'FAIL: ending a Did we was not pushed';
  end if;
  if exists (select 1 from public.push_queue where to_id = c and body like 'Ann ended%') then
    raise exception 'FAIL: someone not on the Did we heard it ended';
  end if;

  -- Joining a family tells the people in it.
  insert into public.families (id, name, code) values (fam, 'Test', upper(substr(md5(fam::text), 1, 6)));
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent');
  insert into public.family_members (family_id, user_id, role) values (fam, b, 'kid');
  if not exists (select 1 from public.push_queue where to_id = a and body = 'Ben joined your family.') then
    raise exception 'FAIL: a family join was not pushed';
  end if;
  if exists (select 1 from public.push_queue where to_id = b and body like '%joined your family%') then
    raise exception 'FAIL: the joiner was told about their own join';
  end if;

  -- A parent removing someone stays quiet; leaving yourself tells the rest.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from public.family_members where family_id = fam and user_id = b;
  if exists (select 1 from public.push_queue where body like '%left your family%') then
    raise exception 'FAIL: a removal was pushed as a leave';
  end if;
  insert into public.family_members (family_id, user_id, role) values (fam, b, 'kid');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  delete from public.family_members where family_id = fam and user_id = b;
  perform set_config('request.jwt.claims', '', true);
  if not exists (select 1 from public.push_queue where to_id = a and body = 'Ben left your family.') then
    raise exception 'FAIL: leaving a family was not pushed';
  end if;

  -- A parent deleting the whole family is not a leave.
  insert into public.family_members (family_id, user_id, role) values (fam, b, 'kid');
  delete from public.push_queue where body like '%left your family%';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from public.families where id = fam;
  perform set_config('request.jwt.claims', '', true);
  if exists (select 1 from public.push_queue where body like '%left your family%') then
    raise exception 'FAIL: deleting a family was pushed as a leave';
  end if;

  -- Someone using your invite code tells you, once.
  perform set_config('did_i.invite_write', '1', true);
  update public.profiles set invited_by = a where user_id = c;
  update public.profiles set invited_by = b where user_id = c;
  perform set_config('did_i.invite_write', '', true);
  select count(*) into n from public.push_queue where body like '%with your invite code.';
  if n <> 1 or not exists (select 1 from public.push_queue where to_id = a and body like '%with your invite code.') then
    raise exception 'FAIL: invite code use gave % pushes, want 1 to the inviter', n;
  end if;

  -- The same push twice in a row is sent once.
  insert into public.push_queue (to_id, title, body, go) values (c, 'Did we', 'twice', '/tonight');
  insert into public.push_queue (to_id, title, body, go) values (c, 'Did we', 'twice', '/tonight');
  select count(*) into n from public.push_queue where to_id = c and body = 'twice';
  if n <> 1 then
    raise exception 'FAIL: a repeat push was queued % times', n;
  end if;
  select c2.n into n from public.push_to_counts c2 where c2.to_id = c and c2.hour = date_trunc('hour', now());
  if n <> (select count(*) from public.push_queue where to_id = c) then
    raise exception 'FAIL: a dropped repeat still counts toward the cap (%)', n;
  end if;
  -- Two friends with the same words both get through.
  insert into public.push_queue (to_id, from_id, title, body, go) values (c, a, 'Did I', 'same', '/friends');
  insert into public.push_queue (to_id, from_id, title, body, go) values (c, b, 'Did I', 'same', '/friends');
  if (select count(*) from public.push_queue where to_id = c and body = 'same') <> 2 then
    raise exception 'FAIL: two senders with the same words were taken for one';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
