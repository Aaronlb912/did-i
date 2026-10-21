-- When a report leads to a removal, the person it was about hears what went,
-- never who reported. Dismiss stays quiet; a ban can not sign in anyway.
-- New at the end of the order; safe to run again.

create or replace function public.queue_report_removed_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  lang text;
  words jsonb := '{
    "en": {"photo": "Your profile photo was removed after a report.", "link": "A link you shared was turned off after a report."},
    "de": {"photo": "Dein Profilbild wurde nach einer Meldung entfernt.", "link": "Ein Link, den du geteilt hast, wurde nach einer Meldung abgeschaltet."},
    "es": {"photo": "Tu foto de perfil se quitó tras una denuncia.", "link": "Un enlace que compartiste se desactivó tras una denuncia."},
    "fr": {"photo": "Ta photo de profil a été retirée après un signalement.", "link": "Un lien que tu as partagé a été désactivé après un signalement."},
    "it": {"photo": "La tua foto profilo è stata rimossa dopo una segnalazione.", "link": "Un link che hai condiviso è stato disattivato dopo una segnalazione."},
    "ja": {"photo": "報告を受けて、プロフィール写真を削除しました。", "link": "報告を受けて、共有したリンクを無効にしました。"},
    "ko": {"photo": "신고를 받아 프로필 사진이 삭제됐어요.", "link": "신고를 받아 공유한 링크가 꺼졌어요."},
    "pt": {"photo": "Sua foto de perfil foi removida após uma denúncia.", "link": "Um link que você compartilhou foi desativado após uma denúncia."},
    "zh": {"photo": "因收到举报，你的头像已被移除。", "link": "因收到举报，你分享的链接已被关闭。"}
  }'::jsonb;
begin
  if new.action <> 'remove' or new.about_id is null then
    return new;
  end if;
  select public.report_kind(r.reason, r.line_id) into k from public.reports r where r.id = new.report_id;
  k := case when k = 'photo' then 'photo' when k in ('did_you_link', 'we_link') then 'link' end;
  if k is null then
    return new;
  end if;
  lang := coalesce((select p.prefs ->> 'locale' from public.profiles p where p.user_id = new.about_id), 'en');
  insert into public.push_queue (to_id, from_id, title, body, go)
  values (new.about_id, null, 'Did I', coalesce(words -> lang ->> k, words -> 'en' ->> k), '/me');
  return new;
end;
$$;

revoke all on function public.queue_report_removed_push() from public, anon, authenticated;

drop trigger if exists queue_report_removed_push on public.report_actions;
create trigger queue_report_removed_push
  after insert on public.report_actions
  for each row execute function public.queue_report_removed_push();
