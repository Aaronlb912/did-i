-- Checks for supabase/social-noise.sql.
--
-- Run with: npm run db:test supabase/tests/social-noise.test.sql
--
-- One DO block that always ends by raising, so every row is rolled back.
-- A pass comes back as the error text 'SQL TESTS PASSED'.

do $$
declare
  a uuid := gen_random_uuid(); -- sends cheers
  b uuid := gen_random_uuid(); -- gets them
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  -- 1. Three cheers in a row are one push, though each has its own id.
  delete from public.push_queue where to_id = b;
  insert into public.push_queue (to_id, from_id, title, body, go) values
    (b, a, 'Did I', 'Ann sent you a cheer', '/inbox?id=cheer:1'),
    (b, a, 'Did I', 'Ann sent you a cheer', '/inbox?id=cheer:2'),
    (b, a, 'Did I', 'Ann sent you a cheer', '/inbox?id=cheer:3');
  select count(*) into n from public.push_queue where to_id = b and sent_at is null;
  if n <> 1 then raise exception 'FAIL: % cheer pushes queued, want 1', n; end if;
  -- Different pages still each get their push.
  insert into public.push_queue (to_id, from_id, title, body, go) values (b, a, 'Did I', 'Ann sent you a cheer', '/people');
  select count(*) into n from public.push_queue where to_id = b and sent_at is null;
  if n <> 2 then raise exception 'FAIL: a push to another page was dropped'; end if;

  -- 2. Twenty waiting cheers do not block a Did you.
  set local session_replication_role = replica;
  insert into public.sends (from_id, to_id, kind, question)
  select a, b, 'cheer', '' from generate_series(1, 20);
  set local session_replication_role = origin;
  delete from public.send_counts where from_id = a;
  begin
    insert into public.sends (from_id, to_id, kind, question) values (a, b, 'todo', 'water');
  exception when others then
    if sqlerrm like '%too many waiting%' then raise exception 'FAIL: waiting cheers blocked a Did you'; end if;
    raise;
  end;
  -- Twenty waiting Did yous still do.
  set local session_replication_role = replica;
  insert into public.sends (from_id, to_id, kind, question)
  select a, b, 'todo', 'q' || g from generate_series(1, 19) g;
  set local session_replication_role = origin;
  begin
    insert into public.sends (from_id, to_id, kind, question) values (a, b, 'todo', 'one more');
    raise exception 'FAIL: a 21st waiting Did you went through';
  exception when others then
    if sqlerrm not like '%too many waiting%' then raise; end if;
  end;

  -- 3. A held Did we push from yesterday is dropped; a fresh one stays.
  delete from public.push_queue where to_id = b;
  set local session_replication_role = replica;
  insert into public.push_queue (to_id, title, body, go, made_at) values
    (b, 'Did we', 'old', '/tonight', now() - interval '13 hours'),
    (b, 'Did we', 'new', '/tonight', now() - interval '1 hour');
  set local session_replication_role = origin;
  perform * from public.take_push_batch(200);
  select count(*) into n from public.push_queue where to_id = b and body = 'old';
  if n <> 0 then raise exception 'FAIL: a 13-hour-old Did we push was kept'; end if;
  select count(*) into n from public.push_queue where to_id = b and body = 'new';
  if n <> 1 then raise exception 'FAIL: a fresh Did we push was dropped'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
