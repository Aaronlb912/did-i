-- Gifts: buy a look, cheer or buddy for a friend or family member.
-- The giver pays from their server balance here, never on the phone.
-- The gift waits in cheer_gifts until the other person opens the app.
-- Run after wallet.sql, blocks.sql and did-we-guard.sql.

alter table public.cheer_gifts add column if not exists kind text not null default 'cheer';
alter table public.cheer_gifts add column if not exists note text not null default '';
alter table public.cheer_gifts add column if not exists gems integer not null default 0;
alter table public.cheer_gifts add column if not exists coins integer not null default 0;
alter table public.cheer_gifts add column if not exists returned_at timestamptz;

alter table public.cheer_gifts drop constraint if exists cheer_gifts_kind;
alter table public.cheer_gifts add constraint cheer_gifts_kind
  check (kind in ('cheer', 'look', 'buddy', 'accessory'));

alter table public.cheer_gifts drop constraint if exists cheer_gifts_note_len;
alter table public.cheer_gifts add constraint cheer_gifts_note_len
  check (length(note) <= 60);

alter table public.cheer_gifts drop constraint if exists cheer_gifts_paid;
alter table public.cheer_gifts add constraint cheer_gifts_paid
  check (gems between 0 and 99 and coins between 0 and 999);

-- What each item costs as a gift. Same prices as the shop (src/lib/purse.js).
-- Free items and ones only given out by hand (like the launch cheer) are not here.
create table if not exists public.gift_catalog (
  kind text not null check (kind in ('cheer', 'look', 'buddy', 'accessory')),
  item_id text not null check (length(item_id) between 1 and 32),
  gems integer not null default 0 check (gems between 0 and 99),
  coins integer not null default 0 check (coins between 0 and 999),
  live_from date not null default '2026-01-01',
  primary key (kind, item_id)
);

alter table public.gift_catalog drop constraint if exists gift_catalog_kind_check;
alter table public.gift_catalog add constraint gift_catalog_kind_check
  check (kind in ('cheer', 'look', 'buddy', 'accessory'));
-- Seasonal items stop being sold (or given) on live_until.
alter table public.gift_catalog add column if not exists live_until date;

alter table public.gift_catalog enable row level security;

drop policy if exists gift_catalog_read on public.gift_catalog;
create policy gift_catalog_read on public.gift_catalog
  for select to authenticated using (true);

revoke insert, update, delete on public.gift_catalog from anon, authenticated;

