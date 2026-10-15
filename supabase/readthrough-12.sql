-- Readthrough 12: push tokens, hidden streaks, late gifts, Did we notes,
-- and blocks between family members.
-- Applies after readthrough-9.sql and before drop-tonight.sql.
--
-- Blocks and family: a blocked family member still SEES family answers on
-- purpose (the family stays one family). A block stops contact, either way:
-- assigning questions, shared Did wes, Did we asks and pushes.

-- 1. One push token, one account. A phone that signs out offline keeps its
-- devices row; when someone else signs in on it, the token moves to them so
-- the first account's pushes stop landing on the second person's phone.
create index if not exists devices_push_token_idx on public.devices (push_token)
  where push_token is not null;

create or replace function public.devices_one_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.push_token is not null then
    update public.devices set push_token = null
    where push_token = new.push_token and user_id <> new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function public.devices_one_token() from public, anon, authenticated;

drop trigger if exists devices_one_token on public.devices;
create trigger devices_one_token
  before insert or update of push_token on public.devices
  for each row execute function public.devices_one_token();

-- 2. known_people: streak and done_on are null when share_streak is off.
-- Full body from social-gentle.sql otherwise (gentle still hides the streak).
create or replace function public.known_people()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  share_streak boolean,
  streak integer,
  done_on date,
  avatar_url text,
  buddy_on text,
  look_on text,
  frame_on text,
  gentle boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select case when l.from_id = (select id from me) then l.to_id else l.from_id end as who
    from public.friend_links l
    where l.state = 'ok' and (select id from me) in (l.from_id, l.to_id)
    union
    select theirs.user_id
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select id from me)
  )
  select p.user_id, p.handle, p.display_name, p.share_streak,
    case when coalesce(p.prefs ->> 'gentle', '') = 'true' or not p.share_streak then null else p.streak end,
    case when p.share_streak then p.done_on end,
    nullif(p.avatar_url, ''), coalesce(p.buddy_on, ''),
    coalesce(p.look_on, 'lime'), coalesce(p.frame_on, ''),
    coalesce(p.prefs ->> 'gentle', '') = 'true'
  from public.profiles p
  join mine on mine.who = p.user_id
  where p.user_id <> (select id from me)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = (select id from me) and b.blocked = p.user_id)
         or (b.blocker = p.user_id and b.blocked = (select id from me))
    );
$$;

revoke all on function public.known_people() from public, anon;
grant execute on function public.known_people() to authenticated;

-- 3. claim_gifts: a gift that lands after the had marking still has had
-- null, so it waits for the next claim, where a duplicate is paid back.
-- Full body from readthrough-9.sql otherwise.
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
  ids uuid[];
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  -- One lock order for the recipient and the givers it may pay back.
  perform 1 from public.profiles p
  where p.user_id = who
    or p.user_id in (select g.from_id from public.cheer_gifts g
      where g.to_id = who and g.claimed_at is null and g.returned_at is null)
  order by p.user_id
  for update;

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

  -- Already had: claimed and returned at once, the giver paid back.
  with back as (
    update public.cheer_gifts g
    set claimed_at = now(), returned_at = now()
    where g.to_id = who and g.claimed_at is null and g.returned_at is null
      and g.had is true
    returning g.from_id, g.gems, g.coins
  )
  update public.profiles p
  set gem_balance = least(p.gem_balance + s.gems, 9999),
      coin_balance = least(p.coin_balance + s.coins, 9999)
  from (select b.from_id, sum(b.gems) as gems, sum(b.coins) as coins
        from back b where b.from_id is not null group by b.from_id) s
  where p.user_id = s.from_id;

  with took as (
    update public.cheer_gifts g
    set claimed_at = now()
    where g.to_id = who and g.claimed_at is null and g.returned_at is null
      and g.had is not null
    returning g.id
  )
  select array_agg(t.id) into ids from took t;

  if ids is null then
    return;
  end if;

  select array_agg(distinct g.cheer_id) into coin_looks
  from public.cheer_gifts g
  where g.id = any (ids) and g.kind = 'look' and g.coins > 0;

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
  where g.id = any (ids) and g.kind = 'accessory';

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
        where g.id = any (ids) and g.kind = 'look' and g.coins = 0) u),
      'cheers', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'cheers') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.id = any (ids) and g.kind = 'cheer') u),
      'buddies', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'buddies') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.id = any (ids) and g.kind = 'buddy') u),
      'frames', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
        select jsonb_array_elements_text(public.gem_owned_normalize(p.gem_cosmetics)->'frames') as x
        union select g.cheer_id from public.cheer_gifts g
        where g.id = any (ids) and g.kind = 'frame') u)
    )
  )
  where p.user_id = who
    and exists (select 1 from public.cheer_gifts g
      where g.id = any (ids)
        and not (g.kind = 'look' and g.coins > 0) and g.kind <> 'accessory');

  return query
    select g.id, g.kind, g.cheer_id, g.note, g.from_id,
      coalesce(nullif(btrim(p.display_name), ''), '') as from_name,
      g.gems, g.coins
    from public.cheer_gifts g
    left join public.profiles p on p.user_id = g.from_id
    where g.id = any (ids)
    order by g.made_at;
