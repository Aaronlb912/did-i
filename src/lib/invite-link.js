import { INVITE_CODE_LEN, cleanInvite, inviteOwner, useInvite } from './people.js'

// Invite links: did-i.app/i/CODE. The page copies the link and opens the
// store; the app picks the code up on first launch (Play install referrer on
// Android, the copied link on iPhone, or a didi://invite/CODE link) and uses
// it once after sign-in.

const KEY = 'did-i-pending-invite'
export const INVITE_URL = 'https://did-i.app/i/'
export const APP_STORE_URL = 'https://apps.apple.com/app/id6814688066'
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.aaronbryant.didi'

export function inviteLink(code) {
  return INVITE_URL + cleanInvite(code)
}

// Android is in testing, so store buttons go to the beta page. What Play's
// install referrer carried (invite=…, did=…, a QR code) rides along as ?ref
// and comes back on the beta page's install button.
export const BETA_PATH = '/beta'
export function betaLinkFor(referrer) {
  const ref = String(referrer || '').trim()
  return ref ? `${BETA_PATH}?ref=${encodeURIComponent(ref)}` : BETA_PATH
}
export function betaRefFrom(search) {
  try {
    const ref = new URLSearchParams(search || '').get('ref') || ''
    return /^[a-z]+=[A-Za-z0-9_:-]{1,64}(&[a-z]+=[A-Za-z0-9_:-]{1,64})?$/.test(ref) ? ref : ''
  } catch {
    return ''
  }
}

export function playLinkFor(code) {
  return `${PLAY_URL}&referrer=${encodeURIComponent(`invite=${cleanInvite(code)}`)}`
}

// What the invite page puts on the clipboard. It is the link itself, because
// the iPhone app only reads the clipboard when iOS says it holds a web link.
export function inviteClip(code) {
  return inviteLink(code)
}

export function inviteFromText(text) {
  const hit = /(?:did-i\.app\/i\/|did i invite |invite[=/])([A-Za-z0-9]{10})\b/i.exec(String(text || ''))
  return hit ? cleanInvite(hit[1]) : ''
}

// A pasted invite: the link a friend shared (did-i.app/i/CODE), the whole
// message it came in, or the bare code with or without its dash.
export function inviteFromPaste(text) {
  const raw = String(text || '')
  const linked = inviteFromText(raw)
  if (linked) return linked
  const bare = /^\s*([A-Za-z0-9]{5})[\s-]?([A-Za-z0-9]{5})\s*$/.exec(raw)
  return bare ? cleanInvite(bare[1] + bare[2]) : ''
}

// Made in the last two days: asked once whether someone invited it.
const NEW_FOR_MS = 2 * 24 * 60 * 60 * 1000
export function isNewAccount(user, now = Date.now()) {
  const made = Date.parse(String(user?.created_at || ''))
  return Number.isFinite(made) && now - made >= 0 && now - made < NEW_FOR_MS
}

export function savePendingInvite(code) {
  const clean = cleanInvite(code)
  if (clean.length !== INVITE_CODE_LEN) return false
  try {
    localStorage.setItem(KEY, clean)
    return true
  } catch {
    return false
  }
}

export function readPendingInvite() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

function clearPendingInvite() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ok
  }
}

// Runs on each signed-in sync (cloud-sync). The server takes one invite per
// account, so a repeat is harmless. Network trouble keeps the code for the
// next sync; a final answer from the server clears it.
export async function applyPendingInvite() {
  const code = readPendingInvite()
  if (!code) return false
  const { miss } = await useInvite(code)
  // Only the server's own answers are final; anything else is a network or auth hiccup.
  if (miss && !['used', 'self', 'nobody', 'code'].includes(miss)) return false
  clearPendingInvite()
  if (miss) {
    try {
      localStorage.setItem(MISS_KEY, miss === 'used' || miss === 'self' ? miss : 'bad')
    } catch {
      // The note is a nicety.
    }
    for (const fn of joinedWatchers) fn()
  } else {
    const name = await inviteOwner(code).catch(() => null)
    try {
      localStorage.setItem(JOINED_KEY, JSON.stringify({ name: name || '' }))
    } catch {
      // The note is a nicety.
    }
    for (const fn of joinedWatchers) fn()
  }
  return !miss
}

// The phone says "You joined with Aaron's invite" once a link's code is used.
// Kept until shown, so a sync that lands before the app is up still says it.
const JOINED_KEY = 'did-i-invite-joined'
const MISS_KEY = 'did-i-invite-miss'
const joinedWatchers = new Set()
// A link whose code did not count: 'used', 'self' or 'bad'. Kept until shown.
export function takeInviteMiss() {
  try {
    const miss = localStorage.getItem(MISS_KEY) || ''
    if (miss) localStorage.removeItem(MISS_KEY)
    return miss
  } catch {
    return ''
  }
}
export function onInviteJoined(fn) {
  joinedWatchers.add(fn)
  return () => joinedWatchers.delete(fn)
}
export function takeInviteJoined() {
  try {
    const raw = localStorage.getItem(JOINED_KEY)
    if (!raw) return null
    localStorage.removeItem(JOINED_KEY)
    return { name: String(JSON.parse(raw)?.name || '') }
  } catch {
    return null
  }
}
