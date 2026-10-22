-- Checks for supabase/we-wake.sql: a Did we answer wakes your own phones.
-- Run with: node scripts/test-sql.mjs supabase/tests/we-wake.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  card uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann') on conflict (user_id) do nothing;
  insert into public.devices (user_id, device_key, push_token, wake_ok) values (a, 'phone-a', 'tok-a', true);
  insert into public.we_cards (id, made_by, question, mode, shows, cadence, starts_on)
  values (card, a, 'Did we walk?', 'all', 'all', 'daily', current_date - 1);
  insert into public.we_members (card_id, user_id, state, joined_at) values (card, a, 'in', now());
  delete from public.wake_queue where user_id = a;

  insert into public.we_answers (card_id, user_id, night, status) values (card, a, current_date, 'did');
  select count(*) into n from public.wake_queue where user_id = a and device_key = 'phone-a' and due;
  if n <> 1 then raise exception 'FAIL: own phone not woken (% rows)', n; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
