-- rotate_family_code also clears its own log rows older than a day. The five a
-- day limit only reads the last day, so older rows were dead weight.
-- Runs after turns-and-code.sql (and after proof-photos.sql when that exists).

create or replace function public.rotate_family_code(fam uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  fresh text;
begin
  if (select auth.uid()) is null or not public.is_parent(fam) then
    raise exception 'parents only';
  end if;
  perform 1 from public.families where id = fam for update;
  delete from public.family_code_rotations r
  where r.family_id = fam and r.made_at <= now() - interval '1 day';
  if (select count(*) from public.family_code_rotations r
      where r.family_id = fam and r.made_at > now() - interval '1 day') >= 5 then
    raise exception 'too many new codes';
  end if;
  fresh := public.new_family_code();
  update public.families set code = fresh where id = fam;
  insert into public.family_code_rotations (family_id) values (fam);
  return fresh;
end;
$$;

revoke all on function public.rotate_family_code(uuid) from public, anon;
grant execute on function public.rotate_family_code(uuid) to authenticated;
