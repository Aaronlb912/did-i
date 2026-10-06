-- Did I: friends show as their buddy, and a friend's last 7 nights.
-- Run after avatars.sql. Safe to run again.

-- Friends and family, now with the buddy they wear. Same rules as avatars.sql.
drop function if exists public.known_people();

create or replace function public.known_people()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  share_streak boolean,
  streak integer,
  done_on date,
  avatar_url text,
  buddy_on text
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
  select p.user_id, p.handle, p.display_name, p.share_streak, p.streak, p.done_on,
    nullif(p.avatar_url, ''), coalesce(p.buddy_on, '')
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

-- Nights you cleared. One row per night, only the last 14 kept.
create table if not exists public.cleared_nights (
  user_id uuid not null references auth.users on delete cascade,
  night date not null,
  primary key (user_id, night)
);

alter table public.cleared_nights enable row level security;

drop policy if exists "own cleared nights" on public.cleared_nights;
create policy "own cleared nights" on public.cleared_nights
  for select using ((select auth.uid()) = user_id);

-- The only write: mark a night cleared (or not). Near today only, and old
-- rows go, so the table stays at 14 rows a person at most.
create or replace function public.mark_cleared(night date, cleared boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not signed in'; end if;
  if night is null or night < current_date - 2 or night > current_date + 2 then
    raise exception 'night out of range';
  end if;
  if cleared then
    insert into public.cleared_nights (user_id, night) values (uid, night)
    on conflict do nothing;
  else
    delete from public.cleared_nights c where c.user_id = uid and c.night = mark_cleared.night;
  end if;
  delete from public.cleared_nights c where c.user_id = uid and c.night < current_date - 14;
end;
$$;

revoke all on function public.mark_cleared(date, boolean) from public, anon;
grant execute on function public.mark_cleared(date, boolean) to authenticated;

-- A friend's last 7 nights, cleared or not, ending on `upto` (your
-- tonight). Only for accepted friends or family who share their streak,
-- and not when either side blocked. Nothing else about the night.
drop function if exists public.friend_week(uuid, date);
create or replace function public.friend_week(other uuid, upto date)
returns table (night date, cleared boolean)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select auth.uid() as id),
  ok as (
    select 1
    from public.profiles p
    where p.user_id = other
      and p.user_id <> (select id from me)
      and p.share_streak is not false
      and upto between current_date - 2 and current_date + 2
      and (
        exists (
          select 1 from public.friend_links l
          where l.state = 'ok'
            and ((l.from_id = (select id from me) and l.to_id = other)
              or (l.to_id = (select id from me) and l.from_id = other))
        )
        or exists (
          select 1 from public.family_members a
          join public.family_members b on b.family_id = a.family_id
          where a.user_id = (select id from me) and b.user_id = other
        )
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = (select id from me) and b.blocked = other)
           or (b.blocker = other and b.blocked = (select id from me))
      )
  )
  select d::date as night,
    exists (select 1 from public.cleared_nights c where c.user_id = other and c.night = d::date) as cleared
  from ok, generate_series(upto - 6, upto, interval '1 day') d
  order by 1;
$$;

revoke all on function public.friend_week(uuid, date) from public, anon;
grant execute on function public.friend_week(uuid, date) to authenticated;
