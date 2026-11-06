-- Did I: a refund Apple reverses gives the gems back. Safe to run again.
-- Run after refunds.sql. New file at the end of the order, so it can be
-- applied on its own.
--
-- functions/apple-notify gets REFUND_REVERSED, asks Apple again (no
-- revocationDate on the transaction), then calls this. It undoes
-- refund_gem_purchase:
--   - refunded before it was claimed: back to unclaimed, claim_gem_purchases
--     pays it (and keeps its room check)
--   - claimed: the gems taken come back. That is the pack's gems minus what
--     is still owed, which is what refund_gem_purchase took plus whatever
--     pay_gem_debt has taken since. gems_owed goes to 0 first, so the debt
--     trigger does not take the same gems twice.

-- 'none' (not ours), 'active' (not refunded), 'unclaimed' or 'restored'.
create or replace function public.unrefund_gem_purchase(from_store text, ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  buy public.gem_purchases%rowtype;
  give integer;
begin
  select * into buy from public.gem_purchases
  where store = from_store and store_ref = ref
  for update;
  if not found then
    return 'none';
  end if;
  if buy.refunded_at is null then
    return 'active';
  end if;
  if buy.claimed_at is not distinct from buy.refunded_at then
    -- refund_gem_purchase stamps both together when the pack was never claimed.
    update public.gem_purchases set refunded_at = null, claimed_at = null where id = buy.id;
    return 'unclaimed';
  end if;
  give := greatest(buy.gems - buy.gems_owed, 0);
  update public.gem_purchases set refunded_at = null, gems_owed = 0 where id = buy.id;
  if give > 0 then
    update public.profiles
    set gem_balance = least(gem_balance + give, 999999)
    where user_id = buy.user_id;
  end if;
  return 'restored';
end;
$$;

revoke all on function public.unrefund_gem_purchase(text, text) from public, anon, authenticated;
grant execute on function public.unrefund_gem_purchase(text, text) to service_role;

notify pgrst, 'reload schema';
