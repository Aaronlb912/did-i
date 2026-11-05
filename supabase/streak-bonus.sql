-- A small gem bonus for a long streak: 1 gem at 30 days, 2 at 100, 3 at 365,
-- once per account per milestone, ever. The row in streak_bonus_claims is the lock: a
-- second call inserts nothing and pays 0.
--
-- There is no server-side streak walk for one person (freezes and every
-- kind of repeat live on the phone). The check uses what the server keeps:
-- profiles.streak, which streak-guard.sql clips to the account's age, and
-- the account's age itself. A made-up streak cannot claim 100 days on an
-- account younger than 99 days, and the most any account can ever get here
-- is 6 gems. Runs as the owner, like claim_tour_coins, so
-- guard_profile_wallet lets the balance change. Run after we-buddy.sql.
create table if not exists public.streak_bonus_claims (
  user_id uuid not null references auth.users on delete cascade,
  days integer not null check (days in (30, 100, 365)),
  made_at timestamptz not null default now(),
  primary key (user_id, days)
);

-- A table made before 365 existed keeps the old check until this runs.
alter table public.streak_bonus_claims drop constraint if exists streak_bonus_claims_days_check;
alter table public.streak_bonus_claims add constraint streak_bonus_claims_days_check check (days in (30, 100, 365));

alter table public.streak_bonus_claims enable row level security;

drop policy if exists "streak_bonus_claims select own" on public.streak_bonus_claims;
create policy "streak_bonus_claims select own" on public.streak_bonus_claims
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.streak_bonus_claims from public, anon, authenticated;
grant select on public.streak_bonus_claims to authenticated;

create or replace function public.claim_streak_bonus(days integer)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  who uuid := (select auth.uid());
  pay integer;
  run integer;
  joined date;
  got integer;
  bal integer;
begin
  if who is null then
    return jsonb_build_object('paid', 0, 'balance', 0);
  end if;
  pay := case claim_streak_bonus.days when 30 then 1 when 100 then 2 when 365 then 3 else 0 end;
  select coalesce(p.streak, 0), p.gem_balance into run, bal from public.profiles p where p.user_id = who;
  select (u.created_at at time zone 'utc')::date into joined from auth.users u where u.id = who;
  if pay < 1
    or coalesce(run, 0) < claim_streak_bonus.days
    or joined is null
    or (current_date - joined) + 1 < claim_streak_bonus.days then
    return jsonb_build_object('paid', 0, 'balance', coalesce(bal, 0));
  end if;

  insert into public.streak_bonus_claims (user_id, days) values (who, claim_streak_bonus.days)
  on conflict (user_id, days) do nothing;
  get diagnostics got = row_count;
  if got < 1 then
    return jsonb_build_object('paid', 0, 'balance', coalesce(bal, 0));
  end if;

  update public.profiles
  set gem_balance = least(gem_balance + pay, 999999)
  where user_id = who
  returning gem_balance into bal;

  return jsonb_build_object('paid', pay, 'balance', bal);
end;
$$;

revoke all on function public.claim_streak_bonus(integer) from public, anon;
grant execute on function public.claim_streak_bonus(integer) to authenticated;
