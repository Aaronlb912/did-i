-- Wearing a coin look or coin frame needs owning it. The guard only checked
-- gem items, so a direct write to profiles.look_on / frame_on could put on a
-- coin item nobody bought, and friends saw it. Apply after readthrough-7.sql.
-- Full body from readthrough-7.sql, with the coin checks added.
-- Full body from readthrough-6.sql otherwise.
create or replace function public.guard_profile_wallet()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  own jsonb;
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
    new.friend_cheers := 0;
    if exists (select 1 from public.profiles p where p.user_id = new.user_id) then
      return new;
    end if;
  else
    new.gem_balance := old.gem_balance;
    new.coin_balance := old.coin_balance;
    new.gem_week := old.gem_week;
    new.coin_cosmetics := old.coin_cosmetics;
    new.gem_cosmetics := old.gem_cosmetics;
    new.friend_cheers := old.friend_cheers;
  end if;

  own := public.gem_owned_normalize(new.gem_cosmetics);

  if (tg_op = 'INSERT' or new.look_on is distinct from old.look_on)
    and exists (select 1 from public.gift_catalog c
      where c.kind = 'look' and c.item_id = new.look_on and c.gems > 0)
    and not own->'looks' @> jsonb_build_array(new.look_on)
    and not coalesce(new.coin_cosmetics->'looks', '[]'::jsonb) @> jsonb_build_array(new.look_on) then
    new.look_on := case when tg_op = 'INSERT' then 'lime' else old.look_on end;
  end if;

  if (tg_op = 'INSERT' or new.buddy_on is distinct from old.buddy_on)
    and exists (select 1 from public.gift_catalog c
      where c.kind = 'buddy' and c.item_id = new.buddy_on and c.gems > 0)
    and not own->'buddies' @> jsonb_build_array(new.buddy_on) then
    new.buddy_on := case when tg_op = 'INSERT' then '' else old.buddy_on end;
  end if;

  if (tg_op = 'INSERT' or new.look_on is distinct from old.look_on)
    and exists (select 1 from public.shop_catalog s
      where s.kind = 'look' and s.item_id = new.look_on)
    and not coalesce(new.coin_cosmetics->'looks', '[]'::jsonb) @> jsonb_build_array(new.look_on)
    and not own->'looks' @> jsonb_build_array(new.look_on) then
    new.look_on := case when tg_op = 'INSERT' then 'lime' else old.look_on end;
  end if;

  if (tg_op = 'INSERT' or new.frame_on is distinct from old.frame_on)
    and exists (select 1 from public.shop_catalog s
      where s.kind = 'frame' and s.item_id = new.frame_on and s.coins > 0)
    and not coalesce(new.coin_cosmetics->'frames', '[]'::jsonb) @> jsonb_build_array(new.frame_on)
    and not own->'frames' @> jsonb_build_array(new.frame_on) then
    new.frame_on := case when tg_op = 'INSERT' then '' else old.frame_on end;
  end if;

  if (tg_op = 'INSERT' or new.frame_on is distinct from old.frame_on)
    and exists (select 1 from public.shop_catalog s
      where s.kind = 'frame' and s.item_id = new.frame_on and s.gems > 0)
    and not own->'frames' @> jsonb_build_array(new.frame_on) then
    new.frame_on := case when tg_op = 'INSERT' then '' else old.frame_on end;
  end if;

  return new;
end;
$$;
