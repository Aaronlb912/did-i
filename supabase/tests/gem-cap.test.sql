-- A pack that does not fit under 9999 waits instead of losing its gems.
do $$
declare
  a uuid := gen_random_uuid();
  bal integer;
  waiting integer;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do nothing;
  update public.profiles set gem_balance = 999990 where user_id = a;

  perform public.record_gem_purchase(a, 'gems_50', 80, 5000, 'apple', 'ref-cap-0001');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.claim_gem_purchases();
  execute 'reset role';
  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 999990 then raise exception 'FAIL: balance % after a pack that does not fit', bal; end if;
  select count(*) into waiting from public.gem_purchases where user_id = a and claimed_at is null;
  if waiting <> 1 then raise exception 'FAIL: the pack that did not fit was claimed'; end if;

  -- Spend some: now it fits and lands whole.
  update public.profiles set gem_balance = 100 where user_id = a;
  execute 'set local role authenticated';
  perform public.claim_gem_purchases();
  execute 'reset role';
  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 180 then raise exception 'FAIL: balance % after room was made, want 180', bal; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
