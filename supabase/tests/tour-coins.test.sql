-- Checks for supabase/tour-coins.sql. Rolls back.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben') on conflict (user_id) do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  if (public.claim_tour_coins('basics')->>'paid')::int <> 20 then raise exception 'FAIL: basics did not pay 20'; end if;
  if (public.claim_tour_coins('basics')->>'paid')::int <> 0 then raise exception 'FAIL: basics paid twice'; end if;
  if (public.claim_tour_coins('more')->>'paid')::int <> 30 then raise exception 'FAIL: more did not pay 30'; end if;
  if (public.claim_tour_coins('nope')->>'paid')::int <> 0 then raise exception 'FAIL: a bad part paid'; end if;
  if (public.claim_tour_coins('basics')->>'balance')::int <> 50 then raise exception 'FAIL: balance not returned'; end if;
  if (select coin_balance from public.profiles where user_id = a) <> 50 then
    raise exception 'FAIL: balance is not 50';
  end if;
  if (select coin_balance from public.profiles where user_id = b) <> 0 then
    raise exception 'FAIL: another user was paid';
  end if;

  begin
    insert into public.tour_claims (user_id, part) values (a, 'basics');
    raise exception 'FAIL: direct insert was allowed';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.tour_claims;
  if n <> 0 then raise exception 'FAIL: saw another user claims'; end if;
  if (public.claim_tour_coins('basics')->>'paid')::int <> 20 then raise exception 'FAIL: second user not paid'; end if;

  raise exception 'SQL TESTS PASSED';
end $$;
