-- Did I: ceilings found in the 2026-10-17 security read. Safe to run again.
-- Run after friend-ask-name.sql (and before drop-tonight.sql).
--
-- 1. Friend requests: cap_asks only counts requests still waiting, so
--    asking, taking it back and asking again pushed the same person over
--    and over. A log that a take-back does not clear holds each pair to 3
--    asks a day and each asker to 50.
-- 2. Pushes: at most 30 an hour reach one person, whatever queued them.
-- 3. Answers: the client wrote answer_log rows straight to the table, with
--    no ceiling. Writes now go through put_answers (and the key and family
--    functions) only, and one account holds at most 200,000 answers.
-- 4. Waitlist: nothing writes it any more, and its cap could be skipped by
--    backdating made_at. Closed to clients; waitlist_count still answers.

-- 1. Friend requests ------------------------------------------------------

create table if not exists public.friend_ask_log (
  from_id uuid not null references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  asked_at timestamptz not null default now()
);

create index if not exists friend_ask_log_from_idx on public.friend_ask_log (from_id, asked_at);
create index if not exists friend_ask_log_pair_idx on public.friend_ask_log (from_id, to_id, asked_at);
create index if not exists friend_ask_log_to_idx on public.friend_ask_log (to_id);

alter table public.friend_ask_log enable row level security;
revoke all on public.friend_ask_log from public, anon, authenticated;

-- Over the cap the ask is left out quietly (no row, no push), so a Did we
-- join or a Did you keep that also asks still goes through.
create or replace function public.log_friend_ask()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.state <> 'asked' then
    return new;
  end if;
  delete from public.friend_ask_log
  where from_id = new.from_id and asked_at < now() - interval '2 days';
  if (select count(*) from public.friend_ask_log
      where from_id = new.from_id and to_id = new.to_id and asked_at > now() - interval '1 day') >= 3
    or (select count(*) from public.friend_ask_log
      where from_id = new.from_id and asked_at > now() - interval '1 day') >= 50 then
    return null;
  end if;
  insert into public.friend_ask_log (from_id, to_id) values (new.from_id, new.to_id);
  return new;
end;
$$;

revoke all on function public.log_friend_ask() from public, anon, authenticated;

drop trigger if exists log_friend_ask on public.friend_links;
create trigger log_friend_ask
  before insert on public.friend_links
  for each row execute function public.log_friend_ask();

-- 2. Pushes -----------------------------------------------------------------

-- Sent pushes leave push_queue, so the count lives in its own table, one row
-- per person per hour.
create table if not exists public.push_to_counts (
  to_id uuid not null references auth.users on delete cascade,
  hour timestamptz not null,
  n integer not null default 0,
  primary key (to_id, hour)
);

alter table public.push_to_counts enable row level security;
revoke all on public.push_to_counts from public, anon, authenticated;

create or replace function public.cap_push_to()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  slot timestamptz := date_trunc('hour', now());
  got integer;
begin
  delete from public.push_to_counts where to_id = new.to_id and hour < slot - interval '1 day';
  insert into public.push_to_counts as c (to_id, hour, n) values (new.to_id, slot, 1)
  on conflict (to_id, hour) do update set n = c.n + 1
  returning n into got;
  if got > 30 then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.cap_push_to() from public, anon, authenticated;

drop trigger if exists cap_push_to on public.push_queue;
create trigger cap_push_to
  before insert on public.push_queue
  for each row execute function public.cap_push_to();

-- 3. Answers ----------------------------------------------------------------

-- Reads (sync) and deletes (demo answers) stay; writes go through functions.
revoke insert, update on public.answer_log from authenticated;

-- Statement level, on new rows only: a sync that rewrites old answers adds
-- nothing and is not counted. One indexed count per account per write.
create or replace function public.cap_answer_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid;
begin
  for who in select distinct user_id from added loop
    if (select count(*) from public.answer_log where user_id = who) > 200000 then
      raise exception 'too many answers';
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.cap_answer_rows() from public, anon, authenticated;

drop trigger if exists cap_answer_rows on public.answer_log;
create trigger cap_answer_rows
  after insert on public.answer_log
  referencing new table as added
  for each statement execute function public.cap_answer_rows();

-- 4. Waitlist ---------------------------------------------------------------

drop policy if exists "join waitlist" on public.waitlist;
revoke all on public.waitlist from public, anon, authenticated;

create or replace function public.cap_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.made_at := now();
  if (select count(*) from public.waitlist
      where made_at > now() - interval '1 hour') >= 200 then
    raise exception 'waitlist cap';
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
