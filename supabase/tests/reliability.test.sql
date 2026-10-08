-- Checks for supabase/reliability.sql: phones not seen for 90 days are
-- removed when a phone checks in, and the anonymous error log is capped per hour.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/reliability.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  n integer;
  capped boolean := false;
begin
  insert into auth.users (id, email) values (a, a::text || '@test.local');

  -- An old phone, then a fresh one checks in.
  insert into public.devices (user_id, device_key, last_seen_at)
    values (a, 'old', now() - interval '91 days');
  insert into public.devices (user_id, device_key, last_seen_at)
    values (a, 'mid', now() - interval '60 days');
  insert into public.devices (user_id, device_key) values (a, 'new');
  select count(*) into n from public.devices where user_id = a;
  if n <> 2 then
    raise exception 'FAIL: the 91 day phone should be gone, % left', n;
  end if;
  if exists (select 1 from public.devices where user_id = a and device_key = 'old') then
    raise exception 'FAIL: the old phone is still listed';
  end if;

  -- No user id on the log: it stays anonymous.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'app_errors' and column_name = 'user_id') then
    raise exception 'FAIL: app_errors should not hold a user id';
  end if;

  -- 2000 rows an hour in all, then the cap.
  delete from public.app_errors;
  insert into public.app_errors (kind, code) select 'sync', 'net' from generate_series(1, 2000);
  begin
    insert into public.app_errors (kind, code) values ('push', 'UNAVAILABLE');
  exception when others then
    capped := sqlerrm like '%error log cap%';
  end;
  if not capped then
    raise exception 'FAIL: row 2001 in an hour should hit the cap';
  end if;
  delete from public.app_errors;

  -- Only known kinds, short codes.
  begin
    insert into public.app_errors (kind) values ('question');
    raise exception 'FAIL: unknown kind went in';
  exception when check_violation then null;
  end;
  begin
    insert into public.app_errors (kind, code) values ('push', repeat('x', 81));
    raise exception 'FAIL: an 81 character code went in';
  exception when check_violation then null;
  end;

  -- Signed-in people cannot read the log.
  if has_table_privilege('authenticated', 'public.app_errors', 'SELECT') then
    raise exception 'FAIL: authenticated can read app_errors';
  end if;
  if has_table_privilege('anon', 'public.app_errors', 'INSERT') then
    raise exception 'FAIL: anon can write app_errors';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
