-- Readthrough 10. Apply after readthrough-9.sql, before drop-tonight.sql
-- (scripts/apply-all-sql.mjs). Safe to run again: a full recreate of the
-- latest body (wallet.sql) with one change.

-- 1. Coins: the night window. The client only sends tonight or last night
-- in the phone's own time zone (src/lib/purse.js returnEarnedCoins; DAY_FOLD
-- is 0, so tonight is the local date). The old window was UTC current_date
-- -2 .. +1, wide enough for any zone, so one caller could fill four nights'
-- caps at once. With a known zone (profiles.zone, pushed by cloud-sync) the
-- window is now that zone's yesterday .. today. With no zone or a bad one it
-- stays the wide UTC window, since a plain UTC yesterday .. today would refuse
-- a real night for anyone far from UTC (UTC+10 at 08:00 is still yesterday in
-- UTC; UTC-10 at 20:00 is already tomorrow).
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
  tz text;
  today date;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  select p.zone into tz from public.profiles p where p.user_id = who;
  if tz <> '' and tz in (select name from pg_timezone_names) then
    today := (now() at time zone tz)::date;
  end if;
  -- Only tonight or the night before, or a caller could walk back through
  -- every past date and collect coins for each.
  if iso !~ '^\d{4}-\d{2}-\d{2}$' or add < 1
     or (today is not null and (iso::date < today - 1 or iso::date > today))
     or (today is null and (iso::date < current_date - 2 or iso::date > current_date + 1)) then
    return coalesce((select coin_balance from public.profiles where user_id = who), 0);
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;

  -- g.night_iso, not night_iso: the parameter has the same name as the column.
  select coalesce(g.coins, 0) into had
  from public.coin_night_grants g
  where g.user_id = who and g.night_iso = iso
  for update;

  if had is null then
    had := 0;
    insert into public.coin_night_grants (user_id, night_iso, coins) values (who, iso, 0);
  end if;

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
