-- Share links for people who are not friends yet. Apply after did-we.sql,
-- did-we-guard.sql, blocks.sql and did-you-links.sql. Safe to run again.
--
-- did-i.app/d/CODE with a 10 letter code is a Did you link
-- (did-you-links.sql). The same path with a 12 letter code is a Did we
-- link: opening it lets someone join that Did we. Both can add the person
-- who made the link as a friend, but only when the person opening it says
-- so (befriend_by_link, or add_friend on we_join_link).

-- Friends through a link ---------------------------------------------------

-- Both sides at once: the maker said yes by sharing the link, the other
-- person by tapping add. Never with someone either of you has blocked.
-- Not callable on its own; only the link functions below use it.
create or replace function public.link_befriend(other uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or other is null or other = me or public.blocked_with(other) then
    return false;
  end if;
  insert into public.friend_links (from_id, to_id, state) values (me, other, 'ok')
  on conflict (from_id, to_id) do update set state = 'ok';
  insert into public.friend_links (from_id, to_id, state) values (other, me, 'ok')
  on conflict (from_id, to_id) do update set state = 'ok';
  return true;
end;
$$;

revoke all on function public.link_befriend(uuid) from public, anon, authenticated;

-- Add whoever made a Did you link. False for a Did I link, an ended link,
-- your own link, or a block.
create or replace function public.befriend_by_link(code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  maker uuid;
begin
  if (select auth.uid()) is null then return false; end if;
  select l.made_by into maker from public.did_you_links l
  where l.code = lower(btrim(coalesce(befriend_by_link.code, ''))) and not l.ended;
  if maker is null then return false; end if;
  return public.link_befriend(maker);
end;
$$;

revoke all on function public.befriend_by_link(text) from public, anon;
grant execute on function public.befriend_by_link(text) to authenticated;

-- Did we links -------------------------------------------------------------

create table if not exists public.we_links (
  code text primary key,
  card_id uuid not null references public.we_cards on delete cascade,
  made_by uuid not null references auth.users on delete cascade,
  made_at timestamptz not null default now(),
  ends_at timestamptz not null default now() + interval '7 days',
  ended boolean not null default false,
  uses integer not null default 0
);

alter table public.we_links drop constraint if exists we_links_code_ok;
alter table public.we_links add constraint we_links_code_ok check (code ~ '^[a-z0-9]{12}$');

create index if not exists we_links_card_idx on public.we_links (card_id);
create index if not exists we_links_made_by_idx on public.we_links (made_by, made_at);

alter table public.we_links enable row level security;
revoke all on public.we_links from anon, authenticated;
grant select on public.we_links to authenticated;

drop policy if exists "own we links" on public.we_links;
create policy "own we links" on public.we_links
  for select to authenticated using (made_by = (select auth.uid()));

create or replace function public.we_max_links_daily() returns integer language sql immutable as $$ select 10 $$;

-- A link to a Did we you are on. Hands back the one you already have for
-- that card while it still works, so sharing twice does not use up the cap.
create or replace function public.we_make_link(card uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  letters text := 'abcdefghjkmnpqrstuvwxyz23456789';
  found text;
  code text;
  tries integer := 0;
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (
    select 1 from public.we_members m
    join public.we_cards c on c.id = m.card_id
    where m.card_id = card and m.user_id = me and m.state = 'in' and not c.archived
  ) then
    raise exception 'not on this card';
  end if;
  perform pg_advisory_xact_lock(hashtext('we_link:' || me::text));
  select l.code into found from public.we_links l
  where l.card_id = card and l.made_by = me and not l.ended and l.ends_at > now() + interval '1 day'
  order by l.made_at desc limit 1;
  if found is not null then return found; end if;
  if (select count(*) from public.we_links l
      where l.made_by = me and l.made_at > now() - interval '1 day') >= public.we_max_links_daily() then
    raise exception 'too many links today';
  end if;
  loop
    code := '';
    for i in 1..12 loop
      code := code || substr(letters, 1 + floor(random() * length(letters))::int, 1);
    end loop;
    begin
      insert into public.we_links (code, card_id, made_by) values (code, card, me);
      return code;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 5 then raise; end if;
    end;
  end loop;
end;
$$;

revoke all on function public.we_make_link(uuid) from public, anon;
grant execute on function public.we_make_link(uuid) to authenticated;

-- Turns off every link you made for this card.
create or replace function public.we_end_links(card uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.we_links set ended = true
  where card_id = card and made_by = (select auth.uid()) and not ended;
$$;

revoke all on function public.we_end_links(uuid) from public, anon;
grant execute on function public.we_end_links(uuid) to authenticated;

-- What the link page, the link preview and the app show: the question, who
-- made the link, and how many are on it. Nothing for an unknown, ended or
-- expired link, or a closed card.
create or replace function public.look_up_we_link(code text)
returns table (question text, name text, avatar_url text, people integer, full_up boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.question,
    coalesce(nullif(p.display_name, ''), nullif('@' || coalesce(p.handle, ''), '@')),
    nullif(p.avatar_url, ''),
    (select count(*)::int from public.we_members m where m.card_id = c.id and m.state = 'in'),
    (select count(*) from public.we_members m where m.card_id = c.id
      and (m.state = 'in' or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days()))))
      >= public.we_max_members()
  from public.we_links l
  join public.we_cards c on c.id = l.card_id and not c.archived
  left join public.profiles p on p.user_id = l.made_by
  where l.code = lower(btrim(look_up_we_link.code)) and not l.ended and l.ends_at > now()
    -- A link stops when the person who made it is no longer on the card.
    and exists (select 1 from public.we_members mm where mm.card_id = l.card_id and mm.user_id = l.made_by and mm.state = 'in')
  limit 1;
$$;

revoke all on function public.look_up_we_link(text) from public;
grant execute on function public.look_up_we_link(text) to anon, authenticated;

-- Join from a link. Returns {card} or {miss}: gone, full, blocked, cap.
-- add_friend also makes you friends with whoever made the link.
create or replace function public.we_join_link(code text, add_friend boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  link public.we_links;
  was text;
begin
  if me is null then raise exception 'sign in first'; end if;
  select l.* into link from public.we_links l
  join public.we_cards c on c.id = l.card_id and not c.archived
  where l.code = lower(btrim(coalesce(we_join_link.code, ''))) and not l.ended and l.ends_at > now()
    and exists (select 1 from public.we_members mm where mm.card_id = l.card_id and mm.user_id = l.made_by and mm.state = 'in');
  if link.code is null then
    return jsonb_build_object('miss', 'gone');
  end if;
  perform pg_advisory_xact_lock(hashtext('we_card:' || link.card_id::text));
  select m.state into was from public.we_members m where m.card_id = link.card_id and m.user_id = me;
  if was = 'in' then
    if add_friend then perform public.link_befriend(link.made_by); end if;
    return jsonb_build_object('card', link.card_id, 'already', true);
  end if;
  -- Nobody already on the card can be someone you blocked, or who blocked you.
  if exists (select 1 from public.we_members m
             where m.card_id = link.card_id and m.state in ('in', 'asked') and m.user_id <> me
               and public.blocked_with(m.user_id)) then
    return jsonb_build_object('miss', 'blocked');
  end if;
  if (select count(*) from public.we_cards c
      join public.we_members m on m.card_id = c.id and m.user_id = me and m.state = 'in'
      where not c.archived) >= public.we_max_cards() then
    return jsonb_build_object('miss', 'cap');
  end if;
  if (select count(*) from public.we_members m
      where m.card_id = link.card_id and m.user_id <> me
        and (m.state = 'in' or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days()))))
     >= public.we_max_members() then
    return jsonb_build_object('miss', 'full');
  end if;
  insert into public.we_members (card_id, user_id, state, turn, asked_by, joined_at)
  values (
    link.card_id, me, 'in',
    coalesce((select max(turn) + 1 from public.we_members where card_id = link.card_id), 1),
    link.made_by, now()
  )
  on conflict (card_id, user_id) do update
    set state = 'in', joined_at = now(), asked_by = excluded.asked_by, said_no_at = null;
  update public.we_links set uses = uses + 1 where we_links.code = link.code;
  if add_friend then perform public.link_befriend(link.made_by); end if;
  return jsonb_build_object('card', link.card_id);
end;
$$;

revoke all on function public.we_join_link(text, boolean) from public, anon;
grant execute on function public.we_join_link(text, boolean) to authenticated;
