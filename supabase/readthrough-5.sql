-- Readthrough 5: invite gems credited again, gift returns only for doubles,
-- wrong family codes counted on join, one "done together" push per night,
-- pushes from someone you block dropped, avatar links pinned to this project.
-- Run after server-stamps.sql (just before drop-tonight.sql). Safe to run again.

-- 1. Invites ------------------------------------------------------------
-- referral-rewards.sql lost the gem_balance credit, so invite gems were
-- marked paid but never landed. The Night look also goes on the coin
-- catalog, where the phone reads coin looks from.
create or replace function public.claim_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  row public.profiles;
  gems integer := 0;
  looks text[] := '{}';
  buddies text[] := '{}';
  frames text[] := '{}';
  joined integer;
  i integer;
  wins_look boolean;
  gems_left integer;
  pay integer;
  cos jsonb;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into row from public.profiles where user_id = me for update;
  if row is null then
    return jsonb_build_object('gems', 0, 'looks', '[]'::jsonb, 'joined', 0,
      'buddies', '[]'::jsonb, 'frames', '[]'::jsonb);
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

  -- Listed every time from the count; they cost nothing to give again.
  if joined >= public.invite_buddy_at() then
    buddies := array_append(buddies, 'hive');
  end if;
  if joined >= public.invite_frame_at() then
    frames := array_append(frames, 'bloom');
  end if;

  if gems > 0 or wins_look then
    cos := public.coin_catalog_normalize(row.coin_cosmetics);
    if wins_look and not (cos->'looks' @> '["night"]'::jsonb) then
      cos := jsonb_set(cos, '{looks}', (cos->'looks') || '["night"]'::jsonb);
    end if;
    perform set_config('did_i.invite_write', '1', true);
    update public.profiles set
      joined_paid = (invited_by is not null),
      invites_paid = joined,
      invite_gems_paid = row.invite_gems_paid + gems,
      invite_look_paid = invite_look_paid or wins_look,
      gem_balance = least(gem_balance + gems, 9999),
      coin_cosmetics = case when wins_look then cos else coin_cosmetics end
    where user_id = me;
    -- Close the trusted-write window, so nothing later in the same
    -- transaction can rewrite the invite columns.
    perform set_config('did_i.invite_write', '', true);
  end if;

  return jsonb_build_object('gems', gems, 'looks', to_jsonb(looks), 'joined', joined,
    'buddies', to_jsonb(buddies), 'frames', to_jsonb(frames));
end;
$$;

revoke all on function public.claim_invites() from public, anon;
grant execute on function public.claim_invites() to authenticated;

