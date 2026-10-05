-- Did I, Did we. One question that two or more people answer together.
-- Run after people.sql, hardening.sql, blocks.sql, push.sql and wallet.sql.
-- Safe to run again.
--
-- Nobody reads another person's answer straight from a table. The owner of
-- a card picks what the others see (every answer, only who is still
-- waiting, or just a count), so answers come out through we_tonight(),
-- which hides what the card says to hide. Every write goes through a
-- function here too; the tables only let you read your own rows.

-- Tables --------------------------------------------------------------

-- The buddy you wear, shown on the Did we cards you share (next to the
-- look and cheer friends can already see). '' is none.
alter table public.profiles add column if not exists buddy_on text not null default '';
alter table public.profiles drop constraint if exists profiles_buddy_on_ok;
alter table public.profiles add constraint profiles_buddy_on_ok
  check (buddy_on ~ '^[a-z0-9-]{0,24}$');

create table if not exists public.we_cards (
  id uuid primary key default gen_random_uuid(),
  made_by uuid references auth.users on delete set null,
  question text not null,
  -- all: everyone says did. any: one person is enough. most: over half.
  -- turns: tonight's person says did, and the turn moves each night.
  mode text not null default 'all' check (mode in ('all', 'any', 'most', 'turns')),
  -- all: everyone sees every answer. waiting: a did shows, a nope reads as
  -- still waiting. count: only "1 of 2", no names on answers.
  shows text not null default 'waiting' check (shows in ('all', 'waiting', 'count')),
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly')),
  weekdays smallint[] not null default '{}',
  -- A challenge: done together this many nights and it is finished.
  goal_nights smallint check (goal_nights is null or goal_nights between 1 and 365),
  starts_on date not null default current_date,
  archived boolean not null default false,
  made_at timestamptz not null default now(),
  constraint we_cards_question_len check (length(question) between 1 and 200),
  constraint we_cards_weekdays_ok check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

create index if not exists we_cards_made_by_idx on public.we_cards (made_by);

create table if not exists public.we_members (
  card_id uuid not null references public.we_cards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  -- asked: invited, has not said yes. in: answering. left: gone, history kept.
  state text not null default 'asked' check (state in ('asked', 'in', 'left')),
  turn smallint not null default 0,
  asked_by uuid references auth.users on delete set null,
  asked_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (card_id, user_id)
);

-- When an ask was turned down. The row stays (state left) so the same ask
-- cannot come straight back; see we_ask.
alter table public.we_members add column if not exists said_no_at timestamptz;

create index if not exists we_members_user_idx on public.we_members (user_id, state);
create index if not exists we_members_asked_by_idx on public.we_members (asked_by);

create table if not exists public.we_answers (
  card_id uuid not null references public.we_cards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  night date not null,
  status text not null check (status in ('did', 'nope')),
  answered_at timestamptz not null default now(),
  primary key (card_id, user_id, night)
);

create index if not exists we_answers_user_idx on public.we_answers (user_id);
create index if not exists we_answers_night_idx on public.we_answers (card_id, night);

-- A night the card was done together. Kept so streaks and look-backs are a
-- short index read, not a walk over every answer.
create table if not exists public.we_done (
  card_id uuid not null references public.we_cards on delete cascade,
  night date not null,
  primary key (card_id, night)
);

-- Who said the did that finished it, and the cheer they wore, so everyone
-- else sees that cheer when they next open the app.
alter table public.we_done add column if not exists finisher uuid references auth.users on delete set null;
alter table public.we_done add column if not exists finisher_cheer text not null default '';
alter table public.we_done drop constraint if exists we_done_cheer_len;
alter table public.we_done add constraint we_done_cheer_len check (length(finisher_cheer) <= 24);
create index if not exists we_done_finisher_idx on public.we_done (finisher);

-- One "your turn" nudge per person per card per night.
create table if not exists public.we_nudges (
  card_id uuid not null references public.we_cards on delete cascade,
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  night date not null,
  primary key (card_id, from_id, to_id, night)
);

create index if not exists we_nudges_from_idx on public.we_nudges (from_id);
create index if not exists we_nudges_to_idx on public.we_nudges (to_id);

-- Coins paid for a shared streak milestone, once per person per milestone.
create table if not exists public.we_streak_grants (
  card_id uuid not null references public.we_cards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  milestone smallint not null,
  primary key (card_id, user_id, milestone)
);

create index if not exists we_streak_grants_user_idx on public.we_streak_grants (user_id);

-- Row level security --------------------------------------------------

alter table public.we_cards enable row level security;
alter table public.we_members enable row level security;
alter table public.we_answers enable row level security;
alter table public.we_done enable row level security;
alter table public.we_nudges enable row level security;
alter table public.we_streak_grants enable row level security;

revoke all on public.we_cards, public.we_members, public.we_answers,
  public.we_done, public.we_nudges, public.we_streak_grants from anon;
-- Reads only. Every change goes through the functions below.
revoke insert, update, delete on public.we_cards, public.we_members, public.we_answers,
  public.we_done, public.we_nudges, public.we_streak_grants from authenticated;

create or replace function public.we_seen(card uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.we_members
    where card_id = card and user_id = (select auth.uid())
      and (state = 'in' or (state = 'asked' and asked_at > now() - interval '14 days'))
  );
$$;

revoke all on function public.we_seen(uuid) from public;
grant execute on function public.we_seen(uuid) to authenticated;

drop policy if exists "see cards you are on" on public.we_cards;
create policy "see cards you are on" on public.we_cards
  for select using (public.we_seen(id));

drop policy if exists "see who is on a card" on public.we_members;
create policy "see who is on a card" on public.we_members
  for select using (public.we_seen(card_id));

drop policy if exists "see your own answers" on public.we_answers;
create policy "see your own answers" on public.we_answers
  for select using ((select auth.uid()) = user_id);

drop policy if exists "see done nights" on public.we_done;
create policy "see done nights" on public.we_done
  for select using (public.we_seen(card_id));

drop policy if exists "see your nudges" on public.we_nudges;
create policy "see your nudges" on public.we_nudges
  for select using ((select auth.uid()) in (from_id, to_id));

drop policy if exists "see your grants" on public.we_streak_grants;
create policy "see your grants" on public.we_streak_grants
  for select using ((select auth.uid()) = user_id);

-- Who can be asked: a friend or someone you share a family with, and never
-- someone either of you has blocked.
create or replace function public.we_can_ask(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select other is not null
    and other <> (select auth.uid())
    and not public.blocked_with(other)
    and (public.are_friends(other) or public.shares_family(other));
$$;

revoke all on function public.we_can_ask(uuid) from public;
grant execute on function public.we_can_ask(uuid) to authenticated;

-- Caps ----------------------------------------------------------------

create or replace function public.we_max_cards() returns integer language sql immutable as $$ select 30 $$;
create or replace function public.we_max_members() returns integer language sql immutable as $$ select 12 $$;
-- An ask nobody answers stops showing after two weeks.
create or replace function public.we_ask_days() returns integer language sql immutable as $$ select 14 $$;
-- New cards a person can start in a day, so closing and remaking a card
-- cannot turn into a stream of asks.
create or replace function public.we_max_new_daily() returns integer language sql immutable as $$ select 10 $$;
-- Nudge pushes one person can get in a night, from every card together.
create or replace function public.we_max_nudges_nightly() returns integer language sql immutable as $$ select 3 $$;

-- A no holds: the same card cannot ask them again for 7 days, and no card of
-- yours can ask them for a day.
create or replace function public.we_said_no_lately(other uuid, card uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.we_members m
    where m.user_id = other
      and m.said_no_at is not null
      and (
        (m.card_id = card and m.said_no_at > now() - interval '7 days')
        or (m.asked_by = (select auth.uid()) and m.said_no_at > now() - interval '1 day')
      )
  );
$$;

revoke all on function public.we_said_no_lately(uuid, uuid) from public;
revoke all on function public.we_said_no_lately(uuid, uuid) from anon;
revoke all on function public.we_said_no_lately(uuid, uuid) from authenticated;

-- Is the card due on this night -------------------------------------

create or replace function public.we_due(starts date, how text, days smallint[], on_night date)
returns boolean
language sql
immutable
as $$
  select on_night >= starts
    and (how = 'daily' or extract(dow from on_night)::smallint = any (days));
$$;

-- Whose turn it is on a night, for a turns card. Members take turns in the
-- order they were asked, and the count only moves on nights the card is due.
create or replace function public.we_turn(card uuid, on_night date)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with c as (select * from public.we_cards where id = card),
  people as (
    select m.user_id, row_number() over (order by m.turn, m.asked_at) - 1 as spot
    from public.we_members m
    where m.card_id = card and m.state = 'in'
  ),
  due_nights as (
    select count(*) as n
    from c, generate_series(c.starts_on, on_night - 1, interval '1 day') as d
    where public.we_due(c.starts_on, c.cadence, c.weekdays, d::date)
  )
  select p.user_id
  from people p, due_nights
  where p.spot = due_nights.n % greatest((select count(*) from people), 1)
$$;

revoke all on function public.we_turn(uuid, date) from public;
grant execute on function public.we_turn(uuid, date) to authenticated;

-- Done together on a night, by the card's rule.
create or replace function public.we_is_done(card uuid, on_night date)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  how text;
  total integer;
  dids integer;
  whose uuid;
begin
  select mode into how from public.we_cards where id = card;
  select count(*) into total from public.we_members where card_id = card and state = 'in';
  select count(*) into dids
  from public.we_answers a
  join public.we_members m on m.card_id = a.card_id and m.user_id = a.user_id and m.state = 'in'
  where a.card_id = card and a.night = on_night and a.status = 'did';
  if total = 0 then
    return false;
  end if;
  if how = 'any' then
    return dids >= 1;
  elsif how = 'most' then
    return dids * 2 > total;
  elsif how = 'turns' then
    whose := public.we_turn(card, on_night);
    return exists (
      select 1 from public.we_answers
      where card_id = card and night = on_night and user_id = whose and status = 'did'
    );
  end if;
  return dids = total;
end;
$$;

revoke all on function public.we_is_done(uuid, date) from public;

-- Keep we_done in step, and tell everyone the moment it is done.
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
begin
  if now_done and not was_done then
    insert into public.we_done (card_id, night, finisher, finisher_cheer)
    select card, on_night, (select auth.uid()), left(coalesce(p.badge_cheer, ''), 24)
    from (select 1) one
    left join public.profiles p on p.user_id = (select auth.uid())
    on conflict do nothing;
    select question into q from public.we_cards where id = card;
    insert into public.push_queue (to_id, title, body, go)
    select m.user_id, 'Did we', left(public.push_text(m.user_id, 'we_done', jsonb_build_object('q', left(q, 120))), 200), '/tonight'
    from public.we_members m
    where m.card_id = card and m.state = 'in' and public.push_wanted(m.user_id, 'sends');
  elsif was_done and not now_done then
    delete from public.we_done where card_id = card and night = on_night;
  end if;
  return now_done;
end;
$$;

revoke all on function public.we_settle(uuid, date) from public;

-- Making and joining ------------------------------------------------

create or replace function public.we_make(
  want_question text,
  want_mode text default 'all',
  want_shows text default 'waiting',
  want_cadence text default 'daily',
  want_weekdays smallint[] default '{}',
  want_goal smallint default null,
  ask uuid[] default '{}'
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

  insert into public.we_cards (made_by, question, mode, shows, cadence, weekdays, goal_nights)
  values (
    who,
    btrim(want_question),
    coalesce(want_mode, 'all'),
    coalesce(want_shows, 'waiting'),
    coalesce(want_cadence, 'daily'),
    coalesce(want_weekdays, '{}'),
    want_goal
  )
  returning id into card;

  insert into public.we_members (card_id, user_id, state, turn, asked_by, joined_at)
  values (card, who, 'in', 0, who, now());

  foreach other in array ask loop
    if not public.we_can_ask(other) then
      raise exception 'can only ask friends or family';
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

revoke all on function public.we_make(text, text, text, text, smallint[], smallint, uuid[]) from public;
grant execute on function public.we_make(text, text, text, text, smallint[], smallint, uuid[]) to authenticated;

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

create or replace function public.we_reply(card uuid, yes boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if yes then
    if (select count(*) from public.we_cards c
        join public.we_members m on m.card_id = c.id and m.user_id = who and m.state = 'in'
        where not c.archived) >= public.we_max_cards() then
      raise exception 'too many shared questions';
    end if;
    update public.we_members
    set state = 'in', joined_at = now()
    where card_id = card and user_id = who and state = 'asked'
      and asked_at > now() - make_interval(days => public.we_ask_days());
  else
    -- Kept, not deleted, so we_said_no_lately can hold the no.
    update public.we_members set state = 'left', said_no_at = now()
    where card_id = card and user_id = who and state = 'asked';
  end if;
end;
$$;

revoke all on function public.we_reply(uuid, boolean) from public;
grant execute on function public.we_reply(uuid, boolean) to authenticated;

-- Leaving keeps every answer and done night for the people who stay. The
-- last one out closes the card.
create or replace function public.we_leave(card uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  heir uuid;
begin
  update public.we_members set state = 'left'
  where card_id = card and user_id = who and state = 'in';
  if not found then
    return;
  end if;
  select user_id into heir from public.we_members
  where card_id = card and state = 'in'
  order by joined_at nulls last
  limit 1;
  if heir is null then
    update public.we_cards set archived = true where id = card;
  elsif (select made_by from public.we_cards where id = card) = who then
    update public.we_cards set made_by = heir where id = card;
  end if;
end;
$$;

revoke all on function public.we_leave(uuid) from public;
grant execute on function public.we_leave(uuid) to authenticated;

-- The owner changes the rules or the words. Members see it next open.
create or replace function public.we_edit(
  card uuid,
  want_question text,
  want_mode text,
  want_shows text,
  want_cadence text,
  want_weekdays smallint[],
  want_goal smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.we_cards
  set question = btrim(want_question),
      mode = want_mode,
      shows = want_shows,
      cadence = want_cadence,
      weekdays = coalesce(want_weekdays, '{}'),
      goal_nights = want_goal
  where id = card and made_by = (select auth.uid()) and not archived;
  if not found then
    raise exception 'only the person who made it can change it';
  end if;
end;
$$;

revoke all on function public.we_edit(uuid, text, text, text, text, smallint[], smallint) from public;
grant execute on function public.we_edit(uuid, text, text, text, text, smallint[], smallint) to authenticated;

-- The extras the Add screen has: a time it comes up, a reminder at that
-- time, and a note. The reminder is set on each phone from this.
alter table public.we_cards add column if not exists ask_after text;
alter table public.we_cards add column if not exists remind boolean not null default true;
alter table public.we_cards add column if not exists note text not null default '';
alter table public.we_cards drop constraint if exists we_cards_ask_after_ok;
alter table public.we_cards add constraint we_cards_ask_after_ok
  check (ask_after is null or ask_after ~ '^([01]\d|2[0-3]):[0-5]\d$');
alter table public.we_cards drop constraint if exists we_cards_note_len;
alter table public.we_cards add constraint we_cards_note_len check (length(note) <= 300);

create or replace function public.we_set_extras(card uuid, want_ask_after text, want_remind boolean, want_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.we_cards
  set ask_after = nullif(btrim(coalesce(want_ask_after, '')), ''),
      remind = coalesce(want_remind, true),
      note = btrim(coalesce(want_note, ''))
  where id = card and made_by = (select auth.uid()) and not archived;
  if not found then
    raise exception 'only the person who made it can change it';
  end if;
end;
$$;

revoke all on function public.we_set_extras(uuid, text, boolean, text) from public;
grant execute on function public.we_set_extras(uuid, text, boolean, text) to authenticated;

-- Where each person files a card: their own folder and topics. Nobody else
-- sees or changes it.
alter table public.we_members add column if not exists folder text not null default '';
alter table public.we_members add column if not exists topics text not null default '';
alter table public.we_members drop constraint if exists we_members_folder_len;
alter table public.we_members add constraint we_members_folder_len
  check (length(folder) <= 60 and length(topics) <= 200);

create or replace function public.we_file(card uuid, want_folder text, want_topics text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.we_members
  set folder = left(btrim(coalesce(want_folder, '')), 60),
      topics = left(btrim(coalesce(want_topics, '')), 200)
  where card_id = card and user_id = (select auth.uid()) and state = 'in';
  if not found then
    raise exception 'not on this card';
  end if;
end;
$$;

revoke all on function public.we_file(uuid, text, text) from public;
grant execute on function public.we_file(uuid, text, text) to authenticated;

-- Answering ---------------------------------------------------------

create or replace function public.we_answer(card uuid, on_night date, want_status text)
returns boolean
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
  -- Tonight or the night before in any time zone. No reaching back to fill
  -- in a streak.
  if on_night < current_date - 2 then
    raise exception 'that night is closed';
  end if;
  -- Done early: a card's next asked night may be answered up to a week ahead,
  -- never a night after it.
  if on_night > current_date + 1 and not exists (
    select 1 from public.we_cards c
    where c.id = card
      and on_night <= current_date + 7
      and public.we_due(c.starts_on, c.cadence, c.weekdays, on_night)
      and not exists (
        select 1 from generate_series(current_date + 2, on_night - 1, interval '1 day') g(d)
        where public.we_due(c.starts_on, c.cadence, c.weekdays, g.d::date)
      )
  ) then
    raise exception 'that night is closed';
  end if;
  if want_status is null then
    delete from public.we_answers where card_id = card and user_id = who and night = on_night;
  else
    insert into public.we_answers (card_id, user_id, night, status)
    values (card, who, on_night, want_status)
    on conflict (card_id, user_id, night) do update
      set status = excluded.status, answered_at = now();
  end if;
  return public.we_settle(card, on_night);
end;
$$;

revoke all on function public.we_answer(uuid, date, text) from public;
grant execute on function public.we_answer(uuid, date, text) to authenticated;

-- "Your turn." Once per sender per card per person per night (the
-- we_nudges primary key), and at most a few for one person a night.
create or replace function public.we_nudge(card uuid, other uuid, on_night date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  name text;
  q text;
begin
  if not exists (select 1 from public.we_members where card_id = card and user_id = who and state = 'in')
     or not exists (select 1 from public.we_members where card_id = card and user_id = other and state = 'in') then
    raise exception 'not on this card';
  end if;
  -- Tonight, or last night while it is still open. No need to say did
  -- yourself first: a card nobody answers should still get a nudge.
  if on_night < current_date - 1 or on_night > current_date + 1 then
    raise exception 'that night is closed';
  end if;
  if not exists (select 1 from public.we_cards c
                 where c.id = card and public.we_due(c.starts_on, c.cadence, c.weekdays, on_night)) then
    raise exception 'that night is closed';
  end if;
  if public.blocked_with(other) then
    raise exception 'not on this card';
  end if;
  if (select count(*) from public.we_nudges n where n.to_id = other and n.night = on_night)
     >= public.we_max_nudges_nightly() then
    raise exception 'enough nudges tonight';
  end if;
  insert into public.we_nudges (card_id, from_id, to_id, night) values (card, who, other, on_night);
  if public.push_wanted(other, 'sends') then
    select coalesce(nullif(btrim(p.display_name), ''), 'Someone') into name
    from public.profiles p where p.user_id = who;
    select question into q from public.we_cards where id = card;
    insert into public.push_queue (to_id, title, body, go)
    values (other,
      left(public.push_text(other, 'we_did', jsonb_build_object('name', coalesce(name, public.push_text(other, 'someone')))), 80),
      left(public.push_text(other, 'we_turn', jsonb_build_object('q', left(q, 120))), 200), '/tonight');
  end if;
exception when unique_violation then
  raise exception 'already nudged tonight';
end;
$$;

revoke all on function public.we_nudge(uuid, uuid, date) from public;
grant execute on function public.we_nudge(uuid, uuid, date) to authenticated;

-- Reading -----------------------------------------------------------

-- Every card you are on or asked to, for one night. Each person's answer
-- comes back only as far as the card's owner allows; yours always does.
create or replace function public.we_tonight(on_night date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  mine as (
    select m.card_id, m.state, m.folder, m.topics
    from public.we_members m, me
    where m.user_id = me.id
      and (m.state = 'in'
        or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days())))
  ),
  cards as (
    select c.*, mine.state as my_state, mine.folder as my_folder, mine.topics as my_topics
    from public.we_cards c join mine on mine.card_id = c.id
    where not c.archived
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'question', c.question,
    'mode', c.mode,
    'shows', c.shows,
    'cadence', c.cadence,
    'weekdays', c.weekdays,
    'goal', c.goal_nights,
    'askAfter', c.ask_after,
    'remind', c.remind,
    'note', c.note,
    'startsOn', c.starts_on,
    'mine', c.made_by = (select id from me),
    'myState', c.my_state,
    'folder', c.my_folder,
    'topics', c.my_topics,
    'due', public.we_due(c.starts_on, c.cadence, c.weekdays, on_night),
    'done', exists (select 1 from public.we_done d where d.card_id = c.id and d.night = on_night),
    'turn', case when c.mode = 'turns' then public.we_turn(c.id, on_night) end,
    'dids', (select count(*) from public.we_answers a
             join public.we_members m2 on m2.card_id = a.card_id and m2.user_id = a.user_id and m2.state = 'in'
             where a.card_id = c.id and a.night = on_night and a.status = 'did'),
    'askedBy', (select coalesce(nullif(btrim(p.display_name), ''), '') from public.we_members m3
                join public.profiles p on p.user_id = m3.asked_by
                where m3.card_id = c.id and m3.user_id = (select id from me)),
    -- The last 400 done nights, newest first: streaks, the month look-back,
    -- and a challenge's finish line all read from this.
    -- Tonight's finish: who said the last did, and their cheer.
    'finish', (select jsonb_build_object('by', d.finisher, 'cheer', d.finisher_cheer)
               from public.we_done d where d.card_id = c.id and d.night = on_night),
    'doneNights', (select coalesce(jsonb_agg(d.night order by d.night desc), '[]'::jsonb)
                   from (select night from public.we_done d
                         where d.card_id = c.id order by night desc limit 400) d),
    'people', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.user_id,
        'name', coalesce(nullif(btrim(p.display_name), ''), '@' || coalesce(p.handle, '')),
        'buddy', coalesce(p.buddy_on, ''),
        'cheer', coalesce(p.badge_cheer, ''),
        'state', m.state,
        'turn', m.turn,
        'me', m.user_id = (select id from me),
        'status', case
          when m.user_id = (select id from me) then a.status
          when c.shows = 'all' then a.status
          when c.shows = 'waiting' and a.status = 'did' then 'did'
          else null
        end,
        'nudged', exists (select 1 from public.we_nudges n
                          where n.card_id = c.id and n.night = on_night
                            and n.from_id = (select id from me) and n.to_id = m.user_id)
      ) order by m.turn, m.asked_at), '[]'::jsonb)
      from public.we_members m
      left join public.profiles p on p.user_id = m.user_id
      left join public.we_answers a on a.card_id = m.card_id and a.user_id = m.user_id and a.night = on_night
      where m.card_id = c.id and m.state in ('in', 'asked')
        -- On a count card the others only exist as a number.
        and (c.shows <> 'count' or m.user_id = (select id from me) or c.my_state = 'asked')
    )
  ) order by c.made_at), '[]'::jsonb)
  from cards c;
$$;

revoke all on function public.we_tonight(date) from public;
grant execute on function public.we_tonight(date) to authenticated;

-- How many people are on each count card, since those cards leave the
-- others out of "people".
create or replace function public.we_counts(cards uuid[])
returns table (card_id uuid, total integer)
language sql
stable
security definer
set search_path = public
as $$
  select m.card_id, count(*)::integer
  from public.we_members m
  where m.card_id = any (cards) and m.state = 'in' and public.we_seen(m.card_id)
  group by m.card_id;
$$;

revoke all on function public.we_counts(uuid[]) from public;
grant execute on function public.we_counts(uuid[]) to authenticated;

-- Streak coins ------------------------------------------------------

-- The streak is the run of due nights done together, ending tonight or
-- the night before. Paid once per person per milestone.
create or replace function public.we_claim(card uuid, on_night date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  c public.we_cards;
  run integer := 0;
  d date;
  paid integer := 0;
  step record;
begin
  if not exists (select 1 from public.we_members where card_id = card and user_id = who and state = 'in') then
    return 0;
  end if;
  if on_night < current_date - 2 or on_night > current_date + 1 then
    return 0;
  end if;
  select * into c from public.we_cards where id = card;
  d := on_night;
  if not exists (select 1 from public.we_done where card_id = card and night = d) then
    d := d - 1;
  end if;
  while d >= c.starts_on and run < 400 loop
    if public.we_due(c.starts_on, c.cadence, c.weekdays, d) then
      exit when not exists (select 1 from public.we_done where card_id = card and night = d);
      run := run + 1;
    end if;
    d := d - 1;
  end loop;

  for step in select * from (values (7, 5), (30, 15), (100, 40), (365, 100)) as s(at, coins) loop
    if run >= step.at then
      insert into public.we_streak_grants (card_id, user_id, milestone)
      values (card, who, step.at)
      on conflict do nothing;
      if found then
        paid := paid + step.coins;
      end if;
    end if;
  end loop;

  if paid > 0 then
    insert into public.profiles (user_id) values (who) on conflict (user_id) do nothing;
    update public.profiles set coin_balance = least(coin_balance + paid, 9999) where user_id = who;
  end if;
  return paid;
end;
$$;

revoke all on function public.we_claim(uuid, date) from public;
grant execute on function public.we_claim(uuid, date) to authenticated;

-- Being asked lands in the inbox, so the push goes there.
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
  if not public.push_wanted(new.user_id, 'sends') then
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

drop trigger if exists queue_we_ask_push on public.we_members;
create trigger queue_we_ask_push
  after insert or update of state, asked_at on public.we_members
  for each row execute function public.queue_we_ask_push();

-- An ask nobody answered in two weeks is treated as turned down wherever it
-- is read, and can be sent again, so there is nothing to sweep.
drop function if exists public.sweep_we();

-- Every night a Did we was due for you, and what you swiped, so your own
-- streak and tonight's count can include it. Only cards you are in and that
-- still run; on a turns card only your turns. From the later of the card's
-- start and the day you joined, at most 400 nights back, through tomorrow
-- (an early answer counts on its night).
create or replace function public.my_we_nights()
returns table (card_id uuid, folder text, night date, status text)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select c.id, c.cadence, c.weekdays, c.mode, coalesce(m.folder, '') as folder,
      greatest(c.starts_on, coalesce(m.joined_at, m.asked_at)::date, current_date - 400) as since
    from public.we_cards c
    join public.we_members m on m.card_id = c.id and m.user_id = (select id from me) and m.state = 'in'
    where not c.archived
  )
  select mine.id, mine.folder, n::date, a.status
  from mine
  cross join lateral generate_series(mine.since, current_date + 1, interval '1 day') as n
  left join public.we_answers a
    on a.card_id = mine.id and a.user_id = (select id from me) and a.night = n::date
  where public.we_due(mine.since, mine.cadence, mine.weekdays, n::date)
    and (mine.mode <> 'turns' or public.we_turn(mine.id, n::date) = (select id from me));
$$;

revoke all on function public.my_we_nights() from public, anon;
grant execute on function public.my_we_nights() to authenticated;
