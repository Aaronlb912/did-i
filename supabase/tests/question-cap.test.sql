-- Checks for supabase/question-cap.sql. Rolled back.
-- Run with: npm run db:test supabase/tests/question-cap.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  n integer;
  big jsonb;
begin
  insert into auth.users (id, email, aud, role) values (a, a || '@test.invalid', 'authenticated', 'authenticated');

  select jsonb_build_object('boards', jsonb_build_array(
    jsonb_build_object('id', 'b1', 'lamps', (select jsonb_agg(jsonb_build_object('id', 'q' || g)) from generate_series(1, 300) g))
  )) into big;
  insert into public.shelves (user_id, doc) values (a, big);

  -- At 300, adding one is refused.
  begin
    update public.shelves set doc = jsonb_set(doc, '{boards,0,lamps}', (doc #> '{boards,0,lamps}') || '[{"id":"extra"}]'::jsonb) where user_id = a;
    raise exception 'FAIL: the 301st question went through';
  exception when check_violation then null;
  end;

  -- An unrelated edit at the cap still saves.
  update public.shelves set doc = jsonb_set(doc, '{boards,0,title}', '"Renamed"') where user_id = a;

  -- Removing one works, then adding it back to 300 works.
  update public.shelves set doc = jsonb_set(doc, '{boards,0,lamps}', (doc #> '{boards,0,lamps}') - 0) where user_id = a;
  update public.shelves set doc = jsonb_set(doc, '{boards,0,lamps}', (doc #> '{boards,0,lamps}') || '[{"id":"again"}]'::jsonb) where user_id = a;

  -- A shelf already over the cap: unrelated edits and removals save, adds do not.
  alter table public.shelves disable trigger shelves_question_cap;
  update public.shelves set doc = jsonb_set(doc, '{boards,0,lamps}', (doc #> '{boards,0,lamps}') || '[{"id":"o1"},{"id":"o2"}]'::jsonb) where user_id = a;
  alter table public.shelves enable trigger shelves_question_cap;
  update public.shelves set doc = jsonb_set(doc, '{boards,0,title}', '"Again"') where user_id = a;
  begin
    update public.shelves set doc = jsonb_set(doc, '{boards,0,lamps}', (doc #> '{boards,0,lamps}') || '[{"id":"o3"}]'::jsonb) where user_id = a;
    raise exception 'FAIL: an add on an over-cap shelf went through';
  exception when check_violation then null;
  end;
  update public.shelves set doc = jsonb_set(doc, '{boards,0,lamps}', (doc #> '{boards,0,lamps}') - 0) where user_id = a;

  select public.shelf_question_count(doc) into n from public.shelves where user_id = a;
  if n <> 301 then raise exception 'FAIL: expected 301 questions, got %', n; end if;
  raise exception 'SQL TESTS PASSED';
end $$;