insert into public.gift_catalog (kind, item_id, gems, coins, live_from) values
  ('cheer', 'tape', 2, 0, '2026-01-01'), ('cheer', 'paper', 2, 0, '2026-01-01'),
  ('cheer', 'boom', 2, 0, '2026-01-01'), ('cheer', 'night', 2, 0, '2026-01-01'),
  ('cheer', 'dance', 2, 0, '2026-01-01'), ('cheer', 'stamp', 2, 0, '2026-01-01'),
  ('cheer', 'rain', 2, 0, '2026-01-01'), ('cheer', 'check', 2, 0, '2026-01-01'),
  ('cheer', 'bubble', 2, 0, '2026-01-01'), ('cheer', 'spark', 2, 0, '2026-01-01'),
  ('cheer', 'flip', 2, 0, '2026-01-01'),
  ('cheer', 'confetti', 2, 0, '2026-10-09'), ('cheer', 'heart', 2, 0, '2026-10-09'),
  ('buddy', 'cat', 5, 0, '2026-01-01'), ('buddy', 'dog', 5, 0, '2026-01-01'),
  ('buddy', 'rabbit', 5, 0, '2026-01-01'), ('buddy', 'owl', 5, 0, '2026-01-01'),
  ('buddy', 'possum', 5, 0, '2026-01-01'), ('buddy', 'frog', 5, 0, '2026-10-09'),
  ('look', 'ink', 0, 30, '2026-01-01'), ('look', 'brass', 0, 30, '2026-01-01'),
  ('look', 'night', 0, 30, '2026-01-01'), ('look', 'clay', 0, 30, '2026-10-09'),
  ('look', 'moss', 2, 0, '2026-01-01'), ('look', 'plum', 2, 0, '2026-01-01'),
  ('look', 'rose', 2, 0, '2026-01-01'), ('look', 'steel', 2, 0, '2026-01-01'),
  ('look', 'wine', 2, 0, '2026-01-01'), ('look', 'glow', 2, 0, '2026-01-01'),
  ('look', 'ember', 2, 0, '2026-01-01'), ('look', 'frost', 2, 0, '2026-01-01'),
  ('look', 'pulse', 2, 0, '2026-01-01'),
  ('look', 'jade', 2, 0, '2026-10-09'), ('look', 'indigo', 2, 0, '2026-10-09'),
  -- Drop 2026-10-23.
  ('cheer', 'medal', 2, 0, '2026-10-23'), ('cheer', 'sun', 2, 0, '2026-10-23'),
  ('buddy', 'penguin', 5, 0, '2026-10-23'),
  ('look', 'sky', 2, 0, '2026-10-23'), ('look', 'orchid', 2, 0, '2026-10-23'),
  ('look', 'chalk', 0, 30, '2026-10-23'),
  -- Drop 2026-11-06.
  ('cheer', 'leaves', 2, 0, '2026-11-06'), ('cheer', 'lantern', 2, 0, '2026-11-06'),
  ('buddy', 'fox', 5, 0, '2026-11-06'),
  ('look', 'maple', 2, 0, '2026-11-06'), ('look', 'fig', 2, 0, '2026-11-06'),
  ('look', 'oat', 0, 30, '2026-11-06')
on conflict (kind, item_id) do update
  set gems = excluded.gems, coins = excluded.coins, live_from = excluded.live_from;

-- Buddy accessories, paid in coins (src/lib/accessories.js).
insert into public.gift_catalog (kind, item_id, gems, coins, live_from, live_until) values
  ('accessory', 'beanie', 0, 15, '2026-01-01', null),
  ('accessory', 'party', 0, 15, '2026-01-01', null),
  ('accessory', 'flower', 0, 15, '2026-01-01', null),
  ('accessory', 'hairbow', 0, 15, '2026-01-01', null),
  ('accessory', 'beret', 0, 25, '2026-01-01', null),
  ('accessory', 'cap', 0, 25, '2026-01-01', null),
  ('accessory', 'bucket', 0, 25, '2026-01-01', null),
  ('accessory', 'crown', 0, 40, '2026-01-01', null),
  ('accessory', 'tophat', 0, 40, '2026-01-01', null),
  ('accessory', 'headphones', 0, 40, '2026-01-01', null),
  ('accessory', 'halo', 0, 40, '2026-01-01', null),
  ('accessory', 'glasses', 0, 15, '2026-01-01', null),
  ('accessory', 'shades', 0, 25, '2026-01-01', null),
  ('accessory', 'heartglasses', 0, 25, '2026-01-01', null),
  ('accessory', 'starglasses', 0, 40, '2026-01-01', null),
  ('accessory', 'monocle', 0, 40, '2026-01-01', null),
  ('accessory', 'butterfly', 0, 25, '2026-01-01', null),
  ('accessory', 'bee', 0, 25, '2026-01-01', null),
  ('accessory', 'angelwings', 0, 40, '2026-01-01', null),
  ('accessory', 'fairy', 0, 40, '2026-01-01', null),
  ('accessory', 'dragon', 0, 40, '2026-01-01', null),
  ('accessory', 'balloon', 0, 15, '2026-01-01', null),
  ('accessory', 'flag', 0, 15, '2026-01-01', null),
  ('accessory', 'umbrella', 0, 25, '2026-01-01', null),
  ('accessory', 'raincloud', 0, 15, '2026-01-01', null),
  ('accessory', 'notes', 0, 15, '2026-01-01', null),
  ('accessory', 'hearts', 0, 25, '2026-01-01', null),
  ('accessory', 'sparkles', 0, 40, '2026-01-01', null),
  ('accessory', 'witch', 0, 30, '2026-10-01', '2026-11-01'),
  ('accessory', 'batwings', 0, 30, '2026-10-01', '2026-11-01'),
  ('accessory', 'santa', 0, 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'antlers', 0, 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'cocoa', 0, 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'snow', 0, 30, '2026-12-01', '2027-01-01'),
  ('accessory', 'sparkler', 0, 30, '2026-12-26', '2027-01-06'),
  ('accessory', 'icecream', 0, 25, '2026-10-23', null),
  ('accessory', 'glasses3d', 0, 40, '2026-10-23', null)
