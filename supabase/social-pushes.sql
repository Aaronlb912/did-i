-- Pushes that were missing (found 2026-10-20 after a Did we yes went unseen):
-- a Did you kept in the app, a Did we ended by its maker, someone joining
-- your family, someone leaving it, someone joining with your invite code.
-- And one push per thing: the same words to the same person
-- within two minutes are dropped (a link join over an ask sent two).

-- Words for these, in every language the app has. push_text holds the rest.
create or replace function public.push_more_text(who uuid, key text, args jsonb default '{}'::jsonb)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lang text := coalesce((select p.prefs ->> 'locale' from public.profiles p where p.user_id = who), 'en');
  words jsonb := '{
    "en": {"we_closed": "{name} ended the Did we: {q}", "family_joined": "{name} joined your family.", "family_left": "{name} left your family.", "invite_used": "{name} joined Did I with your invite code."},
    "de": {"we_closed": "{name} hat das Did we beendet: {q}", "family_joined": "{name} ist deiner Familie beigetreten.", "family_left": "{name} hat deine Familie verlassen.", "invite_used": "{name} ist mit deinem Einladungscode bei Did I."},
    "es": {"we_closed": "{name} terminó el Did we: {q}", "family_joined": "{name} se unió a tu familia.", "family_left": "{name} salió de tu familia.", "invite_used": "{name} se unió a Did I con tu código de invitación."},
    "fr": {"we_closed": "{name} a terminé le Did we : {q}", "family_joined": "{name} a rejoint ta famille.", "family_left": "{name} a quitté ta famille.", "invite_used": "{name} a rejoint Did I avec ton code d’invitation."},
    "it": {"we_closed": "{name} ha chiuso il Did we: {q}", "family_joined": "{name} è entrato nella tua famiglia.", "family_left": "{name} ha lasciato la tua famiglia.", "invite_used": "{name} è entrato in Did I con il tuo codice invito."},
    "ja": {"we_closed": "{name}さんが Did we を終了しました：{q}", "family_joined": "{name}さんが家族に参加しました。", "family_left": "{name}さんが家族から抜けました。", "invite_used": "{name}さんがあなたの招待コードで Did I に参加しました。"},
    "ko": {"we_closed": "{name}님이 Did we를 끝냈어요: {q}", "family_joined": "{name}님이 가족에 들어왔어요.", "family_left": "{name}님이 가족에서 나갔어요.", "invite_used": "{name}님이 내 초대 코드로 Did I에 들어왔어요."},
    "pt": {"we_closed": "{name} encerrou o Did we: {q}", "family_joined": "{name} entrou na sua família.", "family_left": "{name} saiu da sua família.", "invite_used": "{name} entrou no Did I com seu código de convite."},
    "zh": {"we_closed": "{name} 结束了 Did we：{q}", "family_joined": "{name} 加入了你的家庭。", "family_left": "{name} 离开了你的家庭。", "invite_used": "{name} 用你的邀请码加入了 Did I。"}
  }'::jsonb;
  out text;
  k text;
begin
  out := coalesce(words -> lang ->> key, words -> 'en' ->> key, public.push_text(who, key, args));
  for k in select jsonb_object_keys(coalesce(args, '{}'::jsonb)) loop
    out := replace(out, '{' || k || '}', coalesce(args ->> k, ''));
  end loop;
  return out;
end;
$$;

revoke all on function public.push_more_text(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.push_name(who uuid, for_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select nullif(btrim(p.display_name), '') from public.profiles p where p.user_id = who),
                  public.push_text(for_id, 'a_friend'));
$$;

revoke all on function public.push_name(uuid, uuid) from public, anon, authenticated;

-- A Did you kept in the app tells the sender, as a link keep already did.
-- Passing stays quiet.
create or replace function public.queue_send_kept_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind <> 'todo' or old.state <> 'sent' or new.state <> 'kept'
     or exists (select 1 from public.blocks b
                where (b.blocker = new.from_id and b.blocked = new.to_id)
                   or (b.blocker = new.to_id and b.blocked = new.from_id))
     or not public.push_wanted(new.from_id, 'friends') then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  values (new.from_id, new.to_id, 'Did I',
    left(public.push_text(new.from_id, 'link_kept', jsonb_build_object(
      'name', public.push_name(new.to_id, new.from_id), 'q', left(new.question, 120))), 200),
    '/friends');
  return new;
end;
$$;

revoke all on function public.queue_send_kept_push() from public, anon, authenticated;

