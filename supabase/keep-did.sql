-- A Not yet from a widget or watch that had not redrawn yet used to replace a
-- Did saved elsewhere, and the next pull broke the streak on every device.
-- The app already refuses that (applyWidgetTapOnce); now the server does too.
-- Replaces key_answer in answer-keys.sql.

create or replace function public.key_answer(key text, lamp text, night text, kind text, at text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.answer_keys;
  board text;
  tapped timestamptz;
  prev text;
  status text;
  n integer;
begin
  if key is null or key !~ '^[0-9a-f]{64}$'
     or lamp is null or length(lamp) < 1 or length(lamp) > 64
     or night is null or length(night) > 24
     or kind is null or kind not in ('did', 'nope', 'undo')
     or at is null or length(at) > 32 then
    return 'bad';
  end if;

  select * into k from public.answer_keys
  where key_hash = extensions.digest(decode(key, 'hex'), 'sha256') and revoked_at is null
  for update;
  if not found then
    return 'key';
  end if;

  -- 30 writes per key per 10 minutes. Counted before any other check, so a
  -- stolen key cannot probe questions faster either.
  if k.window_at < now() - interval '10 minutes' then
    update public.answer_keys set window_at = now(), window_uses = 1, last_used_at = now() where id = k.id;
  elsif k.window_uses >= 30 then
    return 'slow';
  else
    update public.answer_keys set window_uses = window_uses + 1, last_used_at = now() where id = k.id;
  end if;

  tapped := public.stamp_ts(at);
  -- A tap from up to a day ago (a watch out of reach), never from the future.
  if tapped is null or tapped = '-infinity'::timestamptz
     or tapped < now() - interval '1 day' or tapped > now() + interval '5 minutes' then
    return 'bad';
  end if;

  -- Open when it was tapped, so a late delivery still lands.
  if not public.key_night_open(k.user_id, night, tapped) then
    return 'closed';
  end if;

  -- The question has to be on the owner's own shelf.
  select b->>'id' into board
  from public.shelves s, jsonb_array_elements(case when jsonb_typeof(s.doc->'boards') = 'array' then s.doc->'boards' else '[]'::jsonb end) b
  where s.user_id = k.user_id
    and jsonb_typeof(b->'lamps') = 'array'
    and exists (select 1 from jsonb_array_elements(b->'lamps') l where l->>'id' = lamp)
  limit 1;
  if board is null then
    return 'question';
  end if;

  -- Tells the live triggers which device answered, so it is not woken.
  perform set_config('didi.device', k.device_key, true);

  if kind = 'undo' then
    delete from public.answer_log a
    where a.user_id = k.user_id and a.lamp_id = lamp and a.period_key = night
      and public.stamp_ts(a.answered_at) = tapped;
    get diagnostics n = row_count;
    return case when n > 0 then 'ok' else 'same' end;
  end if;

  -- Did after Not yet on the same night is 'late', as in the app
  -- (didStatusForRow in src/lib/recurrence.js).
  select a.status into prev from public.answer_log a
  where a.user_id = k.user_id and a.lamp_id = lamp and a.period_key = night;
  -- As applyWidgetTapOnce: a Not yet can still become a Did; nothing else changes a set answer.
  if prev is not null and not (prev = 'skip' and kind <> 'nope') then
    return 'same';
  end if;
  status := case when kind = 'nope' then 'skip' when prev = 'skip' then 'late' else 'yes' end;

  -- The same row the app's putAnswer makes: no note, no amount.
  n := public.put_answers_as(k.user_id, jsonb_build_array(jsonb_build_object(
    'b', board, 'l', lamp, 'p', night, 's', status,
    'a', to_char(tapped at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'n', '', 'e', '', 'm', null)));
  return case when n > 0 then 'ok' else 'same' end;
end;
$$;

revoke all on function public.key_answer(text, text, text, text, text) from public;
grant execute on function public.key_answer(text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