on conflict (kind, item_id) do update
  set gems = excluded.gems, coins = excluded.coins, live_from = excluded.live_from, live_until = excluded.live_until;

-- Gem looks, cheers and buddies you own, kept on the server like
-- coin_cosmetics. The phone copies this list on every sync, so editing the
-- saved shelf cannot add items. Gifts and special items (launch) land here too.
create or replace function public.gem_owned_normalize(raw jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'looks', coalesce(raw->'looks', '[]'::jsonb),
    'cheers', coalesce(raw->'cheers', '[]'::jsonb),
    'buddies', coalesce(raw->'buddies', '[]'::jsonb)
  );
$$;

-- Adds one id to one list. Returns the whole normalized object.
create or replace function public.gem_owned_add(raw jsonb, list text, id text)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when public.gem_owned_normalize(raw)->list @> jsonb_build_array(id) then public.gem_owned_normalize(raw)
    else jsonb_set(public.gem_owned_normalize(raw), array[list], (public.gem_owned_normalize(raw)->list) || to_jsonb(id))
  end;
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'gem_cosmetics'
  ) then
    alter table public.profiles
      add column gem_cosmetics jsonb not null default '{"looks":[],"cheers":[],"buddies":[]}'::jsonb;
    -- One time only: people keep the gem items already on their synced shelf.
    update public.profiles p
    set gem_cosmetics = jsonb_build_object(
      'looks', coalesce((select jsonb_agg(distinct c.item_id) from public.gift_catalog c
        where c.kind = 'look' and c.gems > 0 and exists (
          select 1 from jsonb_array_elements(coalesce(s.doc->'boards', '[]'::jsonb)) b
          where coalesce(b->'looks', '[]'::jsonb) @> jsonb_build_array(c.item_id))), '[]'::jsonb),
      'cheers', coalesce((select jsonb_agg(distinct x.id) from (
        select c.item_id as id from public.gift_catalog c where c.kind = 'cheer' union select 'launch') x
        where exists (
          select 1 from jsonb_array_elements(coalesce(s.doc->'boards', '[]'::jsonb)) b
          where coalesce(b->'cheers', '[]'::jsonb) @> jsonb_build_array(x.id))), '[]'::jsonb),
      'buddies', coalesce((select jsonb_agg(distinct c.item_id) from public.gift_catalog c
        where c.kind = 'buddy' and c.gems > 0 and exists (
          select 1 from jsonb_array_elements(coalesce(s.doc->'boards', '[]'::jsonb)) b
          where coalesce(b->'buddies', '[]'::jsonb) @> jsonb_build_array(c.item_id))), '[]'::jsonb)
    )
    from public.shelves s
    where s.user_id = p.user_id;
  end if;
end;
$$;

alter table public.profiles drop constraint if exists profiles_gem_cosmetics_size;
alter table public.profiles add constraint profiles_gem_cosmetics_size
  check (octet_length(gem_cosmetics::text) <= 4096);

create or replace function public.read_gem_owned()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select public.gem_owned_normalize(p.gem_cosmetics) || jsonb_build_object('gems', p.gem_balance)
     from public.profiles p where p.user_id = (select auth.uid())),
    public.gem_owned_normalize('{}'::jsonb) || jsonb_build_object('gems', 0)
  );
$$;

revoke all on function public.read_gem_owned() from public, anon;
grant execute on function public.read_gem_owned() to authenticated;

