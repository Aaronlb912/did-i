-- Checks end_did_you_link and did_you_link_stopped (supabase/did-you-links.sql)
-- and edit_send (supabase/hardening.sql).
-- Run with: node scripts/test-sql.mjs supabase/tests/sent-edit.test.sql

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  lc text;
  sid uuid;
  ok boolean;
  n integer;
  q text;
begin
  insert into auth.users (id, email, aud, role)
  values
    (a, a || '@test.invalid', 'authenticated', 'authenticated'),
    (b, b || '@test.invalid', 'authenticated', 'authenticated'),
    (c, c || '@test.invalid', 'authenticated', 'authenticated');

  -- Ann makes a link and Bea keeps it.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  lc := public.make_did_you_link('Did you stretch?');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.claim_did_you_link(lc);
  -- Bea can not stop Ann's link.
  ok := public.end_did_you_link(lc);
  if ok then raise exception 'FAIL: someone else stopped the link'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.did_you_link_stopped(lc) then raise exception 'FAIL: a live link reads as stopped'; end if;
  ok := public.end_did_you_link(lc);
  if not ok then raise exception 'FAIL: the maker could not stop the link'; end if;
  execute 'reset role';

  select count(*) into n from public.look_up_did_you_link(lc);
  if n <> 0 then raise exception 'FAIL: a stopped link still looks up'; end if;
  if not public.did_you_link_stopped(lc) then raise exception 'FAIL: a stopped link does not say so'; end if;

  -- Cy can not keep it now. Bea still has hers.
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.claim_did_you_link(lc) then raise exception 'FAIL: a stopped link was kept'; end if;
  execute 'reset role';
  select count(*) into n from public.did_you_link_claims where did_you_link_claims.code = lc and user_id = b;
  if n <> 1 then raise exception 'FAIL: stopping the link dropped an earlier keep'; end if;

  -- Ann sends Bea a Did you, then edits it.
  insert into public.sends (from_id, to_id, question) values (a, b, 'Did you read?') returning id into sid;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.edit_send(sid, '  Did you read a chapter?  ') then raise exception 'FAIL: sender could not edit'; end if;
  begin
    perform public.edit_send(sid, '   ');
    raise exception 'FAIL: blank edit went through';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.edit_send(sid, repeat('x', 201));
    raise exception 'FAIL: long edit went through';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  execute 'reset role';
  select question into q from public.sends where id = sid;
  if q <> 'Did you read a chapter?' then raise exception 'FAIL: edit not saved: %', q; end if;

  -- Pushes: the waiting send push carries the new words; once it went out,
  -- edits buzz again only after 10 minutes.
  select count(*) into n from public.push_queue where send_id = sid;
  if n > 1 then raise exception 'FAIL: an edit queued a second push before the first went out'; end if;
  if n = 1 then
    select body into q from public.push_queue where send_id = sid;
    if q not like '%chapter%' then raise exception 'FAIL: waiting push kept the old words: %', q; end if;
    update public.push_queue set sent_at = now() where send_id = sid;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.edit_send(sid, 'Did you read two chapters?');
    execute 'reset role';
    select count(*) into n from public.push_queue where send_id = sid;
    if n <> 1 then raise exception 'FAIL: an edit within 10 minutes buzzed again'; end if;
    update public.push_queue set made_at = now() - interval '11 minutes' where send_id = sid;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.edit_send(sid, 'Did you read a chapter?');
    execute 'reset role';
    select count(*) into n from public.push_queue where send_id = sid;
    if n <> 2 then raise exception 'FAIL: an edit after 10 minutes did not buzz'; end if;
  end if;

  -- A parent can rename the family but not change its join code.
  declare
    fid uuid;
  begin
    insert into public.families (name, code, made_by) values ('Fam', 'T' || left(md5(a::text), 7), a) returning id into fid;
    insert into public.family_members (family_id, user_id, role) values (fid, a, 'parent');
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.families set name = 'Home' where id = fid;
    begin
      update public.families set code = 'HACKED1' where id = fid;
      raise exception 'FAIL: a parent changed the join code';
    exception when insufficient_privilege then null;
    end;
    execute 'reset role';
    select name into q from public.families where id = fid;
    if q <> 'Home' then raise exception 'FAIL: parent rename did not save'; end if;
  end;

  -- Bea can not edit it, and once she answers, Ann can not either.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.edit_send(sid, 'Did you nap?') then raise exception 'FAIL: recipient edited'; end if;
  execute 'reset role';
  update public.sends set state = 'kept' where id = sid;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.edit_send(sid, 'Did you nap?') then raise exception 'FAIL: edited after an answer'; end if;
  execute 'reset role';

  raise exception 'SQL TESTS PASSED';
end;
$$;
