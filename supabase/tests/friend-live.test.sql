-- Checks for supabase/friend-live.sql: a friend request and its yes ping the other phone.
-- Run with: node scripts/test-sql.mjs supabase/tests/friend-live.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  link uuid;
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  -- A request needs a name on it (friend-ask-name.sql).
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cy')
  on conflict (user_id) do update set display_name = excluded.display_name;
  delete from realtime.messages;

  insert into public.friend_links (from_id, to_id) values (a, b) returning id into link;
  select count(*) into n from realtime.messages where topic = 'didi:' || b and payload->>'kind' = 'friend' and payload->>'id' = link::text;
  if n <> 1 then raise exception 'FAIL: the person asked got % pings, want 1', n; end if;
  select count(*) into n from realtime.messages where topic = 'didi:' || a;
  if n <> 0 then raise exception 'FAIL: the asker was pinged for their own request'; end if;

  update public.friend_links set state = 'ok' where id = link;
  select count(*) into n from realtime.messages where topic = 'didi:' || a and payload->>'kind' = 'friend';
  if n <> 1 then raise exception 'FAIL: the asker got % pings for the yes, want 1', n; end if;

  -- Nothing between two people when one has blocked the other.
  delete from realtime.messages;
  insert into public.blocks (blocker, blocked) values (c, a);
  begin
    insert into public.friend_links (from_id, to_id) values (a, c);
  exception when others then null; -- a block may refuse the request outright
  end;
  select count(*) into n from realtime.messages where topic = 'didi:' || c;
  if n <> 0 then raise exception 'FAIL: a blocked person''s request still pinged'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
