-- Did I, part ten. Real-money gem packs, credited after the store confirms.
-- Run after gems-social.sql.

create table if not exists public.gem_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  pack_id text not null,
  gems integer not null,
  cents integer not null,
  store text not null,
  store_ref text not null,
  made_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint gem_purchases_gems check (gems between 1 and 50),
  constraint gem_purchases_cents check (cents between 50 and 50000),
  constraint gem_purchases_store_len check (length(store) between 2 and 16),
  constraint gem_purchases_pack_len check (length(pack_id) between 3 and 24),
  constraint gem_purchases_ref_len check (length(store_ref) between 8 and 128)
);

create unique index if not exists gem_purchases_store_ref_key
  on public.gem_purchases (store, store_ref);

create index if not exists gem_purchases_user_claim_idx
  on public.gem_purchases (user_id, claimed_at nulls first);

alter table public.gem_purchases enable row level security;
revoke all on public.gem_purchases from anon;

drop policy if exists "see my gem purchases" on public.gem_purchases;
create policy "see my gem purchases" on public.gem_purchases
  for select using ((select auth.uid()) = user_id);

-- Twenty packs a day is plenty. Stops a runaway webhook.
create or replace function public.cap_gem_purchases()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.gem_purchases
      where user_id = new.user_id and made_at > now() - interval '1 day') >= 20 then
    raise exception 'gem purchase cap';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_gem_purchases on public.gem_purchases;
create trigger cap_gem_purchases
  before insert on public.gem_purchases
  for each row execute function public.cap_gem_purchases();

-- Called from gem-iap (store receipt verify) with the service role only.
create or replace function public.record_gem_purchase(
  who uuid,
  pack text,
  gem_count integer,
  paid_cents integer,
  from_store text,
  ref text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if who is null or length(btrim(coalesce(ref, ''))) < 8 then
    return false;
  end if;
  insert into public.gem_purchases (user_id, pack_id, gems, cents, store, store_ref)
  values (
    who,
    left(btrim(pack), 24),
    greatest(1, least(50, coalesce(gem_count, 0))),
    greatest(50, least(50000, coalesce(paid_cents, 0))),
    left(btrim(from_store), 16),
    left(btrim(ref), 128)
  )
  on conflict (store, store_ref) do nothing;
  return true;
end;
$$;

revoke all on function public.record_gem_purchase(uuid, text, integer, integer, text, text) from public;
revoke all on function public.record_gem_purchase(uuid, text, integer, integer, text, text) from anon;
revoke all on function public.record_gem_purchase(uuid, text, integer, integer, text, text) from authenticated;

-- Pulls unclaimed packs into the shelf on the phone.
create or replace function public.claim_gem_purchases()
returns table (gems integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  got integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  select coalesce(sum(g.gems), 0)::integer into got
  from public.gem_purchases g
  where g.user_id = who and g.claimed_at is null;

  if got < 1 then
    return;
  end if;

  update public.gem_purchases g
  set claimed_at = now()
  where g.user_id = who and g.claimed_at is null;

  return query select got;
end;
$$;

revoke all on function public.claim_gem_purchases() from public;
revoke all on function public.claim_gem_purchases() from anon;
grant execute on function public.claim_gem_purchases() to authenticated;

notify pgrst, 'reload schema';
