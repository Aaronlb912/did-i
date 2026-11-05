-- Checks for supabase/streak-bonus.sql. Rolls back.
-- Run with: node scripts/test-sql.mjs supabase/tests/streak-bonus.test.sql
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, aud, role, created_at) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated', now() - interval '120 days'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated', now() - interval '120 days'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated', now() - interval '5 days'),
    (d, d || '@test.invalid', 'authenticated', 'authenticated', now() - interval '400 days');
  insert into public.profiles (user_id) values (a), (b), (c), (d) on conflict (user_id) do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- Too short a streak pays 0.
  update public.profiles set streak = 29 where user_id = a;
  if (public.claim_streak_bonus(30)->>'paid')::int <> 0 then raise exception 'FAIL: 29 days paid the 30 bonus'; end if;

  -- Paid once, then 0.
  update public.profiles set streak = 30 where user_id = a;
  if (public.claim_streak_bonus(30)->>'paid')::int <> 1 then raise exception 'FAIL: 30 days did not pay 1'; end if;
  if (public.claim_streak_bonus(30)->>'paid')::int <> 0 then raise exception 'FAIL: 30 paid twice'; end if;
  if (public.claim_streak_bonus(100)->>'paid')::int <> 0 then raise exception 'FAIL: 100 paid at 30 days'; end if;
  update public.profiles set streak = 100 where user_id = a;
  if (public.claim_streak_bonus(100)->>'paid')::int <> 2 then raise exception 'FAIL: 100 days did not pay 2'; end if;
  if (public.claim_streak_bonus(100)->>'paid')::int <> 0 then raise exception 'FAIL: 100 paid twice'; end if;
  if (public.claim_streak_bonus(7)->>'paid')::int <> 0 then raise exception 'FAIL: 7 paid'; end if;
  if (select gem_balance from public.profiles where user_id = a) <> 3 then raise exception 'FAIL: balance is not 3'; end if;

  -- No direct insert, and nobody else's claims.
  begin
    insert into public.streak_bonus_claims (user_id, days) values (b, 30);
    raise exception 'FAIL: direct insert was allowed';
  exception when insufficient_privilege then
    null;
  end;
  if (select count(*) from public.streak_bonus_claims where user_id = b) <> 0 then raise exception 'FAIL: claim made for b'; end if;

  -- Another user's claim pays them, not a, and a's claim never paid b.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  if (select count(*) from public.streak_bonus_claims) <> 0 then raise exception 'FAIL: b sees a claims'; end if;
  if (public.claim_streak_bonus(30)->>'paid')::int <> 0 then raise exception 'FAIL: b paid with no streak'; end if;
  update public.profiles set streak = 31 where user_id = b;
  if (public.claim_streak_bonus(30)->>'paid')::int <> 1 then raise exception 'FAIL: b not paid its own'; end if;

  -- A made-up streak on a new account pays 0.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  update public.profiles set streak = 100 where user_id = c;
  if (public.claim_streak_bonus(30)->>'paid')::int <> 0 then raise exception 'FAIL: 5 day old account paid'; end if;

  -- A year of use pays 3, once, and not before 365 days.
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  update public.profiles set streak = 364 where user_id = d;
  if (public.claim_streak_bonus(365)->>'paid')::int <> 0 then raise exception 'FAIL: 364 days paid the 365 bonus'; end if;
  update public.profiles set streak = 365 where user_id = d;
  if (public.claim_streak_bonus(365)->>'paid')::int <> 3 then raise exception 'FAIL: 365 days did not pay 3'; end if;
  if (public.claim_streak_bonus(365)->>'paid')::int <> 0 then raise exception 'FAIL: 365 paid twice'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  update public.profiles set streak = 365 where user_id = a;
  if (public.claim_streak_bonus(365)->>'paid')::int <> 0 then raise exception 'FAIL: 120 day old account paid 365'; end if;

  reset role;
  if (select gem_balance from public.profiles where user_id = a) <> 3 then raise exception 'FAIL: a balance moved'; end if;
  if (select gem_balance from public.profiles where user_id = c) <> 0 then raise exception 'FAIL: c paid'; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
