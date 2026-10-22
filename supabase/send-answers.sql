-- The person who sent a Did you sees how the other person answers it.
--
-- Once kept, a Did you lives on the keeper's own shelf. Their phone copies
-- the last few nights' Did / Not yet for each kept Did you here, and only
-- for those it still shares. The sender reads the latest nights through
-- send_answers_for. Nothing else from the shelf leaves it.
--
-- The keeper controls it: share_answers on the send, on by default (they
-- kept a question someone asked them). Turning it off deletes what is here
-- and stops new rows. Blocking, unfriending or leaving the family hides it:
-- both functions check the two are still friends or family.
--
-- Apply after people.sql, hardening.sql, blocks.sql and auto-add.sql.

alter table public.sends add column if not exists share_answers boolean not null default true;

create table if not exists public.send_answers (
  send_id uuid not null references public.sends on delete cascade,
  night date not null,
  answer text not null check (answer in ('did', 'nope')),
  at timestamptz not null default now(),
  primary key (send_id, night)
);

alter table public.send_answers enable row level security;
-- Only the functions below read or write it.
revoke all on public.send_answers from anon, authenticated;

-- The keeper's phone sends every kept Did you it shares, with that send's
-- answers from `since` on. Rows from `since` on that it did not send are
-- gone (an answer taken back). Sends that are not theirs, not kept, not
-- shared or with someone they no longer know are left out quietly.
create or replace function public.share_send_answers(since date, ids uuid[], rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  ok uuid[];
  n integer := 0;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if since is null or since < current_date - 14 or since > current_date + 2 then
    raise exception 'bad since';
  end if;
  if coalesce(array_length(ids, 1), 0) > 200 then
    raise exception 'too many sends';
  end if;
  if rows is null or jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 1000 then
    raise exception 'bad rows';
  end if;

  select coalesce(array_agg(s.id), '{}') into ok
  from public.sends s
  where s.id = any(ids)
    and s.to_id = me
    and s.state = 'kept'
    and s.kind = 'todo'
    and s.share_answers
    and not public.blocked_with(s.from_id)
    and (public.are_friends(s.from_id) or public.shares_family(s.from_id));

  delete from public.send_answers a
  where a.send_id = any(ok) and a.night >= since;

  insert into public.send_answers (send_id, night, answer, at)
  select distinct on ((r ->> 'send_id')::uuid, (r ->> 'night')::date)
    (r ->> 'send_id')::uuid,
    (r ->> 'night')::date,
    r ->> 'answer',
    least(coalesce((r ->> 'at')::timestamptz, now()), now())
  from jsonb_array_elements(rows) r
  where (r ->> 'send_id')::uuid = any(ok)
    and (r ->> 'night')::date between since and current_date + 2
    and r ->> 'answer' in ('did', 'nope')
  order by (r ->> 'send_id')::uuid, (r ->> 'night')::date, (r ->> 'at') desc nulls last;
  get diagnostics n = row_count;

  -- ids is every Did you still shared on the caller's shelf, so a send left
  -- out was deleted there (or turned off): its answers go too.
  delete from public.send_answers a
  using public.sends s
  where s.id = a.send_id and s.to_id = me and not (a.send_id = any(ids));

  -- Nobody looks back further than a week. Two weeks covers every time zone
  -- and the oldest `since` this accepts.
  delete from public.send_answers a
  using public.sends s
  where s.id = a.send_id and s.to_id = me and a.night < current_date - 14;

  return n;
end;
$$;

-- On or off for one kept Did you. Off drops what the sender could see.
create or replace function public.set_send_share(send uuid, share boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  update public.sends s
  set share_answers = coalesce(share, true)
  where s.id = send and s.to_id = me;
  if not found then
    return false;
  end if;
  if not coalesce(share, true) then
    delete from public.send_answers where send_id = send;
  end if;
  return true;
end;
$$;

-- The sender's view: the last seven nights each of their sends was answered,
-- newest first, in one call for the whole Sent list.
create or replace function public.send_answers_for(ids uuid[])
returns table (send_id uuid, night date, answer text, at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select x.send_id, x.night, x.answer, x.at
  from (
    select a.send_id, a.night, a.answer, a.at,
      row_number() over (partition by a.send_id order by a.night desc) as k
    from public.send_answers a
    join public.sends s on s.id = a.send_id
    where s.id = any(ids[1:200])
      and s.from_id = (select auth.uid())
      and s.share_answers
      -- The last week only. current_date is UTC, so one more night covers a
      -- phone a day behind.
      and a.night >= current_date - 8
      and not public.blocked_with(s.to_id)
      and (public.are_friends(s.to_id) or public.shares_family(s.to_id))
  ) x
  where x.k <= 7
  order by x.send_id, x.night desc;
$$;

revoke all on function public.share_send_answers(date, uuid[], jsonb) from public, anon;
revoke all on function public.set_send_share(uuid, boolean) from public, anon;
revoke all on function public.send_answers_for(uuid[]) from public, anon;
grant execute on function public.share_send_answers(date, uuid[], jsonb) to authenticated;
grant execute on function public.set_send_share(uuid, boolean) to authenticated;
grant execute on function public.send_answers_for(uuid[]) to authenticated;

-- Clear shared answers when two people stop being connected, so a re-friend
-- later does not bring old answers back. Runs on unfriend, block and leaving
-- a family; keeps answers for pairs still linked another way.
create or replace function public.prune_send_answers(who uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.send_answers a
  using public.sends s
  where s.id = a.send_id
    and (s.from_id = who or s.to_id = who)
    and (
      exists (
        select 1 from public.blocks b
        where (b.blocker = s.from_id and b.blocked = s.to_id)
           or (b.blocker = s.to_id and b.blocked = s.from_id)
      )
      or not (
        exists (
          select 1 from public.friend_links f
          where f.state = 'ok'
            and ((f.from_id = s.from_id and f.to_id = s.to_id) or (f.from_id = s.to_id and f.to_id = s.from_id))
        )
        or exists (
          select 1 from public.family_members m1
          join public.family_members m2 on m2.family_id = m1.family_id
          where m1.user_id = s.from_id and m2.user_id = s.to_id
        )
      )
    );
$$;

revoke all on function public.prune_send_answers(uuid) from public, anon, authenticated;

create or replace function public.prune_send_answers_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'friend_links' then
    perform public.prune_send_answers(old.from_id);
  elsif tg_table_name = 'family_members' then
    perform public.prune_send_answers(old.user_id);
  elsif tg_table_name = 'blocks' then
    perform public.prune_send_answers(new.blocker);
  end if;
  return null;
end;
$$;

revoke all on function public.prune_send_answers_trigger() from public, anon, authenticated;

drop trigger if exists send_answers_unfriend on public.friend_links;
create trigger send_answers_unfriend after delete on public.friend_links
  for each row execute function public.prune_send_answers_trigger();

drop trigger if exists send_answers_leave_family on public.family_members;
create trigger send_answers_leave_family after delete on public.family_members
  for each row execute function public.prune_send_answers_trigger();

drop trigger if exists send_answers_block on public.blocks;
create trigger send_answers_block after insert on public.blocks
  for each row execute function public.prune_send_answers_trigger();
