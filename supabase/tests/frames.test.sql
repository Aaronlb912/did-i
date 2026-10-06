-- Card frames are bought on the server: coin frames through buy_with_coins,
-- gem frames through buy_with_gems. Earned, seasonal and free frames are
-- never sold.
--
-- Run with: node scripts/test-sql.mjs supabase/tests/frames.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid();
  out jsonb;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann')
  on conflict (user_id) do update set display_name = excluded.display_name;
  update public.profiles set coin_balance = 50, gem_balance = 3 where user_id = a;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- A coin frame takes its coins and lands on the list.
  out := public.buy_with_coins('frame', 'thin');
  if (out->>'coins')::int <> 20 or not (out->'catalog'->'frames' @> '["thin"]') then
    raise exception 'FAIL: Fine Line should cost 30 coins and be owned: %', out;
  end if;
  -- Buying it again charges nothing.
  out := public.buy_with_coins('frame', 'thin');
  if (out->>'coins')::int <> 20 then
    raise exception 'FAIL: a frame you own charged again: %', out;
  end if;
  -- Not enough coins: refused.
  begin
    perform public.buy_with_coins('frame', 'marble');
    raise exception 'FAIL: a 120 coin frame went through with 20 coins';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'need coins' then raise exception 'FAIL: wrong message: %', sqlerrm; end if;
  end;
  -- A gem frame has no coin price.
  begin
    perform public.buy_with_coins('frame', 'aurora');
    raise exception 'FAIL: a gem frame was bought with coins';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- A gem frame takes its gems.
  out := public.buy_with_gems('frame', 'glow');
  if (out->>'gems')::int <> 1 or not (out->'frames' @> '["glow"]') then
    raise exception 'FAIL: Soft Glow should cost 2 gems and be owned: %', out;
  end if;
  out := public.buy_with_gems('frame', 'glow');
  if (out->>'gems')::int <> 1 then
    raise exception 'FAIL: a gem frame you own charged again: %', out;
  end if;
  begin
    perform public.buy_with_gems('frame', 'gold');
    raise exception 'FAIL: a 3 gem frame went through with 1 gem';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'need gems' then raise exception 'FAIL: wrong message: %', sqlerrm; end if;
  end;
  begin
    perform public.buy_with_gems('frame', 'thin');
    raise exception 'FAIL: a coin frame was bought with gems';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Earned, seasonal, free and unknown frames are not for sale.
  begin
    perform public.buy_with_coins('frame', 'ember');
    raise exception 'FAIL: an earned frame was bought';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.buy_with_gems('frame', 'vine');
    raise exception 'FAIL: an earned frame was bought with gems';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.buy_with_coins('frame', 'web');
    raise exception 'FAIL: a seasonal frame was bought';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.buy_with_coins('frame', 'first');
    raise exception 'FAIL: the free frame was bought';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.buy_with_gems('frame', 'nope');
    raise exception 'FAIL: an unknown frame was bought';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- The lists read back the same.
  out := public.read_coin_catalog();
  if out->'frames' <> '["thin"]'::jsonb or (out->>'coins')::int <> 20 then
    raise exception 'FAIL: coin catalog frames wrong: %', out;
  end if;
  out := public.read_gem_owned();
  if out->'frames' <> '["glow"]'::jsonb then
    raise exception 'FAIL: gem owned frames wrong: %', out;
  end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
