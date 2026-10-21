-- Checks for supabase/we-joined-push.sql: a yes tells the asker, a no does not.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/we-joined-push.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok'), (a, c, 'ok');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  card := public.we_make('Did we stretch?', 'all', 'waiting', 'daily', '{}', null, array[b, c]);
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, true);
  execute 'reset role';

  if not exists (select 1 from public.push_queue
      where to_id = a and body like 'Ben joined your Did we: Did we stretch?%' and go = '/tonight') then
    raise exception 'FAIL: the asker was not told about a yes';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.we_reply(card, false);
  execute 'reset role';

  if exists (select 1 from public.push_queue where to_id = a and body like 'Cal%') then
    raise exception 'FAIL: a no was pushed as a join';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
