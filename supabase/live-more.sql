-- Did I: the rest of what other people do shows up right away. Safe to run
-- again. Runs after social-live.sql (live_ping) and every file that makes
-- these tables.
--
-- social-live.sql pings for answers and new Did yous. This adds the other
-- changes a screen shows, so it looks again at once instead of on the 5
-- minute check: friend requests (new, yes, removed), gifts, Did we invites
-- and joins, family members, names and questions, and a Did you taken back,
-- edited or answered. Like the others, a ping carries only an id the person
-- can already read, and goes only to people who can already see the change.
-- These use their own kinds (weMembers, familyInfo, sendMoved), not we,
-- family and send: those also wake closed phones (wake-push.sql), which is
-- for answers only.

-- Friend requests: a new one pings the person asked, a yes pings the asker.
-- A removal (or the delete a block makes) pings both sides, so neither list
-- keeps a friend who is gone.
create or replace function public.live_friend_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if tg_op = 'DELETE' then
    for r in select o.id, array[o.from_id, o.to_id] as who from gone o loop
      perform public.live_ping(r.who, 'friend', r.id);
    end loop;
    return null;
  end if;
  for r in
    select c.id, case when tg_op = 'INSERT' then c.to_id else c.from_id end as who
    from changed c
    where ((tg_op = 'INSERT' and c.state = 'asked') or (tg_op = 'UPDATE' and c.state = 'ok'))
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = c.from_id and b.blocked = c.to_id)
           or (b.blocker = c.to_id and b.blocked = c.from_id)
      )
  loop
    perform public.live_ping(array[r.who], 'friend', r.id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_friend_links() from public, anon, authenticated;

drop trigger if exists live_friend_asks on public.friend_links;
create trigger live_friend_asks after insert on public.friend_links
  referencing new table as changed for each statement execute function public.live_friend_links();
drop trigger if exists live_friend_yes on public.friend_links;
create trigger live_friend_yes after update on public.friend_links
  referencing new table as changed for each statement execute function public.live_friend_links();
drop trigger if exists live_friend_gone on public.friend_links;
create trigger live_friend_gone after delete on public.friend_links
  referencing old table as gone for each statement execute function public.live_friend_links();

-- A cheer gift: the person it is for.
create or replace function public.live_gifts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in select c.to_id, (array_agg(c.id))[1] as id from changed c group by c.to_id loop
    perform public.live_ping(array[r.to_id], 'gift', r.id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_gifts() from public, anon, authenticated;

drop trigger if exists live_gifts on public.cheer_gifts;
create trigger live_gifts after insert on public.cheer_gifts
  referencing new table as changed for each statement execute function public.live_gifts();

-- Did we: an invite, a yes or a leave pings everyone on the card who is in
-- or asked, the one invited included.
create or replace function public.live_we_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.card_id, array_agg(distinct m.user_id) as who
    from (select distinct card_id from changed) c
    join public.we_members m on m.card_id = c.card_id and m.state in ('asked', 'in')
    group by c.card_id
  loop
    perform public.live_ping(r.who, 'weMembers', r.card_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_we_members() from public, anon, authenticated;

drop trigger if exists live_we_members_new on public.we_members;
create trigger live_we_members_new after insert on public.we_members
  referencing new table as changed for each statement execute function public.live_we_members();
drop trigger if exists live_we_members_moved on public.we_members;
create trigger live_we_members_moved after update on public.we_members
  referencing new table as changed for each statement execute function public.live_we_members();

-- Families: who is in, the name, and the family questions. Everyone in the
-- family hears it, and someone who left or was removed hears it too.
create or replace function public.live_family_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if tg_op = 'DELETE' then
    for r in
      select g.family_id, array_agg(distinct w.user_id) as who
      from (select distinct family_id from gone) g
      join (
        select family_id, user_id from public.family_members
        union
        select family_id, user_id from gone
      ) w on w.family_id = g.family_id
      group by g.family_id
    loop
      perform public.live_ping(r.who, 'familyInfo', r.family_id);
    end loop;
    return null;
  end if;
  for r in
    select c.family_id, array_agg(distinct m.user_id) as who
    from (select distinct family_id from changed) c
    join public.family_members m on m.family_id = c.family_id
    group by c.family_id
  loop
    perform public.live_ping(r.who, 'familyInfo', r.family_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_family_change() from public, anon, authenticated;

drop trigger if exists live_family_joined on public.family_members;
create trigger live_family_joined after insert on public.family_members
  referencing new table as changed for each statement execute function public.live_family_change();
drop trigger if exists live_family_left on public.family_members;
create trigger live_family_left after delete on public.family_members
  referencing old table as gone for each statement execute function public.live_family_change();

-- Family questions: everyone in the family. Rows have no user_id, so this
-- reads members only (a delete is not a leave).
create or replace function public.live_family_lamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.family_id, array_agg(distinct m.user_id) as who
    from (select distinct family_id from changed) c
    join public.family_members m on m.family_id = c.family_id
    group by c.family_id
  loop
    perform public.live_ping(r.who, 'familyInfo', r.family_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_family_lamps() from public, anon, authenticated;

drop trigger if exists live_family_lamps_new on public.family_lamps;
create trigger live_family_lamps_new after insert on public.family_lamps
  referencing new table as changed for each statement execute function public.live_family_lamps();
drop trigger if exists live_family_lamps_moved on public.family_lamps;
create trigger live_family_lamps_moved after update on public.family_lamps
  referencing new table as changed for each statement execute function public.live_family_lamps();
drop trigger if exists live_family_lamps_gone on public.family_lamps;
create trigger live_family_lamps_gone after delete on public.family_lamps
  referencing old table as changed for each statement execute function public.live_family_lamps();

-- A renamed family: families has id, not family_id.
create or replace function public.live_family_renamed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.id as family_id, array_agg(distinct m.user_id) as who
    from changed c
    join public.family_members m on m.family_id = c.id
    group by c.id
  loop
    perform public.live_ping(r.who, 'familyInfo', r.family_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_family_renamed() from public, anon, authenticated;

drop trigger if exists live_family_renamed on public.families;
create trigger live_family_renamed after update on public.families
  referencing new table as changed for each statement execute function public.live_family_renamed();

-- A Did you edited or taken back pings the person it went to ('ask', their
-- Inbox); kept or passed pings the sender ('send', their Sent).
create or replace function public.live_sends_moved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select s.to_id as who, (array_agg(s.id))[1] as id, 'ask' as kind
    from (select * from changed) s group by s.to_id
    union all
    select s.from_id, (array_agg(s.id))[1], 'sendMoved' from (select * from changed) s where tg_op = 'UPDATE' group by s.from_id
  loop
    perform public.live_ping(array[r.who], r.kind, r.id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_sends_moved() from public, anon, authenticated;

drop trigger if exists live_sends_moved on public.sends;
create trigger live_sends_moved after update on public.sends
  referencing new table as changed for each statement execute function public.live_sends_moved();
drop trigger if exists live_sends_gone on public.sends;
create trigger live_sends_gone after delete on public.sends
  referencing old table as changed for each statement execute function public.live_sends_moved();

notify pgrst, 'reload schema';
