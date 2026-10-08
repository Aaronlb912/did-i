-- Checks for supabase/shop-drops.sql: one push the morning of a drop, only
-- for people who turned it on, once per person per drop.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/shop-drops.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  morning text;
  n integer;
begin
  -- A zone where it is 9am right now, and make today a drop day there.
  select name into morning from pg_timezone_names
  where name like 'Etc/GMT%' and extract(hour from now() at time zone name) = 9
  limit 1;
  if morning is null then
    raise exception 'FAIL: no zone at 9am right now';
  end if;
  insert into public.shop_drop_days (day) values ((now() at time zone morning)::date) on conflict do nothing;

  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set zone = morning, prefs = '{"dropPings": true, "locale": "de"}'::jsonb where user_id = a;
  update public.profiles set zone = morning, prefs = '{}'::jsonb where user_id = b;
  insert into public.devices (user_id, device_key, push_token)
  values (a, 'test-a', 'token-a'), (b, 'test-b', 'token-b');

  perform public.queue_drop_pushes();
  perform public.queue_drop_pushes();

  select count(*) into n from public.push_queue where to_id = a and go = '/shop';
  if n <> 1 then
    raise exception 'FAIL: an opted-in person gets one drop push, found %', n;
  end if;
  select count(*) into n from public.push_queue where to_id = a and go = '/shop' and body like 'Heute neu%';
  if n <> 1 then
    raise exception 'FAIL: the drop push is in the person''s language';
  end if;
  select count(*) into n from public.push_queue where to_id = b and go = '/shop';
  if n <> 0 then
    raise exception 'FAIL: the switch is off by default, found %', n;
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
