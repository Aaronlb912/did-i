-- One-time coins for finishing the in-app tour.
-- Basics pays 20 and More pays 30, once per account per part.
-- The row in tour_claims is the lock: a second call inserts nothing and pays 0.
-- Like credit_night_coins, this runs as the owner, so guard_profile_wallet
-- (which only limits authenticated and anon) lets the balance change.
create table if not exists public.tour_claims (
  user_id uuid not null references auth.users on delete cascade,
  part text not null check (part in ('basics', 'more')),
  made_at timestamptz not null default now(),
  primary key (user_id, part)
);

alter table public.tour_claims enable row level security;

drop policy if exists "tour_claims select own" on public.tour_claims;
create policy "tour_claims select own" on public.tour_claims
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.tour_claims from public;
revoke all on public.tour_claims from anon;
revoke all on public.tour_claims from authenticated;
grant select on public.tour_claims to authenticated;

drop function if exists public.claim_tour_coins(text);

create function public.claim_tour_coins(part text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  who uuid := (select auth.uid());
  pay integer;
  got integer;
  bal integer;
begin
  if who is null then
    return jsonb_build_object('paid', 0, 'balance', 0);
  end if;
  pay := case claim_tour_coins.part when 'basics' then 20 when 'more' then 30 else 0 end;
  if pay < 1 then
    return jsonb_build_object('paid', 0, 'balance', coalesce((select coin_balance from public.profiles where user_id = who), 0));
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;

  insert into public.tour_claims (user_id, part) values (who, claim_tour_coins.part)
  on conflict (user_id, part) do nothing;
  get diagnostics got = row_count;
  if got < 1 then
    return jsonb_build_object('paid', 0, 'balance', coalesce((select coin_balance from public.profiles where user_id = who), 0));
  end if;

  update public.profiles
  set coin_balance = least(coin_balance + pay, 999999)
  where user_id = who
  returning coin_balance into bal;

  return jsonb_build_object('paid', pay, 'balance', bal);
end;
$$;

revoke all on function public.claim_tour_coins(text) from public;
revoke all on function public.claim_tour_coins(text) from anon;
grant execute on function public.claim_tour_coins(text) to authenticated;
