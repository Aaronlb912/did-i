-- Checks for supabase/refunds.sql: a refunded pack takes its gems back.
-- Run with: node scripts/test-sql.mjs supabase/tests/refunds.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  out text;
  bal integer;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do nothing;

  -- A refund the store sends for a buy we never saw does nothing.
  if public.refund_gem_purchase('apple', 'nope-0000') <> 'none' then raise exception 'FAIL: unknown refund matched'; end if;

  -- 1. Refunded before it was claimed: never paid.
  perform public.record_gem_purchase(a, 'gems_5', 6, 500, 'apple', 'ref-unclaimed-1');
  out := public.refund_gem_purchase('apple', 'ref-unclaimed-1');
  if out <> 'unclaimed' then raise exception 'FAIL: unclaimed refund said %', out; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.claim_gem_purchases();
  execute 'reset role';
  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 0 then raise exception 'FAIL: a refunded pack paid % gems', bal; end if;
  -- The same notice twice takes nothing more.
  if public.refund_gem_purchase('apple', 'ref-unclaimed-1') <> 'already' then raise exception 'FAIL: a second refund acted'; end if;

  -- 2. Claimed, some spent: the rest comes off, the spent part is owed.
  perform public.record_gem_purchase(a, 'gems_10', 14, 1000, 'play', 'ref-claimed-22');
  execute 'set local role authenticated';
  perform public.claim_gem_purchases();
  execute 'reset role';
  update public.profiles set gem_balance = 4 where user_id = a; -- 10 spent
  out := public.refund_gem_purchase('play', 'ref-claimed-22');
  if out <> 'taken' then raise exception 'FAIL: claimed refund said %', out; end if;
  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 0 then raise exception 'FAIL: balance after refund is %, want 0', bal; end if;
  select gems_owed into n from public.gem_purchases where store_ref = 'ref-claimed-22';
  if n <> 10 then raise exception 'FAIL: owed % after refund, want 10', n; end if;

  -- 3. The next pack pays the debt first: 6 gems against 10 owed pays nothing.
  perform public.record_gem_purchase(a, 'gems_5', 6, 500, 'apple', 'ref-next-333');
  execute 'set local role authenticated';
  perform public.claim_gem_purchases();
  execute 'reset role';
  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 0 then raise exception 'FAIL: a pack paid % gems while gems were owed', bal; end if;
  select gems_owed into n from public.gem_purchases where store_ref = 'ref-claimed-22';
  if n <> 4 then raise exception 'FAIL: owed % after paying 6, want 4', n; end if;
  -- 14 more: 4 settle the debt, 10 land.
  perform public.record_gem_purchase(a, 'gems_10', 14, 1000, 'apple', 'ref-next-4444');
  execute 'set local role authenticated';
  perform public.claim_gem_purchases();
  execute 'reset role';
  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 10 then raise exception 'FAIL: balance % after the debt was paid, want 10', bal; end if;

  -- 4. Only the service role can refund.
  execute 'set local role authenticated';
  begin
    perform public.refund_gem_purchase('apple', 'ref-next-4444');
    raise exception 'FAIL: a signed-in user could call refund_gem_purchase';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
