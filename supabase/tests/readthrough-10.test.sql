-- Checks for supabase/readthrough-10.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/readthrough-10.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n integer;
  here date;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b) on conflict (user_id) do nothing;
  update public.profiles set zone = 'Pacific/Kiritimati' where user_id = a;
  here := (now() at time zone 'Pacific/Kiritimati')::date;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  -- Tonight and last night in the phone's zone both pay, up to 6 each.
  n := public.credit_night_coins(here::text, 6);
  if n <> 6 then raise exception 'FAIL: tonight paid to %, wanted 6', n; end if;
  n := public.credit_night_coins((here - 1)::text, 9);
  if n <> 12 then raise exception 'FAIL: last night paid to %, wanted 12', n; end if;
  -- Two nights back and tomorrow in that zone pay nothing.
  n := public.credit_night_coins((here - 2)::text, 6);
  if n <> 12 then raise exception 'FAIL: two nights back paid, balance %', n; end if;
  n := public.credit_night_coins((here + 1)::text, 6);
  if n <> 12 then raise exception 'FAIL: tomorrow paid, balance %', n; end if;
  -- The cap still holds on a repeat.
  n := public.credit_night_coins(here::text, 6);
  if n <> 12 then raise exception 'FAIL: tonight paid twice, balance %', n; end if;
  execute 'reset role';

  -- No zone: the wide UTC window still pays a far zone's night.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  n := public.credit_night_coins((current_date - 2)::text, 2);
  if n <> 2 then raise exception 'FAIL: no zone, current_date - 2 paid to %, wanted 2', n; end if;
  n := public.credit_night_coins((current_date - 3)::text, 2);
  if n <> 2 then raise exception 'FAIL: no zone, current_date - 3 paid, balance %', n; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
