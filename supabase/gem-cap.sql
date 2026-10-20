-- A pack that would push the balance past 9999 used to be marked claimed and
-- its extra gems dropped: paid for, never given. Now a pack is only claimed
-- while it fits; the rest waits until gems are spent. Replaces refunds.sql.

create or replace function public.claim_gem_purchases()
returns table (gems integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  got integer := 0;
  room integer;
  pack record;
  owe record;
  paid integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  -- Gems owed from a refund come off first, so they make room too.
  select 9999 - p.gem_balance + coalesce((
    select sum(g.gems_owed) from public.gem_purchases g where g.user_id = who and g.gems_owed > 0
  ), 0)::integer
  into room
  from public.profiles p where p.user_id = who
  for update;
  if room is null then
    return;
  end if;

  for pack in
    select g.id, g.gems from public.gem_purchases g
    where g.user_id = who and g.claimed_at is null and g.refunded_at is null
    order by g.made_at
    for update skip locked
  loop
    continue when got + pack.gems > room;
    update public.gem_purchases set claimed_at = now() where id = pack.id;
    got := got + pack.gems;
  end loop;

  if got < 1 then
    return;
  end if;

  for owe in
    select id, gems_owed from public.gem_purchases
    where user_id = who and gems_owed > 0
    order by refunded_at
    for update
  loop
    exit when got < 1;
    paid := least(got, owe.gems_owed);
    update public.gem_purchases set gems_owed = gems_owed - paid where id = owe.id;
    got := got - paid;
  end loop;

  if got < 1 then
    return;
  end if;

  update public.profiles
  set gem_balance = least(gem_balance + got, 9999)
  where user_id = who;

  return query select got;
end;
$$;

revoke all on function public.claim_gem_purchases() from public, anon;
grant execute on function public.claim_gem_purchases() to authenticated;
