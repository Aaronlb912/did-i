-- Checks the reports admin in supabase/admin.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/admin.test.sql

do $$
<<admin_test>>
declare
  boss uuid := gen_random_uuid();
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  code text;
  rid uuid;
  pid uuid;
  n integer;
  out text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (boss, boss || '@test.invalid', 'authenticated', 'authenticated'),
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.admins (user_id) values (boss);

  -- Bea makes a link; Ann reports it, and reports Bea's photo.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  code := public.make_did_you_link('Did you stretch?');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.report_did_you_link(code, 'spam');
  perform public.unblock_person(b);
  perform public.block_person(b, 'photo');

  -- Ann is not an admin: no list, no actions, no rows.
  if public.is_admin() then raise exception 'FAIL: Ann is an admin'; end if;
  begin
    perform public.admin_reports(10);
    raise exception 'FAIL: Ann read the reports';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  select count(*) into n from public.reports;
  if n <> 0 then raise exception 'FAIL: Ann sees % reports', n; end if;
  execute 'reset role';

  -- The admin sees both, newest first, with kinds.
  perform set_config('request.jwt.claims', json_build_object('sub', boss, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select id into pid from public.admin_reports(10) r where r.kind = 'photo' and r.about_id = b;
  select id into rid from public.admin_reports(10) r where r.kind = 'did_you_link' and r.link_code = code;
  if pid is null or rid is null then raise exception 'FAIL: admin list is missing a report'; end if;

  out := public.admin_act(rid, 'remove', 'looked');
  if out <> 'removed' then raise exception 'FAIL: remove said %', out; end if;
  out := public.admin_act(pid, 'ban', '');
  if out <> 'banned' then raise exception 'FAIL: ban said %', out; end if;
  select count(*) into n from public.report_actions where report_id in (rid, pid);
  if n <> 2 then raise exception 'FAIL: % actions logged', n; end if;
  execute 'reset role';

  if not (select l.ended from public.did_you_links l where l.code = admin_test.code) then
    raise exception 'FAIL: the link is still up';
  end if;
  if (select banned_until from auth.users where id = b) is null then
    raise exception 'FAIL: Bea is not banned';
  end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
