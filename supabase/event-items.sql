-- Free event items (Halloween 2026: the bat buddy and the boo cheer;
-- Thanksgiving 2026: the turkey buddy and the wishbone cheer; the
-- Product Hunt rocket buddy, which is claimed from a link and is not in the shop).
-- An item listed in event_catalog can be claimed for free while its window is
-- open (the same day of slack each way as paid drops). Owners keep it forever.
-- Mirrors `free: true` items in src/lib/purse.js. Runs just before drop-tonight.sql in db:apply:all.
-- Safe to run again.

create table if not exists public.event_catalog (
  kind text not null check (kind in ('buddy', 'cheer')),
  item_id text not null check (char_length(item_id) between 1 and 40),
  live_from date not null,
  live_until date not null check (live_until > live_from),
  primary key (kind, item_id)
);
alter table public.event_catalog enable row level security;
drop policy if exists event_catalog_read on public.event_catalog;
create policy event_catalog_read on public.event_catalog
  for select to authenticated using (true);
revoke all on public.event_catalog from anon, authenticated;
grant select on public.event_catalog to authenticated;

insert into public.event_catalog (kind, item_id, live_from, live_until) values
  ('buddy', 'bat', '2026-10-28', '2026-11-01'),
  ('cheer', 'boo', '2026-10-28', '2026-11-01'),
  ('buddy', 'turkey', '2026-11-23', '2026-11-27'),
  ('cheer', 'wishbone', '2026-11-23', '2026-11-27'),
  ('buddy', 'rocket', '2026-10-27', '2027-01-01')
on conflict (kind, item_id) do nothing;

-- Its coin stages stay on sale for the people who own it, so no live_until.
insert into public.shop_catalog (kind, item_id, live_from) values
  ('cheer_stage', 'boo', '2026-10-28'),
  ('cheer_stage', 'wishbone', '2026-11-23')
on conflict (kind, item_id) do update set live_from = excluded.live_from;

-- Adds a free event item to your list. Claiming again changes nothing.
-- Returns the owned lists and gem balance, the same shape as buy_with_gems.
create or replace function public.claim_free_item(p_kind text, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  k text := lower(btrim(coalesce(p_kind, '')));
  id text := lower(btrim(coalesce(p_item_id, '')));
  list text;
  row public.profiles;
  owned jsonb;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  list := case k when 'cheer' then 'cheers' when 'buddy' then 'buddies' end;
  if list is null or not exists (
    select 1 from public.event_catalog e
    where e.kind = k and e.item_id = id
      and public.shop_window_live(e.kind, e.live_from, e.live_until, (timezone('utc', now()))::date)
  ) then
    raise exception 'bad item';
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
  select * into row from public.profiles where user_id = who for update;
  owned := public.gem_owned_add(public.gem_owned_normalize(row.gem_cosmetics), list, id);
  update public.profiles set gem_cosmetics = owned where user_id = who
  returning * into row;
  return owned || jsonb_build_object('gems', row.gem_balance);
end;
$$;

revoke all on function public.claim_free_item(text, text) from public, anon;
grant execute on function public.claim_free_item(text, text) to authenticated;
