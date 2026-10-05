-- Did I, part three. What keeps it quick and safe with a lot of people on it.
-- Run this after schema.sql and people.sql. It is safe to run again.
--
-- Three jobs:
--   1. An index behind every foreign key the app actually filters on.
--   2. Row level security that is checked once per query, not once per row.
--   3. A ceiling on everything a caller can write, and no reach at all for
--      someone who is not signed in.

-- 1. Indexes ----------------------------------------------------------
--
-- Without these, every one of these lookups reads the whole table, so the
-- app gets slower in a straight line as people sign up.

create index if not exists profiles_invited_by_idx
  on public.profiles (invited_by) where invited_by is not null;

create index if not exists families_made_by_idx on public.families (made_by);
create index if not exists family_tags_tag_idx on public.family_lamps (tag_id);
create index if not exists family_lamps_for_idx on public.family_lamps (for_id) where for_id is not null;
create index if not exists family_lamps_made_by_idx on public.family_lamps (made_by);
create index if not exists family_answers_user_idx on public.family_answers (user_id);
create index if not exists sends_from_idx on public.sends (from_id, made_at desc);

-- The exact shape the night query asks for.
create index if not exists family_lamps_live_idx
  on public.family_lamps (family_id, made_on) where not archived;

-- 2. Row level security ------------------------------------------------
--
-- auth.uid() written bare is re-run for every row the planner touches.
-- Wrapped in a sub-select it is worked out once and reused. Same rule,
-- far less work. Every policy below is the same rule as before.

-- Reading a profile you share a family with, without a correlated join
-- running per row.
create or replace function public.shares_family(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  );
$$;

revoke all on function public.shares_family(uuid) from public;
grant execute on function public.shares_family(uuid) to authenticated;

drop policy if exists "own shelf" on public.shelves;
create policy "own shelf" on public.shelves
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own devices" on public.devices;
create policy "own devices" on public.devices
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "read known profiles" on public.profiles;
create policy "read known profiles" on public.profiles
  for select using (
    (select auth.uid()) = user_id
    or public.are_friends(user_id)
    or public.shares_family(user_id)
  );

drop policy if exists "write own profile" on public.profiles;
create policy "write own profile" on public.profiles
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "see my links" on public.friend_links;
create policy "see my links" on public.friend_links
  for select using ((select auth.uid()) in (from_id, to_id));

drop policy if exists "ask a friend" on public.friend_links;
create policy "ask a friend" on public.friend_links
  for insert with check ((select auth.uid()) = from_id);

drop policy if exists "answer a link" on public.friend_links;
create policy "answer a link" on public.friend_links
  for update using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id);

drop policy if exists "drop a link" on public.friend_links;
create policy "drop a link" on public.friend_links
  for delete using ((select auth.uid()) in (from_id, to_id));

drop policy if exists "leave or remove" on public.family_members;
create policy "leave or remove" on public.family_members
  for delete using ((select auth.uid()) = user_id or public.is_parent(family_id));

drop policy if exists "add a family question" on public.family_lamps;
create policy "add a family question" on public.family_lamps
  for insert with check (
    (select auth.uid()) = made_by
    and (
      public.is_parent(family_id)
      or (public.in_family(family_id) and for_id = (select auth.uid()))
    )
  );

drop policy if exists "edit a family question" on public.family_lamps;
create policy "edit a family question" on public.family_lamps
  for update using (public.is_parent(family_id) or (select auth.uid()) = made_by)
  with check (public.is_parent(family_id) or (select auth.uid()) = made_by);

drop policy if exists "drop a family question" on public.family_lamps;
create policy "drop a family question" on public.family_lamps
  for delete using (public.is_parent(family_id) or (select auth.uid()) = made_by);

drop policy if exists "answer for yourself" on public.family_answers;
create policy "answer for yourself" on public.family_answers
  for all using ((select auth.uid()) = user_id and public.in_family(family_id))
  with check ((select auth.uid()) = user_id and public.in_family(family_id));

drop policy if exists "see my sends" on public.sends;
create policy "see my sends" on public.sends
  for select using ((select auth.uid()) in (from_id, to_id));

drop policy if exists "send to a friend" on public.sends;
create policy "send to a friend" on public.sends
  for insert with check ((select auth.uid()) = from_id and public.are_friends(to_id));

drop policy if exists "keep or pass a send" on public.sends;
create policy "keep or pass a send" on public.sends
  for update using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id);

drop policy if exists "take back a send" on public.sends;
create policy "take back a send" on public.sends
  for delete using ((select auth.uid()) in (from_id, to_id));

-- The helpers read auth.uid() once per call already, but they are called
-- per row, so they have to stay stable and cheap.
create or replace function public.are_friends(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friend_links
    where state = 'ok'
      and ((from_id = (select auth.uid()) and to_id = other)
        or (from_id = other and to_id = (select auth.uid())))
  );
$$;

