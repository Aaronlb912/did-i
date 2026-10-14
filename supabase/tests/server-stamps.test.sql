-- Checks that app callers can not backdate made_at or file a handled report
-- (supabase/server-stamps.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/server-stamps.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n integer;
  st text;
  at timestamptz;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (b, a, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Reports: 20 backdated rows still count, and the 21st is refused.
  for i in 1..20 loop
    insert into public.reports (from_id, about_id, reason, made_at, status, handled_by, handled_at)
    values (a, b, 'test ' || i, now() - interval '7 days', 'dismissed', a, now());
  end loop;
  begin
    insert into public.reports (from_id, about_id, reason, made_at)
    values (a, b, 'one more', now() - interval '7 days');
    raise exception 'FAIL: backdated reports got past the cap';
  exception when raise_exception then
    if sqlerrm not like 'too many reports%' then raise; end if;
  end;

  -- Shared notes: a normal note works, a backdated one is stamped now, and
  -- an update can not move the time.
  insert into public.shared_notes (user_id, lamp_id, period_key, note, made_at)
  values (a, 'l1', 'p1', 'hi', now() - interval '7 days');
  update public.shared_notes set made_at = now() - interval '7 days', note = 'hey'
  where user_id = a and lamp_id = 'l1';

  -- Sends: a repeating Did you works and is stamped now.
  insert into public.sends (from_id, to_id, question, repeat)
  values (a, b, 'Did you read?', 'daily');
  execute 'reset role';

  select count(*) into n from public.reports
  where from_id = a and made_at > now() - interval '1 minute' and status = 'open'
    and handled_by is null and handled_at is null;
  if n <> 20 then raise exception 'FAIL: reports not stamped open and now (%)', n; end if;

  select note, made_at into st, at from public.shared_notes where user_id = a and lamp_id = 'l1';
  if st <> 'hey' then raise exception 'FAIL: shared note update did not save'; end if;
  if at < now() - interval '1 minute' then raise exception 'FAIL: shared note backdated'; end if;

  select made_at into at from public.sends where from_id = a and to_id = b;
  if at < now() - interval '1 minute' then raise exception 'FAIL: send backdated'; end if;

  -- The owner (not an app caller) can still set times, for admin fixes.
  insert into public.reports (from_id, about_id, reason, made_at)
  values (b, a, 'owner', now() - interval '7 days');
  select made_at into at from public.reports where from_id = b and reason = 'owner';
  if at > now() - interval '6 days' then raise exception 'FAIL: owner could not backdate'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
