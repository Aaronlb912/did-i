-- Did I: whose invite code is this? Safe to run again. Runs last (new file).
--
-- The code box shows "Aaron's code" as soon as a whole code is typed, and the
-- sign-in after an invite link says whose invite was used. Returns the
-- owner's name ('' when they have none yet), or null for no such code. A code
-- is 10 of 36 letters, so guessing finds nothing; the cap below (60 looks per
-- 10 minutes) only keeps one account from hammering it.

create table if not exists public.invite_looks (
  user_id uuid not null references auth.users (id) on delete cascade,
  looked_at timestamptz not null default now()
);
create index if not exists invite_looks_user_idx on public.invite_looks (user_id, looked_at);
alter table public.invite_looks enable row level security;
revoke all on public.invite_looks from public, anon, authenticated;

create or replace function public.invite_owner(want_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  code text := upper(btrim(coalesce(want_code, '')));
  name text;
begin
  if who is null or length(code) <> 10 then
    return null;
  end if;
  if (select count(*) from public.invite_looks
      where user_id = who and looked_at > now() - interval '10 minutes') >= 60 then
    return null;
  end if;
  insert into public.invite_looks (user_id) values (who);
  delete from public.invite_looks where user_id = who and looked_at < now() - interval '1 day';
  select coalesce(btrim(p.display_name), '') into name
  from public.profiles p
  where p.invite_code is not null and upper(p.invite_code) = code
  limit 1;
  return name;
end;
$$;

revoke all on function public.invite_owner(text) from public, anon;
grant execute on function public.invite_owner(text) to authenticated;

notify pgrst, 'reload schema';
