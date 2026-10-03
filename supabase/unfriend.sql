-- Ending a friendship cleanly, and the "already friends" check for links.
-- Apply after people.sql, did-we.sql, did-we-guard.sql and share-links.sql.
-- Safe to run again.

-- Did yous still waiting between the two of you go when the friendship
-- ends, both ways, unless you share a family (family can still send).
-- Kept ones are the other person's own questions now and stay.
create or replace function public.drop_sends_on_unfriend()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.state <> 'ok' or public.shares_family_of(old.from_id, old.to_id) then
    return old;
  end if;
  delete from public.sends s
  where s.state = 'sent'
    and ((s.from_id = old.from_id and s.to_id = old.to_id)
      or (s.from_id = old.to_id and s.to_id = old.from_id));
  return old;
end;
$$;

revoke all on function public.drop_sends_on_unfriend() from public, anon, authenticated;

drop trigger if exists drop_sends_on_unfriend on public.friend_links;
create trigger drop_sends_on_unfriend
  after delete on public.friend_links
  for each row execute function public.drop_sends_on_unfriend();

-- Whether two people share a family, for triggers that run without either
-- of them as auth.uid().
create or replace function public.shares_family_of(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members x
    join public.family_members y on y.family_id = x.family_id
    where x.user_id = a and y.user_id = b
  );
$$;

revoke all on function public.shares_family_of(uuid, uuid) from public, anon, authenticated;

-- Leave every Did we you are on with this person. The others keep the card.
-- Offered when you remove a friend.
create or replace function public.we_leave_shared(other uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  shared uuid;
  n integer := 0;
begin
  if me is null or other is null then return 0; end if;
  for shared in
    select mine.card_id
    from public.we_members mine
    join public.we_members them on them.card_id = mine.card_id
      and them.user_id = other and them.state in ('in', 'asked')
    where mine.user_id = me and mine.state = 'in'
  loop
    perform public.we_leave(shared);
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.we_leave_shared(uuid) from public, anon;
grant execute on function public.we_leave_shared(uuid) to authenticated;

-- How many Did wes you share with someone, so the remove sheet can ask.
create or replace function public.we_shared_count(other uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.we_members mine
  join public.we_members them on them.card_id = mine.card_id
    and them.user_id = other and them.state in ('in', 'asked')
  join public.we_cards c on c.id = mine.card_id and not c.archived
  where mine.user_id = (select auth.uid()) and mine.state = 'in';
$$;

revoke all on function public.we_shared_count(uuid) from public, anon;
grant execute on function public.we_shared_count(uuid) to authenticated;

-- Whether you are already friends with whoever made a link (a 10 letter Did
-- you code or a 12 letter Did we code), so the link sheet skips "add".
create or replace function public.link_maker_is_friend(code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((
    select public.are_friends(m.maker)
    from (
      select d.made_by as maker from public.did_you_links d
      where d.code = lower(btrim(link_maker_is_friend.code))
      union all
      select w.made_by from public.we_links w
      where w.code = lower(btrim(link_maker_is_friend.code))
    ) m
    where m.maker is not null
    limit 1
  ), false);
$$;

revoke all on function public.link_maker_is_friend(text) from public, anon;
grant execute on function public.link_maker_is_friend(text) to authenticated;

-- Leaving a family (or being taken out of one): the same clean break with
-- each person still in it, unless you are friends or share another family.
-- Did you's and Did we asks still waiting between you go; kept ones stay.
create or replace function public.drop_on_family_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other uuid;
begin
  for other in
    select m.user_id from public.family_members m
    where m.family_id = old.family_id and m.user_id <> old.user_id
  loop
    if public.shares_family_of(old.user_id, other)
       or exists (select 1 from public.friend_links l
                  where l.state = 'ok'
                    and ((l.from_id = old.user_id and l.to_id = other)
                      or (l.from_id = other and l.to_id = old.user_id))) then
      continue;
    end if;
    delete from public.sends s
    where s.state = 'sent'
      and ((s.from_id = old.user_id and s.to_id = other) or (s.from_id = other and s.to_id = old.user_id));
    delete from public.we_members w
    where w.state = 'asked'
      and ((w.user_id = old.user_id and w.asked_by = other) or (w.user_id = other and w.asked_by = old.user_id));
  end loop;
  return old;
end;
$$;

revoke all on function public.drop_on_family_leave() from public, anon, authenticated;

drop trigger if exists drop_on_family_leave on public.family_members;
create trigger drop_on_family_leave
  after delete on public.family_members
  for each row execute function public.drop_on_family_leave();
