-- Did I: a ceiling on purchase checks. Every call to the gem-iap function
-- signs a store token and asks Apple or Google, so a signed-in account calling
-- it in a loop costs function time and store API quota. gem-iap asks
-- iap_try() first; past 30 checks in 10 minutes it answers 'tooMany'.
-- Run after gem-purchases.sql.

create table if not exists public.iap_tries (
  user_id uuid not null references auth.users on delete cascade,
  tried_at timestamptz not null default now()
);

create index if not exists iap_tries_user_at_idx on public.iap_tries (user_id, tried_at);

alter table public.iap_tries enable row level security;
revoke all on public.iap_tries from public, anon, authenticated;

-- True when this check may go ahead (and counts it). Service role only.
create or replace function public.iap_try(who uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if who is null then
    return false;
  end if;
  delete from public.iap_tries where user_id = who and tried_at < now() - interval '1 hour';
  if (select count(*) from public.iap_tries
      where user_id = who and tried_at > now() - interval '10 minutes') >= 30 then
    return false;
  end if;
  insert into public.iap_tries (user_id) values (who);
  return true;
end;
$$;

revoke all on function public.iap_try(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
