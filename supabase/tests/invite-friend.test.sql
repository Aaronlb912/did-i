-- Checks for supabase/invite-friend.sql: an invite code gives its owner's
-- friend ID, and nothing for your own code, an unknown code, a block or anon.
-- Run with: node scripts/test-sql.mjs supabase/tests/invite-friend.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  fid text;
  out text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  perform set_config('did_i.invite_write', '1', true);
  insert into public.profiles (user_id, display_name, invite_code) values (a, 'Ann', 'ANNCODE123')
  on conflict (user_id) do update set display_name = 'Ann', invite_code = 'ANNCODE123';
  insert into public.profiles (user_id, display_name, invite_code) values (b, 'Bo', 'BOBOCODE12')
  on conflict (user_id) do update set display_name = 'Bo', invite_code = 'BOBOCODE12';
  perform set_config('did_i.invite_write', '', true);
  select friend_id into fid from public.profiles where user_id = a;
  if fid is null then raise exception 'FAIL: the owner has no friend ID to test with'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  out := public.inviter_friend_id('anncode123');
  if out is distinct from fid then raise exception 'FAIL: a real code gave %', out; end if;
  if public.inviter_friend_id('NOPECODE99') is not null then raise exception 'FAIL: an unknown code gave an ID'; end if;
  if public.inviter_friend_id('BOBOCODE12') is not null then raise exception 'FAIL: your own code gave an ID'; end if;
  if public.inviter_friend_id('SHORT') is not null then raise exception 'FAIL: a short code gave an ID'; end if;
  execute 'reset role';

  insert into public.blocks (blocker, blocked) values (a, b);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.inviter_friend_id('ANNCODE123') is not null then raise exception 'FAIL: a block still gave the ID'; end if;
  execute 'reset role';

  execute 'set local role anon';
  begin
    perform public.inviter_friend_id('ANNCODE123');
    raise exception 'FAIL: anon could call inviter_friend_id';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