end;
$$;

revoke all on function public.claim_gifts() from public, anon;
grant execute on function public.claim_gifts() to authenticated;

-- 4. Did we note helpers answer only for a card the caller is on. The
-- we_notes policies call them while the caller is on the card, so they hold.
-- Full bodies from social-amounts.sql otherwise.
create or replace function public.we_note_in(card uuid, who uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.we_seen(card) and exists (
    select 1 from public.we_members m
    join public.we_cards c on c.id = m.card_id
    where m.card_id = card and m.user_id = who and m.state = 'in' and not c.archived
  );
$$;

create or replace function public.we_note_did(card uuid, who uuid, on_night date)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.we_seen(card) and exists (
    select 1 from public.we_answers
    where card_id = card and user_id = who and night = on_night and status = 'did'
  );
$$;

revoke all on function public.we_note_in(uuid, uuid) from public, anon;
revoke all on function public.we_note_did(uuid, uuid, date) from public, anon;
grant execute on function public.we_note_in(uuid, uuid) to authenticated;
grant execute on function public.we_note_did(uuid, uuid, date) to authenticated;

-- 5a. No family question for someone you have a block with, either way.
-- Insert from rls-subselect.sql, edit from consent-guards.sql, plus the block.
drop policy if exists "add a family question" on public.family_lamps;
create policy "add a family question" on public.family_lamps
  for insert with check (
    (select auth.uid()) = made_by
    and (
      public.is_parent(family_id)
      or (public.in_family(family_id) and for_id = (select auth.uid()))
    )
    and (for_id is null or not public.blocked_with(for_id))
  );

drop policy if exists "edit a family question" on public.family_lamps;
create policy "edit a family question" on public.family_lamps
  for update using (public.is_parent(family_id) or (select auth.uid()) = made_by)
  with check (
    public.in_family(family_id)
    and (public.is_parent(family_id) or (select auth.uid()) = made_by)
    and (for_id is null or not public.blocked_with(for_id))
  );

-- 5b. Block also leaves every Did we shared with that person (we_leave_shared
-- from unfriend.sql: state 'left', the others keep the card and it resettles;
-- the last one out closes it). Full body from readthrough-5.sql otherwise.
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

  perform public.we_leave_shared(other);

  if btrim(coalesce(why, '')) <> '' then
    insert into public.reports (from_id, about_id, reason) values (me, other, left(why, 500));
  end if;
end;
$$;

revoke all on function public.block_person(uuid, text) from public, anon;
grant execute on function public.block_person(uuid, text) to authenticated;

-- 5c. No Did we ask push across a block. Full body from did-we.sql otherwise.
create or replace function public.queue_we_ask_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  name text;
  q text;
begin
  if new.state <> 'asked' or new.user_id = new.asked_by then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.state = 'asked' and old.asked_at = new.asked_at then
    return new;
  end if;
  if exists (select 1 from public.blocks b
      where (b.blocker = new.asked_by and b.blocked = new.user_id)
         or (b.blocker = new.user_id and b.blocked = new.asked_by)) then
    return new;
  end if;
  if not public.push_wanted(new.user_id, 'we') then
    return new;
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), 'Someone') into name
  from public.profiles p where p.user_id = new.asked_by;
  select question into q from public.we_cards where id = new.card_id;
  insert into public.push_queue (to_id, title, body, go)
  values (new.user_id,
    left(public.push_text(new.user_id, 'we_asked', jsonb_build_object('name', coalesce(name, public.push_text(new.user_id, 'someone')))), 80),
    left(public.push_text(new.user_id, 'we_ask', jsonb_build_object('q', left(q, 120))), 200), '/inbox');
  return new;
end;
$$;

-- 5d. Catch-all: a person-to-person push across a block is dropped. Server
-- pushes (no from_id) go through. Full body from readthrough-5.sql otherwise.
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
  if new.from_id is not null and exists (select 1 from public.blocks b
      where (b.blocker = new.from_id and b.blocked = new.to_id)
         or (b.blocker = new.to_id and b.blocked = new.from_id)) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.push_from() from public, anon, authenticated;
