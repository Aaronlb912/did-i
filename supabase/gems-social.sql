-- Did I, part nine. Gem spends that reach other people.
-- Run after dit-board.sql.

-- A cheer attached to a send, or a gift waiting to be claimed.
alter table public.sends
  add column if not exists cheer_id text not null default '';

alter table public.sends drop constraint if exists sends_cheer_len;
alter table public.sends add constraint sends_cheer_len
  check (length(cheer_id) <= 20);

create table if not exists public.cheer_gifts (
  id uuid primary key default gen_random_uuid(),
  to_id uuid not null references auth.users on delete cascade,
  from_id uuid not null references auth.users on delete cascade,
  cheer_id text not null,
  made_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint cheer_gifts_not_self check (from_id <> to_id)
);

alter table public.cheer_gifts drop constraint if exists cheer_gifts_id_len;
alter table public.cheer_gifts add constraint cheer_gifts_id_len
  check (length(btrim(cheer_id)) between 1 and 20);

create index if not exists cheer_gifts_to_idx
  on public.cheer_gifts (to_id, claimed_at nulls first);

create index if not exists cheer_gifts_from_idx
  on public.cheer_gifts (from_id);

alter table public.cheer_gifts enable row level security;
revoke all on public.cheer_gifts from anon;

drop policy if exists "see my cheer gifts" on public.cheer_gifts;
create policy "see my cheer gifts" on public.cheer_gifts
  for select using ((select auth.uid()) in (to_id, from_id));

-- Five gifts a day in, so nobody can spam unlocks.
create or replace function public.cap_cheer_gifts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.cheer_gifts
      where to_id = new.to_id and made_at > now() - interval '1 day') >= 5 then
    raise exception 'gift cap';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_cheer_gifts on public.cheer_gifts;
create trigger cap_cheer_gifts
  before insert on public.cheer_gifts
  for each row execute function public.cap_cheer_gifts();

-- Gift a cheer you already own. Gems are spent on the phone first.
create or replace function public.gift_cheer(other uuid, want text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  cid text := left(btrim(coalesce(want, '')), 20);
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other = who or length(cid) < 1 then
    return;
  end if;
  if public.blocked_with(other) then
    return;
  end if;
  if not public.are_friends(other) then
    raise exception 'not friends';
  end if;
  insert into public.cheer_gifts (to_id, from_id, cheer_id)
  values (other, who, cid);
end;
$$;

revoke all on function public.gift_cheer(uuid, text) from public;
revoke all on function public.gift_cheer(uuid, text) from anon;
grant execute on function public.gift_cheer(uuid, text) to authenticated;

-- Pull gifts into the collection. Returns ids to merge locally.
create or replace function public.claim_cheer_gifts()
returns table (cheer_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  return query
    update public.cheer_gifts g
    set claimed_at = now()
    where g.to_id = who and g.claimed_at is null
    returning g.cheer_id;
end;
$$;

revoke all on function public.claim_cheer_gifts() from public;
revoke all on function public.claim_cheer_gifts() from anon;
grant execute on function public.claim_cheer_gifts() to authenticated;

notify pgrst, 'reload schema';