-- 2. Gift returns ---------------------------------------------------------
-- had: the person already owned the item when the gift was opened (or an
-- earlier gift in the same batch gave it). Only those can go back, so the
-- giver is never refunded for something the receiver kept as new.
alter table public.cheer_gifts add column if not exists had boolean;

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
  gem jsonb;
  coin_looks text[];
  accs text[];
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  -- Read what they own before anything is added.
  select public.coin_catalog_normalize(p.coin_cosmetics), public.gem_owned_normalize(p.gem_cosmetics)
  into cos, gem
  from public.profiles p where p.user_id = who for update;
  cos := coalesce(cos, public.coin_catalog_normalize(null));
  gem := coalesce(gem, public.gem_owned_normalize(null));

  update public.cheer_gifts g
  set had = (
    case g.kind
      when 'look' then cos->'looks' @> jsonb_build_array(g.cheer_id)
        or gem->'looks' @> jsonb_build_array(g.cheer_id)
      when 'accessory' then cos->'accessories' @> jsonb_build_array(g.cheer_id)
      when 'cheer' then gem->'cheers' @> jsonb_build_array(g.cheer_id)
      when 'buddy' then gem->'buddies' @> jsonb_build_array(g.cheer_id)
      when 'frame' then gem->'frames' @> jsonb_build_array(g.cheer_id)
      else false
    end
  ) or exists (
    select 1 from public.cheer_gifts e
    where e.to_id = who and e.claimed_at is null and e.returned_at is null
      and e.kind = g.kind and e.cheer_id = g.cheer_id
      and (e.made_at, e.id) < (g.made_at, g.id)
  )
  where g.to_id = who and g.claimed_at is null and g.returned_at is null;

  select array_agg(distinct g.cheer_id) into coin_looks
  from public.cheer_gifts g
  where g.to_id = who and g.claimed_at is null and g.returned_at is null
    and g.kind = 'look' and g.coins > 0;

  if coin_looks is not null then
    select public.coin_catalog_normalize(p.coin_cosmetics) into cos
    from public.profiles p where p.user_id = who;
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
  where g.to_id = who and g.claimed_at is null and g.returned_at is null
    and g.kind = 'accessory';

  if accs is not null then
    select public.coin_catalog_normalize(p.coin_cosmetics) into cos
    from public.profiles p where p.user_id = who;
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
        where g.to_id = who and g.claimed_at is null and g.returned_at is null
          and g.kind = 'look' and g.coins = 0) u),
      'cheers', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'cheers') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.to_id = who and g.claimed_at is null and g.returned_at is null
          and g.kind = 'cheer') u),
      'buddies', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'buddies') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.to_id = who and g.claimed_at is null and g.returned_at is null
          and g.kind = 'buddy') u),
      'frames', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'frames') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.to_id = who and g.claimed_at is null and g.returned_at is null
          and g.kind = 'frame') u)
    )
  )
  where p.user_id = who
    and exists (select 1 from public.cheer_gifts g
      where g.to_id = who and g.claimed_at is null and g.returned_at is null
        and not (g.kind = 'look' and g.coins > 0) and g.kind <> 'accessory');

  return query
    with took as (
      update public.cheer_gifts g
      set claimed_at = now()
      where g.to_id = who and g.claimed_at is null and g.returned_at is null
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

revoke all on function public.claim_gifts() from public, anon;
grant execute on function public.claim_gifts() to authenticated;

-- A gift of something the person already had goes back to the giver.
-- Only the person it was sent to, once, after opening it, and only when
-- they had it before.
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
    and c.claimed_at is not null and c.had is true
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

revoke all on function public.return_gift(uuid) from public, anon;
grant execute on function public.return_gift(uuid) to authenticated;

-- 3. Family join ----------------------------------------------------------
-- A wrong code returns null instead of raising, so the miss row is kept and
-- counts toward the same 20 a day as look_up_family.
create or replace function public.join_family(want_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  fam uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if not public.family_code_tries_left(me) then
    raise exception 'too many tries';
  end if;
  select id into fam from public.families where code = upper(btrim(coalesce(want_code, '')));
  if fam is null then
    insert into public.family_code_misses (user_id) values (me);
    return null;
  end if;
  insert into public.family_members (family_id, user_id, role)
  values (fam, me, 'kid')
  on conflict (family_id, user_id) do nothing;
  return fam;
end;
$$;

revoke all on function public.join_family(text) from public, anon;
grant execute on function public.join_family(text) to authenticated;

-- 4. One "done together" push per card and night --------------------------
create table if not exists public.we_done_pushed (
  card_id uuid not null references public.we_cards on delete cascade,
  night date not null,
  primary key (card_id, night)
);

alter table public.we_done_pushed enable row level security;
revoke all on public.we_done_pushed from public, anon, authenticated;

create or replace function public.we_settle(card uuid, on_night date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  now_done boolean := public.we_is_done(card, on_night);
  was_done boolean := exists (select 1 from public.we_done where card_id = card and night = on_night);
  q text;
  first_time boolean;
begin
  if now_done and not was_done then
    -- The finisher is whoever said the Did that finished it. A join, leave or
    -- edit that tips the night over credits nobody.
    insert into public.we_done (card_id, night, finisher, finisher_cheer)
    select card, on_night, f.who, left(coalesce(p.badge_cheer, ''), 24)
    from (
      select case when exists (
        select 1 from public.we_answers a
        where a.card_id = card and a.night = on_night
          and a.user_id = (select auth.uid()) and a.status = 'did'
      ) then (select auth.uid()) end as who
    ) f
    left join public.profiles p on p.user_id = f.who
    on conflict do nothing;
    -- Did, undo, Did again: the push only goes out the first time.
    insert into public.we_done_pushed (card_id, night) values (card, on_night)
    on conflict do nothing;
    get diagnostics first_time = row_count;
    if first_time then
      select question into q from public.we_cards where id = card;
      insert into public.push_queue (to_id, title, body, go)
      select m.user_id, 'Did we', left(public.push_text(m.user_id, 'we_done', jsonb_build_object('q', left(q, 120))), 200), '/tonight'
      from public.we_members m
      where m.card_id = card and m.state = 'in' and public.push_wanted(m.user_id, 'we');
    end if;
  elsif was_done and not now_done then
    delete from public.we_done where card_id = card and night = on_night;
  end if;
  return now_done;
end;
$$;

revoke all on function public.we_settle(uuid, date) from public, anon, authenticated;

-- 5. Who a push is from -----------------------------------------------------
-- Every person-to-person push is queued while the sender is signed in (their
-- tap runs the function or trigger that inserts it), so the caller is the
-- sender. One trigger fills it for every insert site instead of editing each
-- function. Pushes to yourself and server jobs (no caller) stay null.
alter table public.push_queue
  add column if not exists from_id uuid references auth.users on delete set null;
create index if not exists push_queue_from_idx on public.push_queue (from_id);

create or replace function public.push_from()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.from_id is null then
    new.from_id := nullif((select auth.uid()), new.to_id);
  end if;
  return new;
end;
$$;

revoke all on function public.push_from() from public, anon, authenticated;

drop trigger if exists push_from on public.push_queue;
create trigger push_from
  before insert on public.push_queue
  for each row execute function public.push_from();

-- Block also drops pushes still waiting between the two people.
create or replace function public.block_person(other uuid, why text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if other = me then
    raise exception 'you cannot block yourself';
  end if;

  insert into public.blocks (blocker, blocked) values (me, other)
  on conflict do nothing;

  delete from public.friend_links
  where (from_id = me and to_id = other) or (from_id = other and to_id = me);

  delete from public.sends
  where state = 'sent'
    and ((from_id = me and to_id = other) or (from_id = other and to_id = me));

  delete from public.push_queue
  where sent_at is null
    and ((from_id = other and to_id = me) or (from_id = me and to_id = other));

  if btrim(coalesce(why, '')) <> '' then
    insert into public.reports (from_id, about_id, reason) values (me, other, left(why, 500));
  end if;
end;
$$;

revoke all on function public.block_person(uuid, text) from public, anon;
grant execute on function public.block_person(uuid, text) to authenticated;

-- 6. Avatar links ---------------------------------------------------------
-- Only this project's storage (ref from env.client.js), not any *.supabase.co.
-- not valid: checks every new write without failing on an old row.
alter table public.profiles drop constraint if exists profiles_avatar_url_shape;
alter table public.profiles add constraint profiles_avatar_url_shape
  check (
    avatar_url is null
    or avatar_url = ''
    or (
      length(avatar_url) <= 400
      and avatar_url ~ '^https://lsvvxslgizihbktqoybt\.supabase\.co/storage/v1/object/public/avatars/'
      and position('/avatars/' || user_id::text || '/' in avatar_url) > 0
    )
  ) not valid;