create or replace function public.in_family(fam uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fam and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_parent(fam uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fam and user_id = (select auth.uid()) and role = 'parent'
  );
$$;

-- 3. Ceilings ----------------------------------------------------------
--
-- Every one of these columns is written by a caller we do not control. The
-- client trims its own input, but the client is not the gate.

do $$
declare
  rule text;
begin
  foreach rule in array array[
    'shelves|doc_size|octet_length(doc::text) <= 2097152',
    'profiles|prefs_size|octet_length(prefs::text) <= 8192',
    'profiles|name_len|display_name is null or length(display_name) <= 40',
    'profiles|zone_len|length(zone) <= 64',
    'profiles|look_len|length(look_on) <= 24 and length(badge_cheer) <= 24',
    'profiles|invite_len|invite_code is null or length(invite_code) <= 16',
    'families|name_len|length(name) between 1 and 60',
    'families|code_len|length(code) between 4 and 16',
    'family_tags|title_len|length(title) between 1 and 60',
    'family_tags|look_len|length(look) <= 24',
    'family_lamps|question_len|length(question) between 1 and 200',
    'family_lamps|short_len|length(short) <= 60',
    'family_lamps|once_when_ok|once_when in (''on'', ''by'')',
    'family_answers|period_len|length(period_key) <= 24',
    'sends|question_len|length(question) <= 200',
    'sends|note_len|length(note) <= 280',
    'devices|label_len|length(device_key) <= 80 and length(label) <= 80 and length(platform) <= 40'
  ] loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      split_part(rule, '|', 1), split_part(rule, '|', 1) || '_' || split_part(rule, '|', 2)
    );
    execute format(
      'alter table public.%I add constraint %I check (%s) not valid',
      split_part(rule, '|', 1),
      split_part(rule, '|', 1) || '_' || split_part(rule, '|', 2),
      split_part(rule, '|', 3)
    );
    execute format(
      'alter table public.%I validate constraint %I',
      split_part(rule, '|', 1), split_part(rule, '|', 1) || '_' || split_part(rule, '|', 2)
    );
  end loop;
end;
$$;

-- A nudge is a nudge. Twenty unanswered ones from the same person is not.
create or replace function public.cap_sends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  open_now integer;
begin
  select count(*) into open_now
  from public.sends
  where from_id = new.from_id and to_id = new.to_id and state = 'sent';
  if open_now >= 20 then
    raise exception 'too many waiting for an answer';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_sends on public.sends;
create trigger cap_sends
  before insert on public.sends
  for each row execute function public.cap_sends();

-- Asking to be friends is free, so it is the cheapest thing to abuse.
-- Fifty unanswered requests out is far past normal use.
create or replace function public.cap_asks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting integer;
begin
  if new.state <> 'asked' then
    return new;
  end if;
  select count(*) into waiting
  from public.friend_links
  where from_id = new.from_id and state = 'asked';
  if waiting >= 50 then
    raise exception 'too many requests waiting for an answer';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_asks on public.friend_links;
create trigger cap_asks
  before insert on public.friend_links
  for each row execute function public.cap_asks();

-- One person does not need a hundred families.
create or replace function public.cap_families()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mine integer;
begin
  select count(*) into mine from public.family_members where user_id = new.user_id;
  if mine >= 20 then
    raise exception 'that is enough families';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_families on public.family_members;
create trigger cap_families
  before insert on public.family_members
  for each row execute function public.cap_families();

-- Nobody who is not signed in has any business in these tables. Row level
-- security already says so; this means a mistake in a policy still cannot
-- leak anything to the open internet.
revoke all on public.shelves from anon;
revoke all on public.profiles from anon;
revoke all on public.devices from anon;
revoke all on public.friend_links from anon;
revoke all on public.families from anon;
revoke all on public.family_members from anon;
revoke all on public.family_tags from anon;
revoke all on public.family_lamps from anon;
revoke all on public.family_answers from anon;
revoke all on public.sends from anon;

-- 4. Fewer round trips ------------------------------------------------
--
-- Reading friends used to be one query for the links and another for the
-- profiles, with the profile policy re-checked per row. This is the whole
-- set in one call, checked once.

drop function if exists public.known_people();

create or replace function public.known_people()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  share_streak boolean,
  streak integer,
  done_on date
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
  select p.user_id, p.handle, p.display_name, p.share_streak, p.streak, p.done_on
  from public.profiles p
  join mine on mine.who = p.user_id
  where p.user_id <> (select id from me);
$$;

revoke all on function public.known_people() from public;
grant execute on function public.known_people() to authenticated;

-- Opening the People screen should not write a row when nothing is owed.
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
      invite_look_paid = invite_look_paid or wins_look
    where user_id = me;
  end if;

  return jsonb_build_object('gems', gems, 'looks', to_jsonb(looks), 'joined', joined);
end;
$$;

revoke all on function public.claim_invites() from public;
grant execute on function public.claim_invites() to authenticated;

-- A query that runs away should die rather than hold a connection open.
alter role authenticated set statement_timeout = '8s';

-- Edit a Did you you sent, while they have not answered it. Same limits as
-- sending: 1 to 200 letters. Only the sender, only while it waits. The
-- recipient's inbox reads the row, so they see the new words.
create or replace function public.edit_send(send uuid, question text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  q text := btrim(coalesce(edit_send.question, ''));
  hit integer;
begin
  if me is null then raise exception 'sign in first'; end if;
  if length(q) < 1 then raise exception 'blank'; end if;
  if length(q) > 200 then raise exception 'too long'; end if;
  update public.sends s set question = q
  where s.id = edit_send.send and s.from_id = me and s.state = 'sent' and s.kind = 'todo';
  get diagnostics hit = row_count;
  return hit > 0;
end;
$$;

revoke all on function public.edit_send(uuid, text) from public, anon;
grant execute on function public.edit_send(uuid, text) to authenticated;
