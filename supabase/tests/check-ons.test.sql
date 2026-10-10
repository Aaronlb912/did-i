-- Checks for check_ons in supabase/social-gentle.sql.
-- Run with: node scripts/test-sql.mjs supabase/tests/check-ons.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  n integer;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.friend_links (from_id, to_id, state) values (a, b, 'ok');

  -- Ann asks her friend Bea to check on her.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question) values (a, b, 'l1', 'walk');

  -- Not a friend: refused.
  begin
    insert into public.check_ons (owner_id, buddy_id, lamp_id, question) values (a, c, 'l2', 'walk');
    raise exception 'FAIL: a check-on went to a stranger';
  exception when insufficient_privilege then null;
  end;

  -- Not as someone else.
  begin
    insert into public.check_ons (owner_id, buddy_id, lamp_id, question) values (b, a, 'l3', 'forged');
    raise exception 'FAIL: made a check-on owned by someone else';
  exception when insufficient_privilege then null;
  end;

  -- The job's sent_on is not the owner's to move.
  begin
    update public.check_ons set sent_on = current_date where owner_id = a;
    raise exception 'FAIL: the owner moved sent_on';
  exception when insufficient_privilege then null;
  end;

  -- Bad shapes are refused.
  begin
    insert into public.check_ons (owner_id, buddy_id, lamp_id, question, kind) values (a, b, 'l4', 'walk', 'once');
    raise exception 'FAIL: a Just once check-on with no date was saved';
  exception when check_violation then null;
  end;
  begin
    insert into public.check_ons (owner_id, buddy_id, lamp_id, question, at_minute) values (a, b, 'l5', 'walk', 1440);
    raise exception 'FAIL: a time past midnight was saved';
  exception when check_violation then null;
  end;
  execute 'reset role';

  -- Bea reads it and can turn it off. Cy sees nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.check_ons;
  if n <> 0 then raise exception 'FAIL: a stranger can read a check-on'; end if;
  delete from public.check_ons where owner_id = a;
  execute 'reset role';
  select count(*) into n from public.check_ons where owner_id = a;
  if n <> 1 then raise exception 'FAIL: a stranger removed a check-on'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.check_ons where owner_id = a;
  if n <> 1 then raise exception 'FAIL: the friend cannot read the check-on'; end if;
  delete from public.check_ons where owner_id = a;
  execute 'reset role';
  select count(*) into n from public.check_ons where owner_id = a;
  if n <> 0 then raise exception 'FAIL: the friend could not turn it off'; end if;

  -- Twenty per person.
  insert into public.check_ons (owner_id, buddy_id, lamp_id, question)
  select a, b, 'cap' || i, 'walk' from generate_series(1, 20) i;
  begin
    insert into public.check_ons (owner_id, buddy_id, lamp_id, question) values (a, b, 'cap21', 'walk');
    raise exception 'FAIL: a 21st check-on was saved';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  raise exception 'SQL TESTS PASSED';
end;
$$;
