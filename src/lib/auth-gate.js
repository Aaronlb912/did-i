import { cloudSetUp } from './cloud.js'
import { readAccountUserId } from './session-id.js'

const SKIP_KEY = 'did-i-auth-skip'

export function authSkipped() {
  try {
    return localStorage.getItem(SKIP_KEY) === '1'
  } catch {
    return false
  }
}

export function skipAuth() {
  try {
    localStorage.setItem(SKIP_KEY, '1')
  } catch {
    // Board still opens.
  }
}

export function clearAuthSkip() {
  try {
    localStorage.removeItem(SKIP_KEY)
  } catch {
    // ok
  }
}

export function nativeApp() {
  const platform = globalThis.__didIPlatform
  return platform === 'ios' || platform === 'android'
}

export function needsAuth(account) {
  if (!cloudSetUp() || !nativeApp()) return false
  if (account?.user) return false
  if (authSkipped()) return false
  // Signed in last time: keep the app up while the session check runs, so a
  // cold open does not flash sign-in. If the check finds no session, `ready`
  // flips with no user and the gate shows sign-in then.
  if (!account?.ready && readAccountUserId()) return false
  // Never signed in: a fresh install starts on the welcome screen (sign in,
  // or start without an account). Someone already using the app on this
  // phone without an account is left alone.
  if (!readAccountUserId()) return freshInstall()
  // Signed in before and the session is gone: ask again.
  return true
}

// Nothing on this phone yet: the first night was never finished and the
// shelf has no questions.
export function freshInstall() {
  try {
    if (localStorage.getItem('did-i-welcome') === '1') return false
    const shelf = JSON.parse(localStorage.getItem('did-i-shelf') || 'null')
    return !(shelf?.boards || []).some((board) => (board.lamps || []).length > 0)
  } catch {
    return false
  }
}

const AUTH_FREE = new Set(['/privacy', '/terms'])

export function authGated(path, account) {
  if (AUTH_FREE.has(path)) return false
  return needsAuth(account)
}
