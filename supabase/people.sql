-- Did I, part two. People. Run this after schema.sql in the Supabase SQL editor.
-- Friends, families, the tag a family shares, and a Did I you send someone.
--
-- Everything a second person can see goes through row level security. The
-- helper functions below are security definer on purpose: a policy on
-- family_members cannot read family_members without looping.

-- A handle so people can find each other without trading email addresses.
alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists share_streak boolean not null default true;
alter table public.profiles add column if not exists streak integer not null default 0;
alter table public.profiles add column if not exists done_on date;

-- One handle per person, no two the same whatever the casing. The shape
-- check keeps the client from smuggling in a blank or a lookalike.
update public.profiles set handle = null where handle = '';

-- Fold the handle before anything else looks at it, so two people cannot
-- take the same name with different casing no matter what client they use.
create or replace function public.fold_handle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.handle := nullif(lower(btrim(coalesce(new.handle, ''))), '');
  return new;
end;
$$;

drop trigger if exists fold_handle on public.profiles;
create trigger fold_handle
  before insert or update of handle on public.profiles
  for each row execute function public.fold_handle();

alter table public.profiles drop constraint if exists profiles_handle_shape;
alter table public.profiles add constraint profiles_handle_shape
  check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');

-- Keep fragments in sync with src/lib/handle-safe.js.
create or replace function public.handle_safe(raw text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  h text := lower(btrim(coalesce(raw, '')));
  bad text[] := array[
    '1488', '8814', '1312', '8888', '6666', '6969',
    'nigger', 'nigga', 'faggot', 'fagot', 'kike', 'spic', 'chink', 'gook',
    'wetback', 'beaner', 'tranny', 'retard', 'cunt', 'rape', 'lynch',
    'hitler', 'nazi', 'kkk', 'coon', 'raghead', 'towelhead', 'pedo'
  ];
  piece text;
begin
  if h = '' then
    return true;
  end if;
  if h !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;
  foreach piece in array bad loop
    if position(piece in h) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.profiles drop constraint if exists profiles_handle_safe;
alter table public.profiles add constraint profiles_handle_safe
  check (handle is null or public.handle_safe(handle));

drop index if exists profiles_handle_key;
create unique index if not exists profiles_handle_key
  on public.profiles (lower(handle)) where handle is not null;

-- Where the person is. Read off the phone, never picked in Settings.
alter table public.profiles add column if not exists zone text not null default '';

-- Invites. Your code, who sent you, and what you have already been paid
-- so a reward cannot be claimed twice.
alter table public.profiles add column if not exists invite_code text;
alter table public.profiles add column if not exists invited_by uuid references auth.users on delete set null;
alter table public.profiles add column if not exists joined_paid boolean not null default false;
alter table public.profiles add column if not exists invites_paid integer not null default 0;
alter table public.profiles add column if not exists invite_look_paid boolean not null default false;

create unique index if not exists profiles_invite_code_key
  on public.profiles (upper(invite_code)) where invite_code is not null;

-- Friends -------------------------------------------------------------

create table if not exists public.friend_links (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  state text not null default 'asked' check (state in ('asked', 'ok')),
  made_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

create index if not exists friend_links_to_idx on public.friend_links (to_id, state);
create index if not exists friend_links_from_idx on public.friend_links (from_id, state);

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
      and ((from_id = auth.uid() and to_id = other)
        or (from_id = other and to_id = auth.uid()))
  );
$$;

-- Families ------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Family',
  code text not null unique,
  made_by uuid references auth.users on delete set null,
  made_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'kid' check (role in ('parent', 'kid')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index if not exists family_members_user_idx on public.family_members (user_id);

-- The family agrees on when a night ends. Without this, two phones with
-- different fold hours file the same night under different keys.
alter table public.families add column if not exists fold_hour smallint not null default 0;
alter table public.families alter column fold_hour set default 0;
update public.families set fold_hour = 0 where fold_hour <> 0;

create or replace function public.in_family(fam uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fam and user_id = auth.uid()
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
    where family_id = fam and user_id = auth.uid() and role = 'parent'
  );
$$;

-- A family always keeps one parent. Without this a parent can lock the
-- family so nobody can add anyone again.
-- Deferred on purpose. Closing a whole family cascades through the member
-- rows, and that is fine. What is not fine is a family that still exists
-- with nobody who can add anyone to it.
create or replace function public.keep_one_parent()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  fam uuid := old.family_id;
  parents integer;
  heir uuid;
begin
  if tg_op = 'UPDATE' and new.role = 'parent' then
    return null;
  end if;
  if old.role <> 'parent' then
    return null;
  end if;
  if not exists (select 1 from public.families where id = fam) then
    return null;
  end if;
  select count(*) into parents
  from public.family_members
  where family_id = fam and role = 'parent';
  if parents > 0 then
    return null;
  end if;

  -- The account itself is gone, so there is nobody to ask. Hand the family
  -- to whoever has been in it longest, or close it if it is empty.
  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = old.user_id) then
    select user_id into heir
    from public.family_members
    where family_id = fam
    order by joined_at
    limit 1;
    if heir is null then
      delete from public.families where id = fam;
    else
      update public.family_members set role = 'parent' where family_id = fam and user_id = heir;
    end if;
    return null;
  end if;

  raise exception 'a family keeps one parent';
end;
$$;

drop trigger if exists keep_one_parent on public.family_members;
create constraint trigger keep_one_parent
  after update or delete on public.family_members
  deferrable initially deferred
  for each row execute function public.keep_one_parent();

-- The tag a family shares, and the questions on it.

create table if not exists public.family_tags (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  title text not null default 'Family',
  look text not null default 'lime',
  made_at timestamptz not null default now()
);

create index if not exists family_tags_family_idx on public.family_tags (family_id);

create table if not exists public.family_lamps (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  tag_id uuid not null references public.family_tags on delete cascade,
  question text not null,
  short text not null default '',
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly', 'once')),
  weekdays smallint[] not null default '{}',
  once_on date,
  for_id uuid references auth.users on delete cascade,
  made_by uuid references auth.users on delete set null,
  made_on date not null default current_date,
  archived boolean not null default false
);

create index if not exists family_lamps_family_idx on public.family_lamps (family_id, archived);

create table if not exists public.family_answers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  lamp_id uuid not null references public.family_lamps on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  period_key text not null,
  status text not null default 'yes' check (status in ('yes', 'skip', 'late')),
  answered_at timestamptz not null default now(),
  unique (lamp_id, user_id, period_key)
);

