-- Checks for supabase/shared-notes-window.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/shared-notes-window.test.sql

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
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  insert into public.shared_notes (user_id, lamp_id, period_key, question, note)
  values (a, 'new', 'p1', 'Did I call mom?', 'yes'), (a, 'old', 'p0', 'Did I take meds?', 'late');
  alter table public.shared_notes disable trigger a_stamp_made_at;
  update public.shared_notes set made_at = now() - interval '30 days' where user_id = a and lamp_id = 'old';
  alter table public.shared_notes enable trigger a_stamp_made_at;

  -- The friend sees the recent note only.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.shared_notes where user_id = a;
  if n <> 1 then raise exception 'FAIL: friend reads % notes, expected only the recent one', n; end if;
  execute 'reset role';

  -- The owner still sees both.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.shared_notes where user_id = a;
  if n <> 2 then raise exception 'FAIL: owner reads % notes', n; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
