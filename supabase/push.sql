-- Did I, part six. Getting a nudge to a phone that is not open.
-- Run after the others. Safe to run again.
--
-- The phone stores its Firebase token against its device row. When a
-- send or a friend request lands, a trigger drops a job in push_queue.
-- An edge function drains the queue and talks to Firebase, because
-- Postgres has no business holding an HTTP connection open.

alter table public.devices add column if not exists push_token text;

alter table public.devices drop constraint if exists devices_token_len;
alter table public.devices add constraint devices_token_len
  check (push_token is null or length(push_token) <= 400);

-- Only rows with a token are worth reading when something happens.
create index if not exists devices_push_idx
  on public.devices (user_id) where push_token is not null;

create table if not exists public.push_queue (
  id bigserial primary key,
  to_id uuid not null references auth.users on delete cascade,
  title text not null default 'Did I',
  body text not null default '',
  go text not null default '/inbox',
  made_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists push_queue_waiting_idx
  on public.push_queue (made_at) where sent_at is null;

create index if not exists push_queue_to_idx on public.push_queue (to_id);

-- A did you push carries its send, so Keep and Pass can sit on the
-- notification. Gone with the send.
alter table public.push_queue
  add column if not exists send_id uuid references public.sends on delete cascade;
create index if not exists push_queue_send_idx on public.push_queue (send_id);

alter table public.push_queue enable row level security;
revoke all on public.push_queue from anon;
revoke all on public.push_queue from authenticated;

alter table public.push_queue drop constraint if exists push_queue_len;
alter table public.push_queue add constraint push_queue_len
  check (length(title) <= 80 and length(body) <= 200 and length(go) <= 80);

-- The person's own notification switches (prefs.pingsOff, set in the app's
-- Reminders screen). Kinds: sends, cheers, friends. Same names as
-- PING_KINDS in src/lib/prefs.js.
create or replace function public.push_wanted(who uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not coalesce(
    (select jsonb_typeof(p.prefs -> 'pingsOff') = 'array' and (p.prefs -> 'pingsOff') ? kind
     from public.profiles p where p.user_id = who),
    false
  );
$$;

revoke all on function public.push_wanted(uuid, text) from public;
revoke all on function public.push_wanted(uuid, text) from anon;
revoke all on function public.push_wanted(uuid, text) from authenticated;

-- Push text in the person's own language (prefs.locale, synced with the rest
-- of prefs). English when the locale or key is missing. args fill {name},
-- {q}, {n}, {total}.
create or replace function public.push_text(who uuid, key text, args jsonb default '{}'::jsonb)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lang text := coalesce((select p.prefs ->> 'locale' from public.profiles p where p.user_id = who), 'en');
  words jsonb := '{
    "en": {"a_friend": "A friend", "someone": "Someone", "send_cheer": "sent you a cheer.", "send_did": "sent you a Did I: {q}",
           "friend_title": "Friend request", "ask_named": "{name} wants to be friends.", "ask": "Someone wants to be friends.",
           "yes_named": "{name} said yes. You are friends now.", "yes": "Your friend request was accepted.",
           "family": "Your family", "family_all": "Everyone is done tonight. {total} of {total}.", "family_some": "{n} of {total} done tonight.",
           "cheered": "cheered you on tonight.", "gift": "{name} sent you a gift", "open": "Open Did I to see it.",
           "we_done": "Done together: {q}", "we_did": "{name} did it", "we_turn": "Your turn: {q}", "we_asked": "{name} asked you", "we_ask": "Did we: {q}",
           "didi_send": "Sent you a Did you: {q}",
           "link_kept": "{name} kept your Did you: {q}", "link_joined": "{name} joined your Did we: {q}"},
    "de": {"a_friend": "Ein Freund", "someone": "Jemand", "send_cheer": "hat dich angefeuert.", "send_did": "hat dir ein Did I geschickt: {q}",
           "friend_title": "Freundschaftsanfrage", "ask_named": "{name} möchte mit dir befreundet sein.", "ask": "Jemand möchte mit dir befreundet sein.",
           "yes_named": "{name} hat Ja gesagt. Ihr seid jetzt befreundet.", "yes": "Deine Freundschaftsanfrage wurde angenommen.",
           "family": "Deine Familie", "family_all": "Heute Abend sind alle fertig. {total} von {total}.", "family_some": "{n} von {total} heute Abend fertig.",
           "cheered": "hat dich heute Abend angefeuert.", "gift": "{name} hat dir ein Geschenk geschickt", "open": "Öffne Did I, um es zu sehen.",
           "we_done": "Gemeinsam erledigt: {q}", "we_did": "{name} hat es geschafft", "we_turn": "Du bist dran: {q}", "we_asked": "{name} hat dich gefragt", "we_ask": "Did we: {q}",
           "didi_send": "Hat dir ein Did you geschickt: {q}",
           "link_kept": "{name} hat dein Did you behalten: {q}", "link_joined": "{name} ist deinem Did we beigetreten: {q}"},
    "es": {"a_friend": "Un amigo", "someone": "Alguien", "send_cheer": "te mandó ánimos.", "send_did": "te envió un Did I: {q}",
           "friend_title": "Solicitud de amistad", "ask_named": "{name} quiere ser tu amigo.", "ask": "Alguien quiere ser tu amigo.",
           "yes_named": "{name} dijo que sí. Ya son amigos.", "yes": "Aceptaron tu solicitud de amistad.",
           "family": "Tu familia", "family_all": "Todos terminaron esta noche. {total} de {total}.", "family_some": "{n} de {total} terminaron esta noche.",
           "cheered": "te animó esta noche.", "gift": "{name} te envió un regalo", "open": "Abre Did I para verlo.",
           "we_done": "Hecho juntos: {q}", "we_did": "{name} lo hizo", "we_turn": "Tu turno: {q}", "we_asked": "{name} te preguntó", "we_ask": "Did we: {q}",
           "didi_send": "Te envió un Did you: {q}",
           "link_kept": "{name} guardó tu Did you: {q}", "link_joined": "{name} se unió a tu Did we: {q}"},
    "fr": {"a_friend": "Un ami", "someone": "Quelqu''un", "send_cheer": "t''a encouragé.", "send_did": "t''a envoyé un Did I : {q}",
           "friend_title": "Demande d''ami", "ask_named": "{name} veut être ton ami.", "ask": "Quelqu''un veut être ton ami.",
           "yes_named": "{name} a dit oui. Vous êtes amis.", "yes": "Ta demande d''ami a été acceptée.",
           "family": "Ta famille", "family_all": "Tout le monde a fini ce soir. {total} sur {total}.", "family_some": "{n} sur {total} ont fini ce soir.",
           "cheered": "t''a encouragé ce soir.", "gift": "{name} t''a envoyé un cadeau", "open": "Ouvre Did I pour le voir.",
           "we_done": "Fait ensemble : {q}", "we_did": "{name} l''a fait", "we_turn": "À toi : {q}", "we_asked": "{name} te l''a demandé", "we_ask": "Did we : {q}",
           "didi_send": "T''a envoyé un Did you : {q}",
           "link_kept": "{name} a gardé ton Did you : {q}", "link_joined": "{name} a rejoint ton Did we : {q}"},
    "it": {"a_friend": "Un amico", "someone": "Qualcuno", "send_cheer": "ti ha fatto il tifo.", "send_did": "ti ha inviato un Did I: {q}",
           "friend_title": "Richiesta di amicizia", "ask_named": "{name} vuole essere tuo amico.", "ask": "Qualcuno vuole essere tuo amico.",
           "yes_named": "{name} ha detto sì. Ora siete amici.", "yes": "La tua richiesta di amicizia è stata accettata.",
           "family": "La tua famiglia", "family_all": "Stasera hanno finito tutti. {total} su {total}.", "family_some": "{n} su {total} hanno finito stasera.",
           "cheered": "ti ha fatto il tifo stasera.", "gift": "{name} ti ha inviato un regalo", "open": "Apri Did I per vederlo.",
           "we_done": "Fatto insieme: {q}", "we_did": "{name} l''ha fatto", "we_turn": "Tocca a te: {q}", "we_asked": "{name} te l''ha chiesto", "we_ask": "Did we: {q}",
           "didi_send": "Ti ha inviato un Did you: {q}",
           "link_kept": "{name} ha tenuto il tuo Did you: {q}", "link_joined": "{name} si è unito al tuo Did we: {q}"},
    "ja": {"a_friend": "友だち", "someone": "だれか", "send_cheer": "応援が届きました。", "send_did": "Did I が届きました：{q}",
           "friend_title": "友だちリクエスト", "ask_named": "{name}さんが友だちになりたがっています。", "ask": "だれかが友だちになりたがっています。",
           "yes_named": "{name}さんが承認しました。友だちになりました。", "yes": "友だちリクエストが承認されました。",
           "family": "あなたの家族", "family_all": "今夜は全員完了。{total}人中{total}人。", "family_some": "今夜は{total}人中{n}人が完了。",
           "cheered": "今夜あなたを応援しました。", "gift": "{name}さんからギフトが届きました", "open": "Did I を開いて確認してください。",
           "we_done": "一緒に達成：{q}", "we_did": "{name}さんが達成しました", "we_turn": "あなたの番：{q}", "we_asked": "{name}さんから誘いが届きました", "we_ask": "Did we：{q}",
           "didi_send": "Did you が届きました：{q}",
           "link_kept": "{name}さんがあなたの Did you を受け取りました：{q}", "link_joined": "{name}さんがあなたの Did we に参加しました：{q}"},
    "ko": {"a_friend": "친구", "someone": "누군가", "send_cheer": "응원을 보냈어요.", "send_did": "Did I를 보냈어요: {q}",
           "friend_title": "친구 요청", "ask_named": "{name}님이 친구가 되고 싶어 해요.", "ask": "누군가 친구가 되고 싶어 해요.",
           "yes_named": "{name}님이 수락했어요. 이제 친구예요.", "yes": "친구 요청이 수락되었어요.",
           "family": "우리 가족", "family_all": "오늘 밤 모두 끝냈어요. {total}명 중 {total}명.", "family_some": "오늘 밤 {total}명 중 {n}명이 끝냈어요.",
           "cheered": "오늘 밤 응원했어요.", "gift": "{name}님이 선물을 보냈어요", "open": "Did I를 열어 확인하세요.",
           "we_done": "함께 해냄: {q}", "we_did": "{name}님이 해냈어요", "we_turn": "내 차례: {q}", "we_asked": "{name}님이 물어봤어요", "we_ask": "Did we: {q}",
           "didi_send": "Did you를 보냈어요: {q}",
           "link_kept": "{name}님이 내 Did you를 받았어요: {q}", "link_joined": "{name}님이 내 Did we에 참여했어요: {q}"},
    "pt": {"a_friend": "Um amigo", "someone": "Alguém", "send_cheer": "te mandou uma torcida.", "send_did": "te enviou um Did I: {q}",
           "friend_title": "Pedido de amizade", "ask_named": "{name} quer ser seu amigo.", "ask": "Alguém quer ser seu amigo.",
           "yes_named": "{name} disse sim. Agora vocês são amigos.", "yes": "Seu pedido de amizade foi aceito.",
           "family": "Sua família", "family_all": "Todos terminaram hoje à noite. {total} de {total}.", "family_some": "{n} de {total} terminaram hoje à noite.",
           "cheered": "torceu por você hoje à noite.", "gift": "{name} te enviou um presente", "open": "Abra o Did I para ver.",
           "we_done": "Feito juntos: {q}", "we_did": "{name} fez", "we_turn": "Sua vez: {q}", "we_asked": "{name} te convidou", "we_ask": "Did we: {q}",
           "didi_send": "Te enviou um Did you: {q}",
           "link_kept": "{name} guardou seu Did you: {q}", "link_joined": "{name} entrou no seu Did we: {q}"},
    "zh": {"a_friend": "一位朋友", "someone": "有人", "send_cheer": "为你加油了。", "send_did": "给你发了一个 Did I：{q}",
           "friend_title": "好友请求", "ask_named": "{name} 想加你为好友。", "ask": "有人想加你为好友。",
           "yes_named": "{name} 同意了。你们现在是好友了。", "yes": "你的好友请求已通过。",
           "family": "你的家人", "family_all": "今晚大家都完成了。{total}/{total}。", "family_some": "今晚 {total} 人中有 {n} 人完成。",
           "cheered": "今晚为你加油了。", "gift": "{name} 给你送了礼物", "open": "打开 Did I 查看。",
           "we_done": "一起完成：{q}", "we_did": "{name} 完成了", "we_turn": "轮到你了：{q}", "we_asked": "{name} 邀请了你", "we_ask": "Did we：{q}",
           "didi_send": "给你发了一个 Did you：{q}",
           "link_kept": "{name} 收下了你的 Did you：{q}", "link_joined": "{name} 加入了你的 Did we：{q}"}
  }'::jsonb;
  out text;
  k text;