create index if not exists family_answers_period_idx
  on public.family_answers (family_id, period_key);

-- A Did I one person sends another ------------------------------------

create table if not exists public.sends (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  kind text not null default 'todo' check (kind in ('todo', 'cheer')),
  question text not null default '',
  note text not null default '',
  due_on date default current_date,
  state text not null default 'sent' check (state in ('sent', 'kept', 'passed')),
  made_at timestamptz not null default now(),
  check (from_id <> to_id)
);

alter table public.sends alter column due_on set default current_date;

create index if not exists sends_to_idx on public.sends (to_id, state, made_at desc);

-- One of the same question per person per day. Stops a nudge from turning
-- into twenty nudges.
create unique index if not exists sends_no_repeat
  on public.sends (from_id, to_id, lower(question), coalesce(due_on, '1970-01-01'))
  where kind = 'todo';

-- Row level security ---------------------------------------------------

alter table public.friend_links enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_tags enable row level security;
alter table public.family_lamps enable row level security;
alter table public.family_answers enable row level security;
alter table public.sends enable row level security;

-- A friend or someone in your family can read your profile row. Nobody else.
drop policy if exists "own profile" on public.profiles;
drop policy if exists "read known profiles" on public.profiles;
create policy "read known profiles" on public.profiles
  for select using (
    auth.uid() = user_id
    or public.are_friends(user_id)
    or exists (
      select 1 from public.family_members mine
      join public.family_members theirs on theirs.family_id = mine.family_id
      where mine.user_id = auth.uid() and theirs.user_id = public.profiles.user_id
    )
  );

