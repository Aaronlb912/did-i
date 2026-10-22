-- A tap changed on one phone was refused for good when another phone had
-- added a later note: the row was kept only when its newest stamp, tap or
-- note, beat the stored newest. Each part now wins on its own stamp.
-- Replaces put_answers_as in answer-undos.sql.

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
    -- Either part newer is enough: the set lines above merge the tap and the
    -- note apart, so a newer tap is not refused behind a newer note.
    where public.stamp_ts(excluded.answered_at) > public.stamp_ts(public.answer_log.answered_at)
      or public.stamp_ts(excluded.note_at) > public.stamp_ts(public.answer_log.note_at);

  get diagnostics put = row_count;
  return put;
end;
$$;

revoke all on function public.put_answers_as(uuid, jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
