-- Did we safety: a deleted account leaves its cards the normal way, an ended
-- card says so, a kid's card holds only the kid's family, and we_close takes
-- the same card lock as the other writers.
--
-- Redefines delete_me (latest: drop-tonight.sql), we_answer (we-slots.sql),
-- we_join_link (share-links.sql),
-- we_make, we_ask and we_close (did-we.sql). Applied last in db:apply:all.

-- Whether other may join card, by the kid rule: a family kid shares a card
-- only with people in one of the kid's families. Checked both ways against
-- everyone on it or asked (an ask past its two weeks is gone).
create or replace function public.we_kid_ok(card uuid, other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1 from public.we_members m
    where m.card_id = card
      and m.user_id <> other
      and (m.state = 'in'
        or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days())))
      and exists (
        select 1 from public.family_members k
        where k.role = 'kid' and k.user_id in (m.user_id, other)
      )
      and not public.shares_family_of(m.user_id, other)
  );
$$;

revoke all on function public.we_kid_ok(uuid, uuid) from public, anon, authenticated;

create or replace function public.we_make(
  want_question text,
  want_mode text default 'all',
  want_shows text default 'waiting',
  want_cadence text default 'daily',
  want_weekdays smallint[] default '{}',
  want_goal smallint default null,
  ask uuid[] default '{}',
  want_starts date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  card uuid;
  other uuid;
  spot smallint := 1;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from public.we_cards c
      join public.we_members m on m.card_id = c.id and m.user_id = who and m.state = 'in'
      where not c.archived) >= public.we_max_cards() then
    raise exception 'too many shared questions';
  end if;
  if (select count(*) from public.we_cards c
      where c.made_by = who and c.made_at > now() - interval '1 day') >= public.we_max_new_daily() then
    raise exception 'too many new today';
  end if;
  -- Nobody asked is fine: a Did we can start with just you and a share link
  -- (we_make_link in share-links.sql).
  if coalesce(array_length(ask, 1), 0) >= public.we_max_members() then
    raise exception 'too many people';
  end if;

  insert into public.we_cards (made_by, question, mode, shows, cadence, weekdays, goal_nights, starts_on)
  values (
    who,
    btrim(want_question),
    coalesce(want_mode, 'all'),
    coalesce(want_shows, 'waiting'),
    coalesce(want_cadence, 'daily'),
    coalesce(want_weekdays, '{}'),
    want_goal,
    public.we_near_night(want_starts)
  )
  returning id into card;

  insert into public.we_members (card_id, user_id, state, turn, asked_by, joined_at)
  values (card, who, 'in', 0, who, now());

  foreach other in array ask loop
    if not public.we_can_ask(other) then
      raise exception 'can only ask friends or family';
    end if;
    if not public.we_kid_ok(card, other) then
      raise exception 'kid card is family only';
    end if;
    if public.we_said_no_lately(other) then
      raise exception 'they said no lately';
    end if;
    insert into public.we_members (card_id, user_id, state, turn, asked_by)
    values (card, other, 'asked', spot, who)
    on conflict do nothing;
    spot := spot + 1;
  end loop;

  return card;
end;
$$;

revoke all on function public.we_make(text, text, text, text, smallint[], smallint, uuid[], date) from public, anon;
grant execute on function public.we_make(text, text, text, text, smallint[], smallint, uuid[], date) to authenticated;

