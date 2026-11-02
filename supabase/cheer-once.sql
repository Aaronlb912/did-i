-- Cheers are safe to retry. The phone makes one request id per cheer; if the
-- answer is lost and it asks again, the same id returns the current stock and
-- spends nothing. Old builds send no id and behave as before.
-- Full bodies from friend-cheers.sql plus the request id. Apply after gift-once.sql, before drop-tonight.sql.

alter table public.sends add column if not exists request_id uuid;

create unique index if not exists sends_request_once
  on public.sends (from_id, request_id)
  where request_id is not null;

drop function if exists public.send_friend_cheer(uuid, text, text);
drop function if exists public.send_friend_cheer(uuid, text, text, text);
create or replace function public.send_friend_cheer(other uuid, note text, want text, about text default '', p_request_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  bal integer;
  held integer;
  cid text := left(btrim(coalesce(want, '')), 20);
  line text := left(btrim(coalesce(note, '')), 280);
  topic text := left(btrim(coalesce(about, '')), 200);
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who or public.blocked_with(other) or not public.are_friends(other) then
    raise exception 'not friends';
  end if;
  -- Only the words of a note they really shared; anything else is a plain cheer.
  if topic <> '' and not exists (
    select 1 from public.shared_notes s where s.user_id = other and s.question = topic
  ) then
    topic := '';
  end if;

  select p.gem_balance, p.friend_cheers
    into bal, held
  from public.profiles p
  where p.user_id = who
  for update;

  if bal is null then
    raise exception 'not signed in';
  end if;
  -- A retry of a cheer that already went: same answer, nothing spent.
  if p_request_id is not null and exists (
    select 1 from public.sends s where s.from_id = who and s.request_id = p_request_id
  ) then
    return jsonb_build_object('gems', bal, 'cheers', held);
  end if;
  if held < 1 then
    raise exception 'need cheers';
  end if;

  perform set_config('did_i.friend_cheer', '1', true);
  perform set_config('did_i.cheer_send', '1', true);
  update public.profiles
    set friend_cheers = held - 1
    where user_id = who
    returning gem_balance, friend_cheers into bal, held;

  insert into public.sends (from_id, to_id, kind, question, note, cheer_id, request_id)
  values (who, other, 'cheer', topic, line, cid, p_request_id);

  return jsonb_build_object('gems', bal, 'cheers', held);
end;
$$;

revoke all on function public.send_friend_cheer(uuid, text, text, text, uuid) from public;
revoke all on function public.send_friend_cheer(uuid, text, text, text, uuid) from anon;
grant execute on function public.send_friend_cheer(uuid, text, text, text, uuid) to authenticated;

-- Same stored cheer as a friend. The person has to share a family.
drop function if exists public.send_family_cheer(uuid, text, text);
create or replace function public.send_family_cheer(other uuid, note text, want text, p_request_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  bal integer;
  held integer;
  cid text := left(btrim(coalesce(want, '')), 20);
  line text := left(btrim(coalesce(note, '')), 280);
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who or public.blocked_with(other) or not public.shares_family(other) then
    raise exception 'not family';
  end if;

  select p.gem_balance, p.friend_cheers
    into bal, held
  from public.profiles p
  where p.user_id = who
  for update;

  if bal is null then
    raise exception 'not signed in';
  end if;
  -- A retry of a cheer that already went: same answer, nothing spent.
  if p_request_id is not null and exists (
    select 1 from public.sends s where s.from_id = who and s.request_id = p_request_id
  ) then
    return jsonb_build_object('gems', bal, 'cheers', held);
  end if;
  if held < 1 then
    raise exception 'need cheers';
  end if;

  perform set_config('did_i.friend_cheer', '1', true);
  perform set_config('did_i.cheer_send', '1', true);
  update public.profiles
    set friend_cheers = held - 1
    where user_id = who
    returning gem_balance, friend_cheers into bal, held;

  insert into public.sends (from_id, to_id, kind, question, note, cheer_id, request_id)
  values (who, other, 'cheer', '', line, cid, p_request_id);

  return jsonb_build_object('gems', bal, 'cheers', held);
end;
$$;

revoke all on function public.send_family_cheer(uuid, text, text, uuid) from public;
revoke all on function public.send_family_cheer(uuid, text, text, uuid) from anon;
grant execute on function public.send_family_cheer(uuid, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';
