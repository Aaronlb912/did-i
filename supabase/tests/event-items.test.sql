-- Checks that free event items are claimed on the server, only in their
-- window, once, and never by anyone signed out.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/event-items.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  out jsonb;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set gem_balance = 3 where user_id = a;

  -- Open the window around today so the test does not depend on the date.
  update public.event_catalog
  set live_from = (timezone('utc', now()))::date - 1, live_until = (timezone('utc', now()))::date + 2
  where item_id in ('bat', 'boo');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  out := public.claim_free_item('buddy', 'bat');
  if not (out->'buddies' @> '["bat"]') or (out->>'gems')::int <> 3 then
    raise exception 'FAIL: claiming the bat should own it and keep 3 gems: %', out;
  end if;
  out := public.claim_free_item('buddy', 'bat');
  select count(*) into n from jsonb_array_elements_text(out->'buddies') x where x = 'bat';
  if n <> 1 then raise exception 'FAIL: claiming twice gave % copies', n; end if;
  out := public.claim_free_item('cheer', 'boo');
  if not (out->'cheers' @> '["boo"]') or not (out->'buddies' @> '["bat"]') then
    raise exception 'FAIL: claiming the cheer lost or missed an item: %', out;
  end if;

  -- Unknown items, items of the wrong kind and paid items are refused.
  begin
    perform public.claim_free_item('buddy', 'cat');
    raise exception 'FAIL: a paid buddy was claimed free';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'bad item' then raise exception 'FAIL: wrong message: %', sqlerrm; end if;
  end;
  begin
    perform public.claim_free_item('cheer', 'bat');
    raise exception 'FAIL: the bat was claimed as a cheer';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.claim_free_item('look', 'rose');
    raise exception 'FAIL: a look was claimed free';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- The list cannot be written from the phone.
  begin
    insert into public.event_catalog (kind, item_id, live_from, live_until)
    values ('buddy', 'cat', '2026-01-01', '2027-01-01');
    raise exception 'FAIL: a signed-in user wrote to event_catalog';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  -- Outside the window it is refused, even for the owner of a new claim.
  update public.event_catalog
  set live_from = (timezone('utc', now()))::date - 10, live_until = (timezone('utc', now()))::date - 5
  where item_id in ('bat', 'boo');
  update public.profiles set gem_cosmetics = '{"looks":[],"cheers":[],"buddies":[]}' where user_id = a;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.claim_free_item('buddy', 'bat');
    raise exception 'FAIL: the bat was claimed after its window';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'bad item' then raise exception 'FAIL: wrong message: %', sqlerrm; end if;
  end;
  execute 'reset role';

  -- Nobody signed out can claim.
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role anon';
  begin
    perform public.claim_free_item('buddy', 'bat');
    raise exception 'FAIL: anon could call claim_free_item';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
