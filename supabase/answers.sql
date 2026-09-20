-- Did I, part four. Answers sync on their own.
-- Run after schema.sql, people.sql, hardening.sql. Safe to run again.
--
-- The shelf used to travel as one JSON document: every tag, every
-- question, and every answer you have ever given, pushed again on every
-- tap. That is fine for a week and awful after a year. Structure is
-- small and changes rarely, so it stays in the document. Answers grow
-- forever, so they live here and move one at a time.

create table if not exists public.answer_log (
  user_id uuid not null references auth.users on delete cascade,
  lamp_id text not null,
  period_key text not null,
  board_id text not null default '',
  status text not null default 'yes' check (status in ('yes', 'skip', 'late')),
  answered_at text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lamp_id, period_key)
);

-- The only read the client makes: what changed since I last looked.
create index if not exists answer_log_since_idx
  on public.answer_log (user_id, updated_at);

alter table public.answer_log enable row level security;

drop policy if exists "own answers" on public.answer_log;
create policy "own answers" on public.answer_log
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.answer_log from anon;

alter table public.answer_log drop constraint if exists answer_log_len;
alter table public.answer_log add constraint answer_log_len check (
  length(lamp_id) <= 64
  and length(period_key) <= 24
  and length(board_id) <= 64
  and length(answered_at) <= 32
  and length(note) <= 500
);

-- Writing a batch ------------------------------------------------------
--
-- A later tap wins. The where clause on the conflict is what makes two
-- phones safe: an older answer arriving late cannot undo a newer one.

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
    (user_id, lamp_id, period_key, board_id, status, answered_at, note, updated_at)
  select
    me,
    left(r->>'l', 64),
    left(r->>'p', 24),
    left(coalesce(r->>'b', ''), 64),
    case when r->>'s' in ('yes', 'skip', 'late') then r->>'s' else 'yes' end,
    left(coalesce(r->>'a', ''), 32),
    left(coalesce(r->>'n', ''), 500)
  , now()
  from jsonb_array_elements(rows) r
  where r->>'l' is not null and r->>'p' is not null
  on conflict (user_id, lamp_id, period_key) do update
    set status = excluded.status,
        answered_at = excluded.answered_at,
        note = excluded.note,
        board_id = excluded.board_id,
        updated_at = now()
    where excluded.answered_at > public.answer_log.answered_at;

  get diagnostics put = row_count;
  return put;
end;
$$;

revoke all on function public.put_answers(jsonb) from public;
grant execute on function public.put_answers(jsonb) to authenticated;

-- A question that no longer exists should not leave answers behind.
create or replace function public.prune_answers(keep text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  gone integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  -- An empty list means the caller has nothing loaded yet. Do not read
  -- that as "delete everything".
  if keep is null or array_length(keep, 1) is null then
    return 0;
  end if;
  delete from public.answer_log
  where user_id = me and not (lamp_id = any(keep));
  get diagnostics gone = row_count;
  return gone;
end;
$$;

revoke all on function public.prune_answers(text[]) from public;
grant execute on function public.prune_answers(text[]) to authenticated;

-- Moving what is already there ----------------------------------------
--
-- Lift the answers out of every shelf document that still carries them,
-- then take them out of the document.

insert into public.answer_log
  (user_id, lamp_id, period_key, board_id, status, answered_at, note)
select
  s.user_id,
  left(a->>'lampId', 64),
  left(a->>'periodKey', 24),
  left(coalesce(b->>'id', ''), 64),
  case when a->>'status' in ('yes', 'skip', 'late') then a->>'status' else 'yes' end,
  left(coalesce(a->>'answeredAt', ''), 32),
  left(coalesce(a->>'note', ''), 500)
from public.shelves s
cross join lateral jsonb_array_elements(coalesce(s.doc->'boards', '[]'::jsonb)) b
cross join lateral jsonb_array_elements(coalesce(b->'answers', '[]'::jsonb)) a
where a->>'lampId' is not null and a->>'periodKey' is not null
on conflict (user_id, lamp_id, period_key) do nothing;

update public.shelves s
set doc = jsonb_set(
      s.doc,
      '{boards}',
      (
        select coalesce(jsonb_agg(b - 'answers' order by ord), '[]'::jsonb)
        from jsonb_array_elements(s.doc->'boards') with ordinality t(b, ord)
      )
    )
where s.doc ? 'boards'
  and exists (
    select 1 from jsonb_array_elements(s.doc->'boards') b where b ? 'answers'
  );
