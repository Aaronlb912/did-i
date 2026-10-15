-- Checks for supabase/reviewer-flag.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/reviewer-flag.test.sql

do $$
declare
  ok boolean;
begin
  update public.app_flags set on_now = false where name = 'reviewer_signin';
  if public.reviewer_signin_on() then raise exception 'FAIL: off reads as on'; end if;

  update public.app_flags set on_now = true where name = 'reviewer_signin';
  if not public.reviewer_signin_on() then raise exception 'FAIL: on reads as off'; end if;

  -- Re-applying the file's insert keeps a switch that is on.
  insert into public.app_flags (name, on_now)
  values ('reviewer_signin', false)
  on conflict (name) do nothing;
  if not public.reviewer_signin_on() then raise exception 'FAIL: re-applying the insert turned the switch off'; end if;

  delete from public.app_flags where name = 'reviewer_signin';
  if public.reviewer_signin_on() then raise exception 'FAIL: a missing row reads as on'; end if;

  if has_table_privilege('anon', 'public.app_flags', 'select')
     or has_table_privilege('authenticated', 'public.app_flags', 'update') then
    raise exception 'FAIL: apps can touch app_flags directly';
  end if;
  if not has_function_privilege('anon', 'public.reviewer_signin_on()', 'execute') then
    raise exception 'FAIL: anon cannot read the flag';
  end if;
  select relrowsecurity into ok from pg_class where oid = 'public.app_flags'::regclass;
  if not ok then raise exception 'FAIL: RLS off on app_flags'; end if;

  raise notice 'reviewer-flag: all checks passed';
end $$;
