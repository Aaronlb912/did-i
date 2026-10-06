-- Server-owned gem balance. The shelf doc may show gems for offline play,
-- but upserts are clamped to profiles.gem_balance.
-- Run after gem-purchases.sql.

alter table public.profiles
  add column if not exists gem_balance integer not null default 0;

alter table public.profiles
  add column if not exists gem_week text not null default '';

alter table public.profiles drop constraint if exists profiles_gem_balance_rng;
alter table public.profiles add constraint profiles_gem_balance_rng
  check (gem_balance between 0 and 9999);

alter table public.profiles drop constraint if exists profiles_gem_week_len;
alter table public.profiles add constraint profiles_gem_week_len
  check (length(gem_week) <= 12);

-- ISO week key YYYY-Www, UTC, same shape as the app shelf.gemWeek.
create or replace function public.iso_gem_week(on_day date default (timezone('utc', now()))::date)
returns text
language sql
stable
set search_path = public
as $$
  select to_char(on_day, 'IYYY') || '-W' || lpad(to_char(on_day, 'IW'), 2, '0');
$$;

create or replace function public.shelf_gem_max(doc jsonb)
returns integer
language sql
immutable
set search_path = public
as $$
  select coalesce(
    max((b->>'gems')::integer),
    0
  )
  from jsonb_array_elements(coalesce(doc->'boards', '[]'::jsonb)) as b
  where (b->>'gems') ~ '^-?\d+$';
$$;

create or replace function public.shelf_set_gems(doc jsonb, gems integer)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_set(
    coalesce(doc, '{}'::jsonb),
    '{boards}',
    coalesce(
      (
        select jsonb_agg(
          case
            when jsonb_typeof(b) = 'object' then jsonb_set(b, '{gems}', to_jsonb(greatest(0, gems)), true)
            else b
          end
        )
        from jsonb_array_elements(coalesce(doc->'boards', '[]'::jsonb)) as b
      ),
      '[]'::jsonb
    ),
    true
  );
$$;

create or replace function public.shelf_coin_max(doc jsonb)
returns integer
language sql
immutable
set search_path = public
as $$
  select coalesce(
    max((b->>'coins')::integer),
    0
  )
  from jsonb_array_elements(coalesce(doc->'boards', '[]'::jsonb)) as b
  where (b->>'coins') ~ '^-?\d+$';
$$;

create or replace function public.shelf_set_coins(doc jsonb, coins integer)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_set(
    coalesce(doc, '{}'::jsonb),
    '{boards}',
    coalesce(
      (
        select jsonb_agg(
          case
            when jsonb_typeof(b) = 'object' then jsonb_set(b, '{coins}', to_jsonb(greatest(0, coins)), true)
            else b
          end
        )
        from jsonb_array_elements(coalesce(doc->'boards', '[]'::jsonb)) as b
      ),
      '[]'::jsonb
    ),
    true
  );
$$;

alter table public.profiles
  add column if not exists coin_balance integer not null default 0;

alter table public.profiles
  add column if not exists coin_cosmetics jsonb not null default '{"stamps":[],"badges":[]}'::jsonb;

alter table public.profiles drop constraint if exists profiles_coin_balance_rng;
alter table public.profiles add constraint profiles_coin_balance_rng
  check (coin_balance between 0 and 9999);

alter table public.profiles drop constraint if exists profiles_coin_cosmetics_size;
alter table public.profiles add constraint profiles_coin_cosmetics_size
  check (octet_length(coin_cosmetics::text) <= 4096);

create or replace function public.clamp_shelf_gems()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gbal integer;
  cbal integer;
  gwant integer;
  cwant integer;
begin
  insert into public.profiles (user_id)
  values (NEW.user_id)
  on conflict (user_id) do nothing;

  select coalesce(p.gem_balance, 0), coalesce(p.coin_balance, 0)
  into gbal, cbal
  from public.profiles p
  where p.user_id = NEW.user_id;

  gwant := public.shelf_gem_max(NEW.doc);
  cwant := public.shelf_coin_max(NEW.doc);

  if gwant < gbal then
    gbal := greatest(0, gwant);
  end if;
  if cwant < cbal then
    cbal := greatest(0, cwant);
  end if;

  update public.profiles
  set gem_balance = gbal, coin_balance = cbal
  where user_id = NEW.user_id;

  NEW.doc := public.shelf_set_gems(public.shelf_set_coins(NEW.doc, cbal), gbal);
  return NEW;
