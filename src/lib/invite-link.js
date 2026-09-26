import { INVITE_CODE_LEN, cleanInvite, useInvite } from './people.js'

// Invite links: did-i.app/i/CODE. The page copies the code and opens the
// store; the app picks the code up on first launch (Play install referrer on
// Android, the clipboard on iPhone, or a didi://invite/CODE link) and uses it
// once after sign-in.

const KEY = 'did-i-pending-invite'
export const INVITE_URL = 'https://did-i.app/i/'
export const APP_STORE_URL = 'https://apps.apple.com/app/id6814688066'
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.aaronbryant.didi'

export function inviteLink(code) {
  return INVITE_URL + cleanInvite(code)
}

export function playLinkFor(code) {
  return `${PLAY_URL}&referrer=${encodeURIComponent(`invite=${cleanInvite(code)}`)}`
}

// Text the invite page puts on the clipboard, so the app can tell it apart.
export function inviteClip(code) {
  return `Did I invite ${cleanInvite(code)}`
}

export function inviteFromText(text) {
  const hit = /(?:did-i\.app\/i\/|did i invite |invite[=/])([A-Za-z0-9]{10})\b/i.exec(String(text || ''))
  return hit ? cleanInvite(hit[1]) : ''
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
  return !miss
}