drop policy if exists "write own profile" on public.profiles;
create policy "write own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "see my links" on public.friend_links;
create policy "see my links" on public.friend_links
  for select using (auth.uid() in (from_id, to_id));

drop policy if exists "ask a friend" on public.friend_links;
create policy "ask a friend" on public.friend_links
  for insert with check (auth.uid() = from_id);

drop policy if exists "answer a link" on public.friend_links;
create policy "answer a link" on public.friend_links
  for update using (auth.uid() = to_id) with check (auth.uid() = to_id);

drop policy if exists "drop a link" on public.friend_links;
create policy "drop a link" on public.friend_links
  for delete using (auth.uid() in (from_id, to_id));

drop policy if exists "see my family" on public.families;
create policy "see my family" on public.families
  for select using (public.in_family(id));

drop policy if exists "parents edit the family" on public.families;
create policy "parents edit the family" on public.families
  for update using (public.is_parent(id)) with check (public.is_parent(id));

drop policy if exists "parents close the family" on public.families;
create policy "parents close the family" on public.families
  for delete using (public.is_parent(id));

drop policy if exists "see the members" on public.family_members;
create policy "see the members" on public.family_members
  for select using (public.in_family(family_id));

drop policy if exists "parents add members" on public.family_members;
create policy "parents add members" on public.family_members
  for insert with check (public.is_parent(family_id));

drop policy if exists "parents set roles" on public.family_members;
create policy "parents set roles" on public.family_members
  for update using (public.is_parent(family_id)) with check (public.is_parent(family_id));

drop policy if exists "leave or remove" on public.family_members;
create policy "leave or remove" on public.family_members
  for delete using (auth.uid() = user_id or public.is_parent(family_id));

drop policy if exists "see family tags" on public.family_tags;
create policy "see family tags" on public.family_tags
  for select using (public.in_family(family_id));

drop policy if exists "parents keep family tags" on public.family_tags;
create policy "parents keep family tags" on public.family_tags
  for all using (public.is_parent(family_id)) with check (public.is_parent(family_id));

drop policy if exists "see family questions" on public.family_lamps;
create policy "see family questions" on public.family_lamps
  for select using (public.in_family(family_id));

-- A parent can put a question on anyone. A kid can only put one on themselves.
drop policy if exists "add a family question" on public.family_lamps;
create policy "add a family question" on public.family_lamps
  for insert with check (
    auth.uid() = made_by
    and (public.is_parent(family_id) or (public.in_family(family_id) and for_id = auth.uid()))
  );

drop policy if exists "edit a family question" on public.family_lamps;
create policy "edit a family question" on public.family_lamps
  for update using (public.is_parent(family_id) or auth.uid() = made_by)
  with check (public.is_parent(family_id) or auth.uid() = made_by);

drop policy if exists "drop a family question" on public.family_lamps;
create policy "drop a family question" on public.family_lamps
  for delete using (public.is_parent(family_id) or auth.uid() = made_by);

drop policy if exists "see family answers" on public.family_answers;
create policy "see family answers" on public.family_answers
  for select using (public.in_family(family_id));

drop policy if exists "answer for yourself" on public.family_answers;
create policy "answer for yourself" on public.family_answers
  for all using (auth.uid() = user_id and public.in_family(family_id))
  with check (auth.uid() = user_id and public.in_family(family_id));

drop policy if exists "see my sends" on public.sends;
create policy "see my sends" on public.sends
  for select using (auth.uid() in (from_id, to_id));

drop policy if exists "send to a friend" on public.sends;
create policy "send to a friend" on public.sends
  for insert with check (auth.uid() = from_id and public.are_friends(to_id));

drop policy if exists "keep or pass a send" on public.sends;
create policy "keep or pass a send" on public.sends
  for update using (auth.uid() = to_id) with check (auth.uid() = to_id);

drop policy if exists "take back a send" on public.sends;
create policy "take back a send" on public.sends
  for delete using (auth.uid() in (from_id, to_id));

-- Calls the client makes ----------------------------------------------

