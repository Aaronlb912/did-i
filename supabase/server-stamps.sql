-- Server-set times and report status. Run by db:apply:all just before
-- drop-tonight.sql. Safe to run again.
--
-- Clients could send their own made_at (and a report's status), so a row
-- dated last week slipped past the 20 a day caps and the report mail.
-- For app callers (current_user authenticated or anon) the server now sets
-- these. Triggers fire in name order, so the stamps are named a_* to run
-- before the cap_* triggers count.

-- Reports: the cap itself stamps the row first.
create or replace function public.cap_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.made_at := now();
    new.status := 'open';
    new.handled_at := null;
    new.handled_by := null;
  end if;
  if (select count(*) from public.reports r
      where r.from_id = new.from_id and r.made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many reports today';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_reports() from public;

drop trigger if exists cap_reports on public.reports;
create trigger cap_reports
  before insert on public.reports
  for each row execute function public.cap_reports();

-- Shared notes, we notes and sends: made_at is now() on insert and never
-- moves on update. Not security definer, so current_user is the caller.
create or replace function public.stamp_made_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.made_at := now();
    else
      new.made_at := old.made_at;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.stamp_made_at() from public;

drop trigger if exists a_stamp_made_at on public.shared_notes;
create trigger a_stamp_made_at
  before insert or update on public.shared_notes
  for each row execute function public.stamp_made_at();

drop trigger if exists a_stamp_made_at on public.we_notes;
create trigger a_stamp_made_at
  before insert or update on public.we_notes
  for each row execute function public.stamp_made_at();

drop trigger if exists a_stamp_made_at on public.sends;
create trigger a_stamp_made_at
  before insert on public.sends
  for each row execute function public.stamp_made_at();
