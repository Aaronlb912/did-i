-- Checks for supabase/cheers-got.sql.
--
-- Run with: npm run db:test supabase/tests/cheers-got.test.sql
-- Rolled back every time; a pass comes back as 'SQL TESTS PASSED'.

do $$
declare
  a uuid := gen_random_uuid(); -- gets cheers
  b uuid := gen_random_uuid(); -- sends them
  c uuid := gen_random_uuid(); -- a stranger
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  perform set_config('did_i.cheer_send', '1', true);
  insert into public.sends (from_id, to_id, kind, cheer_id, state, made_at)
  select b, a, 'cheer', 'lime', 'kept', now() - (g || ' minutes')::interval
  from generate_series(1, 21) g;
  insert into public.sends (from_id, to_id, kind, cheer_id, state) values (b, a, 'cheer', 'lime', 'sent');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.cheers_got_list();
  if n <> 20 then raise exception 'FAIL: expected 20 kept cheers, got %', n; end if;

  -- another user sees none of a's
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.cheers_got_list();
  if n <> 0 then raise exception 'FAIL: stranger read % rows', n; end if;

  -- a blocked sender is hidden
  execute 'reset role';
  insert into public.blocks (blocker, blocked) values (a, b);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.cheers_got_list();
  if n <> 0 then raise exception 'FAIL: blocked sender shown (%)', n; end if;

  execute 'reset role';
  raise exception 'SQL TESTS PASSED';
end;
$$;
