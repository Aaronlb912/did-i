-- Coins, coin looks and accessories earned while signed out carry to the
-- account once, at first sign-in. Capped at 300 coins of total value.
-- The row in signin_carries is the lock: a second call inserts nothing.
-- Runs as the owner, so guard_profile_wallet lets the balance change.
create table if not exists public.signin_carries (
  user_id uuid primary key references auth.users on delete cascade,
  coins integer not null default 0,
  items jsonb not null default '[]',
  made_at timestamptz not null default now()
);

alter table public.signin_carries drop constraint if exists signin_carries_items_size;
alter table public.signin_carries add constraint signin_carries_items_size check (octet_length(items::text) <= 4096);

alter table public.signin_carries enable row level security;

drop policy if exists "signin_carries select own" on public.signin_carries;
create policy "signin_carries select own" on public.signin_carries
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.signin_carries from public;
revoke all on public.signin_carries from anon;
revoke all on public.signin_carries from authenticated;
grant select on public.signin_carries to authenticated;

drop function if exists public.carry_signed_out(integer, text[], text[]);

create function public.carry_signed_out(add_coins integer, looks text[], accessories text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  who uuid := (select auth.uid());
  budget integer := 300;
  want integer := greatest(0, least(coalesce(add_coins, 0), 300));
  got integer;
  rec record;
  cos jsonb;
  lk jsonb;
  ac jsonb;
  granted jsonb := '[]'::jsonb;
begin
  if who is null then
    return jsonb_build_object('carried', false);
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;

  insert into public.signin_carries (user_id) values (who) on conflict (user_id) do nothing;
  get diagnostics got = row_count;
  if got < 1 then
    return public.read_coin_catalog() || jsonb_build_object('carried', false);
  end if;

  select public.coin_catalog_normalize(coin_cosmetics) into cos
  from public.profiles where user_id = who for update;
  lk := cos->'looks';
  ac := cos->'accessories';

  for rec in
    select c.kind, c.item_id, case c.kind when 'look' then 30 else c.coins end as price
    from public.shop_catalog c
    where (c.kind = 'look' and c.gems is null and c.item_id = any (carry_signed_out.looks[1:50]))
       or (c.kind = 'accessory' and c.gems is null and c.item_id = any (carry_signed_out.accessories[1:50]))
    order by case c.kind when 'look' then 30 else c.coins end, c.item_id
  loop
    if rec.price is null or rec.price < 1 or rec.price > budget then continue; end if;
    if not public.shop_item_live(rec.kind, rec.item_id) then continue; end if;
    if rec.kind = 'look' then
      if lk @> jsonb_build_array(rec.item_id) then continue; end if;
      lk := lk || to_jsonb(rec.item_id);
    else
      if ac @> jsonb_build_array(rec.item_id) then continue; end if;
      ac := ac || to_jsonb(rec.item_id);
    end if;
    budget := budget - rec.price;
    granted := granted || to_jsonb(rec.kind || ':' || rec.item_id);
  end loop;

  want := least(want, budget);

  update public.profiles
  set coin_balance = least(coin_balance + want, 999999),
      coin_cosmetics = jsonb_build_object(
        'stamps', cos->'stamps', 'badges', cos->'badges', 'looks', lk,
        'cheer_stages', cos->'cheer_stages', 'accessories', ac, 'frames', cos->'frames'
      )
  where user_id = who;

  update public.signin_carries set coins = want, items = granted where user_id = who;

  return public.read_coin_catalog() || jsonb_build_object('carried', true);
end;
$$;

revoke all on function public.carry_signed_out(integer, text[], text[]) from public;
revoke all on function public.carry_signed_out(integer, text[], text[]) from anon;
grant execute on function public.carry_signed_out(integer, text[], text[]) to authenticated;
