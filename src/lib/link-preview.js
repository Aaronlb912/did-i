// The text a message app shows for a did-i.app/d/CODE link. Message apps
// read the page without running it, so api/link-preview.js fills these into
// index.html on the server, in the visitor's language (Accept-Language).

function esc(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// A Did you is typed after a "Did you" label, so the link stores only the
// rest ("get the test"). Shown on its own it needs the lead back. A question
// that already starts with "Did" (a Did we, a send from Did I) is left alone.
export function didYouAsk(question, lead = 'Did you') {
  const text = String(question || '').trim()
  if (!text) return ''
  const head = String(lead || '').trim()
  if (/^did\s/i.test(text) || (head && text.toLowerCase().startsWith(head.toLowerCase()))) return text
  if (!head) return text
  // Phones capitalize the first word typed; after the lead it reads mid-sentence.
  const rest = /^I\b/.test(text) || /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1)
  return `${head} ${rest}`
}

// The fixed words in a preview, in the app's 9 languages. Kept here, not in
// src/locales, so the preview function stays small and fast. "Did you",
// "Did we" and "Did I" are names and stay as they are.
const PREVIEW_WORDS = {
  en: { you: '{name} sent you a Did you', youDidI: 'A Did you from Did I', we: '{name} asked you to join a Did we', weAny: 'Join a Did we', ended: 'This link has ended', endedBody: 'Ask whoever sent it for a new one.' },
  de: { you: '{name} hat dir ein Did you geschickt', youDidI: 'Ein Did you von Did I', we: '{name} lädt dich zu einem Did we ein', weAny: 'Bei einem Did we mitmachen', ended: 'Dieser Link ist beendet', endedBody: 'Bitte die Person um einen neuen.' },
  es: { you: '{name} te envió un Did you', youDidI: 'Un Did you de Did I', we: '{name} te invita a un Did we', weAny: 'Únete a un Did we', ended: 'Este enlace terminó', endedBody: 'Pide uno nuevo a quien te lo envió.' },
  fr: { you: '{name} t’a envoyé un Did you', youDidI: 'Un Did you de Did I', we: '{name} t’invite à rejoindre un Did we', weAny: 'Rejoindre un Did we', ended: 'Ce lien a pris fin', endedBody: 'Demande-en un nouveau à la personne qui l’a envoyé.' },
  it: { you: '{name} ti ha mandato un Did you', youDidI: 'Un Did you da Did I', we: '{name} ti invita a un Did we', weAny: 'Unisciti a un Did we', ended: 'Questo link è terminato', endedBody: 'Chiedine uno nuovo a chi te l’ha mandato.' },
  ja: { you: '{name}から Did you が届きました', youDidI: 'Did I からの Did you', we: '{name}から Did we へのお誘い', weAny: 'Did we に参加', ended: 'このリンクは終了しました', endedBody: '送った人に新しいリンクを頼んでください。' },
  ko: { you: '{name}님이 Did you를 보냈어요', youDidI: 'Did I가 보낸 Did you', we: '{name}님이 Did we에 초대했어요', weAny: 'Did we 함께하기', ended: '이 링크는 끝났어요', endedBody: '보낸 사람에게 새 링크를 부탁하세요.' },
  pt: { you: '{name} te enviou um Did you', youDidI: 'Um Did you do Did I', we: '{name} chamou você para um Did we', weAny: 'Entre em um Did we', ended: 'Este link terminou', endedBody: 'Peça um novo para quem enviou.' },
  zh: { you: '{name} 给你发了一个 Did you', youDidI: '来自 Did I 的 Did you', we: '{name} 邀你加入一个 Did we', weAny: '加入一个 Did we', ended: '这个链接已结束', endedBody: '请让发送的人重新发一个。' },
}

export const PREVIEW_LANGS = Object.keys(PREVIEW_WORDS)

// The first of the visitor's Accept-Language picks that is one of ours, by
// q weight. English when none match.
export function previewLang(header) {
  const picks = String(header || '')
    .split(',')
    .map((part, i) => {
      const [tag, ...rest] = part.trim().split(';')
      const q = rest.map((p) => /^\s*q=([\d.]+)/.exec(p)).find(Boolean)
      return { lang: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q[1]) : 1, i }
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
  return picks.find((p) => PREVIEW_WORDS[p.lang])?.lang || 'en'
}

// found: { question, name } from look_up_did_you_link or look_up_we_link.
// The question stays as written; only the fixed words follow lang.
export function linkPreviewText(found, we, lang = 'en') {
  if (!found?.question) return null
  const words = PREVIEW_WORDS[lang] || PREVIEW_WORDS.en
  const name = String(found.name || '').trim()
  const title = we
    ? name ? words.we.replace('{name}', name) : words.weAny
    : name ? words.you.replace('{name}', name) : words.youDidI
  return { title, description: didYouAsk(found.question).slice(0, 200) }
}

// A Did you link its maker ended.
export function endedPreviewText(lang = 'en') {
  const words = PREVIEW_WORDS[lang] || PREVIEW_WORDS.en
  return { title: words.ended, description: words.endedBody }
}

export function withLinkPreview(html, { title, description, url }) {
  const set = (attr, key, value) => {
    const tag = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
    html = html.replace(tag, (_, a, b) => `${a}${esc(value)}${b}`)
  }
  set('property', 'og:title', title)
  set('name', 'twitter:title', title)
  set('property', 'og:description', description)
  set('name', 'twitter:description', description)
  set('name', 'description', description)
  set('property', 'og:url', url)
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => `${a}${esc(url)}${b}`)
}