end;
$$;

drop trigger if exists clamp_shelf_gems on public.shelves;
create trigger clamp_shelf_gems
  before insert or update of doc on public.shelves
  for each row execute function public.clamp_shelf_gems();

-- One free gem per ISO week when the app marks a clear week on sync.
create or replace function public.grant_weekly_gem(week_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  row public.profiles;
  key text := left(btrim(coalesce(week_key, '')), 12);
  now_week text := public.iso_gem_week();
  bal integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  -- The phone names the week by its own local date, the server by UTC, so
  -- around Sunday midnight they differ by one. Accept the weeks either side;
  -- gem_week still pays each week once.
  if key !~ '^\d{4}-W\d{2}$' or key not in (
    now_week,
    public.iso_gem_week((timezone('utc', now()))::date - 1),
    public.iso_gem_week((timezone('utc', now()))::date + 1)
  ) then
    return coalesce((select gem_balance from public.profiles where user_id = who), 0);
  end if;

  select * into row from public.profiles where user_id = who for update;
  if row is null then
    insert into public.profiles (user_id) values (who)
    on conflict (user_id) do nothing;
    select * into row from public.profiles where user_id = who for update;
  end if;

  if row.gem_week = key then
    return row.gem_balance;
  end if;

  update public.profiles
  set gem_balance = least(row.gem_balance + 1, 9999), gem_week = key
  where user_id = who
  returning gem_balance into bal;

  return bal;
end;
$$;

revoke all on function public.grant_weekly_gem(text) from public;
revoke all on function public.grant_weekly_gem(text) from anon;
grant execute on function public.grant_weekly_gem(text) to authenticated;

create or replace function public.read_gem_balance()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.gem_balance from public.profiles p where p.user_id = (select auth.uid())),
    0
  );
$$;

revoke all on function public.read_gem_balance() from public;
revoke all on function public.read_gem_balance() from anon;
grant execute on function public.read_gem_balance() to authenticated;

create or replace function public.read_coin_balance()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.coin_balance from public.profiles p where p.user_id = (select auth.uid())),
    0
  );
$$;

revoke all on function public.read_coin_balance() from public;
revoke all on function public.read_coin_balance() from anon;
grant execute on function public.read_coin_balance() to authenticated;

create table if not exists public.coin_night_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  night_iso text not null,
  coins smallint not null default 0,
  primary key (user_id, night_iso),
  constraint coin_night_grants_iso check (night_iso ~ '^\d{4}-\d{2}-\d{2}$'),
  constraint coin_night_grants_coins check (coins between 0 and 6)
);

-- The cap went from 4 to 6 a night (purse.js NIGHT_COIN_CAP).
alter table public.coin_night_grants drop constraint if exists coin_night_grants_coins;
alter table public.coin_night_grants add constraint coin_night_grants_coins check (coins between 0 and 6);

alter table public.coin_night_grants enable row level security;

revoke all on public.coin_night_grants from anon;
revoke all on public.coin_night_grants from authenticated;

