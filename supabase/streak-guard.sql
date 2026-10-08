-- The streak friends see is reported by the phone. Freezes are worked out
-- from answers on the phone and never stored, so there is no balance to add
-- to. This guard keeps a reported streak honest: never below 0 and never more
-- nights than the account has existed (plus one for tonight).
create or replace function public.clip_profile_streak()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  joined date;
begin
  select (u.created_at at time zone 'utc')::date into joined from auth.users u where u.id = new.user_id;
  if new.streak is null or new.streak < 0 then
    new.streak := 0;
  end if;
  if joined is not null and new.streak > (current_date - joined) + 2 then
    new.streak := (current_date - joined) + 2;
  end if;
  return new;
end;
$$;

revoke all on function public.clip_profile_streak() from public, anon, authenticated;

drop trigger if exists profiles_clip_streak on public.profiles;
create trigger profiles_clip_streak
  before insert or update of streak on public.profiles
  for each row execute function public.clip_profile_streak();
