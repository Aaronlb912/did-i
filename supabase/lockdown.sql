-- Security review fixes (2026-09-30). Run last, after gifts.sql.

-- 1. Profiles: read your own row only. Friends and family get names, handles
-- and streaks through known_people(), never the whole row (phone, balances,
-- invite fields, settings).
drop policy if exists "read known profiles" on public.profiles;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using ((select auth.uid()) = user_id);

-- 2. Coin-bought looks and cheer stages only change through buy_with_coins,
-- gem items through buy_with_gems (and gift claims for both). Writing coin_cosmetics straight to your profile row
-- would unlock them for free.
create or replace function public.guard_profile_wallet()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.gem_balance := 0;
    new.coin_balance := 0;
    new.gem_week := '';
    new.coin_cosmetics := '{"stamps":[],"badges":[]}'::jsonb;
    new.gem_cosmetics := '{"looks":[],"cheers":[],"buddies":[]}'::jsonb;
  else
    new.gem_balance := old.gem_balance;
    new.coin_balance := old.coin_balance;
    new.gem_week := old.gem_week;
    new.coin_cosmetics := old.coin_cosmetics;
    new.gem_cosmetics := old.gem_cosmetics;
  end if;
  return new;
end;
$$;

-- 3. Server-only or helper functions nobody should call from the app.
revoke all on function public.sweep_push_queue() from public, anon, authenticated;
revoke all on function public.we_is_done(uuid, date) from public, anon, authenticated;
revoke all on function public.we_turn(uuid, date) from public, anon, authenticated;
revoke all on function public.we_counts(uuid[]) from public, anon;
grant execute on function public.we_counts(uuid[]) to authenticated;

-- 4. Catalogs are read-only for everyone.
revoke all on public.shop_catalog from anon, authenticated;
revoke all on public.gift_catalog from anon, authenticated;
grant select on public.shop_catalog to authenticated;
grant select on public.gift_catalog to authenticated;

notify pgrst, 'reload schema';
