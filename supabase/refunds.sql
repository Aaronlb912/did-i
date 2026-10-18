-- Did I: a refunded gem pack takes its gems back. Safe to run again.
-- Run after wallet.sql and readthrough-6.sql (it replaces claim_gem_purchases).
--
-- The store tells us (functions/apple-notify for Apple, functions/play-voided
-- for Google); either one asks the store again before calling
-- refund_gem_purchase, so a forged notice does nothing. Gems not yet claimed
-- are never paid. Claimed gems come off the balance; what was already spent
-- is owed and comes off the next packs claimed.

alter table public.gem_purchases add column if not exists refunded_at timestamptz;
alter table public.gem_purchases add column if not exists gems_owed integer not null default 0;
-- When apple-notify last asked Apple about this buy: one check per 15 minutes,
-- so forged notices for a real transaction id cannot make us call Apple in a loop.
alter table public.gem_purchases add column if not exists store_checked_at timestamptz;
alter table public.gem_purchases drop constraint if exists gem_purchases_owed_rng;
alter table public.gem_purchases add constraint gem_purchases_owed_rng check (gems_owed between 0 and 100);

create index if not exists gem_purchases_owed_idx
  on public.gem_purchases (user_id) where gems_owed > 0;

-- 'none' (not ours), 'already', 'unclaimed' (never paid) or 'taken'.
create or replace function public.refund_gem_purchase(from_store text, ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  buy public.gem_purchases%rowtype;
  bal integer;
  take integer;
begin
  select * into buy from public.gem_purchases
  where store = from_store and store_ref = ref
  for update;
  if not found then
    return 'none';
  end if;
  if buy.refunded_at is not null then
    return 'already';
  end if;
  if buy.claimed_at is null then
    -- Marked claimed too, so claim_gem_purchases never pays it.
    update public.gem_purchases set refunded_at = now(), claimed_at = now() where id = buy.id;
    return 'unclaimed';
  end if;
  select coalesce(gem_balance, 0) into bal from public.profiles where user_id = buy.user_id for update;
  take := least(coalesce(bal, 0), buy.gems);
  update public.profiles set gem_balance = gem_balance - take where user_id = buy.user_id;
  update public.gem_purchases set refunded_at = now(), gems_owed = buy.gems - take where id = buy.id;
  return 'taken';
end;
$$;

revoke all on function public.refund_gem_purchase(text, text) from public, anon, authenticated;
grant execute on function public.refund_gem_purchase(text, text) to service_role;

-- From readthrough-6.sql, plus: refunded packs are never paid, and gems owed
-- from a refund come off what is paid now.
create or replace function public.claim_gem_purchases()
returns table (gems integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  got integer;
  owe record;
  paid integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  with took as (
    update public.gem_purchases g
    set claimed_at = now()
    where g.user_id = who and g.claimed_at is null and g.refunded_at is null
    returning g.gems
  )
  select coalesce(sum(t.gems), 0)::integer into got from took t;

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

-- Gems owed from a refund come off every gem that lands, not only new packs:
-- the weekly gem, a gift sent back, invite rewards. Without this, spending or
-- gifting the gems before refunding kept them. Runs after guard_profile_wallet
-- (trigger names sort), so it sees the balance the server really set.
create or replace function public.pay_gem_debt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gain integer := coalesce(new.gem_balance, 0) - coalesce(old.gem_balance, 0);
  owe record;
  paid integer;
begin
  if gain < 1 then
    return new;
  end if;
  for owe in
    select id, gems_owed from public.gem_purchases
    where user_id = new.user_id and gems_owed > 0
    order by refunded_at
    for update
  loop
    exit when gain < 1;
    paid := least(gain, owe.gems_owed);
    update public.gem_purchases set gems_owed = gems_owed - paid where id = owe.id;
    gain := gain - paid;
    new.gem_balance := new.gem_balance - paid;
  end loop;
  return new;
end;
$$;

revoke all on function public.pay_gem_debt() from public, anon, authenticated;

drop trigger if exists pay_gem_debt on public.profiles;
create trigger pay_gem_debt
  before update of gem_balance on public.profiles
  for each row execute function public.pay_gem_debt();

-- From gem-purchases.sql, plus: a buy already recorded is a repeat (the phone
-- was closed before it finished the transaction), not a new pack. It never
-- counts against the 20 a day, or the phone could not finish it for a day.
create or replace function public.cap_gem_purchases()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.gem_purchases g where g.store = new.store and g.store_ref = new.store_ref) then
    return new;
  end if;
  if (select count(*) from public.gem_purchases
      where user_id = new.user_id and made_at > now() - interval '1 day') >= 20 then
    raise exception 'gem purchase cap';
  end if;
  return new;
end;
$$;

-- Google has no refund push without Pub/Sub, so play-voided reads its list of
-- voided buys every hour.
select cron.unschedule('play-voided') where exists (select 1 from cron.job where jobname = 'play-voided');
select cron.schedule('play-voided', '17 * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/play-voided',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url');
$cron$);

notify pgrst, 'reload schema';
