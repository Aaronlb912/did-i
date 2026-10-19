-- Checks for supabase/referral-rewards.sql: the Hive buddy at 15 friends
-- joined, the Bloom frame at 20, gems still 10 in all.
-- Run with: node scripts/test-sql.mjs supabase/tests/referral-rewards.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  f uuid;
  out jsonb;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a) on conflict (user_id) do nothing;

  -- 14 friends joined with a's code.
  perform set_config('did_i.invite_write', '1', true);
  for n in 1..14 loop
    f := gen_random_uuid();
    insert into auth.users (id, email, aud, role)
    values (f, f || '@test.invalid', 'authenticated', 'authenticated');
    insert into public.profiles (user_id, invited_by) values (f, a)
    on conflict (user_id) do update set invited_by = excluded.invited_by;
    -- A join counts after 3 nights of answers (sweep2-guards.sql).
    insert into public.answer_log (user_id, lamp_id, period_key, status)
    select f, 'q', d, 'yes' from unnest(array['2026-10-01', '2026-10-02', '2026-10-03']) d;
  end loop;
  perform set_config('did_i.invite_write', '', true);

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  out := public.claim_invites();
  if (out->>'joined')::int <> 14 then raise exception 'FAIL: joined should be 14: %', out; end if;
  if (out->>'gems')::int <> 10 then raise exception 'FAIL: gems should stop at 10: %', out; end if;
  if out->'buddies' <> '[]'::jsonb or out->'frames' <> '[]'::jsonb then
    raise exception 'FAIL: nothing past the gems at 14: %', out;
  end if;

  -- A client cannot add friends to itself.
  begin
    update public.profiles set invites_paid = 99, invite_gems_paid = 0 where user_id = a;
  exception when others then null;
  end;

  execute 'reset role';
  perform set_config('did_i.invite_write', '1', true);
  f := gen_random_uuid();
  insert into auth.users (id, email, aud, role) values (f, f || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, invited_by) values (f, a)
  on conflict (user_id) do update set invited_by = excluded.invited_by;
  -- A join counts after 3 nights of answers (sweep2-guards.sql).
  insert into public.answer_log (user_id, lamp_id, period_key, status)
  select f, 'q', d, 'yes' from unnest(array['2026-10-01', '2026-10-02', '2026-10-03']) d;
  perform set_config('did_i.invite_write', '', true);
  execute 'set local role authenticated';

  out := public.claim_invites();
  if (out->>'gems')::int <> 0 then raise exception 'FAIL: gems paid again: %', out; end if;
  if not (out->'buddies' @> '["hive"]') or out->'frames' <> '[]'::jsonb then
    raise exception 'FAIL: 15 friends should give the Hive buddy only: %', out;
  end if;
  -- Asking again lists it again and pays nothing.
  out := public.claim_invites();
  if not (out->'buddies' @> '["hive"]') or (out->>'gems')::int <> 0 then
    raise exception 'FAIL: a second claim should list Hive and pay nothing: %', out;
  end if;

  execute 'reset role';
  perform set_config('did_i.invite_write', '1', true);
  for n in 1..5 loop
    f := gen_random_uuid();
    insert into auth.users (id, email, aud, role) values (f, f || '@test.invalid', 'authenticated', 'authenticated');
    insert into public.profiles (user_id, invited_by) values (f, a)
    on conflict (user_id) do update set invited_by = excluded.invited_by;
    -- A join counts after 3 nights of answers (sweep2-guards.sql).
    insert into public.answer_log (user_id, lamp_id, period_key, status)
    select f, 'q', d, 'yes' from unnest(array['2026-10-01', '2026-10-02', '2026-10-03']) d;
  end loop;
  perform set_config('did_i.invite_write', '', true);
  execute 'set local role authenticated';

  out := public.claim_invites();
  if (out->>'joined')::int <> 20 or not (out->'frames' @> '["bloom"]') or not (out->'buddies' @> '["hive"]') then
    raise exception 'FAIL: 20 friends should give Hive and Bloom: %', out;
  end if;
  select invite_gems_paid into n from public.profiles where user_id = a;
  if n <> 10 then raise exception 'FAIL: referral gems should stay at 10, got %', n; end if;

  execute 'reset role';
  raise exception 'SQL TESTS PASSED';
end;
$$;