-- Earn path for signed-in accounts. Matches the client cap of 6 coins a night.
create or replace function public.credit_night_coins(night_iso text, add_coins integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  iso text := left(btrim(coalesce(night_iso, '')), 10);
  add integer := greatest(0, least(6, coalesce(add_coins, 0)));
  had integer;
  room integer;
  bal integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  -- Only tonight or the night before in any time zone, or a caller could walk
  -- back through every past date and collect coins for each.
  if iso !~ '^\d{4}-\d{2}-\d{2}$' or add < 1
     or iso::date < current_date - 2 or iso::date > current_date + 1 then
    return coalesce((select coin_balance from public.profiles where user_id = who), 0);
  end if;

  insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;

  -- g.night_iso, not night_iso: the parameter has the same name as the column.
  select coalesce(g.coins, 0) into had
  from public.coin_night_grants g
  where g.user_id = who and g.night_iso = iso
  for update;

  if had is null then
    had := 0;
    insert into public.coin_night_grants (user_id, night_iso, coins) values (who, iso, 0);
  end if;

  room := greatest(0, 6 - had);
  add := least(add, room);
  if add < 1 then
    return coalesce((select coin_balance from public.profiles where user_id = who), 0);
  end if;

  update public.coin_night_grants g set coins = had + add where g.user_id = who and g.night_iso = iso;
  update public.profiles
  set coin_balance = least(coin_balance + add, 9999)
  where user_id = who
  returning coin_balance into bal;

  return bal;
end;
$$;

revoke all on function public.credit_night_coins(text, integer) from public;
revoke all on function public.credit_night_coins(text, integer) from anon;
grant execute on function public.credit_night_coins(text, integer) to authenticated;

-- Your last 14 nights of coins and the last week a gem paid, for the
-- "how coins work" sheet. Read only, your own rows.
create or replace function public.read_coin_history()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nights', coalesce((
      select jsonb_agg(jsonb_build_object('night', g.night_iso, 'coins', g.coins) order by g.night_iso desc)
      from (
        select night_iso, coins from public.coin_night_grants
        where user_id = (select auth.uid())
        order by night_iso desc
        limit 14
      ) g
    ), '[]'::jsonb),
    'gem_week', coalesce((select p.gem_week from public.profiles p where p.user_id = (select auth.uid())), '')
  );
$$;

revoke all on function public.read_coin_history() from public;
revoke all on function public.read_coin_history() from anon;
grant execute on function public.read_coin_history() to authenticated;

-- Option C: every coin spend goes through here. Shelf coins are display-only.
create or replace function public.coin_catalog_normalize(raw jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'stamps', coalesce(raw->'stamps', '[]'::jsonb),
    'badges', coalesce(raw->'badges', '[]'::jsonb),
    'looks', coalesce(raw->'looks', '[]'::jsonb),
    'cheer_stages', coalesce(raw->'cheer_stages', '{}'::jsonb),
    'accessories', coalesce(raw->'accessories', '[]'::jsonb),
    'frames', coalesce(raw->'frames', '[]'::jsonb)
  );
$$;

create or replace function public.read_coin_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'coins', p.coin_balance,
        'stamps', public.coin_catalog_normalize(p.coin_cosmetics)->'stamps',
        'badges', public.coin_catalog_normalize(p.coin_cosmetics)->'badges',
        'looks', public.coin_catalog_normalize(p.coin_cosmetics)->'looks',
        'cheer_stages', public.coin_catalog_normalize(p.coin_cosmetics)->'cheer_stages',
        'accessories', public.coin_catalog_normalize(p.coin_cosmetics)->'accessories',
        'frames', public.coin_catalog_normalize(p.coin_cosmetics)->'frames'
      )
      from public.profiles p
      where p.user_id = (select auth.uid())
    ),
    jsonb_build_object(
      'coins', 0,
      'stamps', '[]'::jsonb,
      'badges', '[]'::jsonb,
      'looks', '[]'::jsonb,
      'cheer_stages', '{}'::jsonb,
      'accessories', '[]'::jsonb,
      'frames', '[]'::jsonb
    )
  );
$$;

revoke all on function public.read_coin_catalog() from public;
revoke all on function public.read_coin_catalog() from anon;
grant execute on function public.read_coin_catalog() to authenticated;

create or replace function public.read_coin_cosmetics()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.coin_catalog_normalize(
    coalesce(
      (select p.coin_cosmetics from public.profiles p where p.user_id = (select auth.uid())),
      '{}'::jsonb
    )
  );
$$;

revoke all on function public.read_coin_cosmetics() from public;
revoke all on function public.read_coin_cosmetics() from anon;
grant execute on function public.read_coin_cosmetics() to authenticated;

