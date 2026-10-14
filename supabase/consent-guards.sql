-- Consent guards (2026-10-14). Run last. Safe to run again.
--
-- Closes holes where one person could act for another without their say:
-- friend links made or rewritten from the client, family members added
-- without joining, free cheers on a new profile, family questions moved to
-- a family you are not in. Also makes put_answers compare answer times as
-- times, not text, for the switch to UTC stamps.

-- 1. A request from the client is only ever a request. A friendship ('ok')
-- comes from say_yes or the link functions, which are security definer.
drop policy if exists "ask a friend" on public.friend_links;
create policy "ask a friend" on public.friend_links
  for insert with check (
    (select auth.uid()) = from_id
    and not public.blocked_with(to_id)
    and state = 'asked'
  );

-- 2. The person asked can only answer yes. They cannot rewrite who asked.
-- Definer functions (say_yes, link_befriend) run as the owner, so the
-- trigger lets them through.
revoke update on public.friend_links from authenticated;
grant update (state) on public.friend_links to authenticated;

create or replace function public.guard_link_answer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if old.state <> 'asked' or new.state <> 'ok'
     or (to_jsonb(new) - 'state') is distinct from (to_jsonb(old) - 'state') then
    raise exception 'only a yes to a request';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_link_answer() from public, anon, authenticated;

drop trigger if exists guard_link_answer on public.friend_links;
create trigger guard_link_answer
  before update on public.friend_links
  for each row execute function public.guard_link_answer();

-- 3. Nobody joins a family from the client. make_family and join_family
-- (security definer) add the maker and code joiners; there is no other
-- insert in the app, so the policy goes and inserts are closed to clients.
drop policy if exists "parents add members" on public.family_members;
revoke insert on public.family_members from anon, authenticated;

-- 4. Same wallet guard as lockdown.sql, plus friend_cheers. keep_friend_cheers
-- already holds it on update; this also zeroes it on insert, so a new
-- profile row cannot start with free cheers. buy_friend_cheers, gifts and
-- claims are security definer, so current_user is the owner and they pass.
create or replace function public.guard_profile_wallet()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.gem_balance := 0;
    new.coin_balance := 0;
    new.gem_week := '';
    new.coin_cosmetics := '{"stamps":[],"badges":[]}'::jsonb;
    new.gem_cosmetics := '{"looks":[],"cheers":[],"buddies":[]}'::jsonb;
    new.friend_cheers := 0;
  else
    new.gem_balance := old.gem_balance;
    new.coin_balance := old.coin_balance;
    new.gem_week := old.gem_week;
    new.coin_cosmetics := old.coin_cosmetics;
    new.gem_cosmetics := old.gem_cosmetics;
    new.friend_cheers := old.friend_cheers;
  end if;
  return new;
end;
$$;

-- 5. A family question can only move to a family you are in.
drop policy if exists "edit a family question" on public.family_lamps;
create policy "edit a family question" on public.family_lamps
  for update using (public.is_parent(family_id) or (select auth.uid()) = made_by)
  with check (
    public.in_family(family_id)
    and (public.is_parent(family_id) or (select auth.uid()) = made_by)
  );

-- 6. Answer times as times.
--
-- answered_at and note_at are text. Older apps wrote zoneless local time
-- ('2026-10-14T22:00:00'); newer ones write UTC ('2026-10-15T03:00:00.000Z').
-- Text compare across the two is wrong by the phone's offset. stamp_ts reads
-- a stamp with a zone as is and a zoneless one as UTC. That is still off by
-- the offset for old local stamps, but only while a phone has both kinds;
-- once the old stamps are replaced it is exact. Empty or unreadable is
-- the earliest time, so any real stamp beats it.
create or replace function public.stamp_ts(stamp text)
returns timestamptz
language plpgsql
immutable
set search_path = public
as $$
begin
  if stamp is null or btrim(stamp) = '' then
    return '-infinity'::timestamptz;
  end if;
  if stamp ~ '(Z|z|[+-]\d{2}(:?\d{2})?)$' and stamp ~ 'T|\s' then
    return stamp::timestamptz;
  end if;
  return stamp::timestamp at time zone 'UTC';
exception when others then
  return '-infinity'::timestamptz;
end;
$$;

revoke all on function public.stamp_ts(text) from public, anon;
grant execute on function public.stamp_ts(text) to authenticated;

-- Full body from answers.sql; only the where clause on the conflict changed.
create or replace function public.put_answers(rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  put integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(rows) > 2000 then
    raise exception 'too many answers at once';
  end if;

  insert into public.answer_log
    (user_id, lamp_id, period_key, board_id, status, answered_at, note, note_at, amount, updated_at)
  select
    me,
    left(r->>'l', 64),
    left(r->>'p', 24),
    left(coalesce(r->>'b', ''), 64),
    case when r->>'s' in ('yes', 'skip', 'late') then r->>'s' else 'yes' end,
    left(coalesce(r->>'a', ''), 32),
    left(coalesce(r->>'n', ''), 500),
    left(coalesce(r->>'e', ''), 32),
    case
      when not (r ? 'm') then (
        select o.amount from public.answer_log o
        where o.user_id = me and o.lamp_id = left(r->>'l', 64) and o.period_key = left(r->>'p', 24)
      )
      -- Nested so the cast only runs on a json number.
      when jsonb_typeof(r->'m') = 'number' then (
        case when (r->'m')::numeric >= 0 and (r->'m')::numeric <= 100000
          then round((r->'m')::numeric, 2) end
      )
      else null
    end
  , now()
  from jsonb_array_elements(rows) r
  where r->>'l' is not null and r->>'p' is not null
  on conflict (user_id, lamp_id, period_key) do update
    set status = excluded.status,
        answered_at = excluded.answered_at,
        note = excluded.note,
        note_at = excluded.note_at,
        amount = excluded.amount,
        board_id = excluded.board_id,
        updated_at = now()
    where greatest(public.stamp_ts(excluded.answered_at), public.stamp_ts(excluded.note_at))
      > greatest(public.stamp_ts(public.answer_log.answered_at), public.stamp_ts(public.answer_log.note_at));

  get diagnostics put = row_count;
  return put;
end;
$$;

revoke all on function public.put_answers(jsonb) from public;
grant execute on function public.put_answers(jsonb) to authenticated;

notify pgrst, 'reload schema';