-- Anyone on the card can ask one more person in.
create or replace function public.we_ask(card uuid, other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if not exists (select 1 from public.we_members where card_id = card and user_id = who and state = 'in') then
    raise exception 'not on this card';
  end if;
  if not public.we_can_ask(other) then
    raise exception 'can only ask friends or family';
  end if;
  -- Same lock as the other writers, so two asks cannot both pass the kid rule.
  perform pg_advisory_xact_lock(hashtext('we_card:' || card::text));
  if not public.we_kid_ok(card, other) then
    raise exception 'kid card is family only';
  end if;
  if public.we_said_no_lately(other, card) then
    raise exception 'they said no lately';
  end if;
  -- An ask past its two weeks counts as gone, the same as one turned down.
  if (select count(*) from public.we_members
      where card_id = card
        and (state = 'in'
          or (state = 'asked' and asked_at > now() - make_interval(days => public.we_ask_days()))))
     >= public.we_max_members() then
    raise exception 'too many people';
  end if;
  insert into public.we_members (card_id, user_id, state, turn, asked_by)
  values (
    card, other, 'asked',
    coalesce((select max(turn) + 1 from public.we_members where card_id = card), 1),
    who
  )
  on conflict (card_id, user_id) do update
    set state = 'asked', asked_by = who, asked_at = now(), said_no_at = null
    where public.we_members.state = 'left'
      or (public.we_members.state = 'asked'
        and public.we_members.asked_at <= now() - make_interval(days => public.we_ask_days()));
end;
$$;

revoke all on function public.we_ask(uuid, uuid) from public;
grant execute on function public.we_ask(uuid, uuid) to authenticated;

-- The owner closes it for everyone. Answers stay; it drops off every list.
create or replace function public.we_close(card uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('we_card:' || card::text));
  update public.we_cards set archived = true
  where id = card and made_by = (select auth.uid()) and not archived;
  if not found then
    raise exception 'only the person who made it can change it';
  end if;
end;
$$;

revoke all on function public.we_close(uuid) from public;
revoke all on function public.we_close(uuid) from anon;
grant execute on function public.we_close(uuid) to authenticated;

create or replace function public.we_answer(card uuid, on_night date, want_status text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  c public.we_cards;
  target date;
  was_done boolean;
begin
  if not exists (select 1 from public.we_members where card_id = card and user_id = who and state = 'in') then
    raise exception 'not on this card';
  end if;
  -- One change to a card at a time: two people answering in the same moment
  -- would each count only their own Did, and the night would stay not done.
  perform pg_advisory_xact_lock(hashtext('we_card:' || card::text));
  -- Tonight or the night before in any time zone. No reaching back to fill
  -- in a streak.
  if on_night < current_date - 2 then
    raise exception 'that night is closed';
  end if;
  select * into c from public.we_cards where id = card;
  if on_night > current_date + 1 then
    -- Done early: a card's next asked night may be answered up to a week
    -- ahead, never a night after it.
    if on_night > current_date + 7
       or not public.we_due(c.starts_on, c.cadence, c.weekdays, on_night)
       or exists (
         select 1 from generate_series(current_date + 2, on_night - 1, interval '1 day') g(d)
         where public.we_due(c.starts_on, c.cadence, c.weekdays, g.d::date)
       ) then
      raise exception 'that night is closed';
    end if;
    target := on_night;
  else
    -- A day that is not a due night only counts for the slot it is in, and
    -- only while it is tonight in some time zone.
    if not public.we_due(c.starts_on, c.cadence, c.weekdays, on_night) and on_night < current_date - 1 then
      raise exception 'that night is closed';
    end if;
    target := public.we_target(c.starts_on, c.cadence, c.weekdays, on_night);
    if target is null or target > current_date + 7 then
      raise exception 'that night is closed';
    end if;
  end if;
  -- A weekly day that maps back to an older slot cannot undo it: that would
  -- lower a streak after the fact.
  if target <> on_night and target < current_date - 1 and want_status is distinct from 'did'
     and exists (select 1 from public.we_done where card_id = card and night = target) then
    raise exception 'that night is closed';
  end if;
  -- A closed card, or a night it is not asked, takes no new answers. Taking
  -- one back (want_status null) still works after the card changed.
  if want_status is not null and c.archived then
    raise exception 'card ended';
  end if;
  if want_status is not null and not public.we_due(c.starts_on, c.cadence, c.weekdays, target) then
    raise exception 'that night is closed: not asked';
  end if;
  perform public.we_pin_turns(card, target, target);
  was_done := exists (select 1 from public.we_done where card_id = card and night = target);
  if want_status is null then
    delete from public.we_answers where card_id = card and user_id = who and night = target;
  else
    insert into public.we_answers (card_id, user_id, night, status)
    values (card, who, target, want_status)
    on conflict (card_id, user_id, night) do update
      set status = excluded.status, answered_at = now();
  end if;
  if not public.we_settle(card, target) then
    return 0;
  end if;
  return case when was_done then 1 else 2 end;
end;
$$;

revoke all on function public.we_answer(uuid, date, text) from public;
grant execute on function public.we_answer(uuid, date, text) to authenticated;

create or replace function public.delete_me()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := (select auth.uid());
  fam uuid;
  heir uuid;
  card uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  -- Leave every Did we first, the normal way: the next person takes over a
  -- card you made, the last one out ends it, and done nights are counted again.
  for card in
    select card_id from public.we_members where user_id = me and state = 'in'
  loop
    perform public.we_leave(card);
  end loop;
  -- Gifts waiting for you go back to whoever paid for them.
  with back as (
    update public.cheer_gifts g
    set returned_at = now()
    where g.to_id = me and g.claimed_at is null and g.returned_at is null
      and g.from_id is not null and g.from_id <> me
    returning g.from_id, g.gems, g.coins
  )
  update public.profiles p
  set gem_balance = least(p.gem_balance + s.gems, 999999),
      coin_balance = least(p.coin_balance + s.coins, 999999)
  from (select from_id, sum(gems) as gems, sum(coins) as coins from back group by from_id) s
  where p.user_id = s.from_id;
  -- Hand each family to somebody else, or close it if you were the only one.
  for fam in
    select family_id from public.family_members where user_id = me and role = 'parent'
  loop
    select user_id into heir
    from public.family_members
    where family_id = fam and user_id <> me
    order by role = 'parent' desc, joined_at
    limit 1;
    if heir is null then
      delete from public.families where id = fam;
    else
      update public.family_members set role = 'parent'
      where family_id = fam and user_id = heir;
    end if;
  end loop;
  delete from public.family_members where user_id = me;
  delete from public.shelves where user_id = me;
  delete from public.profiles where user_id = me;
  delete from public.devices where user_id = me;
  -- Photo files stay public until removed. Supabase may block direct deletes
  -- on storage.objects (storage.protect_delete); then the app's Storage API
  -- call is the only way, so a refusal here must not stop the account delete.
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
    where bucket_id = 'avatars' and (storage.foldername(name))[1] = me::text;
  exception when others then
    raise warning 'delete_me: avatar files left for %: %', me, sqlerrm;
  end;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_me() from public;
revoke all on function public.delete_me() from anon;
grant execute on function public.delete_me() to authenticated;


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
    if add_friend then perform public.link_ask_friend(link.made_by); end if;
    return jsonb_build_object('card', link.card_id, 'already', true);
  end if;
  -- Nobody already on the card can be someone you blocked, or who blocked you.
  if exists (select 1 from public.we_members m
             where m.card_id = link.card_id and m.state in ('in', 'asked') and m.user_id <> me
               and public.blocked_with(m.user_id)) then
    return jsonb_build_object('miss', 'blocked');
  end if;
  -- A kid shares a card only with the kid's family, by link too.
  if not public.we_kid_ok(link.card_id, me) then
    raise exception 'kid card is family only';
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
  -- Keep whose turn the nights around now were before someone new joins.
  perform public.we_pin_turns(link.card_id, current_date - 1, current_date + 1);
  insert into public.we_members (card_id, user_id, state, turn, asked_by, joined_at)
  values (
    link.card_id, me, 'in',
    coalesce((select max(turn) + 1 from public.we_members where card_id = link.card_id), 1),
    link.made_by, now()
  )
  on conflict (card_id, user_id) do update
    set state = 'in', joined_at = now(), asked_by = excluded.asked_by, said_no_at = null;
  update public.we_links set uses = uses + 1 where we_links.code = link.code;
  -- A new member can undo a done night on an all-of-us card.
  perform public.we_resettle(link.card_id);
  -- Tell the maker someone joined. Someone who was asked already set off the
  -- yes push (we-joined-push.sql), so this one would be a second copy.
  if link.made_by <> me and was is distinct from 'asked' and public.push_wanted(link.made_by, 'friends') then
    insert into public.push_queue (to_id, title, body, go)
    select link.made_by, 'Did we',
      left(public.push_text(link.made_by, 'link_joined', jsonb_build_object(
        'name', coalesce((select nullif(trim(p.display_name), '') from public.profiles p where p.user_id = me),
                         public.push_text(link.made_by, 'a_friend')),
        'q', left(c.question, 120))), 200),
      '/tonight'
    from public.we_cards c where c.id = link.card_id;
  end if;
  if add_friend then perform public.link_ask_friend(link.made_by); end if;
  return jsonb_build_object('card', link.card_id);
end;
$$;

revoke all on function public.we_join_link(text, boolean) from public, anon;
grant execute on function public.we_join_link(text, boolean) to authenticated;

notify pgrst, 'reload schema';
