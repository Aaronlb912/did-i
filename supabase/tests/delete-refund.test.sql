-- Deleting an account sends its unopened gifts' gems and coins back to the giver.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  bal integer;
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id) values (a), (b) on conflict (user_id) do nothing;
  alter table public.profiles disable trigger user;
  update public.profiles set gem_balance = 10 where user_id = a;
  alter table public.profiles enable trigger user;
  alter table public.cheer_gifts disable trigger user;
  insert into public.cheer_gifts (from_id, to_id, kind, cheer_id, gems, coins)
  values (a, b, 'cheer', 'sparkle', 5, 0);
  alter table public.cheer_gifts enable trigger user;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.delete_me();
  execute 'reset role';

  select gem_balance into bal from public.profiles where user_id = a;
  if bal <> 15 then raise exception 'FAIL: giver has %', bal; end if;
  raise exception 'SQL TESTS PASSED';
end $$;
