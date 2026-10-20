-- A non-parent cannot move their own family question onto someone else.
do $$
declare
  kid uuid := gen_random_uuid();
  sib uuid := gen_random_uuid();
  fam uuid;
  q uuid;
  tag uuid;
  n integer;
begin
  insert into auth.users (id, email, aud, role) values
    (kid, kid || '@test.invalid', 'authenticated', 'authenticated'),
    (sib, sib || '@test.invalid', 'authenticated', 'authenticated');
  insert into public.families (name, code, made_by) values ('Test', public.new_family_code(), kid) returning id into fam;
  insert into public.family_tags (family_id) values (fam) returning id into tag;
  insert into public.family_members (family_id, user_id, role) values (fam, kid, 'kid'), (fam, sib, 'kid')
  on conflict do nothing;

  perform set_config('request.jwt.claims', json_build_object('sub', kid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.family_lamps (family_id, tag_id, made_by, for_id, question) values (fam, tag, kid, kid, 'Read?') returning id into q;
  update public.family_lamps set question = 'Read a book?' where id = q;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: kid could not edit own question'; end if;
  begin
    update public.family_lamps set for_id = sib where id = q;
    raise exception 'FAIL: kid moved a question onto a sibling';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  raise exception 'SQL TESTS PASSED';
end $$;