begin
  out := coalesce(words -> lang ->> key, words -> 'en' ->> key, key);
  for k in select jsonb_object_keys(coalesce(args, '{}'::jsonb)) loop
    out := replace(out, '{' || k || '}', coalesce(args ->> k, ''));
  end loop;
  return out;
end;
$$;

revoke all on function public.push_text(uuid, text, jsonb) from public, anon, authenticated;

-- What the person sees on the lock screen. Never the question itself
-- for a cheer, and never anything about who else is involved.
create or replace function public.queue_send_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  if not public.push_wanted(new.to_id, case when new.kind = 'cheer' then 'cheers' else 'sends' end) then
    return new;
  end if;
  select coalesce(nullif(p.display_name, ''), '@' || coalesce(p.handle, ''), 'A friend')
  into who
  from public.profiles p where p.user_id = new.from_id;

  insert into public.push_queue (to_id, title, body, go, send_id)
  values (
    new.to_id,
    coalesce(who, public.push_text(new.to_id, 'a_friend')),
    case
      when new.kind = 'cheer' then public.push_text(new.to_id, 'send_cheer')
      else left(public.push_text(new.to_id, 'send_did', jsonb_build_object('q', left(new.question, 120))), 200)
    end,
    '/inbox',
    case when new.kind = 'todo' then new.id end
  );
  return new;
