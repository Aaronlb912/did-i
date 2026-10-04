-- Checks my_did_you_links in supabase/did-you-links.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/my-links.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  code text;
  row record;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (b, 'Bea')
  on conflict (user_id) do update set display_name = excluded.display_name;

  -- Ann makes a link; Bea and Cy keep it.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  code := public.make_did_you_link('Did you call your mom?');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.claim_did_you_link(code);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.claim_did_you_link(code);
  -- Cy did not make it, so Cy sees none.
  select count(*) into n from public.my_did_you_links();
  if n <> 0 then raise exception 'FAIL: someone else sees % of Ann''s links', n; end if;
  execute 'reset role';

  -- Ann sees the link and both keepers, Bea by name.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into row from public.my_did_you_links();
  if row.question <> 'Did you call your mom?' or jsonb_array_length(row.kept) <> 2 then
    raise exception 'FAIL: maker list came back wrong: %', row;
  end if;
  if not exists (select 1 from jsonb_array_elements(row.kept) k where k->>'name' = 'Bea') then
    raise exception 'FAIL: Bea is not named: %', row.kept;
  end if;
  execute 'reset role';

  -- Cy blocks Ann: Cy drops off Ann's list.
  insert into public.blocks (blocker, blocked) values (c, a);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into row from public.my_did_you_links();
  if jsonb_array_length(row.kept) <> 1 then raise exception 'FAIL: a blocked keeper still shows: %', row.kept; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
