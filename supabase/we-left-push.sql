-- Leaving a Did we tells the people who stay: "{name} left: {q}". One push
-- each, not to a blocked pair, not to someone who is no longer a friend or
-- family of the leaver (unfriend and block drop the link first), not when the we pings are off. A trigger on
-- we_members, so every way out (we_leave, block, unfriend) is covered and
-- we_leave itself is not redefined. Run last in db:apply:all (after
-- streak-bonus.sql). Safe to run again.
--
-- push_text is copied from we-buddy.sql (latest) with one new key, we_left,
-- in all 9 languages.

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
    "en": {"a_friend": "A friend", "someone": "Someone", "send_cheer": "sent you a cheer.", "send_cheer_note": "cheered your note on \"{q}\".", "send_did": "sent you a Did you: {q}", "send_edit": "changed their Did I: {q}",
           "friend_title": "Friend request", "ask_named": "{name} wants to be friends.", "ask": "Someone wants to be friends.",
           "yes_named": "{name} said yes. You are friends now.", "yes": "Your friend request was accepted.",
           "family": "Your family", "family_all": "Everyone is done today. {total} of {total}.", "family_some": "{n} done today so far.",
           "cheered": "cheered you on today.", "gift": "{name} sent you a gift", "open": "Open Did I to see it.",
           "we_done": "Done together: {q}", "we_did": "{name} did it", "we_turn": "Your turn: {q}", "we_asked": "{name} asked you", "we_ask": "Did we: {q}", "we_buddy": "{name} did it: {q}", "we_left": "{name} left: {q}",
           "didi_send": "Sent you a Did you: {q}",
           "link_kept": "{name} kept your Did you: {q}", "link_joined": "{name} joined your Did we: {q}", "drop_live": "New in the shop today. Open Did I to see it."},
    "de": {"a_friend": "Ein Freund", "someone": "Jemand", "send_cheer": "hat dich angefeuert.", "send_cheer_note": "hat deine Notiz zu \"{q}\" angefeuert.", "send_did": "hat dir ein Did you geschickt: {q}", "send_edit": "hat sein Did I geändert: {q}",
           "friend_title": "Freundschaftsanfrage", "ask_named": "{name} möchte mit dir befreundet sein.", "ask": "Jemand möchte mit dir befreundet sein.",
           "yes_named": "{name} hat Ja gesagt. Ihr seid jetzt befreundet.", "yes": "Deine Freundschaftsanfrage wurde angenommen.",
           "family": "Deine Familie", "family_all": "Heute sind alle fertig. {total} von {total}.", "family_some": "Heute schon {n} fertig.",
           "cheered": "hat dich heute angefeuert.", "gift": "{name} hat dir ein Geschenk geschickt", "open": "Öffne Did I, um es zu sehen.",
           "we_done": "Gemeinsam erledigt: {q}", "we_did": "{name} hat es geschafft", "we_turn": "Du bist dran: {q}", "we_asked": "{name} hat dich gefragt", "we_ask": "Did we: {q}", "we_buddy": "{name} hat es geschafft: {q}", "we_left": "{name} ist raus: {q}",
           "didi_send": "Hat dir ein Did you geschickt: {q}",
           "link_kept": "{name} hat dein Did you behalten: {q}", "link_joined": "{name} ist deinem Did we beigetreten: {q}", "drop_live": "Heute neu im Shop. Öffne Did I, um es zu sehen."},
    "es": {"a_friend": "Un amigo", "someone": "Alguien", "send_cheer": "te mandó ánimos.", "send_cheer_note": "animó tu nota sobre \"{q}\".", "send_did": "te envió un Did you: {q}", "send_edit": "cambió su Did I: {q}",
           "friend_title": "Solicitud de amistad", "ask_named": "{name} quiere ser tu amigo.", "ask": "Alguien quiere ser tu amigo.",
           "yes_named": "{name} dijo que sí. Ya son amigos.", "yes": "Aceptaron tu solicitud de amistad.",
           "family": "Tu familia", "family_all": "Todos terminaron hoy. {total} de {total}.", "family_some": "{n} ya terminaron hoy.",
           "cheered": "te animó hoy.", "gift": "{name} te envió un regalo", "open": "Abre Did I para verlo.",
           "we_done": "Hecho juntos: {q}", "we_did": "{name} lo hizo", "we_turn": "Tu turno: {q}", "we_asked": "{name} te preguntó", "we_ask": "Did we: {q}", "we_buddy": "{name} lo hizo: {q}", "we_left": "{name} salió: {q}",
           "didi_send": "Te envió un Did you: {q}",
           "link_kept": "{name} guardó tu Did you: {q}", "link_joined": "{name} se unió a tu Did we: {q}", "drop_live": "Hoy hay novedades en la tienda. Abre Did I para verlas."},
    "fr": {"a_friend": "Un ami", "someone": "Quelqu''un", "send_cheer": "t''a encouragé.", "send_cheer_note": "a encouragé ta note sur « {q} ».", "send_did": "t''a envoyé un Did you : {q}", "send_edit": "a modifié son Did I : {q}",
           "friend_title": "Demande d''ami", "ask_named": "{name} veut être ton ami.", "ask": "Quelqu''un veut être ton ami.",
           "yes_named": "{name} a dit oui. Vous êtes amis.", "yes": "Ta demande d''ami a été acceptée.",
           "family": "Ta famille", "family_all": "Tout le monde a fini aujourd''hui. {total} sur {total}.", "family_some": "Déjà {n} ont fini aujourd''hui.",
           "cheered": "t''a encouragé aujourd''hui.", "gift": "{name} t''a envoyé un cadeau", "open": "Ouvre Did I pour le voir.",
           "we_done": "Fait ensemble : {q}", "we_did": "{name} l''a fait", "we_turn": "À toi : {q}", "we_asked": "{name} te l''a demandé", "we_ask": "Did we : {q}", "we_buddy": "{name} l''a fait : {q}", "we_left": "{name} est parti : {q}",
           "didi_send": "T''a envoyé un Did you : {q}",
           "link_kept": "{name} a gardé ton Did you : {q}", "link_joined": "{name} a rejoint ton Did we : {q}", "drop_live": "Nouveau dans la boutique aujourd''hui. Ouvre Did I pour voir."},
    "it": {"a_friend": "Un amico", "someone": "Qualcuno", "send_cheer": "ti ha fatto il tifo.", "send_cheer_note": "ha fatto il tifo per la tua nota su \"{q}\".", "send_did": "ti ha inviato un Did you: {q}", "send_edit": "ha cambiato il suo Did I: {q}",
           "friend_title": "Richiesta di amicizia", "ask_named": "{name} vuole essere tuo amico.", "ask": "Qualcuno vuole essere tuo amico.",
           "yes_named": "{name} ha detto sì. Ora siete amici.", "yes": "La tua richiesta di amicizia è stata accettata.",
           "family": "La tua famiglia", "family_all": "Oggi hanno finito tutti. {total} su {total}.", "family_some": "Oggi {n} hanno già finito.",
           "cheered": "ti ha fatto il tifo oggi.", "gift": "{name} ti ha inviato un regalo", "open": "Apri Did I per vederlo.",
           "we_done": "Fatto insieme: {q}", "we_did": "{name} l''ha fatto", "we_turn": "Tocca a te: {q}", "we_asked": "{name} te l''ha chiesto", "we_ask": "Did we: {q}", "we_buddy": "{name} l''ha fatto: {q}", "we_left": "{name} è uscito: {q}",
           "didi_send": "Ti ha inviato un Did you: {q}",
           "link_kept": "{name} ha tenuto il tuo Did you: {q}", "link_joined": "{name} si è unito al tuo Did we: {q}", "drop_live": "Oggi ci sono novità nello shop. Apri Did I per vederle."},
    "ja": {"a_friend": "友だち", "someone": "だれか", "send_cheer": "応援が届きました。", "send_cheer_note": "「{q}」のメモを応援しました。", "send_did": "Did you が届きました：{q}", "send_edit": "Did I が変更されました：{q}",
           "friend_title": "友だちリクエスト", "ask_named": "{name}さんが友だちになりたがっています。", "ask": "だれかが友だちになりたがっています。",
           "yes_named": "{name}さんが承認しました。友だちになりました。", "yes": "友だちリクエストが承認されました。",
           "family": "あなたの家族", "family_all": "今日は全員完了。{total}人中{total}人。", "family_some": "今日はもう{n}人が完了。",
           "cheered": "今日あなたを応援しました。", "gift": "{name}さんからギフトが届きました", "open": "Did I を開いて確認してください。",
           "we_done": "一緒に達成：{q}", "we_did": "{name}さんが達成しました", "we_turn": "あなたの番：{q}", "we_asked": "{name}さんから誘いが届きました", "we_ask": "Did we：{q}", "we_buddy": "{name}さんが達成しました：{q}", "we_left": "{name}さんが抜けました：{q}",
           "didi_send": "Did you が届きました：{q}",
           "link_kept": "{name}さんがあなたの Did you を受け取りました：{q}", "link_joined": "{name}さんがあなたの Did we に参加しました：{q}", "drop_live": "今日ショップに新作が出ました。Did I を開いて見てみましょう。"},
    "ko": {"a_friend": "친구", "someone": "누군가", "send_cheer": "응원을 보냈어요.", "send_cheer_note": "\"{q}\" 메모를 응원했어요.", "send_did": "Did you를 보냈어요: {q}", "send_edit": "Did I를 바꿨어요: {q}",
           "friend_title": "친구 요청", "ask_named": "{name}님이 친구가 되고 싶어 해요.", "ask": "누군가 친구가 되고 싶어 해요.",
           "yes_named": "{name}님이 수락했어요. 이제 친구예요.", "yes": "친구 요청이 수락되었어요.",
           "family": "우리 가족", "family_all": "오늘 모두 끝냈어요. {total}명 중 {total}명.", "family_some": "오늘 벌써 {n}명이 끝냈어요.",
           "cheered": "오늘 응원했어요.", "gift": "{name}님이 선물을 보냈어요", "open": "Did I를 열어 확인하세요.",
           "we_done": "함께 해냄: {q}", "we_did": "{name}님이 해냈어요", "we_turn": "내 차례: {q}", "we_asked": "{name}님이 물어봤어요", "we_ask": "Did we: {q}", "we_buddy": "{name}님이 해냈어요: {q}", "we_left": "{name}님이 나갔어요: {q}",
           "didi_send": "Did you를 보냈어요: {q}",
           "link_kept": "{name}님이 내 Did you를 받았어요: {q}", "link_joined": "{name}님이 내 Did we에 참여했어요: {q}", "drop_live": "오늘 상점에 새 상품이 나왔어요. Did I를 열어 확인하세요."},
    "pt": {"a_friend": "Um amigo", "someone": "Alguém", "send_cheer": "te mandou uma torcida.", "send_cheer_note": "torceu pela sua nota em \"{q}\".", "send_did": "te enviou um Did you: {q}", "send_edit": "mudou o Did I: {q}",
           "friend_title": "Pedido de amizade", "ask_named": "{name} quer ser seu amigo.", "ask": "Alguém quer ser seu amigo.",
           "yes_named": "{name} disse sim. Agora vocês são amigos.", "yes": "Seu pedido de amizade foi aceito.",
           "family": "Sua família", "family_all": "Todos terminaram hoje. {total} de {total}.", "family_some": "{n} já terminaram hoje.",
           "cheered": "torceu por você hoje.", "gift": "{name} te enviou um presente", "open": "Abra o Did I para ver.",
           "we_done": "Feito juntos: {q}", "we_did": "{name} fez", "we_turn": "Sua vez: {q}", "we_asked": "{name} te convidou", "we_ask": "Did we: {q}", "we_buddy": "{name} fez: {q}", "we_left": "{name} saiu: {q}",
           "didi_send": "Te enviou um Did you: {q}",
           "link_kept": "{name} guardou seu Did you: {q}", "link_joined": "{name} entrou no seu Did we: {q}", "drop_live": "Novidades na loja hoje. Abra o Did I para ver."},
    "zh": {"a_friend": "一位朋友", "someone": "有人", "send_cheer": "为你加油了。", "send_cheer_note": "为你在“{q}”上的笔记加油了。", "send_did": "给你发了一个 Did you：{q}", "send_edit": "修改了 Did I：{q}",
           "friend_title": "好友请求", "ask_named": "{name} 想加你为好友。", "ask": "有人想加你为好友。",
           "yes_named": "{name} 同意了。你们现在是好友了。", "yes": "你的好友请求已通过。",
           "family": "你的家人", "family_all": "今天大家都完成了。{total}/{total}。", "family_some": "今天已有 {n} 人完成。",
           "cheered": "今天为你加油了。", "gift": "{name} 给你送了礼物", "open": "打开 Did I 查看。",
           "we_done": "一起完成：{q}", "we_did": "{name} 完成了", "we_turn": "轮到你了：{q}", "we_asked": "{name} 邀请了你", "we_ask": "Did we：{q}", "we_buddy": "{name} 完成了：{q}", "we_left": "{name} 退出了：{q}",
           "didi_send": "给你发了一个 Did you：{q}",
           "link_kept": "{name} 收下了你的 Did you：{q}", "link_joined": "{name} 加入了你的 Did we：{q}", "drop_live": "今天商店上新了。打开 Did I 看看。"}
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