-- Buy a gem look, cheer or buddy. Prices come from gift_catalog.
create or replace function public.buy_with_gems(p_kind text, p_item_id text)
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
  price public.gift_catalog;
  row public.profiles;
  owned jsonb;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  list := case k when 'look' then 'looks' when 'cheer' then 'cheers' when 'buddy' then 'buddies' end;
  select * into price from public.gift_catalog c
  where c.kind = k and c.item_id = id and c.gems > 0
    and c.live_from <= (timezone('utc', now()))::date + 1;
  if list is null or price is null then
    raise exception 'bad item';
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
  select * into row from public.profiles where user_id = who for update;
  owned := public.gem_owned_normalize(row.gem_cosmetics);
  if owned->list @> jsonb_build_array(id) then
    return owned || jsonb_build_object('gems', row.gem_balance);
  end if;
  if row.gem_balance < price.gems then
    raise exception 'need gems';
  end if;

  owned := public.gem_owned_add(owned, list, id);
  update public.profiles
  set gem_balance = gem_balance - price.gems, gem_cosmetics = owned
  where user_id = who
  returning * into row;
  return owned || jsonb_build_object('gems', row.gem_balance);
end;
$$;

revoke all on function public.buy_with_gems(text, text) from public, anon;
grant execute on function public.buy_with_gems(text, text) to authenticated;

-- Ten gifts a day out, on top of five a day in (cap_cheer_gifts).
create or replace function public.cap_gifts_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.cheer_gifts
      where from_id = new.from_id and made_at > now() - interval '1 day') >= 10 then
    raise exception 'gift cap';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_gifts_out() from public;

drop trigger if exists cap_gifts_out on public.cheer_gifts;
create trigger cap_gifts_out
  before insert on public.cheer_gifts
  for each row execute function public.cap_gifts_out();