end;
$$;

drop trigger if exists queue_send_push on public.sends;
create trigger queue_send_push
  after insert on public.sends
  for each row execute function public.queue_send_push();

create or replace function public.queue_ask_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dname text;
  body text;
begin
  if new.state <> 'asked' or not public.push_wanted(new.to_id, 'friends') then
    return new;
  end if;
  select coalesce(nullif(trim(p.display_name), ''), '')
  into dname
  from public.profiles p where p.user_id = new.from_id;

  if dname <> '' then
    body := left(public.push_text(new.to_id, 'ask_named', jsonb_build_object('name', dname)), 200);
  else
    body := public.push_text(new.to_id, 'ask');
  end if;

  insert into public.push_queue (to_id, title, body, go)
  values (new.to_id, public.push_text(new.to_id, 'friend_title'), body, '/friends?id=' || new.id::text);
  return new;
end;
$$;

drop trigger if exists queue_ask_push on public.friend_links;
create trigger queue_ask_push
  after insert on public.friend_links
  for each row execute function public.queue_ask_push();

-- The asker hears back when their request is accepted. A no stays quiet.
create or replace function public.queue_yes_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dname text;
begin
  -- say_yes also flips the yes-sayer's own row when both had asked; that one
  -- would tell them about their own tap, so it is skipped.
  if old.state <> 'asked' or new.state <> 'ok'
     or new.from_id = (select auth.uid())
     or not public.push_wanted(new.from_id, 'friends') then
    return new;
  end if;
  select coalesce(nullif(trim(p.display_name), ''), '')
  into dname
  from public.profiles p where p.user_id = new.to_id;

  insert into public.push_queue (to_id, title, body, go)
  values (
    new.from_id,
    public.push_text(new.from_id, 'friend_title'),
    case when dname <> '' then left(public.push_text(new.from_id, 'yes_named', jsonb_build_object('name', dname)), 200)
         else public.push_text(new.from_id, 'yes') end,
    '/friends'
  );
  return new;
