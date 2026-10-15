-- Checks for supabase/realtime.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/realtime.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n integer;
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'answer_log'
  ) then
    raise exception 'FAIL: answer_log is not in supabase_realtime';
  end if;

  -- Deletes skip policies in Realtime, so they must not be published.
  if (select pubdelete or pubtruncate from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'FAIL: supabase_realtime publishes deletes';
  end if;

  -- Realtime sends only rows the listener can select: RLS must stay on.
  if not (select relrowsecurity from pg_class where oid = 'public.answer_log'::regclass) then
    raise exception 'FAIL: answer_log has RLS off';
  end if;

  -- Only the tables meant to be live are in the publication.
  select count(*) into n from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public'
    and tablename in ('we_answers', 'shelves', 'profiles', 'sends');
  if n > 0 then raise exception 'FAIL: % private tables are in supabase_realtime', n; end if;

  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.answer_log (user_id, lamp_id, period_key, answered_at)
  values (b, 'lamp-b', '2026-10-15', '2026-10-15T20:00:00.000Z');

  -- What Realtime checks for a listener: can this account select the row?
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.answer_log where user_id = b;
  if n <> 0 then raise exception 'FAIL: one account can read another account''s answers'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
