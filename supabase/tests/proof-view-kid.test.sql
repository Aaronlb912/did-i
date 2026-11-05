begin;
do $$
begin
  if position('shares_family_of' in (select prosrc from pg_proc where proname = 'can_see_proof')) = 0 then
    raise exception 'can_see_proof does not check kid family';
  end if;
  raise exception 'SQL TESTS PASSED';
end
$$;
rollback;
