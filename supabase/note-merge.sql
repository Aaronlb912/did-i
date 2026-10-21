-- put_answers_as (answer-keys.sql) with the note merged on its own stamp:
-- a newer tap from a phone that never got the note no longer blanks it.
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
  on conflict (user_id, lamp_id, period_key) do update
    set status = excluded.status,
        answered_at = excluded.answered_at,
        note = case when public.stamp_ts(excluded.note_at) > public.stamp_ts(public.answer_log.note_at)
          then excluded.note else public.answer_log.note end,
        note_at = case when public.stamp_ts(excluded.note_at) > public.stamp_ts(public.answer_log.note_at)
          then excluded.note_at else public.answer_log.note_at end,
        amount = excluded.amount,
        board_id = excluded.board_id,
        updated_at = now()
    where greatest(public.stamp_ts(excluded.answered_at), public.stamp_ts(excluded.note_at))
      > greatest(public.stamp_ts(public.answer_log.answered_at), public.stamp_ts(public.answer_log.note_at));

  get diagnostics put = row_count;
  return put;
end;
$$;

revoke all on function public.put_answers_as(uuid, jsonb) from public, anon, authenticated;
