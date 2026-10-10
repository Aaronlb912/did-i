-- Checks report emails and photo paths in supabase/admin-mail.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/admin-mail.test.sql

do $$
<<mail_test>>
declare
  boss uuid := gen_random_uuid();
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  rid uuid;
  n integer;
  qid bigint;
  p text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (boss, boss || '@test.invalid', 'authenticated', 'authenticated'),
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.admins (user_id) values (boss);

  -- Ann reports Bea's photo: one queued email.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.block_person(b, 'photo');

  -- Ann can not see or touch the queue or its helpers.
  begin
    perform 1 from public.report_mail_queue;
    raise exception 'FAIL: Ann read the mail queue';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.report_mail_batch(50);
    raise exception 'FAIL: Ann ran report_mail_batch';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_photo_path(gen_random_uuid());
    raise exception 'FAIL: Ann read a photo path';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';

  select r.id into rid from public.reports r where r.from_id = a and r.about_id = b and r.reason = 'photo';
  if rid is null then raise exception 'FAIL: no photo report'; end if;
  select count(*) into n from public.report_mail_queue where report_id = rid;
  if n <> 1 then raise exception 'FAIL: % queued rows for one report', n; end if;

  select id into qid from public.report_mail_batch(50) where report_id = rid;
  if qid is null then raise exception 'FAIL: batch missed the report'; end if;
  select count(*) into n from public.admin_emails() e where e.email = boss || '@test.invalid';
  if n <> 1 then raise exception 'FAIL: admin email missing'; end if;

  -- A failure is kept for a retry; a send closes the row.
  perform public.report_mail_done(qid, 'resend 500');
  if (select sent_at from public.report_mail_queue where id = qid) is not null then
    raise exception 'FAIL: a failed send was marked sent';
  end if;
  perform public.report_mail_done(qid, '');
  select count(*) into n from public.report_mail_batch(50) where report_id = rid;
  if n <> 0 then raise exception 'FAIL: a sent row came back'; end if;

  -- Photo path: only inside avatars/<Bea>/.
  update public.profiles set avatar_url = 'https://abc.supabase.co/storage/v1/object/public/avatars/' || b || '/1.jpg?t=1'
  where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', boss, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  p := public.admin_photo_path(rid);
  if p is distinct from (b::text || '/1.jpg') then raise exception 'FAIL: photo path was %', p; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
