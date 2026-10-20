-- New family codes are 10 characters (32^10, so a code can't be guessed in
-- the daily wrong-code limit). Apps from 1.3.8 take 6 or 10; older families
-- keep their 6-character codes, and joining by either still works.
create or replace function public.new_family_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  -- No I, O, 0, or 1. Someone is going to read this out loud.
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  try text;
  n integer := 0;
begin
  loop
    try := '';
    for i in 1..10 loop
      try := try || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where code = try);
    n := n + 1;
    if n > 40 then
      raise exception 'could not find a free code';
    end if;
  end loop;
  return try;
end;
$$;
