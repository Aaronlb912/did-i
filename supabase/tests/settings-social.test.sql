-- Checks for profiles.family_hour (supabase/family-summary.sql) and phone
-- names (supabase/device-names.sql).
--
-- Run with: node scripts/test-sql.mjs supabase/tests/settings-social.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  fam uuid;
  hour_now integer := extract(hour from now() at time zone 'UTC')::integer;
  n integer;
  ok boolean;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;

  -- Default is 9pm.
  select family_hour into n from public.profiles where user_id = a;
  if n <> 21 then
    raise exception 'FAIL: family_hour should default to 21, got %', n;
  end if;

  -- Out of range is refused.
  ok := false;
  begin
    update public.profiles set family_hour = 24 where user_id = a;
  exception when check_violation then
    ok := true;
  end;
  if not ok then
    raise exception 'FAIL: family_hour 24 should be refused';
  end if;

  -- A family of two, both sharing. a picked the current hour; b picked another.
  insert into public.families (name, code, made_by) values ('Tests', 'T' || left(a::text, 8), a) returning id into fam;
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, b, 'kid');
  update public.profiles set zone = 'UTC', prefs = '{}'::jsonb, share_streak = true, family_hour = hour_now where user_id = a;
  update public.profiles set zone = 'UTC', prefs = '{}'::jsonb, share_streak = true, family_hour = (hour_now + 1) % 24 where user_id = b;
  insert into public.devices (user_id, device_key, push_token) values (a, 'ta', 'tok-a'), (b, 'tb', 'tok-b');

  perform public.queue_family_summaries();
  select count(*) into n from public.push_queue where to_id = a and go = '/people';
  if n <> 1 then
    raise exception 'FAIL: the summary should queue in the chosen hour, found %', n;
  end if;
  select count(*) into n from public.push_queue where to_id = b and go = '/people';
  if n <> 0 then
    raise exception 'FAIL: the summary should wait for the other hour, found %', n;
  end if;

  -- Phone names: the owner renames, 40 is the cap, nobody else can.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.devices set name = 'Kitchen phone', model = 'Pixel 8 · Android 15' where device_key = 'ta';
  select count(*) into n from public.devices where user_id = a and name = 'Kitchen phone';
  if n <> 1 then
    raise exception 'FAIL: the owner should rename a phone, found %', n;
  end if;
  ok := false;
  begin
    update public.devices set name = repeat('x', 41) where device_key = 'ta';
  exception when check_violation then
    ok := true;
  end;
  if not ok then
    raise exception 'FAIL: a 41 character phone name should be refused';
  end if;
  update public.devices set name = 'Taken' where user_id = b;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: someone else renamed b''s phone';
  end if;
  ok := false;
  begin
    update public.profiles set family_hour = 7 where user_id = b;
    get diagnostics n = row_count;
    ok := n = 0;
  exception when insufficient_privilege then
    ok := true;
  end;
  if not ok then
    raise exception 'FAIL: someone else changed b''s family hour';
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
