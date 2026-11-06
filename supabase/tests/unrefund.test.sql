-- Checks for supabase/unrefund.sql: a refund Apple reverses gives the gems back.
-- Run with: node scripts/test-sql.mjs supabase/tests/unrefund.test.sql

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

  -- A reversal for a buy we never saw does nothing; one for a buy that was never refunded too.
  if public.unrefund_gem_purchase('apple', 'nope-0000') <> 'none' then raise exception 'FAIL: unknown reversal matched'; end if;
  perform public.record_gem_purchase(a, 'gems_5', 6, 500, 'apple', 'unref-active-1');
  if public.unrefund_gem_purchase('apple', 'unref-active-1') <> 'active' then raise exception 'FAIL: a buy that was not refunded was acted on'; end if;

  -- 1. Refunded before it was claimed, then reversed: it pays on the next claim.
  perform public.record_gem_purchase(a, 'gems_5', 6, 500, 'apple', 'unref-unclaimed-1');
  perform public.refund_gem_purchase('apple', 'unref-unclaimed-1');
  out := public.unrefund_gem_purchase('apple', 'unref-unclaimed-1');
  if out <> 'unclaimed' then raise exception 'FAIL: unclaimed reversal said %', out; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.claim_gem_purchases();
  execute 'reset role';
  select gem_balance into bal from public.profiles where user_id = a;
  -- gems_5 above was never refunded, so it pays too: 6 + 6.
  if bal <> 12 then raise exception 'FAIL: balance % after a reversed unclaimed refund, want 12', bal; end if;
  -- The same notice twice gives nothing more.
  if public.unrefund_gem_purchase('apple', 'unref-unclaimed-1') <> 'active' then raise exception 'FAIL: a second reversal acted'; end if;

  -- 2. Claimed, part spent, refunded, then reversed: what was taken comes back.
  perform public.record_gem_purchase(a, 'gems_10', 14, 1000, 'apple', 'unref-claimed-22');
  execute 'set local role authenticated';
  perform public.claim_gem_purchases();
  execute 'reset role';
  -- One test transaction has one now(): move the claim back, as it would be in real life.
  update public.gem_purchases set claimed_at = now() - interval '1 hour' where store_ref = 'unref-claimed-22';
  update public.profiles set gem_balance = 4 where user_id = a; -- 10 spent
  perform public.refund_gem_purchase('apple', 'unref-claimed-22');
  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 0 then raise exception 'FAIL: balance after refund is %, want 0', bal; end if;
  select gems_owed into n from public.gem_purchases where store_ref = 'unref-claimed-22';
  if n <> 10 then raise exception 'FAIL: owed % after refund, want 10', n; end if;
  -- 3 gems land and pay part of the debt (7 still owed).
  update public.profiles set gem_balance = gem_balance + 3 where user_id = a;
  select gems_owed into n from public.gem_purchases where store_ref = 'unref-claimed-22';
  if n <> 7 then raise exception 'FAIL: owed % after 3 gems, want 7', n; end if;
  out := public.unrefund_gem_purchase('apple', 'unref-claimed-22');
  if out <> 'restored' then raise exception 'FAIL: claimed reversal said %', out; end if;
  select gem_balance into bal from public.profiles where user_id = a;
  -- 14 were paid for and 7 are still owed, so the 7 taken (4 at the refund, 3 off the next gains) come back.
  if bal <> 7 then raise exception 'FAIL: balance % after the reversal, want 7', bal; end if;
  select gems_owed into n from public.gem_purchases where store_ref = 'unref-claimed-22';
  if n <> 0 then raise exception 'FAIL: % still owed after the reversal', n; end if;
  if exists (select 1 from public.gem_purchases where store_ref = 'unref-claimed-22' and refunded_at is not null) then
    raise exception 'FAIL: the buy is still marked refunded';
  end if;
  -- A later refund of the same buy works again.
  if public.refund_gem_purchase('apple', 'unref-claimed-22') <> 'taken' then raise exception 'FAIL: a second refund after a reversal did not act'; end if;

  -- 3. Only the service role can reverse.
  execute 'set local role authenticated';
  begin
    perform public.unrefund_gem_purchase('apple', 'unref-claimed-22');
    raise exception 'FAIL: a signed-in user could call unrefund_gem_purchase';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
