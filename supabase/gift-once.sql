-- send_gift is safe to retry. The phone makes one request id per send; if the
-- answer is lost and it asks again, the same id returns the current balances
-- and charges nothing. Old builds send no id and behave as before.
-- Full body from gift-owned.sql plus the request id.
-- Apply after signin-carry.sql.

alter table public.cheer_gifts add column if not exists request_id uuid;

create unique index if not exists cheer_gifts_request_once
  on public.cheer_gifts (from_id, request_id)
  where request_id is not null;

drop function if exists public.send_gift(uuid, text, text, text);

create or replace function public.send_gift(other uuid, p_kind text, p_item_id text, p_note text default '', p_request_id uuid default null)
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
  made uuid;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who then
    raise exception 'bad person';
  end if;

  -- Lock the giver first: two calls from one person queue here, so the
  -- request id check below cannot race a second call that is still paying.
  select * into row from public.profiles where user_id = who for update;
  if row is null then
    raise exception 'need gems';
  end if;

  -- A retry of a send that already went: same answer, nothing charged.
  if p_request_id is not null and exists (
    select 1 from public.cheer_gifts g where g.from_id = who and g.request_id = p_request_id
  ) then
    return jsonb_build_object('gems', row.gem_balance, 'coins', row.coin_balance);
  end if;

  if public.blocked_with(other) then
    raise exception 'not friends';
  end if;
  if not (public.are_friends(other) or public.share_family(other)) then
    raise exception 'not friends';
  end if;

  if k = 'frame' then
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

  if public.owns_item(other, k, id) then
    raise exception 'already owned';
  end if;

  if row.gem_balance < price.gems then
    raise exception 'need gems';
  end if;
  if row.coin_balance < price.coins then
    raise exception 'need coins';
  end if;

  -- Insert first, so the caps raise before anything is paid. The unique index
  -- is the backstop: a losing duplicate inserts nothing and pays nothing.
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, note, gems, coins, request_id)
  values (other, who, id, k, say, price.gems, price.coins, p_request_id)
  on conflict (from_id, request_id) where request_id is not null do nothing
  returning cheer_gifts.id into made;
  if made is null then
    return jsonb_build_object('gems', row.gem_balance, 'coins', row.coin_balance);
  end if;

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

revoke all on function public.send_gift(uuid, text, text, text, uuid) from public, anon;
grant execute on function public.send_gift(uuid, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';
