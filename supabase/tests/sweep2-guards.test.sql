-- Checks for supabase/sweep2-guards.sql.
--
-- Run with: npm run db:test supabase/tests/sweep2-guards.test.sql
-- One DO block that always ends by raising, so everything rolls back.

do $$
declare
  a uuid := gen_random_uuid(); -- inviter
  p uuid := gen_random_uuid(); -- invited
  r jsonb;
  n integer;
  base text := 'https://lsvvxslgizihbktqoybt.supabase.co/storage/v1/object/public/avatars/';
begin
  -- Old photo links must still pass, or those people could not save their profile.
  select count(*) into n from public.profiles
  where avatar_url is not null and avatar_url <> ''
    and not (
      length(avatar_url) <= 400
      and avatar_url ~ ('^https://lsvvxslgizihbktqoybt\.supabase\.co/storage/v1/object/public/avatars/'
        || user_id::text || '/[A-Za-z0-9_-][A-Za-z0-9._-]*(\?[A-Za-z0-9=&._-]*)?$')
      and position('..' in avatar_url) = 0
    );
  if n <> 0 then raise exception 'FAIL: % saved photo links fail the new check', n; end if;

  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (p, p || '@test.invalid', 'authenticated', 'authenticated');
  perform set_config('did_i.invite_write', '1', true);
  insert into public.profiles (user_id, invite_code) values (a, 'SWPAAAAAAA'), (p, 'SWPPPPPPPP');
  perform set_config('did_i.invite_write', '', true);

  -- 1. A join with no answers pays nobody. --------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.use_invite('SWPAAAAAAA') <> 'ok' then
    execute 'reset role';
    raise exception 'FAIL: new account could not use an invite';
  end if;
  r := public.claim_invites();
  execute 'reset role';
  if (r->>'gems')::int <> 0 then raise exception 'FAIL: invited paid before using the app'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.claim_invites();
  execute 'reset role';
  if (r->>'gems')::int <> 0 or (r->>'joined')::int <> 0 then
    raise exception 'FAIL: inviter paid for a throwaway join (%)', r;
  end if;

  -- 3 nights of answers: both get paid, once. ------------------------------
  insert into public.answer_log (user_id, lamp_id, period_key, status)
  values (p, 'q', '2026-10-01', 'yes'), (p, 'q', '2026-10-02', 'yes'), (p, 'q', '2026-10-03', 'late');

  execute 'set local role authenticated';
  r := public.claim_invites();
  execute 'reset role';
  if (r->>'gems')::int < 1 or (r->>'joined')::int <> 1 then
    raise exception 'FAIL: inviter not paid for a real join (%)', r;
  end if;
  execute 'set local role authenticated';
  r := public.claim_invites();
  execute 'reset role';
  if (r->>'gems')::int <> 0 then raise exception 'FAIL: inviter paid twice'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  r := public.claim_invites();
  execute 'reset role';
  if (r->>'gems')::int < 1 then raise exception 'FAIL: invited not paid after 3 nights'; end if;

  -- invite_real is closed to clients.
  execute 'set local role authenticated';
  begin
    perform public.invite_real(a);
    raise exception 'FAIL: client called invite_real';
  exception when insufficient_privilege then
    null;
  end;
  execute 'reset role';

  -- 2. Avatar links ---------------------------------------------------------
  update public.profiles set avatar_url = base || a || '/1760000000000.jpg' where user_id = a;
  begin
    update public.profiles set avatar_url = base || p || '/x.jpg?x=/avatars/' || a || '/' where user_id = a;
    raise exception 'FAIL: photo link to someone else was saved';
  exception when check_violation then
    null;
  end;
  begin
    update public.profiles set avatar_url = base || a || '/../' || p || '/x.jpg' where user_id = a;
    raise exception 'FAIL: photo link with .. was saved';
  exception when check_violation then
    null;
  end;

  raise exception 'SQL TESTS PASSED';
end;
$$;
