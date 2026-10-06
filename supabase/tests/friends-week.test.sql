-- Checks for supabase/friends-week.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/friends-week.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  n integer;
  failed boolean;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, buddy_on, share_streak) values (a, 'frog', true), (b, 'ant', true), (c, '', true)
  on conflict (user_id) do update set buddy_on = excluded.buddy_on, share_streak = excluded.share_streak;
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  -- Bea clears last night and tonight.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.mark_cleared(current_date - 1);
  perform public.mark_cleared(current_date);
  failed := false;
  begin
    perform public.mark_cleared(current_date - 30);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL: an old night was accepted'; end if;
  execute 'reset role';

  -- Ann sees Bea's buddy and her week.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.known_people() k where k.user_id = b and k.buddy_on = 'ant';
  if n <> 1 then raise exception 'FAIL: known_people has no buddy'; end if;
  select count(*) into n from public.friend_week(b, current_date);
  if n <> 7 then raise exception 'FAIL: week is not 7 nights: %', n; end if;
  select count(*) into n from public.friend_week(b, current_date) w where w.cleared;
  if n <> 2 then raise exception 'FAIL: cleared nights wrong: %', n; end if;
  -- Not a friend: nothing.
  select count(*) into n from public.friend_week(c, current_date);
  if n <> 0 then raise exception 'FAIL: a stranger''s week showed'; end if;
  -- Ann cannot read the table directly.
  select count(*) into n from public.cleared_nights where user_id = b;
  if n <> 0 then raise exception 'FAIL: cleared_nights readable by a friend'; end if;
  execute 'reset role';

  -- Bea stops sharing: her week goes.
  update public.profiles set share_streak = false where user_id = b;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.friend_week(b, current_date);
  if n <> 0 then raise exception 'FAIL: week showed with sharing off'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
