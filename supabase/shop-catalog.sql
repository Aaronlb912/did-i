-- Items the server sells for coins, with the day each one goes on sale.
-- Shop drops (docs/shop-drops.md) add rows here; buy_with_coins (wallet.sql)
-- checks this table instead of a hard-coded list. Run before wallet.sql.

create table if not exists public.shop_catalog (
  kind text not null check (kind in ('look', 'cheer_stage', 'accessory')),
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

-- Drop 2026-10-09.
insert into public.shop_catalog (kind, item_id, live_from) values
  ('look', 'clay', '2026-10-09'),
  ('cheer_stage', 'confetti', '2026-10-09'), ('cheer_stage', 'heart', '2026-10-09')
on conflict (kind, item_id) do update set live_from = excluded.live_from;

-- Drop 2026-10-23.
insert into public.shop_catalog (kind, item_id, live_from) values
  ('look', 'chalk', '2026-10-23'),
  ('cheer_stage', 'medal', '2026-10-23'), ('cheer_stage', 'sun', '2026-10-23')
on conflict (kind, item_id) do update set live_from = excluded.live_from;

-- Drop 2026-11-06.
insert into public.shop_catalog (kind, item_id, live_from) values
  ('look', 'oat', '2026-11-06'),
  ('cheer_stage', 'leaves', '2026-11-06'), ('cheer_stage', 'lantern', '2026-11-06')
on conflict (kind, item_id) do update set live_from = excluded.live_from;

-- Buddy accessories. Each row carries its own coin price, so buy_with_coins
-- charges what the shop shows (src/lib/accessories.js, a test keeps them equal).
alter table public.shop_catalog add column if not exists coins integer
  check (coins is null or coins between 1 and 500);
-- Seasonal items leave the shop on live_until (not sold that day).
alter table public.shop_catalog add column if not exists live_until date;
alter table public.shop_catalog drop constraint if exists shop_catalog_kind_check;
alter table public.shop_catalog add constraint shop_catalog_kind_check
  check (kind in ('look', 'cheer_stage', 'accessory', 'frame'));

insert into public.shop_catalog (kind, item_id, coins) values
  ('accessory', 'beanie', 15),
  ('accessory', 'party', 15),
  ('accessory', 'flower', 15),
  ('accessory', 'hairbow', 15),
  ('accessory', 'beret', 25),
  ('accessory', 'cap', 25),
  ('accessory', 'bucket', 25),
  ('accessory', 'crown', 40),
  ('accessory', 'tophat', 40),
  ('accessory', 'headphones', 40),
  ('accessory', 'halo', 40),
  ('accessory', 'glasses', 15),
  ('accessory', 'shades', 25),
  ('accessory', 'heartglasses', 25),
  ('accessory', 'starglasses', 40),
  ('accessory', 'monocle', 40),
  ('accessory', 'butterfly', 25),
  ('accessory', 'bee', 25),
  ('accessory', 'angelwings', 40),
  ('accessory', 'fairy', 40),
  ('accessory', 'dragon', 40),
  ('accessory', 'balloon', 15),
  ('accessory', 'flag', 15),
  ('accessory', 'umbrella', 25),
  ('accessory', 'raincloud', 15),
  ('accessory', 'notes', 15),
  ('accessory', 'hearts', 25),
  ('accessory', 'sparkles', 40)
on conflict (kind, item_id) do update set coins = excluded.coins;

-- Seasonal accessories.
insert into public.shop_catalog (kind, item_id, coins, live_from, live_until) values
  ('accessory', 'witch', 30, '2026-10-01', '2026-11-01'),
  ('accessory', 'batwings', 30, '2026-10-01', '2026-11-01'),
  ('accessory', 'santa', 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'antlers', 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'cocoa', 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'snow', 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'sparkler', 30, '2026-12-26', '2027-01-06')
on conflict (kind, item_id) do update
  set coins = excluded.coins, live_from = excluded.live_from, live_until = excluded.live_until;


-- Card frames (src/lib/frames.js, a test keeps prices equal). Still frames
-- cost coins (buy_with_coins), animated ones cost gems (buy_with_gems, gifts.sql).
-- Earned, seasonal and free frames are never sold, so they are not here.
alter table public.shop_catalog add column if not exists gems integer
  check (gems is null or gems between 1 and 9);
alter table public.shop_catalog drop constraint if exists shop_catalog_kind_check;
alter table public.shop_catalog add constraint shop_catalog_kind_check
  check (kind in ('look', 'cheer_stage', 'accessory', 'frame'));

insert into public.shop_catalog (kind, item_id, coins, gems, live_from) values
  ('frame', 'thin', 30, null, '2026-10-05'),
  ('frame', 'double', 40, null, '2026-10-05'),
  ('frame', 'dotted', 40, null, '2026-10-05'),
  ('frame', 'washi', 60, null, '2026-10-05'),
  ('frame', 'pixel', 50, null, '2026-10-05'),
  ('frame', 'stitch', 70, null, '2026-10-05'),
  ('frame', 'polaroid', 80, null, '2026-10-05'),
  ('frame', 'wood', 80, null, '2026-10-05'),
  ('frame', 'flowers', 80, null, '2026-10-05'),
  ('frame', 'comic', 90, null, '2026-10-05'),
  ('frame', 'moon', 100, null, '2026-10-05'),
  ('frame', 'filigree', 120, null, '2026-10-05'),
  ('frame', 'deco', 120, null, '2026-10-05'),
  ('frame', 'marble', 120, null, '2026-10-05'),
  ('frame', 'glow', null, 3, '2026-10-05'),
  ('frame', 'silver', null, 3, '2026-10-05'),
  ('frame', 'neon', null, 3, '2026-10-05'),
  ('frame', 'fireflies', null, 3, '2026-10-05'),
  ('frame', 'shoot', null, 3, '2026-10-05'),
  ('frame', 'glass', null, 3, '2026-10-05'),
  ('frame', 'gold', null, 3, '2026-10-05'),
  ('frame', 'const', null, 3, '2026-10-05'),
  ('frame', 'ring', null, 3, '2026-10-05'),
  ('frame', 'aurora', null, 3, '2026-10-05'),
  ('frame', 'ticket', 80, null, '2026-10-07'),
  ('frame', 'notebook', 60, null, '2026-10-07'),
  ('frame', 'postage', 90, null, '2026-10-07'),
  ('frame', 'bamboo', 80, null, '2026-10-07'),
  ('frame', 'chalk', 70, null, '2026-10-07'),
  ('frame', 'quilt', 120, null, '2026-10-07'),
  ('frame', 'rope', 90, null, '2026-10-07'),
  ('frame', 'street', null, 3, '2026-10-07'),
  ('frame', 'lights', null, 3, '2026-10-07'),
  ('frame', 'train', null, 3, '2026-10-07'),
  ('frame', 'garden', null, 3, '2026-10-07'),
  ('frame', 'dusk', null, 3, '2026-10-07'),
  ('frame', 'globe', null, 3, '2026-10-07'),
  ('frame', 'doodle', null, 3, '2026-10-07'),
  ('frame', 'swipe', null, 3, '2026-10-07')
on conflict (kind, item_id) do update
  set coins = excluded.coins, gems = excluded.gems, live_from = excluded.live_from;

-- A frame is a coin frame or a gem frame, never both or neither.
alter table public.shop_catalog drop constraint if exists shop_catalog_frame_price;
alter table public.shop_catalog add constraint shop_catalog_frame_price
  check (kind <> 'frame' or ((coins is null) <> (gems is null)));

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
      -- A day of slack each way, for phones ahead of or behind UTC.
      and (c.live_until is null or (timezone('utc', now()))::date - 1 < c.live_until)
  );
$$;

revoke all on function public.shop_item_live(text, text) from public;
revoke all on function public.shop_item_live(text, text) from anon;
grant execute on function public.shop_item_live(text, text) to authenticated;
