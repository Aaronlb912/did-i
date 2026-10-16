-- Checks thank_gift and take_gift_thanks (supabase/gift-thanks.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/gift-thanks.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  gid uuid;
  waiting uuid;
  n int;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  -- Ann gave Bea a cheer Bea has opened, and one she has not.
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, claimed_at)
  values (b, a, 'tape', 'cheer', now()) returning id into gid;
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind)
  values (b, a, 'paper', 'cheer') returning id into waiting;

  -- Cal cannot thank for Bea's gift.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.thank_gift(gid) then raise exception 'FAIL: someone else thanked'; end if;
  execute 'reset role';

  -- Bea thanks once; the second time and an unopened gift are refused.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.thank_gift(gid) then raise exception 'FAIL: thanks refused'; end if;
  if public.thank_gift(gid) then raise exception 'FAIL: thanked twice'; end if;
  if public.thank_gift(waiting) then raise exception 'FAIL: thanked before opening'; end if;
  begin
    update public.cheer_gifts set thanked_at = null where id = gid;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: thanked_at reset by hand'; end if;
  exception when insufficient_privilege then null;
  end;
  -- Bea sees no thanks; they are Ann's.
  select count(*) into n from public.take_gift_thanks();
  if n <> 0 then raise exception 'FAIL: receiver got % thanks', n; end if;
  execute 'reset role';

  -- Ann gets it once.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.take_gift_thanks();
  if n <> 1 then raise exception 'FAIL: giver got % thanks, wanted 1', n; end if;
  select count(*) into n from public.take_gift_thanks();
  if n <> 0 then raise exception 'FAIL: thanks came twice'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end $$;
