// Product Hunt buddy links: did-i.app/hunt is the page, did-i.app/hunt/claim
// (or didi://hunt) is what the app claims on. Like invite links, a fresh
// install keeps the link: Play's install referrer carries hunt=1, and on
// iPhone the page copies the claim link. Kept until the app has used it.

const KEY = 'did-i-pending-hunt'
const ASKED = 'did-i-hunt-asked:'
export const HUNT_URL = 'https://did-i.app/hunt'
export const HUNT_CLAIM_URL = 'https://did-i.app/hunt/claim'
export const HUNT_APP_URL = 'didi://hunt'

const watchers = new Set()

export function readHuntLink(url) {
  const base = String(url || '').trim().split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase()
  return base === 'https://did-i.app/hunt/claim' || base === 'https://www.did-i.app/hunt/claim' || base === 'didi://hunt'
}

export function huntFromText(text) {
  const s = String(text || '')
  return /did-i\.app\/hunt\/claim/i.test(s) || /(?:^|&)hunt=1(?:&|$)/.test(s)
}

export function savePendingHunt() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // The claim button works again.
  }
  for (const fn of watchers) fn()
}

export function readPendingHunt() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function clearPendingHunt() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ok
  }
}

export function onPendingHunt(fn) {
  watchers.add(fn)
  return () => watchers.delete(fn)
}

export function huntAsked(userId) {
  try {
    return Boolean(localStorage.getItem(ASKED + userId))
  } catch {
    return true
  }
}

export function markHuntAsked(userId) {
  try {
    localStorage.setItem(ASKED + userId, '1')
  } catch {
    // Asked again next time is fine.
  }
}
