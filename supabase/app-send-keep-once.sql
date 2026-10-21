-- set_app_send_answer (app-send-answer-upsert.sql), safe across two phones:
-- a Keep only lands once (the second phone gets false and says already
-- kept), and a stale Pass never turns a Keep back into passed.
create or replace function public.set_app_send_answer(send_id uuid, answer text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  put integer;
begin
  if uid is null or answer is null or answer <> all (array['kept', 'passed', 'added']) then
    return false;
  end if;
  if not exists (select 1 from public.app_sends s where s.id = send_id) then
    return false;
  end if;
  insert into public.app_send_answers (app_send_id, user_id, state)
  values (send_id, uid, answer)
  on conflict (app_send_id, user_id) do update set state = excluded.state, made_at = now()
    where answer = 'added' or public.app_send_answers.state = 'passed';
  get diagnostics put = row_count;
  return put > 0 or answer = 'passed';
end;
$$;

revoke all on function public.set_app_send_answer(uuid, text) from public, anon;
grant execute on function public.set_app_send_answer(uuid, text) to authenticated;
