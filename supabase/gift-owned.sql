-- No gift for something they already have. send_gift refuses with
-- 'already owned' before anything is paid. Owned means bought, earned or a
-- claimed gift (on the profile), or the same gift already waiting unopened.
-- Cheers are one-time unlocks (gem_cosmetics.cheers), so they count too.
-- Same rule claim_gifts uses for "had" (readthrough-12.sql).
-- Apply after readthrough-8.sql.

create or replace function public.owns_item(person uuid, p_kind text, p_item_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case p_kind
      when 'look' then public.coin_catalog_normalize(p.coin_cosmetics)->'looks' @> jsonb_build_array(p_item_id)
        or public.gem_owned_normalize(p.gem_cosmetics)->'looks' @> jsonb_build_array(p_item_id)
      when 'accessory' then public.coin_catalog_normalize(p.coin_cosmetics)->'accessories' @> jsonb_build_array(p_item_id)
      when 'cheer' then public.gem_owned_normalize(p.gem_cosmetics)->'cheers' @> jsonb_build_array(p_item_id)
      when 'buddy' then public.gem_owned_normalize(p.gem_cosmetics)->'buddies' @> jsonb_build_array(p_item_id)
      when 'frame' then public.gem_owned_normalize(p.gem_cosmetics)->'frames' @> jsonb_build_array(p_item_id)
      else false
    end
    from public.profiles p where p.user_id = person
  ), false)
  -- cheer_gifts_to_idx (to_id, claimed_at) covers this.
  or exists (
    select 1 from public.cheer_gifts g
    where g.to_id = person and g.claimed_at is null and g.returned_at is null
      and g.kind = p_kind and g.cheer_id = p_item_id
  );
$$;

-- Only send_gift calls it; nobody may probe what someone else owns.
revoke all on function public.owns_item(uuid, text, text) from public, anon, authenticated;

-- Full body from readthrough-8.sql plus the owned check.
create or replace function public.send_gift(other uuid, p_kind text, p_item_id text, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  k text := lower(btrim(coalesce(p_kind, '')));
  id text := lower(btrim(coalesce(p_item_id, '')));
  say text := left(btrim(coalesce(p_note, '')), 60);
  price public.gift_catalog;
  row public.profiles;
  name text;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who then
    raise exception 'bad person';
  end if;
  if public.blocked_with(other) then
    raise exception 'not friends';
  end if;
  if not (public.are_friends(other) or public.share_family(other)) then
    raise exception 'not friends';
  end if;

  if k = 'frame' then
    -- Gem frames only, priced in shop_catalog. Coin, earned, seasonal and
    -- free frames are never gifts.
    select 'frame', s.item_id, s.gems, 0, s.live_from, null::date into price
    from public.shop_catalog s
    where s.kind = 'frame' and s.item_id = id and s.gems > 0 and public.shop_item_live('frame', id);
  else
    select * into price from public.gift_catalog c
    where c.kind = k and c.item_id = id
      and public.shop_window_live(c.kind, c.live_from, c.live_until, (timezone('utc', now()))::date);
  end if;
  if price is null then
    raise exception 'bad item';
  end if;

  select * into row from public.profiles where user_id = who for update;
  if row is null then
    raise exception 'need gems';
  end if;

  -- Checked after the giver's lock so two sends of the same item queue here.
  if public.owns_item(other, k, id) then
    raise exception 'already owned';
  end if;

  if row.gem_balance < price.gems then
    raise exception 'need gems';
  end if;
  if row.coin_balance < price.coins then
    raise exception 'need coins';
  end if;

  -- Insert first, so the caps raise before anything is paid.
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, note, gems, coins)
  values (other, who, id, k, say, price.gems, price.coins);

  update public.profiles
  set gem_balance = gem_balance - price.gems,
      coin_balance = coin_balance - price.coins
  where user_id = who
  returning * into row;

  select coalesce(nullif(btrim(p.display_name), ''), 'Someone') into name
  from public.profiles p where p.user_id = who;
  if public.push_wanted(other, 'sends') then
    insert into public.push_queue (to_id, title, body, go)
    values (other,
      left(public.push_text(other, 'gift', jsonb_build_object('name', coalesce(name, public.push_text(other, 'someone')))), 80),
      public.push_text(other, 'open'), '/tonight');
  end if;

  return jsonb_build_object('gems', row.gem_balance, 'coins', row.coin_balance);
end;
$$;

revoke all on function public.send_gift(uuid, text, text, text) from public, anon;
grant execute on function public.send_gift(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
