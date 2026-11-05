-- Checks for supabase/proof-files-api.sql.
--
-- Run with: npm run db:test supabase/tests/proof-files-api.test.sql
--
-- One DO block that always ends by raising, so everything is rolled back.
-- A pass comes back as the error text 'SQL TESTS PASSED'.

do $$
declare
  a uuid := gen_random_uuid(); -- asked the question
  b uuid := gen_random_uuid(); -- answered Did and added the photo
  sid uuid;
  pid uuid;
  lost text;
  n integer;
  go_to text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');

  insert into public.sends (from_id, to_id, question, state)
  values (a, b, 'Did you stretch?', 'kept') returning id into sid;
  insert into public.send_answers (send_id, night, answer) values (sid, current_date, 'did');
  insert into public.proofs (owner_id, send_id, night)
  values (b, sid, current_date) returning id into pid;

  -- The push waits for the file.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform public.proof_uploaded(pid);
  select count(*) into n from public.push_queue where to_id = a;
  if n <> 0 then raise exception 'FAIL: pushed before the file was there'; end if;

  insert into storage.objects (bucket_id, name)
  values ('proofs', b::text || '/' || pid::text || '.jpg');

  perform public.proof_uploaded(pid);
  select go into go_to from public.push_queue where to_id = a;
  if go_to is distinct from '/photos?id=' || pid::text then
    raise exception 'FAIL: push opens % not the photo', go_to;
  end if;

  -- A second call does nothing.
  perform public.proof_uploaded(pid);
  select count(*) into n from public.push_queue where to_id = a;
  if n <> 1 then raise exception 'FAIL: % pushes for one photo', n; end if;

  -- Your own file shows even when its photo row is gone; nobody else's does.
  lost := b::text || '/' || gen_random_uuid()::text || '.jpg';
  insert into storage.objects (bucket_id, name) values ('proofs', lost);

  execute 'set local role authenticated';
  select count(*) into n from storage.objects where bucket_id = 'proofs' and name = lost;
  if n <> 1 then raise exception 'FAIL: the owner cannot see a file with no photo row'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from storage.objects where bucket_id = 'proofs' and name = lost;
  if n <> 0 then raise exception 'FAIL: someone else saw a file with no photo row'; end if;
  execute 'reset role';

  -- A photo row with a file in storage goes without an error (the direct
  -- storage delete is blocked), and so does the whole account.
  insert into public.send_answers (send_id, night, answer)
  values (sid, current_date - 1, 'did'), (sid, current_date - 2, 'did');
  insert into public.proofs (owner_id, send_id, night)
  values (b, sid, current_date - 1) returning id into pid;
  insert into storage.objects (bucket_id, name)
  values ('proofs', b::text || '/' || pid::text || '.jpg');
  delete from public.proofs where id = pid;
  select count(*) into n from public.proofs where id = pid;
  if n <> 0 then raise exception 'FAIL: the photo row did not go'; end if;

  insert into public.proofs (owner_id, send_id, night)
  values (b, sid, current_date - 2);
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform public.delete_me();
  select count(*) into n from auth.users where id = b;
  if n <> 0 then raise exception 'FAIL: delete_me did not finish with photos'; end if;
  select count(*) into n from public.proofs where owner_id = b;
  if n <> 0 then raise exception 'FAIL: photo rows left after delete_me'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
