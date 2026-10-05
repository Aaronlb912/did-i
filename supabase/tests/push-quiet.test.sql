-- Checks for quiet hours in supabase/push.sql: push_quiet on the person's
-- clock, take_push_batch holding pushes, and dropping the family summary.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/push-quiet.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  late jsonb := '{"quietOn": true, "quietFrom": "22:00", "quietTo": "07:00"}'::jsonb;
  day jsonb := '{"quietOn": true, "quietFrom": "09:00", "quietTo": "17:00"}'::jsonb;
  local_now time := (now() at time zone 'America/New_York')::time;
  n integer;
begin
  -- Wraps past midnight.
  if not public.push_quiet(late, 'America/New_York', '2026-01-10 04:00:00+00') then
    raise exception 'FAIL: 23:00 New York should be quiet for 22:00 to 07:00';
  end if;
  if public.push_quiet(late, 'America/New_York', '2026-01-10 17:00:00+00') then
    raise exception 'FAIL: 12:00 New York should not be quiet for 22:00 to 07:00';
  end if;
  if not public.push_quiet(late, 'America/New_York', '2026-01-10 11:30:00+00') then
    raise exception 'FAIL: 06:30 New York should be quiet for 22:00 to 07:00';
  end if;
  -- Same day.
  if not public.push_quiet(day, 'UTC', '2026-01-10 12:00:00+00') then
    raise exception 'FAIL: 12:00 should be quiet for 09:00 to 17:00';
  end if;
  if public.push_quiet(day, 'UTC', '2026-01-10 17:00:00+00') then
    raise exception 'FAIL: the end time itself is not quiet';
  end if;
  -- Off, no zone, a bad zone, or bad times: never quiet.
  if public.push_quiet(late || '{"quietOn": false}', 'UTC', '2026-01-10 23:00:00+00') then
    raise exception 'FAIL: quietOn false should never be quiet';
  end if;
  if public.push_quiet(late, '', '2026-01-10 23:00:00+00') then
    raise exception 'FAIL: no zone should never be quiet';
  end if;
  if public.push_quiet(late, 'Not/AZone', '2026-01-10 23:00:00+00') then
    raise exception 'FAIL: a bad zone should never be quiet';
  end if;
  if public.push_quiet(late || '{"quietFrom": "9pm"}', 'UTC', '2026-01-10 23:00:00+00') then
    raise exception 'FAIL: a bad time should never be quiet';
  end if;

  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;

  -- a is in quiet hours right now (an hour either side of now); b is not.
  update public.profiles
  set zone = 'America/New_York',
      prefs = jsonb_build_object(
        'quietOn', true,
        'quietFrom', left((local_now - interval '1 hour')::text, 5),
        'quietTo', left((local_now + interval '1 hour')::text, 5))
  where user_id = a;
  update public.profiles set zone = 'America/New_York', prefs = '{}'::jsonb where user_id = b;

  insert into public.push_queue (to_id, title, body, go)
  values (a, 'Did I', 'held', '/inbox'), (a, 'Family', 'dropped', '/people'), (b, 'Did I', 'sent', '/inbox');

  perform 1 from public.take_push_batch(200) t where t.to_id in (a, b);

  select count(*) into n from public.push_queue where to_id = a and sent_at is null and go = '/inbox';
  if n <> 1 then
    raise exception 'FAIL: a push in quiet hours should stay queued, found %', n;
  end if;
  select count(*) into n from public.push_queue where to_id = a and go = '/people';
  if n <> 0 then
    raise exception 'FAIL: the family summary in quiet hours should be dropped, found %', n;
  end if;
  select count(*) into n from public.push_queue where to_id = b and sent_at is not null;
  if n <> 1 then
    raise exception 'FAIL: a push outside quiet hours should go out, found %', n;
  end if;

  -- Quiet hours over: the held push goes out.
  update public.profiles set prefs = '{}'::jsonb where user_id = a;
  perform 1 from public.take_push_batch(200) t where t.to_id = a;
  select count(*) into n from public.push_queue where to_id = a and sent_at is null;
  if n <> 0 then
    raise exception 'FAIL: the held push should go out after quiet hours, % left', n;
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
