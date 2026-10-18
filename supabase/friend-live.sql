-- Did I: a friend request shows up on the other phone right away. Safe to
-- run again. Runs after social-live.sql (live_ping).
--
-- A new request pings the person asked; a yes pings the one who asked, so
-- both People screens look again at once instead of on the 5 minute check.
-- Like the other live pings it carries only the link id, and nothing goes
-- between two people when either has blocked the other.

create or replace function public.live_friend_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
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

notify pgrst, 'reload schema';