create or replace function public.queue_we_left_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.state <> 'in' or new.state <> 'left' then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  select m.user_id, new.user_id, 'Did we',
    left(public.push_text(m.user_id, 'we_left', jsonb_build_object(
      'name', public.push_name(new.user_id, m.user_id),
      'q', left(c.question, 120))), 200),
    '/tonight'
  from public.we_cards c
  join public.we_members m on m.card_id = c.id and m.state = 'in' and m.user_id <> new.user_id
  where c.id = new.card_id
    and not exists (select 1 from public.blocks b
                    where (b.blocker = new.user_id and b.blocked = m.user_id)
                       or (b.blocker = m.user_id and b.blocked = new.user_id))
    and (exists (select 1 from public.friend_links f
                 where f.state = 'ok'
                   and ((f.from_id = new.user_id and f.to_id = m.user_id)
                     or (f.from_id = m.user_id and f.to_id = new.user_id)))
         or public.shares_family_of(new.user_id, m.user_id))
    and public.push_wanted(m.user_id, 'we');
  return new;
end;
$$;

revoke all on function public.queue_we_left_push() from public, anon, authenticated;

drop trigger if exists queue_we_left_push on public.we_members;
create trigger queue_we_left_push
  after update of state on public.we_members
  for each row execute function public.queue_we_left_push();