end;
$$;

revoke all on function public.queue_yes_push() from public, anon, authenticated;

drop trigger if exists queue_yes_push on public.friend_links;
create trigger queue_yes_push
  after update of state on public.friend_links
  for each row execute function public.queue_yes_push();

-- A request taken back (or turned down) before its push went out: drop the
-- push so nobody is told about a request that is already gone.
create or replace function public.drop_ask_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.state = 'asked' then
    delete from public.push_queue
    where to_id = old.to_id and sent_at is null and go = '/friends?id=' || old.id::text;
  end if;
  return old;
end;
$$;

revoke all on function public.drop_ask_push() from public, anon, authenticated;

drop trigger if exists drop_ask_push on public.friend_links;
create trigger drop_ask_push
  after delete on public.friend_links
  for each row execute function public.drop_ask_push();

-- What the edge function calls. It runs with the service role, which is
-- why neither anon nor a signed-in person can reach any of this.
-- The return shape grew send_id; Postgres cannot change it in place.
drop function if exists public.take_push_batch(integer);
create or replace function public.take_push_batch(how_many integer default 50)
returns table (id bigint, to_id uuid, title text, body text, go text, send_id uuid, tokens text[])
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    update public.push_queue q
    set sent_at = now()
    where q.id in (
      select q2.id from public.push_queue q2
      where q2.sent_at is null
      order by q2.made_at
      limit greatest(1, least(how_many, 200))
      for update skip locked
    )
    returning q.id, q.to_id, q.title, q.body, q.go, q.send_id
  )
  select p.id, p.to_id, p.title, p.body, p.go, p.send_id,
         coalesce(array_agg(d.push_token) filter (where d.push_token is not null), '{}')
  from picked p
  left join public.devices d on d.user_id = p.to_id and d.push_token is not null
  group by p.id, p.to_id, p.title, p.body, p.go, p.send_id;
end;
$$;

revoke all on function public.take_push_batch(integer) from public;
revoke all on function public.take_push_batch(integer) from anon;
revoke all on function public.take_push_batch(integer) from authenticated;

-- A queue nobody drained should not grow forever.
create or replace function public.sweep_push_queue()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  gone integer;
begin
  delete from public.push_queue
  where (sent_at is not null and sent_at < now() - interval '3 days')
     or made_at < now() - interval '14 days';
  get diagnostics gone = row_count;
  return gone;
end;
$$;
