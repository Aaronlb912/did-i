-- Declining a friend request holds new asks from that person for 7 days.
-- The asker still gets the normal "asked" answer, so a decline is not shown.
-- Rows are only read and written by the functions below.
create table if not exists public.friend_declines (
  decliner uuid not null references auth.users (id) on delete cascade,
  asker uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (decliner, asker)
);
create index if not exists friend_declines_asker_idx on public.friend_declines (asker);
alter table public.friend_declines enable row level security;
revoke all on public.friend_declines from anon, authenticated;

-- A request deleted by the person it was sent to is a decline.
create or replace function public.note_friend_decline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.state = 'asked' and old.to_id = (select auth.uid()) then
    delete from public.friend_declines d where d.at < now() - interval '7 days';
    insert into public.friend_declines (decliner, asker, at)
    values (old.to_id, old.from_id, now())
    on conflict (decliner, asker) do update set at = excluded.at;
  end if;
  return old;
end;
$$;
revoke all on function public.note_friend_decline() from public, anon, authenticated;

drop trigger if exists friend_decline_note on public.friend_links;
create trigger friend_decline_note
  after delete on public.friend_links
  for each row execute function public.note_friend_decline();

create or replace function public.ask_by_friend_id(wanted text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  code text := regexp_replace(coalesce(wanted, ''), '[^0-9]', '', 'g');
  them public.profiles;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if (select count(*) from public.friend_id_misses m
      where m.user_id = who and m.made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many tries';
  end if;
  if code !~ '^[1-9][0-9]{11}$' then
    raise exception 'bad id';
  end if;

  select * into them from public.profiles p where p.friend_id = code;
  -- A miss returns instead of raising: raising would roll back the miss
  -- row, and then the daily limit would never count anything.
  -- A block gets the same answer as a wrong ID, so it is not revealed.
  if them is null or them.user_id = who or public.blocked_with(them.user_id) then
    insert into public.friend_id_misses (user_id) values (who);
    return jsonb_build_object('miss', 'nobody');
  end if;

  if exists (select 1 from public.friend_links f
             where f.from_id = them.user_id and f.to_id = who and f.state = 'asked') then
    perform public.link_befriend(them.user_id);
    return jsonb_build_object('user_id', them.user_id, 'display_name', coalesce(them.display_name, ''), 'friends', true);
  end if;

  -- Declined in the last 7 days: answer like a fresh ask, write nothing.
  if exists (select 1 from public.friend_declines d
             where d.decliner = them.user_id and d.asker = who
               and d.at > now() - interval '7 days') then
    return jsonb_build_object('user_id', them.user_id, 'display_name', coalesce(them.display_name, ''));
  end if;

  insert into public.friend_links (from_id, to_id, state)
  values (who, them.user_id, 'asked')
  on conflict do nothing;
  -- Nothing written and nothing there before: the ask cap dropped it.
  if not found and not exists (select 1 from public.friend_links f
                               where f.from_id = who and f.to_id = them.user_id) then
    return jsonb_build_object('miss', 'cap');
  end if;

  return jsonb_build_object('user_id', them.user_id, 'display_name', coalesce(them.display_name, ''));
end;
$$;
revoke all on function public.ask_by_friend_id(text) from public, anon;
grant execute on function public.ask_by_friend_id(text) to authenticated;

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
  if exists (select 1 from public.friend_declines d
             where d.decliner = other and d.asker = me
               and d.at > now() - interval '7 days') then
    return true;
  end if;
  insert into public.friend_links (from_id, to_id, state) values (me, other, 'asked')
  on conflict (from_id, to_id) do nothing;
  return true;
end;
$$;

revoke all on function public.link_ask_friend(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
