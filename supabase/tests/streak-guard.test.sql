-- Checks for supabase/streak-guard.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/streak-guard.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  s integer;
begin
  -- An account made 10 days ago.
  insert into auth.users (id, email, aud, role, created_at)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated', now() - interval '10 days');
  insert into public.profiles (user_id) values (a) on conflict (user_id) do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- An honest streak is kept as sent.
  update public.profiles set streak = 9 where user_id = a;
  select streak into s from public.profiles where user_id = a;
  if s <> 9 then raise exception 'FAIL: honest streak changed to %', s; end if;

  -- A made-up streak is cut to what the account could have.
  update public.profiles set streak = 500 where user_id = a;
  select streak into s from public.profiles where user_id = a;
  if s > 12 then raise exception 'FAIL: streak of 500 kept as % on a 10 day old account', s; end if;

  -- Below zero becomes zero.
  update public.profiles set streak = -4 where user_id = a;
  select streak into s from public.profiles where user_id = a;
  if s <> 0 then raise exception 'FAIL: negative streak kept as %', s; end if;

  execute 'reset role';
  raise exception 'SQL TESTS PASSED';
end;
$$;
