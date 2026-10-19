-- Checks for supabase/sweep-guards.sql.
--
-- Run with: npm run db:test supabase/tests/sweep-guards.test.sql
--
-- Everything happens inside one DO block that always ends by raising, so
-- the made-up people and rows below are rolled back every time, pass or
-- fail. A pass comes back as the error text 'SQL TESTS PASSED'.

do $$
declare
  a uuid := gen_random_uuid(); -- new account, invites with b's code
  b uuid := gen_random_uuid(); -- inviter
  c uuid := gen_random_uuid(); -- old account
  d uuid := gen_random_uuid(); -- new account that already answered
  fam uuid := gen_random_uuid();
  r text;
  j uuid;
  bal integer;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated'),
    (d, d || '@test.invalid', 'authenticated', 'authenticated');
  update auth.users set created_at = now() - interval '30 days' where id = c;

  -- guard_profile_invites clears invite codes on insert unless this is set.
  perform set_config('did_i.invite_write', '1', true);
  insert into public.profiles (user_id, invite_code)
  values (a, 'AAAAAAAAAA'), (b, 'BBBBBBBBBB'), (c, 'CCCCCCCCCC'), (d, 'DDDDDDDDDD');

  -- 1. 6 character codes still join. ---------------------------------------

  insert into public.families (id, name, code) values (fam, 'Test', 'ABC234');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  j := public.join_family('abc234');
  if j is distinct from fam then
    raise exception 'FAIL: old 6 character code stopped working';
  end if;
  if public.join_family('ZZZZZZZZZZ') is not null then
    raise exception 'FAIL: a wrong code joined something';
  end if;
  execute 'reset role';

  select misses into n from public.family_miss_days where day = (timezone('utc', now()))::date;
  if coalesce(n, 0) < 1 then
    raise exception 'FAIL: the wrong code was not counted globally';
  end if;

  -- Over the global cap, wrong codes are refused but a right code still works.
  update public.family_miss_days set misses = 500 where day = (timezone('utc', now()))::date;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.join_family('ZZZZZZZZZZ');
    raise exception 'FAIL: wrong code joined past the global miss cap';
  exception when others then
    if sqlerrm not like '%too many tries%' then raise; end if;
  end;
  begin
    perform public.look_up_family('ZZZZZZZZZZ');
    raise exception 'FAIL: wrong code looked up past the global miss cap';
  exception when others then
    if sqlerrm not like '%too many tries%' then raise; end if;
  end;
  if public.look_up_family('ABC234')->>'id' is distinct from fam::text then
    raise exception 'FAIL: right code refused while the global cap is full';
  end if;
  if public.join_family('ABC234') is distinct from fam then
    raise exception 'FAIL: right code did not join while the global cap is full';
  end if;
  execute 'reset role';

  -- The counter table is closed to clients.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform 1 from public.family_miss_days;
    raise exception 'FAIL: client read family_miss_days';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  -- 2. buy_with_gems honors live_until ------------------------------------
  insert into public.gift_catalog (kind, item_id, gems, coins, live_from, live_until)
  values ('buddy', 'sweep-old', 1, 0, current_date - 30, current_date - 10)
  on conflict (kind, item_id) do update
    set gems = 1, live_from = current_date - 30, live_until = current_date - 10;
  update public.profiles set gem_balance = 50 where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.buy_with_gems('buddy', 'sweep-old');
    raise exception 'FAIL: bought an item past live_until';
  exception when others then
    if sqlerrm not like '%bad item%' then raise; end if;
  end;
  execute 'reset role';

  -- 3. use_invite ----------------------------------------------------------
  -- old account
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.use_invite('BBBBBBBBBB');
  execute 'reset role';
  if r <> 'used' then raise exception 'FAIL: old account used an invite (%)', r; end if;

  -- code swap: b was invited by a, so a cannot use b's code
  perform set_config('did_i.invite_write', '1', true);
  update public.profiles set invited_by = a where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.use_invite('BBBBBBBBBB');
  execute 'reset role';
  if r <> 'used' then raise exception 'FAIL: code swap allowed (%)', r; end if;

  -- the normal case still works
  update public.profiles set invited_by = null where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.use_invite('BBBBBBBBBB');
  execute 'reset role';
  if r <> 'ok' then raise exception 'FAIL: a new account could not use an invite (%)', r; end if;

  -- 5. note_milestone hourly cap -------------------------------------------
  insert into public.milestones (install_id, event)
  select 'sweeptest' || lpad(g::text, 10, '0'), 'opened' from generate_series(1, 5000) g;
  perform public.note_milestone('sweepnewinstall0001', 'opened', 'ios', '1');
  if exists (select 1 from public.milestones where install_id = 'sweepnewinstall0001') then
    raise exception 'FAIL: milestone written past the hourly cap';
  end if;
  delete from public.milestones where install_id like 'sweeptest%';
  perform public.note_milestone('sweepnewinstall0001', 'opened', 'ios', '1');
  if not exists (select 1 from public.milestones where install_id = 'sweepnewinstall0001') then
    raise exception 'FAIL: milestone not written under the cap';
  end if;

  -- 6. we_nudge refuses a self nudge ---------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.we_nudge(gen_random_uuid(), a, current_date);
    execute 'reset role';
    raise exception 'FAIL: self nudge allowed';
  exception when raise_exception then
    execute 'reset role';
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  raise exception 'SQL TESTS PASSED';
end;
$$;