drop trigger if exists queue_send_kept_push on public.sends;
create trigger queue_send_kept_push
  after update of state on public.sends
  for each row execute function public.queue_send_kept_push();

-- The maker ending a Did we tells everyone still on it. Only the maker's own
-- close (we_close); the last one out closing it has nobody left to tell.
create or replace function public.queue_we_closed_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.archived or not new.archived or (select auth.uid()) is distinct from new.made_by then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  select m.user_id, new.made_by, 'Did we',
    left(public.push_more_text(m.user_id, 'we_closed', jsonb_build_object(
      'name', public.push_name(new.made_by, m.user_id), 'q', left(new.question, 120))), 200),
    '/tonight'
  from public.we_members m
  where m.card_id = new.id and m.state = 'in' and m.user_id <> new.made_by
    and public.push_wanted(m.user_id, 'we');
  return new;
end;
$$;

revoke all on function public.queue_we_closed_push() from public, anon, authenticated;

drop trigger if exists queue_we_closed_push on public.we_cards;
create trigger queue_we_closed_push
  after update of archived on public.we_cards
  for each row execute function public.queue_we_closed_push();

-- Someone joining a family tells the people already in it.
create or replace function public.queue_family_joined_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_queue (to_id, from_id, title, body, go)
  select m.user_id, new.user_id, public.push_text(m.user_id, 'family'),
    left(public.push_more_text(m.user_id, 'family_joined', jsonb_build_object(
      'name', public.push_name(new.user_id, m.user_id))), 200),
    '/people'
  from public.family_members m
  where m.family_id = new.family_id and m.user_id <> new.user_id
    and public.push_wanted(m.user_id, 'family');
  return new;
end;
$$;

revoke all on function public.queue_family_joined_push() from public, anon, authenticated;

drop trigger if exists queue_family_joined_push on public.family_members;
create trigger queue_family_joined_push
  after insert on public.family_members
  for each row execute function public.queue_family_joined_push();

-- Leaving a family tells the people still in it. Only when you leave
-- yourself: a parent removing someone already knows.
create or replace function public.queue_family_left_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is distinct from (select auth.uid()) then
    return old;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  select m.user_id, old.user_id, public.push_text(m.user_id, 'family'),
    left(public.push_more_text(m.user_id, 'family_left', jsonb_build_object(
      'name', public.push_name(old.user_id, m.user_id))), 200),
    '/people'
  from public.family_members m
  where m.family_id = old.family_id and m.user_id <> old.user_id
    and public.push_wanted(m.user_id, 'family');
  return old;
end;
$$;

revoke all on function public.queue_family_left_push() from public, anon, authenticated;

drop trigger if exists queue_family_left_push on public.family_members;
create trigger queue_family_left_push
  after delete on public.family_members
  for each row execute function public.queue_family_left_push();

-- Someone using your invite code tells you (the gems follow when you open the app).
create or replace function public.queue_invite_used_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.invited_by is not null or new.invited_by is null
     or not public.push_wanted(new.invited_by, 'friends') then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  values (new.invited_by, new.user_id, 'Did I',
    left(public.push_more_text(new.invited_by, 'invite_used', jsonb_build_object(
      'name', public.push_name(new.user_id, new.invited_by))), 200),
    '/people');
  return new;
end;
$$;

revoke all on function public.queue_invite_used_push() from public, anon, authenticated;

drop trigger if exists queue_invite_used_push on public.profiles;
create trigger queue_invite_used_push
  after update of invited_by on public.profiles
  for each row execute function public.queue_invite_used_push();

-- One push per thing. Named to run last (triggers run in name order), so it
-- compares the row as it would be stored. Sender and link must match too, so
-- private pushes from two friends are not taken for one. A dropped repeat
-- gives back its slot in the hourly cap (cap_push_to counted it already).
create or replace function public.push_once()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.push_queue q
      where q.to_id = new.to_id and q.sent_at is null and q.body = new.body and q.title = new.title
        and q.from_id is not distinct from new.from_id and q.go is not distinct from new.go
        and q.made_at > now() - interval '2 minutes') then
    update public.push_to_counts set n = n - 1
    where to_id = new.to_id and hour = date_trunc('hour', now()) and n > 0;
    return null;
  end if;
  return new;
end;
$$;

revoke all on function public.push_once() from public, anon, authenticated;

drop trigger if exists zz_push_once on public.push_queue;
drop trigger if exists a_push_once on public.push_queue;
create trigger zz_push_once
  before insert on public.push_queue
  for each row execute function public.push_once();
