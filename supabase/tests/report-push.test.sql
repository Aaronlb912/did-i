-- Checks for supabase/report-push.sql. Rolls back.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  rep uuid;
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben') on conflict (user_id) do nothing;
  insert into public.reports (from_id, about_id, reason) values (a, b, 'photo') returning id into rep;
  insert into public.report_actions (report_id, about_id, action) values (rep, b, 'dismiss');
  if exists (select 1 from public.push_queue where to_id = b) then raise exception 'FAIL: a dismiss was pushed'; end if;
  insert into public.report_actions (report_id, about_id, action) values (rep, b, 'remove');
  if not exists (select 1 from public.push_queue where to_id = b and body like '%photo was removed%') then
    raise exception 'FAIL: a removed photo was not pushed (kind %)', (select public.report_kind(reason, line_id) from public.reports where id = rep);
  end if;
  if exists (select 1 from public.push_queue where to_id = a) or exists (select 1 from public.push_queue where to_id = b and body like '%Ann%') then
    raise exception 'FAIL: the reporter was named or pushed';
  end if;
  raise exception 'SQL TESTS PASSED';
end $$;