-- Look someone up by handle without opening the profiles table to everyone.
-- Handles are handed out, not picked. Two short words run together so each
-- one reads differently and friends do not get near-miss numbers.
create or replace function public.my_handle()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  have text;
  words text[] := array[
    'acorn', 'anchor', 'apron', 'atlas', 'beacon', 'birch', 'bramble', 'canyon',
    'cedar', 'clover', 'comet', 'copper', 'cove', 'dune', 'ember', 'fennel',
    'flint', 'garnet', 'harbor', 'hazel', 'indigo', 'juniper', 'kettle', 'lantern',
    'ledger', 'maple', 'meadow', 'mica', 'nickel', 'olive', 'onyx', 'otter',
    'parcel', 'pebble', 'quarry', 'quill', 'ridge', 'rowan', 'saffron', 'sage',
    'slate', 'sparrow', 'spruce', 'thistle', 'timber', 'tulip', 'umber', 'vellum',
    'walnut', 'willow'
  ];
  try text;
  n integer := 0;
  w integer;
  i integer;
  j integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select p.handle into have from public.profiles p where p.user_id = me;
  if have is not null and have <> '' then
    return have;
  end if;
  w := array_length(words, 1);
  loop
    i := 1 + floor(random() * w)::int;
    loop
      j := 1 + floor(random() * w)::int;
      exit when j <> i;
    end loop;
    try := words[i] || words[j];
    exit when public.handle_safe(try)
      and not exists (select 1 from public.profiles where lower(handle) = try);
    n := n + 1;
    if n > 60 then
      raise exception 'could not find a free handle';
    end if;
  end loop;
  insert into public.profiles (user_id, handle) values (me, try)
  on conflict (user_id) do update set handle = coalesce(nullif(public.profiles.handle, ''), try);
  select p.handle into have from public.profiles p where p.user_id = me;
  return have;
end;
$$;

revoke all on function public.my_handle() from public;
grant execute on function public.my_handle() to authenticated;

create or replace function public.find_handle(wanted text)
returns table (user_id uuid, handle text, display_name text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, p.handle, p.display_name
  from public.profiles p
  where p.handle is not null
    and lower(p.handle) = lower(btrim(wanted))
    and p.user_id <> auth.uid()
  limit 1;
$$;

create or replace function public.new_family_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  -- No I, O, 0, or 1. Someone is going to read this out loud.
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  try text;
  n integer := 0;
begin
  loop
    try := '';
    for i in 1..6 loop
      try := try || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where code = try);
    n := n + 1;
    if n > 40 then
      raise exception 'could not find a free code';
    end if;
  end loop;
  return try;
end;
$$;

