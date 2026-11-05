-- Checks for supabase/away-check-ons.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/away-check-ons.test.sql

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
  insert into public.profiles (user_id) values (a), (b) on conflict (user_id) do nothing;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');
  insert into public.devices (user_id, device_key, push_token) values (b, 'away1', 'tok');
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute) values (a, b, 'q1', 'walk', 0);

  -- Away today: nothing is queued.
  update public.profiles set zone = 'UTC',
    prefs = jsonb_build_object('away', jsonb_build_array(jsonb_build_array(
      ((now() at time zone 'UTC')::date - 1)::text, ((now() at time zone 'UTC')::date + 1)::text)))
  where user_id = a;
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b;
  if n <> 0 then raise exception 'FAIL: an away owner sent % check-ons', n; end if;

  -- The range ends today (until is not included): it goes out.
  update public.profiles set prefs = jsonb_build_object('away', jsonb_build_array(jsonb_build_array(
      ((now() at time zone 'UTC')::date - 3)::text, (now() at time zone 'UTC')::date::text)))
  where user_id = a;
  perform public.queue_check_ons();
  select count(*) into n from public.push_queue where to_id = b;
  if n <> 1 then raise exception 'FAIL: the day away ended gave % check-ons, wanted 1', n; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
