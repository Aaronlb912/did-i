-- Items the server sells for coins, with the day each one goes on sale.
-- Shop drops (docs/shop-drops.md) add rows here; buy_with_coins (wallet.sql)
-- checks this table instead of a hard-coded list. Run before wallet.sql.

create table if not exists public.shop_catalog (
  kind text not null check (kind in ('look', 'cheer_stage')),
  item_id text not null check (length(item_id) between 1 and 32),
  live_from date not null default '2026-01-01',
  primary key (kind, item_id)
);

alter table public.shop_catalog enable row level security;

drop policy if exists shop_catalog_read on public.shop_catalog;
create policy shop_catalog_read on public.shop_catalog
  for select to authenticated using (true);

revoke insert, update, delete on public.shop_catalog from anon, authenticated;

insert into public.shop_catalog (kind, item_id) values
  ('look', 'ink'), ('look', 'brass'), ('look', 'night'),
  ('cheer_stage', 'lime'), ('cheer_stage', 'tape'), ('cheer_stage', 'paper'),
  ('cheer_stage', 'boom'), ('cheer_stage', 'night'), ('cheer_stage', 'dance'),
  ('cheer_stage', 'stamp'), ('cheer_stage', 'rain'), ('cheer_stage', 'check'),
  ('cheer_stage', 'bubble'), ('cheer_stage', 'spark'), ('cheer_stage', 'flip')
on conflict (kind, item_id) do nothing;

create or replace function public.shop_item_live(p_kind text, p_item_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.shop_catalog c
    where c.kind = p_kind and c.item_id = p_item_id
      and c.live_from <= (timezone('utc', now()))::date + 1
  );
$$;

revoke all on function public.shop_item_live(text, text) from public;
revoke all on function public.shop_item_live(text, text) from anon;
grant execute on function public.shop_item_live(text, text) to authenticated;
