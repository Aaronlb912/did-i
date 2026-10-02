import * as Linking from 'expo-linking'
import { savePendingInvite } from '../src/lib/invite-link.js'
import { goHash } from './navigation/hash.js'
import { holdSpoken } from '../src/lib/voice-add.js'
import { readQrLink } from '../src/lib/qr-links.js'
import { matchSpoken, openTonight, spokenAnswer } from '../src/lib/voice-answer.js'
import { applyWidgetTapOnce } from '../src/lib/widget-tonight.js'
import { t } from '../src/lib/i18n.js'
import { showToast } from './lib/toast-queue.js'

export const TONIGHT_WIDGET_URI = 'didi://tonight'

export function routeFromDeepLink(url) {
  if (!url) return null
  try {
    // https://did-i.app/i/CODE through a universal link or App Link.
    const webInvite = /^https:\/\/(?:www\.)?did-i\.app\/i\/([a-z0-9]{10})\/?$/i.exec(String(url).trim())
    if (webInvite) return { invite: webInvite[1] }
    const parsed = Linking.parse(url)
    const host = String(parsed.hostname || '').toLowerCase()
    let path = String(parsed.path || '').replace(/^\/+/, '').toLowerCase()
    if (!path && host && host !== 'localhost') path = host
    // didi://invite/CODE from the invite page when the app is already installed.
    const invite = /^invite\/?([a-z0-9]{10})$/i.exec(host === 'invite' ? `invite/${path}` : path)
    if (invite) return { invite: invite[1] }
    // A friend or family QR code: did-i.app/f/ID or /j/CODE through a
    // universal link, or didi://friend/ID and didi://family/CODE from the page.
    const qr = readQrLink(String(url).trim())
    if (qr) return { path: '/people/connect', id: qr.friend ? `friend:${qr.friend}` : `family:${qr.family}` }
    // didi://open/friends and the rest from an app icon shortcut.
    if (host === 'open' || path.startsWith('open/')) {
      const where = path.replace(/^open\/?/, '')
      const to = { tonight: '/tonight', add: '/add', friends: '/people', scan: '/scan' }[where]
      if (to) return { path: to }
    }
    // didi://add?q=lock+the+back+door from Google Assistant, a Siri Shortcut or the app shortcut.
    if (path === 'add') {
      return { path: '/add', say: String(parsed.queryParams?.q || parsed.queryParams?.text || '') }
    }
    // didi://answer?q=stretch&a=did from Siri or Google Assistant.
    if (path === 'answer') {
      return {
        path: '/tonight',
        answer: { said: String(parsed.queryParams?.q || ''), kind: spokenAnswer(parsed.queryParams?.a) },
      }
    }
    if (path === 'tonight') {
      const face = String(parsed.queryParams?.face || parsed.queryParams?.id || '')
      const tag = String(parsed.queryParams?.tag || '')
      return { path: '/tonight', face, tag }
    }
    const lampId = String(parsed.queryParams?.face || parsed.queryParams?.id || '')
    if (lampId) return { path: '/tonight', face: lampId }
  } catch {
    // ok
  }
  return null
}

export function goFromDeepLink(url) {
  const route = routeFromDeepLink(url)
  if (!route) return false
  if (route.invite) {
    savePendingInvite(route.invite)
    return true
  }
  if (route.answer) {
    answerSpoken(route.answer)
    return true
  }
  if (route.say) holdSpoken(route.say)
  const extra = {}
  if (route.face) extra.face = route.face
  if (route.tag) extra.tag = route.tag
  if (route.id) extra.id = route.id
  goHash(route.path, extra)
  return true
}

// Saves a spoken Did or Nope the way a widget tap does, then shows that card.
// With no answer given, or no close question, Tonight opens to answer by hand.
function answerSpoken({ said, kind }) {
  const row = matchSpoken(said, openTonight())
  if (!row) {
    goHash('/tonight')
    showToast({ id: 'voice-answer', kind: 'error', text: t('voice.noMatch', { said }), ms: 5200 })
    return
  }
  if (kind) {
    const shelf = applyWidgetTapOnce(row.lamp.id, kind, row.periodKey)
    if (shelf) {
      import('./widget-sync.js').then((mod) => mod.syncTonightWidget(shelf)).catch(() => {})
    }
  }
  goHash('/tonight', { face: row.lamp.id, tag: 'all' })
}
