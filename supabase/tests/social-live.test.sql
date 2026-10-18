-- Checks for supabase/social-live.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/social-live.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid;
  fam uuid;
  tag uuid;
  lamp uuid;
  send uuid;
  n integer;
  before integer;
begin
  insert into auth.users (id, email, aud, role) values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');

  -- Did we: A and B on a card, C not.
  insert into public.we_cards (made_by, question) values (a, 'Did we walk?') returning id into card;
  insert into public.we_members (card_id, user_id, state) values (card, a, 'in'), (card, b, 'in');
  insert into public.we_answers (card_id, user_id, night, status) values (card, b, current_date, 'did');

  select count(*) into n from realtime.messages
  where topic = 'didi:' || a and payload->>'kind' = 'we' and payload->>'id' = card::text;
  if n <> 1 then raise exception 'FAIL: A got % Did we broadcasts, want 1', n; end if;
  -- Answer pings only: being put on the card is its own ping (live-more.sql).
  select count(*) into n from realtime.messages where topic in ('didi:' || b, 'didi:' || c) and payload->>'kind' = 'we';
  if n <> 0 then raise exception 'FAIL: the answerer or an outsider got a broadcast'; end if;

  -- The broadcast carries no answer.
  if exists (select 1 from realtime.messages where topic = 'didi:' || a
             and (payload ? 'status' or payload ? 'night' or payload ? 'user_id')) then
    raise exception 'FAIL: broadcast carries answer fields';
  end if;

  -- After A leaves, no more.
  update public.we_members set state = 'left' where card_id = card and user_id = a;
  select count(*) into before from realtime.messages where topic = 'didi:' || a;
  update public.we_answers set status = 'nope' where card_id = card and user_id = b;
  select count(*) into n from realtime.messages where topic = 'didi:' || a;
  if n <> before then raise exception 'FAIL: A still gets Did we broadcasts after leaving'; end if;

  -- Family: A and B in, C not.
  insert into public.families (code, made_by) values ('t' || substr(md5(random()::text), 1, 10), a) returning id into fam;
  insert into public.family_members (family_id, user_id, role) values (fam, a, 'parent'), (fam, b, 'parent');
  insert into public.family_tags (family_id) values (fam) returning id into tag;
  insert into public.family_lamps (family_id, tag_id, question) values (fam, tag, 'Brush teeth?') returning id into lamp;
  insert into public.family_answers (family_id, lamp_id, user_id, period_key) values (fam, lamp, b, current_date::text);
  select count(*) into n from realtime.messages where topic = 'didi:' || a and payload->>'kind' = 'family';
  if n <> 1 then raise exception 'FAIL: A got % family broadcasts, want 1', n; end if;
  select count(*) into n from realtime.messages where topic = 'didi:' || c;
  if n <> 0 then raise exception 'FAIL: someone outside the family got a broadcast'; end if;

  -- Left the family: no more.
  delete from public.family_members where family_id = fam and user_id = a;
  select count(*) into before from realtime.messages where topic = 'didi:' || a;
  update public.family_answers set status = 'skip' where lamp_id = lamp and user_id = b;
  select count(*) into n from realtime.messages where topic = 'didi:' || a;
  if n <> before then raise exception 'FAIL: A still gets family broadcasts after leaving'; end if;

  -- Did you: A sent C one, friends, C shares answers.
  insert into public.friend_links (from_id, to_id, state) values (a, c, 'ok');
  select count(*) into before from realtime.messages where topic = 'didi:' || b;
  insert into public.sends (from_id, to_id, question, state) values (a, c, 'Did you read?', 'kept') returning id into send;
  -- The new ask reaches C only.
  select count(*) into n from realtime.messages where topic = 'didi:' || c and payload->>'kind' = 'ask' and payload->>'id' = send::text;
  if n <> 1 then raise exception 'FAIL: C got % ask broadcasts, want 1', n; end if;
  select count(*) into n from realtime.messages where topic = 'didi:' || b;
  if n <> before then raise exception 'FAIL: someone else got the ask broadcast'; end if;
  insert into public.send_answers (send_id, night, answer) values (send, current_date, 'did');
  select count(*) into n from realtime.messages where topic = 'didi:' || a and payload->>'kind' = 'send';
  if n <> 1 then raise exception 'FAIL: the sender got % Did you broadcasts, want 1', n; end if;
  select count(*) into n from realtime.messages where topic = 'didi:' || b;
  if n <> before then raise exception 'FAIL: someone else got a Did you broadcast'; end if;

  -- Blocked: no more.
  insert into public.blocks (blocker, blocked) values (c, a);
  select count(*) into before from realtime.messages where topic = 'didi:' || a;
  update public.send_answers set answer = 'nope' where send_id = send;
  select count(*) into n from realtime.messages where topic = 'didi:' || a;
  if n <> before then raise exception 'FAIL: a blocked sender still gets Did you broadcasts'; end if;

  -- Joining a topic: only your own.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.live_topic_mine('didi:' || a) then raise exception 'FAIL: C may join A''s topic'; end if;
  if not public.live_topic_mine('didi:' || c) then raise exception 'FAIL: C may not join their own topic'; end if;
  perform set_config('realtime.topic', 'didi:' || a, true);
  select count(*) into n from realtime.messages where topic = 'didi:' || a;
  if n <> 0 then raise exception 'FAIL: C can read A''s broadcasts'; end if;
  execute 'reset role';

  -- Your own undo goes only to your own topic.
  insert into public.answer_log (user_id, lamp_id, period_key, answered_at) values (b, 'lamp-x', '2026-10-15', '2026-10-15T20:00:00.000Z');
  select count(*) into before from realtime.messages where topic <> 'didi:' || b;
  delete from public.answer_log where user_id = b and lamp_id = 'lamp-x';
  select count(*) into n from realtime.messages where topic = 'didi:' || b and payload->>'kind' = 'undo'
    and payload->'gone' @> '[{"lamp": "lamp-x", "period": "2026-10-15"}]';
  if n <> 1 then raise exception 'FAIL: B got % undo broadcasts, want 1', n; end if;
  select count(*) into n from realtime.messages where topic <> 'didi:' || b;
  if n <> before then raise exception 'FAIL: an undo went to someone else'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
