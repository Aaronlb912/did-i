-- Did I waitlist. Run after gem-purchases.sql.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  made_at timestamptz not null default now(),
  constraint waitlist_email_len check (length(btrim(email)) between 5 and 254),
  constraint waitlist_email_shape check (btrim(email) ~* '^[^@]+@[^@]+\.[^@]+$')
);

create unique index if not exists waitlist_email_key on public.waitlist (lower(btrim(email)));

alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon;

drop policy if exists "join waitlist" on public.waitlist;
create policy "join waitlist" on public.waitlist
  for insert to anon, authenticated
  with check (true);

create or replace function public.waitlist_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::bigint from public.waitlist;
$$;

revoke all on function public.waitlist_count() from public;
grant execute on function public.waitlist_count() to anon, authenticated;

create or replace function public.cap_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.waitlist
      where made_at > now() - interval '1 hour') >= 200 then
    raise exception 'waitlist cap';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_waitlist on public.waitlist;
create trigger cap_waitlist
  before insert on public.waitlist
  for each row execute function public.cap_waitlist();
