-- A second answer on the same Did I send (kept, then added) updates the
-- caller's row instead of failing on the primary key. Only your own row.
create or replace function public.set_app_send_answer(send_id uuid, answer text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or answer is null or answer <> all (array['kept', 'passed', 'added']) then
    return false;
  end if;
  if not exists (select 1 from public.app_sends s where s.id = send_id) then
    return false;
  end if;
  insert into public.app_send_answers (app_send_id, user_id, state)
  values (send_id, uid, answer)
  on conflict (app_send_id, user_id) do update set state = excluded.state, made_at = now();
  return true;
end;
$$;

revoke all on function public.set_app_send_answer(uuid, text) from public, anon;
grant execute on function public.set_app_send_answer(uuid, text) to authenticated;