create or replace function public.buy_with_coins(p_kind text, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  k text := lower(btrim(coalesce(p_kind, '')));
  id text := lower(btrim(coalesce(p_item_id, '')));
  cost integer := 0;
  row public.profiles;
  cos jsonb;
  stamps jsonb;
  badges jsonb;
  looks jsonb;
  stages jsonb;
  accs jsonb;
  frms jsonb;
  cur_stage integer;
  next_stage integer;
  bal integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  if k = 'stamp' then
    if id not in ('star', 'check', 'moon') then
      raise exception 'bad item';
    end if;
    cost := 8;
  elsif k = 'badge' then
    if id not in ('briefcase', 'leaf', 'home', 'heart', 'bolt') then
      raise exception 'bad item';
    end if;
    cost := 20;
  elsif k = 'look' then
    if not public.shop_item_live('look', id) then
      raise exception 'bad item';
    end if;
    cost := 30;
  elsif k = 'cheer_stage' then
    if not public.shop_item_live('cheer_stage', id) then
      raise exception 'bad item';
    end if;
    cost := 15;
  elsif k = 'accessory' then
    if not public.shop_item_live('accessory', id) then
      raise exception 'bad item';
    end if;
    select c.coins into cost from public.shop_catalog c where c.kind = 'accessory' and c.item_id = id;
    if cost is null or cost < 1 then
      raise exception 'bad item';
    end if;
  elsif k = 'frame' then
    -- Coin frames only: gem, earned, seasonal and free frames have no coin price.
    if not public.shop_item_live('frame', id) then
      raise exception 'bad item';
    end if;
    select c.coins into cost from public.shop_catalog c where c.kind = 'frame' and c.item_id = id;
    if cost is null or cost < 1 then
      raise exception 'bad item';
    end if;
  else
    raise exception 'bad kind';
  end if;

  select * into row from public.profiles where user_id = who for update;
  if row is null then
    insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
    select * into row from public.profiles where user_id = who for update;
  end if;

  cos := public.coin_catalog_normalize(row.coin_cosmetics);
  stamps := cos->'stamps';
  badges := cos->'badges';
  looks := cos->'looks';
  stages := cos->'cheer_stages';
  accs := cos->'accessories';
  frms := cos->'frames';

  if k = 'stamp' and stamps @> jsonb_build_array(id) then
    return jsonb_build_object('coins', row.coin_balance, 'catalog', cos);
  end if;
  if k = 'badge' and badges @> jsonb_build_array(id) then
    return jsonb_build_object('coins', row.coin_balance, 'catalog', cos);
  end if;
  if k = 'look' and looks @> jsonb_build_array(id) then
    return jsonb_build_object('coins', row.coin_balance, 'catalog', cos);
  end if;
  if k = 'accessory' and accs @> jsonb_build_array(id) then
    return jsonb_build_object('coins', row.coin_balance, 'catalog', cos);
  end if;
  if k = 'frame' and frms @> jsonb_build_array(id) then
    return jsonb_build_object('coins', row.coin_balance, 'catalog', cos);
  end if;

  if k = 'cheer_stage' then
    cur_stage := greatest(1, coalesce((stages->>id)::integer, 1));
    next_stage := cur_stage + 1;
    if next_stage > 5 then
      return jsonb_build_object('coins', row.coin_balance, 'catalog', cos);
    end if;
    if row.coin_balance < cost then
      raise exception 'need coins';
    end if;
    stages := jsonb_set(stages, array[id], to_jsonb(next_stage), true);
    update public.profiles
    set coin_balance = coin_balance - cost,
        coin_cosmetics = jsonb_build_object(
          'stamps', stamps, 'badges', badges, 'looks', looks, 'cheer_stages', stages, 'accessories', accs, 'frames', frms
        )
    where user_id = who
    returning coin_balance into bal;
    cos := jsonb_build_object('stamps', stamps, 'badges', badges, 'looks', looks, 'cheer_stages', stages, 'accessories', accs, 'frames', frms);
    return jsonb_build_object('coins', bal, 'catalog', cos);
  end if;

  if row.coin_balance < cost then
    raise exception 'need coins';
  end if;

  if k = 'stamp' then
    stamps := stamps || to_jsonb(id);
  elsif k = 'badge' then
    badges := badges || to_jsonb(id);
  elsif k = 'accessory' then
    accs := accs || to_jsonb(id);
  elsif k = 'frame' then
    frms := frms || to_jsonb(id);
  else
    looks := looks || to_jsonb(id);
  end if;

  update public.profiles
  set
    coin_balance = coin_balance - cost,
    coin_cosmetics = jsonb_build_object(
      'stamps', stamps, 'badges', badges, 'looks', looks, 'cheer_stages', stages, 'accessories', accs, 'frames', frms
    )
  where user_id = who
  returning coin_balance into bal;

  cos := jsonb_build_object('stamps', stamps, 'badges', badges, 'looks', looks, 'cheer_stages', stages, 'accessories', accs, 'frames', frms);
  return jsonb_build_object('coins', bal, 'catalog', cos);
end;
$$;

revoke all on function public.buy_with_coins(text, text) from public;
revoke all on function public.buy_with_coins(text, text) from anon;
grant execute on function public.buy_with_coins(text, text) to authenticated;

-- Back-compat name for older clients.
create or replace function public.buy_coin_cosmetic(kind text, item_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.buy_with_coins(kind, item_id);
$$;

revoke all on function public.buy_coin_cosmetic(text, text) from public;
revoke all on function public.buy_coin_cosmetic(text, text) from anon;
grant execute on function public.buy_coin_cosmetic(text, text) to authenticated;

-- Credit purchases on the server, not in the shelf JSON. This is the only
-- definition of claim_gem_purchases() — it must not be duplicated back into
-- gem-purchases.sql, since this file runs after it and needs to win.
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

  update public.profiles
  set gem_balance = least(gem_balance + got, 9999)
  where user_id = who;

  return query select got;
end;
$$;

-- Invite gems land on gem_balance too.
create or replace function public.claim_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  row public.profiles;
  gems integer := 0;
  looks text[] := '{}';
  joined integer;
  i integer;
  wins_look boolean;
  gems_left integer;
  pay integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into row from public.profiles where user_id = me for update;
  if row is null then
    return jsonb_build_object('gems', 0, 'looks', '[]'::jsonb, 'joined', 0);
  end if;

  select count(*) into joined from public.profiles where invited_by = me;
  gems_left := public.invite_gems_left(row.invite_gems_paid);

  if row.invited_by is not null and not row.joined_paid and gems_left > 0 then
    pay := least(public.invite_gems_for(1), gems_left);
    gems := gems + pay;
    gems_left := gems_left - pay;
  end if;

  for i in (row.invites_paid + 1)..joined loop
    if gems_left <= 0 then
      exit;
    end if;
    pay := least(public.invite_gems_for(i), gems_left);
    gems := gems + pay;
    gems_left := gems_left - pay;
  end loop;

  wins_look := joined >= public.invite_look_at() and not row.invite_look_paid;
  if wins_look then
    looks := array_append(looks, 'night');
  end if;

  if gems > 0 or wins_look then
    perform set_config('did_i.invite_write', '1', true);
    update public.profiles set
      joined_paid = (invited_by is not null),
      invites_paid = joined,
      invite_gems_paid = row.invite_gems_paid + gems,
      invite_look_paid = invite_look_paid or wins_look,
      gem_balance = least(gem_balance + gems, 9999)
    where user_id = me;
  end if;

  return jsonb_build_object('gems', gems, 'looks', to_jsonb(looks), 'joined', joined);
end;
$$;

-- Backfill balance from existing shelves once.
update public.profiles p
set gem_balance = least(
  greatest(p.gem_balance, coalesce(public.shelf_gem_max(s.doc), 0)),
  9999
)
from public.shelves s
where s.user_id = p.user_id
  and p.gem_balance = 0
  and public.shelf_gem_max(s.doc) > 0;

update public.profiles p
set coin_balance = least(
  greatest(p.coin_balance, coalesce(public.shelf_coin_max(s.doc), 0)),
  9999
)
from public.shelves s
where s.user_id = p.user_id
  and p.coin_balance = 0
  and public.shelf_coin_max(s.doc) > 0;

-- Balances only move through the functions above (they run as the owner) or the
-- gem-iap function (service role). A signed-in user writing their own profile row
-- keeps the stored balances, so nobody can set gem_balance = 9999 over the API.
create or replace function public.guard_profile_wallet()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.gem_balance := 0;
    new.coin_balance := 0;
    new.gem_week := '';
  else
    new.gem_balance := old.gem_balance;
    new.coin_balance := old.coin_balance;
    new.gem_week := old.gem_week;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_wallet on public.profiles;
create trigger guard_profile_wallet
  before insert or update on public.profiles
  for each row execute function public.guard_profile_wallet();

notify pgrst, 'reload schema';
