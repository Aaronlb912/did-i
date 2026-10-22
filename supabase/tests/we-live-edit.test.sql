-- Checks for supabase/we-live-edit.sql: ending or editing a Did we pings the members.
-- Run with: node scripts/test-sql.mjs supabase/tests/we-live-edit.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  card uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.profiles (user_id, display_name) values (a, 'Ann'), (b, 'Ben'), (c, 'Cy')
  on conflict (user_id) do update set display_name = excluded.display_name;
  insert into public.we_cards (id, made_by, question, mode, shows, cadence, starts_on)
  values (card, a, 'Did we walk?', 'all', 'all', 'daily', current_date - 1);
  insert into public.we_members (card_id, user_id, state, joined_at)
  values (card, a, 'in', now()), (card, b, 'in', now());
  insert into public.we_members (card_id, user_id, state) values (card, c, 'declined');
  delete from realtime.messages;

  update public.we_cards set archived = true where id = card;
  select count(*) into n from realtime.messages
  where topic in ('didi:' || a, 'didi:' || b) and payload->>'kind' = 'we' and payload->>'id' = card::text;
  if n <> 2 then raise exception 'FAIL: members got % pings for the end, want 2', n; end if;
  select count(*) into n from realtime.messages where topic = 'didi:' || c;
  if n <> 0 then raise exception 'FAIL: someone not on the card was pinged'; end if;

  raise notice 'ok';
end;
$$;
