-- New family codes are 10 characters from the safe alphabet.
do $$
declare
  code text := public.new_family_code();
begin
  if length(code) <> 10 then raise exception 'FAIL: family code is % long', length(code); end if;
  if code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$' then raise exception 'FAIL: bad characters in %', code; end if;
  raise exception 'SQL TESTS PASSED';
end $$;
