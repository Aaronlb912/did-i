-- Checks for supabase/we-link-blocked.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/we-link-blocked.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid;
  code text;
  row record;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Bea'), (c, 'Cal')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.we_cards (id, made_by, question) values (gen_random_uuid(), a, 'Did we walk the dog?')
  returning id into card;
  insert into public.we_members (card_id, user_id, state, asked_by, joined_at) values (card, a, 'in', a, now());

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  code := public.we_make_link(card);
  execute 'reset role';

  -- Bea blocked Ann.
  insert into public.blocks (blocker, blocked) values (b, a);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into row from public.look_up_we_link(code);
  if row.blocked is not true then raise exception 'FAIL: a blocked caller was not marked blocked'; end if;
  execute 'reset role';

  -- Cal has no block with Ann.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into row from public.look_up_we_link(code);
  if row.question is null or row.blocked is not false then raise exception 'FAIL: an unblocked caller came back blocked: %', row; end if;
  execute 'reset role';

  -- Signed out is never blocked.
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role anon';
  select * into row from public.look_up_we_link(code);
  if row.question is null or row.blocked is not false then raise exception 'FAIL: signed out came back blocked: %', row; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end $$;