create or replace function public.share_family(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members a
    join public.family_members b on b.family_id = a.family_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

revoke all on function public.share_family(uuid) from public;
grant execute on function public.share_family(uuid) to authenticated;

-- Send a gift. Returns the giver's new balances for the phone to show.
create or replace function public.send_gift(other uuid, p_kind text, p_item_id text, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  k text := lower(btrim(coalesce(p_kind, '')));
  id text := lower(btrim(coalesce(p_item_id, '')));
  say text := left(btrim(coalesce(p_note, '')), 60);
  price public.gift_catalog;
  row public.profiles;
  name text;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who then
    raise exception 'bad person';
  end if;
  if public.blocked_with(other) then
    raise exception 'not friends';
  end if;
  if not (public.are_friends(other) or public.share_family(other)) then
    raise exception 'not friends';
  end if;

  select * into price from public.gift_catalog c
  where c.kind = k and c.item_id = id
    and c.live_from <= (timezone('utc', now()))::date + 1
    and (c.live_until is null or (timezone('utc', now()))::date - 1 < c.live_until);
  if price is null then
    raise exception 'bad item';
  end if;

  select * into row from public.profiles where user_id = who for update;
  if row is null then
    raise exception 'need gems';
  end if;
  if row.gem_balance < price.gems then
    raise exception 'need gems';
  end if;
  if row.coin_balance < price.coins then
    raise exception 'need coins';
  end if;

  -- Insert first, so the caps raise before anything is paid.
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, note, gems, coins)
  values (other, who, id, k, say, price.gems, price.coins);

  update public.profiles
  set gem_balance = gem_balance - price.gems,
      coin_balance = coin_balance - price.coins
  where user_id = who
  returning * into row;

  select coalesce(nullif(btrim(p.display_name), ''), 'Someone') into name
  from public.profiles p where p.user_id = who;
  if public.push_wanted(other, 'sends') then
    insert into public.push_queue (to_id, title, body, go)
    values (other,
      left(public.push_text(other, 'gift', jsonb_build_object('name', coalesce(name, public.push_text(other, 'someone')))), 80),
      public.push_text(other, 'open'), '/tonight');
  end if;

  return jsonb_build_object('gems', row.gem_balance, 'coins', row.coin_balance);
end;
$$;

revoke all on function public.send_gift(uuid, text, text, text) from public;
revoke all on function public.send_gift(uuid, text, text, text) from anon;
grant execute on function public.send_gift(uuid, text, text, text) to authenticated;

-- Pull waiting gifts. Coin looks also go into the server's coin catalog,
-- since that is where the phone reads them from.
drop function if exists public.claim_gifts();
create or replace function public.claim_gifts()
returns table (id uuid, kind text, item_id text, note text, from_id uuid, from_name text, gems integer, coins integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  cos jsonb;
  coin_looks text[];
  accs text[];
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  select array_agg(distinct g.cheer_id) into coin_looks
  from public.cheer_gifts g
  where g.to_id = who and g.claimed_at is null and g.kind = 'look' and g.coins > 0;

  if coin_looks is not null then
    select public.coin_catalog_normalize(p.coin_cosmetics) into cos
    from public.profiles p where p.user_id = who for update;
    if cos is not null then
      update public.profiles p
      set coin_cosmetics = jsonb_set(
        cos, '{looks}',
        (select to_jsonb(array_agg(distinct x))
         from (select jsonb_array_elements_text(cos->'looks') as x
               union select unnest(coin_looks)) u)
      )
      where p.user_id = who;
    end if;
  end if;

  -- Accessories are coin items, kept on the coin catalog like coin looks.
  select array_agg(distinct g.cheer_id) into accs
  from public.cheer_gifts g
  where g.to_id = who and g.claimed_at is null and g.kind = 'accessory';

  if accs is not null then
    select public.coin_catalog_normalize(p.coin_cosmetics) into cos
    from public.profiles p where p.user_id = who for update;
    if cos is not null then
      update public.profiles p
      set coin_cosmetics = jsonb_set(
        cos, '{accessories}',
        (select to_jsonb(array_agg(distinct x))
         from (select jsonb_array_elements_text(cos->'accessories') as x
               union select unnest(accs)) u)
      )
      where p.user_id = who;
    end if;
  end if;

  -- Everything else (gem items, specials, older free cheer gifts) goes on
  -- the server's gem list.
  update public.profiles p
  set gem_cosmetics = (
    select public.gem_owned_normalize(p.gem_cosmetics) || jsonb_build_object(
      'looks', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'looks') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.to_id = who and g.claimed_at is null and g.kind = 'look' and g.coins = 0) u),
      'cheers', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'cheers') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.to_id = who and g.claimed_at is null and g.kind = 'cheer') u),
      'buddies', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'buddies') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.to_id = who and g.claimed_at is null and g.kind = 'buddy') u)
    )
  )
  where p.user_id = who
    and exists (select 1 from public.cheer_gifts g
      where g.to_id = who and g.claimed_at is null
        and not (g.kind = 'look' and g.coins > 0) and g.kind <> 'accessory');

  return query
    with took as (
      update public.cheer_gifts g
      set claimed_at = now()
      where g.to_id = who and g.claimed_at is null
      returning g.id, g.kind, g.cheer_id, g.note, g.from_id, g.gems, g.coins, g.made_at
    )
    select t.id, t.kind, t.cheer_id, t.note, t.from_id,
      coalesce(nullif(btrim(p.display_name), ''), '') as from_name,
      t.gems, t.coins
    from took t
    left join public.profiles p on p.user_id = t.from_id
    order by t.made_at;
end;
$$;

revoke all on function public.claim_gifts() from public;
revoke all on function public.claim_gifts() from anon;
grant execute on function public.claim_gifts() to authenticated;

-- Older apps still call claim_cheer_gifts and only know shop cheers. Leave
-- new gifts (paid here, or special ones like launch) for claim_gifts.
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
  update public.profiles p
  set gem_cosmetics = public.gem_owned_normalize(p.gem_cosmetics) || jsonb_build_object(
    'cheers', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
      select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'cheers') as x
      union select g.cheer_id from public.cheer_gifts g
      where g.to_id = who and g.claimed_at is null
        and g.kind = 'cheer' and g.gems = 0 and g.coins = 0
        and exists (select 1 from public.gift_catalog c where c.kind = 'cheer' and c.item_id = g.cheer_id)) u)
  )
  where p.user_id = who;
  return query
    update public.cheer_gifts g
    set claimed_at = now()
    where g.to_id = who and g.claimed_at is null
      and g.kind = 'cheer' and g.gems = 0 and g.coins = 0
      and exists (select 1 from public.gift_catalog c where c.kind = 'cheer' and c.item_id = g.cheer_id)
    returning g.cheer_id;
