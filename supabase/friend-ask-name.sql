-- A friend request needs the asker's name. With no name the person asked
-- only sees "Someone wants to be friends." and cannot tell who it is.
-- Run after supabase/share-links.sql (and before drop-tonight.sql).
--
-- Every way to ask ends in an insert of an 'asked' row in friend_links
-- (the "ask a friend" policy, ask_by_friend_id, link_ask_friend), so the
-- check is a trigger there: no path skips it. The app asks for a name first
-- and maps 'need name' to that prompt.

create or replace function public.has_display_name(who uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = who and btrim(coalesce(p.display_name, '')) <> ''
  );
$$;

revoke all on function public.has_display_name(uuid) from public, anon, authenticated;

create or replace function public.friend_ask_needs_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.state = 'asked' and not public.has_display_name(new.from_id) then
    raise exception 'need name';
  end if;
  return new;
end;
$$;

revoke all on function public.friend_ask_needs_name() from public, anon, authenticated;

drop trigger if exists friend_ask_needs_name on public.friend_links;
create trigger friend_ask_needs_name
  before insert on public.friend_links
  for each row execute function public.friend_ask_needs_name();

-- Joining a Did we or keeping a Did you with "add" also asks through here.
-- With no name the ask is left out instead of raising, so the join or keep
-- itself still goes through (the app asks for the name before it calls).
create or replace function public.link_ask_friend(other uuid)
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
  if exists (select 1 from public.friend_links f
             where f.from_id = other and f.to_id = me and f.state = 'asked') then
    return public.link_befriend(other);
  end if;
  if not public.has_display_name(me) then
    return false;
  end if;
  insert into public.friend_links (from_id, to_id, state) values (me, other, 'asked')
  on conflict (from_id, to_id) do nothing;
  return true;
end;
$$;

revoke all on function public.link_ask_friend(uuid) from public, anon, authenticated;

-- Asking from a Did you link on its own says why it did nothing, so the app
-- can ask for a name and keep the ask waiting until there is one.
create or replace function public.befriend_by_link(code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  maker uuid;
begin
  if me is null then return false; end if;
  select l.made_by into maker from public.did_you_links l
  where l.code = lower(btrim(coalesce(befriend_by_link.code, ''))) and not l.ended
    and public.did_you_link_open(l.made_by, l.made_at);
  if maker is null or maker = me then return false; end if;
  if not public.has_display_name(me)
     and not exists (select 1 from public.friend_links f
                     where f.from_id = maker and f.to_id = me and f.state = 'asked') then
    raise exception 'need name';
  end if;
  return public.link_ask_friend(maker);
end;
$$;

revoke all on function public.befriend_by_link(text) from public, anon;
grant execute on function public.befriend_by_link(text) to authenticated;

-- The friend request list: their friend ID too, so a request from someone
-- with no name (sent before this file) still says who it is.
drop function if exists public.friend_askers();
create function public.friend_askers()
returns table (user_id uuid, handle text, display_name text, avatar_url text, friend_id text)
language sql
security definer
stable
set search_path = public
as $$
  select p.user_id, p.handle, p.display_name, nullif(p.avatar_url, ''), p.friend_id
  from public.friend_links l
  join public.profiles p on p.user_id = l.from_id
  where l.to_id = (select auth.uid()) and l.state <> 'ok'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = (select auth.uid()) and b.blocked = p.user_id)
         or (b.blocker = p.user_id and b.blocked = (select auth.uid()))
    );
$$;

revoke all on function public.friend_askers() from public, anon;
grant execute on function public.friend_askers() to authenticated;
