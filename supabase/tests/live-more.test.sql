-- Checks for supabase/live-more.sql: what other people do pings the phones that show it.
-- Run with: node scripts/test-sql.mjs supabase/tests/live-more.test.sql

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

  -- A removed friend: both sides look again.
  delete from realtime.messages;
  delete from public.friend_links where id = link;
  select count(*) into n from realtime.messages where payload->>'kind' = 'friend' and topic in ('didi:' || a, 'didi:' || b);
  if n <> 2 then raise exception 'FAIL: a removal pinged % sides, want 2', n; end if;

  -- A cheer gift pings the person it is for.
  delete from realtime.messages;
  insert into public.cheer_gifts (to_id, from_id, cheer_id) values (b, a, 'confetti');
  select count(*) into n from realtime.messages where topic = 'didi:' || b and payload->>'kind' = 'gift';
  if n <> 1 then raise exception 'FAIL: a gift pinged % times, want 1', n; end if;

  -- A Did you edited pings who it went to; answered pings the sender; taken back pings who it went to.
  insert into public.sends (from_id, to_id, question) values (a, b, 'Walk?') returning id into link;
  delete from realtime.messages;
  update public.sends set state = 'kept' where id = link;
  select count(*) into n from realtime.messages where topic = 'didi:' || b and payload->>'kind' = 'ask';
  if n <> 1 then raise exception 'FAIL: an edited Did you pinged its person % times', n; end if;
  select count(*) into n from realtime.messages where topic = 'didi:' || a and payload->>'kind' = 'sendMoved';
  if n <> 1 then raise exception 'FAIL: an answered Did you pinged its sender % times', n; end if;
  delete from realtime.messages;
  delete from public.sends where id = link;
  select count(*) into n from realtime.messages where topic = 'didi:' || b and payload->>'kind' = 'ask';
  if n <> 1 then raise exception 'FAIL: a taken back Did you pinged % times', n; end if;
  select count(*) into n from realtime.messages where topic = 'didi:' || a;
  if n <> 0 then raise exception 'FAIL: taking one back pinged the sender'; end if;

  -- Families: a join pings everyone in it, a leave pings the one who left too, a rename pings all.
  insert into public.families (name, code) values ('Home', 'LIVE01') returning id into link;
  insert into public.family_members (family_id, user_id, role) values (link, a, 'parent');
  delete from realtime.messages;
  insert into public.family_members (family_id, user_id) values (link, b);
  select count(*) into n from realtime.messages where payload->>'kind' = 'familyInfo' and topic in ('didi:' || a, 'didi:' || b);
  if n <> 2 then raise exception 'FAIL: a join pinged % members, want 2', n; end if;
  delete from realtime.messages;
  update public.families set name = 'House' where id = link;
  select count(*) into n from realtime.messages where payload->>'kind' = 'familyInfo';
  if n <> 2 then raise exception 'FAIL: a rename pinged % members, want 2', n; end if;
  delete from realtime.messages;
  delete from public.family_members where family_id = link and user_id = b;
  select count(*) into n from realtime.messages where payload->>'kind' = 'familyInfo' and topic in ('didi:' || a, 'didi:' || b);
  if n <> 2 then raise exception 'FAIL: a leave pinged % people, want 2 (the one left too)', n; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