end;
$$;

revoke all on function public.claim_cheer_gifts() from public;
revoke all on function public.claim_cheer_gifts() from anon;
grant execute on function public.claim_cheer_gifts() to authenticated;

-- A special item (like the launch cheer) sent by hand. Service role only:
-- node scripts/give-special.mjs --to them@example.com --from you@example.com --item launch --note "..."
create or replace function public.give_special(to_email text, from_email text, p_kind text, p_item_id text, p_note text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  to_user uuid;
  from_user uuid;
  made uuid;
begin
  select id into to_user from auth.users where lower(email) = lower(btrim(to_email));
  select id into from_user from auth.users where lower(email) = lower(btrim(from_email));
  if to_user is null or from_user is null then
    raise exception 'no such account';
  end if;
  insert into public.cheer_gifts (to_id, from_id, cheer_id, kind, note)
  values (to_user, from_user, lower(btrim(p_item_id)), lower(btrim(p_kind)), left(btrim(coalesce(p_note, '')), 60))
  returning id into made;
  return made;
end;
$$;

revoke all on function public.give_special(text, text, text, text, text) from public;
revoke all on function public.give_special(text, text, text, text, text) from anon;
revoke all on function public.give_special(text, text, text, text, text) from authenticated;

-- A gift of something the person already had goes back to the giver.
-- Only the person it was sent to can send it back, once.
create or replace function public.return_gift(gift uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  g public.cheer_gifts;
begin
  update public.cheer_gifts c
  set returned_at = now()
  where c.id = gift and c.to_id = who and c.returned_at is null
  returning * into g;
  if g is null then
    return;
  end if;
  update public.profiles
  set gem_balance = least(gem_balance + g.gems, 9999),
      coin_balance = least(coin_balance + g.coins, 9999)
  where user_id = g.from_id;
end;
$$;

revoke all on function public.return_gift(uuid) from public;
revoke all on function public.return_gift(uuid) from anon;
grant execute on function public.return_gift(uuid) to authenticated;

-- Report a gift's note. Like every report here, it also blocks the sender.
create or replace function public.report_gift(gift uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  who uuid;
  said text;
begin
  select g.from_id, g.note into who, said
  from public.cheer_gifts g where g.id = gift and g.to_id = me;
  if not found then
    raise exception 'not yours';
  end if;
  insert into public.reports (from_id, about_id, reason)
  values (me, who, left('gift note: ' || coalesce(said, ''), 500));
  perform public.block_person(who, '');
end;
$$;

revoke all on function public.report_gift(uuid) from public;
grant execute on function public.report_gift(uuid) to authenticated;

-- Blocking someone drops the gifts they have not opened yet, and pays the giver back.
create or replace function public.gifts_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  with gone as (
    delete from public.cheer_gifts g
    where g.claimed_at is null
      and ((g.from_id = new.blocker and g.to_id = new.blocked)
        or (g.from_id = new.blocked and g.to_id = new.blocker))
    returning g.from_id, g.gems, g.coins
  )
  update public.profiles p
  set gem_balance = least(p.gem_balance + s.gems, 9999),
      coin_balance = least(p.coin_balance + s.coins, 9999)
  from (select from_id, sum(gems) as gems, sum(coins) as coins from gone group by from_id) s
  where p.user_id = s.from_id;
  return new;
end;
$$;

revoke all on function public.gifts_on_block() from public;

drop trigger if exists gifts_on_block on public.blocks;
create trigger gifts_on_block
  after insert on public.blocks
  for each row execute function public.gifts_on_block();

notify pgrst, 'reload schema';
