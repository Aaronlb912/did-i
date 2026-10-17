-- Checks for supabase/iap-tries.sql: 30 purchase checks per 10 minutes.
-- Run with: node scripts/test-sql.mjs supabase/tests/iap-tries.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  i integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');

  for i in 1..30 loop
    if not public.iap_try(a) then raise exception 'FAIL: check % refused under the cap', i; end if;
  end loop;
  if public.iap_try(a) then raise exception 'FAIL: the 31st check in 10 minutes went through'; end if;
  -- Another account has its own count.
  if not public.iap_try(b) then raise exception 'FAIL: one account''s checks blocked another'; end if;
  -- Old checks stop counting.
  update public.iap_tries set tried_at = now() - interval '11 minutes' where user_id = a;
  if not public.iap_try(a) then raise exception 'FAIL: checks older than 10 minutes still counted'; end if;
  if public.iap_try(null) then raise exception 'FAIL: a check with no account went through'; end if;

  -- Signed-in users cannot call it or read the table.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.iap_try(a);
    raise exception 'FAIL: a signed-in user could call iap_try';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.iap_tries;
    raise exception 'FAIL: a signed-in user could read iap_tries';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  raise exception 'SQL TESTS PASSED';
end $$;
