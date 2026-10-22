-- Undo on one phone must not come back from another phone that missed it.
-- The app notes each undone answer here before it deletes the row. Pulls
-- read these and drop the same answer (same stamps) on every phone, and
-- put_answers_as refuses to put that exact answer back. A new tap has a new
-- stamp, so it always goes through.
-- Only real undos are noted: removing a question deletes its rows without a
-- note, so undoing that remove sends them back fine.

create table if not exists public.answer_undos (
  user_id uuid not null references auth.users (id) on delete cascade,
  lamp_id text not null check (char_length(lamp_id) <= 64),
  period_key text not null check (char_length(period_key) <= 24),
  answered_at text not null default '' check (char_length(answered_at) <= 32),
  note_at text not null default '' check (char_length(note_at) <= 32),
  undone_at timestamptz not null default now(),
  primary key (user_id, lamp_id, period_key)
);

alter table public.answer_undos enable row level security;

drop policy if exists "read my undos" on public.answer_undos;
create policy "read my undos" on public.answer_undos
  for select using ((select auth.uid()) = user_id);

-- Pulls page by time.
create index if not exists answer_undos_user_time on public.answer_undos (user_id, undone_at);

create or replace function public.note_answer_undo(lamp text, period text, a text, e text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if lamp is null or period is null or lamp = '' or period = '' then
    return;
  end if;
  insert into public.answer_undos (user_id, lamp_id, period_key, answered_at, note_at)
  values (me, left(lamp, 64), left(period, 24), left(coalesce(a, ''), 32), left(coalesce(e, ''), 32))
  on conflict (user_id, lamp_id, period_key) do update
    set answered_at = excluded.answered_at, note_at = excluded.note_at, undone_at = now();
  -- Old notes are no use: no phone holds a 60-day-old answer it never sent.
  delete from public.answer_undos
  where user_id = me and undone_at < now() - interval '60 days';
end;
$$;

revoke all on function public.note_answer_undo(text, text, text, text) from public, anon;
grant execute on function public.note_answer_undo(text, text, text, text) to authenticated;

create or replace function public.put_answers_as(me uuid, rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
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
    -- The exact answer an undo took away, sent again by a phone that missed it.
    and not exists (
      select 1 from public.answer_undos u
      where u.user_id = me and u.lamp_id = left(r->>'l', 64) and u.period_key = left(r->>'p', 24)
        and public.stamp_ts(left(coalesce(r->>'a', ''), 32)) = public.stamp_ts(u.answered_at)
        and public.stamp_ts(left(coalesce(r->>'e', ''), 32)) <= public.stamp_ts(u.note_at)
    )
  on conflict (user_id, lamp_id, period_key) do update
    set status = case when public.stamp_ts(excluded.answered_at) > public.stamp_ts(public.answer_log.answered_at)
          then excluded.status else public.answer_log.status end,
        answered_at = case when public.stamp_ts(excluded.answered_at) > public.stamp_ts(public.answer_log.answered_at)
          then excluded.answered_at else public.answer_log.answered_at end,
        note = case when public.stamp_ts(excluded.note_at) > public.stamp_ts(public.answer_log.note_at)
          then excluded.note else public.answer_log.note end,
        note_at = case when public.stamp_ts(excluded.note_at) > public.stamp_ts(public.answer_log.note_at)
          then excluded.note_at else public.answer_log.note_at end,
        amount = case when public.stamp_ts(excluded.note_at) > public.stamp_ts(public.answer_log.note_at)
          then excluded.amount else public.answer_log.amount end,
        board_id = case when public.stamp_ts(excluded.answered_at) > public.stamp_ts(public.answer_log.answered_at)
          then excluded.board_id else public.answer_log.board_id end,
        updated_at = now()
    where greatest(public.stamp_ts(excluded.answered_at), public.stamp_ts(excluded.note_at))
      > greatest(public.stamp_ts(public.answer_log.answered_at), public.stamp_ts(public.answer_log.note_at));

  get diagnostics put = row_count;
  return put;
end;
$$;

revoke all on function public.put_answers_as(uuid, jsonb) from public, anon, authenticated;
