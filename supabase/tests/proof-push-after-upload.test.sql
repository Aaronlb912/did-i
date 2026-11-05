-- The photo push waits for the file, goes out once, and only for the owner.
--
-- Run with: npm run db:test supabase/tests/proof-push-after-upload.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  sid uuid := gen_random_uuid();
  pid uuid;
  n int;
begin
  insert into auth.users (id, email, aud, role)
  values (a, a || '@test.invalid', 'authenticated', 'authenticated'),
         (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Bea')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.sends (id, from_id, to_id, question, state) values (sid, b, a, 'Did you stretch?', 'kept');
  insert into public.send_answers (send_id, night, answer) values (sid, current_date, 'did');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  pid := public.add_proof(sid, null, current_date);
  execute 'reset role';

  select count(*) into n from public.push_queue q where q.to_id = b and q.go = '/sent';
  if n <> 0 then raise exception 'FAIL: a push went out before the upload'; end if;

  execute 'set local role authenticated';
  perform public.proof_uploaded(pid);
  execute 'reset role';
  select count(*) into n from public.push_queue q where q.to_id = b and q.go = '/sent';
  if n <> 0 then raise exception 'FAIL: a push went out with no file'; end if;

  insert into storage.objects (bucket_id, name, owner_id)
  values ('proofs', a::text || '/' || pid::text || '.jpg', a::text);

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.proof_uploaded(pid);
  execute 'reset role';
  select count(*) into n from public.push_queue q where q.to_id = b and q.go = '/sent';
  if n <> 0 then raise exception 'FAIL: someone else queued the push'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.proof_uploaded(pid);
  perform public.proof_uploaded(pid);
  execute 'reset role';
  select count(*) into n from public.push_queue q where q.to_id = b and q.go = '/sent';
  if n <> 1 then raise exception 'FAIL: expected one push, got %', n; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
