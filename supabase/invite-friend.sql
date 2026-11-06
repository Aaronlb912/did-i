-- Did I: the friend ID behind an invite code. Safe to run again. Runs last (new file).
--
-- Someone who opened a friend's invite link can add that friend in one tap:
-- right after joining, or when the account was too old for the invite to
-- count. Connect opens with the friend filled in and the ask still needs
-- their yes. Null for no such code, your own code, or a block either way.
-- Shares invite_owner's cap on looks (supabase/invite-owner.sql).

create or replace function public.inviter_friend_id(want_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  code text := upper(btrim(coalesce(want_code, '')));
  them public.profiles;
begin
  if who is null or length(code) <> 10 then
    return null;
  end if;
  if (select count(*) from public.invite_looks
      where user_id = who and looked_at > now() - interval '10 minutes') >= 60 then
    return null;
  end if;
  insert into public.invite_looks (user_id) values (who);
  select * into them
  from public.profiles p
  where p.invite_code is not null and upper(p.invite_code) = code
  limit 1;
  if them.user_id is null or them.user_id = who or public.blocked_with(them.user_id) then
    return null;
  end if;
  return them.friend_id;
end;
$$;

revoke all on function public.inviter_friend_id(text) from public, anon;
grant execute on function public.inviter_friend_id(text) to authenticated;

notify pgrst, 'reload schema';
