-- Friend ID asks: if they already asked you, it is a yes both ways (like a
-- link), and a request the daily cap drops says so instead of "Asked".
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

notify pgrst, 'reload schema';