-- Make a family, become its parent, and start its shared tag. One call so
-- the first membership does not have to pass a policy that needs it.
create or replace function public.make_family(want_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  fam uuid;
  clean text := coalesce(nullif(btrim(want_name), ''), 'Family');
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  insert into public.families (name, code, made_by)
  values (clean, public.new_family_code(), me)
  returning id into fam;
  insert into public.family_members (family_id, user_id, role) values (fam, me, 'parent');
  insert into public.family_tags (family_id, title) values (fam, clean);
  return fam;
end;
$$;

create or replace function public.join_family(want_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  fam uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select id into fam from public.families where code = upper(btrim(want_code));
  if fam is null then
    raise exception 'no family with that code';
  end if;
  insert into public.family_members (family_id, user_id, role)
  values (fam, me, 'kid')
  on conflict (family_id, user_id) do nothing;
  return fam;
end;
$$;

-- Accepting a friend request writes the other direction too, so either
-- person can read the pair the same way.
create or replace function public.say_yes(link uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  asker uuid;
begin
  select from_id into asker from public.friend_links
  where id = link and to_id = me and state = 'asked';
  if asker is null then
    raise exception 'no request to answer';
  end if;
  update public.friend_links set state = 'ok' where id = link;
  insert into public.friend_links (from_id, to_id, state)
  values (me, asker, 'ok')
  on conflict (from_id, to_id) do update set state = 'ok';
end;
$$;

create or replace function public.drop_friend(other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  delete from public.friend_links
  where (from_id = me and to_id = other) or (from_id = other and to_id = me);
end;
$$;

-- Invites -------------------------------------------------------------
--
-- What a code is worth, in one place so the screen and the payout cannot
-- drift apart: ten coins to each side per friend who joins, and the Night
-- look once three of them have. Coins, never gems. Gems still only come
-- from a finished night.

create or replace function public.invite_coins()
returns integer language sql immutable as $$ select 10 $$;

create or replace function public.invite_look_at()
returns integer language sql immutable as $$ select 3 $$;

-- Ten characters out of a 32 letter alphabet. Even at a million people the
-- odds of a clash are tiny, and the unique index below catches it anyway.
create or replace function public.my_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  try text;
  n integer := 0;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select p.invite_code into code from public.profiles p where p.user_id = me;
  if code is not null and length(code) = 10 then
    return code;
  end if;
  loop
    try := '';
    for i in 1..10 loop
      try := try || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where upper(invite_code) = try);
    n := n + 1;
    if n > 40 then
      raise exception 'could not find a free code';
    end if;
  end loop;
  insert into public.profiles (user_id, invite_code) values (me, try)
  on conflict (user_id) do update set invite_code = try;
  return try;
end;
$$;

create or replace function public.use_invite(want_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  owner uuid;
  mine text;
  already uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select p.invited_by, p.invite_code into already, mine
  from public.profiles p where p.user_id = me;
  if already is not null then
    return 'used';
  end if;
  if mine is not null and upper(mine) = upper(btrim(want_code)) then
    return 'self';
  end if;
  select p.user_id into owner
  from public.profiles p
  where p.invite_code is not null and upper(p.invite_code) = upper(btrim(want_code));
  if owner is null then
    return 'nobody';
  end if;
  if owner = me then
    return 'self';
  end if;
  insert into public.profiles (user_id, invited_by) values (me, owner)
  on conflict (user_id) do update set invited_by = owner
  where public.profiles.invited_by is null;
  return 'ok';
end;
$$;

-- Hands back what is owed and marks it paid in the same statement, so a
-- second tap pays nothing.
create or replace function public.claim_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  row public.profiles;
  coins integer := 0;
  looks text[] := '{}';
  joined integer;
  owed integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into row from public.profiles where user_id = me for update;
  if row is null then
    return jsonb_build_object('coins', 0, 'looks', '[]'::jsonb, 'joined', 0);
  end if;

  select count(*) into joined from public.profiles where invited_by = me;

  if row.invited_by is not null and not row.joined_paid then
    coins := coins + public.invite_coins();
  end if;

  owed := greatest(joined - row.invites_paid, 0);
  coins := coins + owed * public.invite_coins();

  if joined >= public.invite_look_at() and not row.invite_look_paid then
    looks := array_append(looks, 'night');
  end if;

  update public.profiles set
    joined_paid = (invited_by is not null),
    invites_paid = joined,
    invite_look_paid = invite_look_paid or joined >= public.invite_look_at()
  where user_id = me;

  return jsonb_build_object('coins', coins, 'looks', to_jsonb(looks), 'joined', joined);
end;
$$;

revoke all on function public.my_invite() from public;
revoke all on function public.use_invite(text) from public;
revoke all on function public.claim_invites() from public;
grant execute on function public.my_invite() to authenticated;
grant execute on function public.use_invite(text) to authenticated;
grant execute on function public.claim_invites() to authenticated;

-- Deleting your account already cascades through the new tables. This also
-- clears out a family nobody is left in.
create or replace function public.delete_me()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
  fam uuid;
  heir uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
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
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;

revoke all on function public.find_handle(text) from public;
revoke all on function public.make_family(text) from public;
revoke all on function public.join_family(text) from public;
revoke all on function public.say_yes(uuid) from public;
revoke all on function public.drop_friend(uuid) from public;
grant execute on function public.find_handle(text) to authenticated;
grant execute on function public.make_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.say_yes(uuid) to authenticated;
grant execute on function public.drop_friend(uuid) to authenticated;
