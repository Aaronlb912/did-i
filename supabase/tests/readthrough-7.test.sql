-- Checks for supabase/readthrough-7.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/readthrough-7.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  fam uuid;
  tag uuid;
  lamp uuid;
  n integer;
  st text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b), (c) on conflict (user_id) do nothing;

  -- 1. A parent can set a role but not move a member row to another account.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  fam := public.make_family('Test');
  execute 'reset role';
  insert into public.family_members (family_id, user_id, role) values (fam, b, 'kid')
  on conflict do nothing;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.family_members set role = 'parent' where family_id = fam and user_id = b;
  begin
    update public.family_members set user_id = c where family_id = fam and user_id = b;
    raise exception 'FAIL: a parent moved a member row to another account';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  select role into st from public.family_members where family_id = fam and user_id = b;
  if st <> 'parent' then raise exception 'FAIL: role update did not stick (%)', st; end if;

  -- 2. An upsert keeps an owned gem look and refuses one not owned.
  update public.profiles set gem_cosmetics = public.gem_owned_add(gem_cosmetics, 'looks', 'moss') where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.profiles (user_id, look_on) values (a, 'moss')
  on conflict (user_id) do update set look_on = excluded.look_on;
  select look_on into st from public.profiles where user_id = a;
  if st <> 'moss' then raise exception 'FAIL: upsert of an owned look became %', st; end if;
  insert into public.profiles (user_id, look_on) values (a, 'plum')
  on conflict (user_id) do update set look_on = excluded.look_on;
  select look_on into st from public.profiles where user_id = a;
  if st <> 'moss' then raise exception 'FAIL: upsert of an unowned look gave %', st; end if;
  execute 'reset role';
  select gem_balance into n from public.profiles where user_id = a;
  if n <> 0 then raise exception 'FAIL: upsert changed the gem balance'; end if;

  -- 3. Old questions do not count toward today; a client update keeps
  -- made_at and made_by; unarchiving checks the 200 cap.
  select id into tag from public.family_tags where family_id = fam limit 1;
  insert into public.family_lamps (family_id, tag_id, question, made_by)
  select fam, tag, 'Old ' || i || '?', a from generate_series(1, 50) i;
  update public.family_lamps set made_at = now() - interval '3 days' where family_id = fam;
  insert into public.family_lamps (family_id, tag_id, question, made_by)
  values (fam, tag, 'New today?', a) returning id into lamp;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.family_lamps set made_at = now() - interval '9 days', made_by = b, question = 'Edited?'
  where id = lamp;
  execute 'reset role';
  if not exists (select 1 from public.family_lamps where id = lamp and made_by = a
      and made_at > now() - interval '1 hour' and question = 'Edited?') then
    raise exception 'FAIL: a client update moved made_at or made_by';
  end if;
  update public.family_lamps set archived = true where id = lamp;
  insert into public.family_lamps (family_id, tag_id, question)
  select fam, tag, 'Fill ' || i || '?' from generate_series(1,
    200 - (select count(*) from public.family_lamps where family_id = fam and not archived)::int) i;
  begin
    update public.family_lamps set archived = false where id = lamp;
    raise exception 'FAIL: unarchive went past 200 live';
  exception when raise_exception then
    if sqlerrm <> 'too many family questions' then raise; end if;
  end;

  -- 4. 20 folders per family; period_key shapes.
  insert into public.family_tags (family_id, title)
  select fam, 'F' || i from generate_series(1, 20 - (select count(*) from public.family_tags where family_id = fam)::int) i;
  begin
    insert into public.family_tags (family_id, title) values (fam, 'One more');
    raise exception 'FAIL: a 21st family folder got in';
  exception when raise_exception then
    if sqlerrm <> 'too many family folders' then raise; end if;
  end;
  insert into public.family_answers (family_id, lamp_id, user_id, period_key)
  values (fam, lamp, a, '2026-10-14'), (fam, lamp, a, '2026-10'), (fam, lamp, a, 'once:' || lamp);
  begin
    insert into public.family_answers (family_id, lamp_id, user_id, period_key)
    values (fam, lamp, a, 'junk');
    raise exception 'FAIL: a bad period_key got in';
  exception when check_violation then null;
  end;

  -- 5. An 11th phone pushes out a phone with no push token before an
  -- older phone that has one.
  delete from public.devices where user_id = a;
  insert into public.devices (user_id, device_key, push_token, last_seen_at)
  select a, 'd' || i, case when i = 3 then null else 'tok' || i end, now() - make_interval(days => i)
  from generate_series(1, 10) i;
  insert into public.devices (user_id, device_key) values (a, 'new');
  select count(*) into n from public.devices where user_id = a;
  if n <> 10 then raise exception 'FAIL: phones went past 10 (%)', n; end if;
  if exists (select 1 from public.devices where user_id = a and device_key = 'd3') then
    raise exception 'FAIL: the phone with no push token was kept';
  end if;
  if not exists (select 1 from public.devices where user_id = a and device_key = 'd10') then
    raise exception 'FAIL: an older phone with a push token was dropped';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
