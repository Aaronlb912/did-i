-- Two first-of-day credits at once: both used to miss the grant row and both
-- insert it, so one failed and its coins were lost. Insert first, then lock.
create or replace function public.credit_night_coins(night_iso text, add_coins integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  iso text := left(btrim(coalesce(night_iso, '')), 10);
  add integer := greatest(0, least(6, coalesce(add_coins, 0)));
  had integer;
  room integer;
  bal integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  -- Only tonight or the night before in any time zone, or a caller could walk
  -- back through every past date and collect coins for each.
  if iso !~ '^\d{4}-\d{2}-\d{2}$' or add < 1
     or iso::date < current_date - 2 or iso::date > current_date + 1 then
    return coalesce((select coin_balance from public.profiles where user_id = who), 0);
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
  insert into public.coin_night_grants (user_id, night_iso, coins) values (who, iso, 0)
  on conflict (user_id, night_iso) do nothing;

  -- g.night_iso, not night_iso: the parameter has the same name as the column.
  select coalesce(g.coins, 0) into had
  from public.coin_night_grants g
  where g.user_id = who and g.night_iso = iso
  for update;

  had := coalesce(had, 0);

  room := greatest(0, 6 - had);
  add := least(add, room);
  if add < 1 then
    return coalesce((select coin_balance from public.profiles where user_id = who), 0);
  end if;

  update public.coin_night_grants g set coins = had + add where g.user_id = who and g.night_iso = iso;
  update public.profiles
  set coin_balance = least(coin_balance + add, 9999)
  where user_id = who
  returning coin_balance into bal;

  return bal;
end;
$$;

revoke all on function public.credit_night_coins(text, integer) from public;
revoke all on function public.credit_night_coins(text, integer) from anon;
grant execute on function public.credit_night_coins(text, integer) to authenticated;
