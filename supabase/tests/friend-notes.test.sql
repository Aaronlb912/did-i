-- Checks for supabase/friend-notes.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/friend-notes.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated');

  -- Ann writes a note about Bea.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.friend_notes (owner_id, friend_id, note) values (a, b, 'Allergic to nuts');
  select count(*) into n from public.friend_notes where friend_id = b;
  if n <> 1 then raise exception 'FAIL: owner cannot read their own note'; end if;

  -- Too long is refused.
  begin
    update public.friend_notes set note = repeat('x', 501) where owner_id = a and friend_id = b;
    raise exception 'FAIL: a 501 character note was saved';
  exception when check_violation then null;
  end;

  -- Ann cannot write a note as Bea.
  begin
    insert into public.friend_notes (owner_id, friend_id, note) values (b, a, 'forged');
    raise exception 'FAIL: wrote a note owned by someone else';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- Bea sees nothing, not even that a note about her exists.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.friend_notes;
  if n <> 0 then raise exception 'FAIL: the friend can see a note about them'; end if;
  update public.friend_notes set note = 'changed' where owner_id = a;
  delete from public.friend_notes where owner_id = a;
  execute 'reset role';
  select count(*) into n from public.friend_notes where owner_id = a and note = 'Allergic to nuts';
  if n <> 1 then raise exception 'FAIL: the friend changed or removed the note'; end if;

  raise exception 'SQL TESTS PASSED';
end;
$$;
