-- Checks for supabase/invite-owner.sql: a code names its owner, nothing else does.
-- Run with: node scripts/test-sql.mjs supabase/tests/invite-owner.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  out text;
  i integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  perform set_config('did_i.invite_write', '1', true);
  insert into public.profiles (user_id, display_name, invite_code) values (a, 'Ann', 'ANNCODE123')
  on conflict (user_id) do update set display_name = 'Ann', invite_code = 'ANNCODE123';
  insert into public.profiles (user_id, display_name) values (b, '') on conflict (user_id) do nothing;
  perform set_config('did_i.invite_write', '', true);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.invite_owner('anncode123');
  if out is distinct from 'Ann' then raise exception 'FAIL: owner of a real code was %', out; end if;
  out := public.invite_owner('NOPECODE99');
  if out is not null then raise exception 'FAIL: an unknown code named %', out; end if;
  out := public.invite_owner('SHORT');
  if out is not null then raise exception 'FAIL: a short code named %', out; end if;
  for i in 1..60 loop
    perform public.invite_owner('NOPECODE99');
  end loop;
  if public.invite_owner('ANNCODE123') is not null then raise exception 'FAIL: looks past the cap still answered'; end if;
  begin
    perform count(*) from public.invite_looks;
    raise exception 'FAIL: a signed-in user could read invite_looks';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  execute 'set local role anon';
  begin
    perform public.invite_owner('ANNCODE123');
    raise exception 'FAIL: anon could call invite_owner';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
