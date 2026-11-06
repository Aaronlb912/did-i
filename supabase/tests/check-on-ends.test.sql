-- Checks for supabase/check-on-ends.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/check-on-ends.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, zone) values (a, 'UTC'), (b, 'UTC') on conflict (user_id) do update set zone = 'UTC';
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');
  insert into public.devices (user_id, device_key, push_token) values (b, 'ends1', 'tok');
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute, ends_on)
  values (a, b, 'q1', 'walk', 0, (now() at time zone 'UTC')::date - 1);

  -- Its end date was yesterday: no push today.
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b;
  if n <> 0 then raise exception 'FAIL: a check-on past its end date sent % pushes', n; end if;

  -- The end date is today: today is still asked.
  update public.check_ons set ends_on = (now() at time zone 'UTC')::date where owner_id = a;
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b;
  if n <> 1 then raise exception 'FAIL: the last day sent % pushes, wanted 1', n; end if;

  -- No end date is covered by check-ons.test.sql (the queue keeps one push a day).

  raise exception 'SQL TESTS PASSED';
end;
$$;
