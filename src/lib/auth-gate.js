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
  // A fresh install goes straight to the first night. Sign-in is offered
  // after night one and from Settings, not as a wall.
  if (!readAccountUserId()) return false
  // Signed in before and the session is gone: ask again.
  return true
}

const AUTH_FREE = new Set(['/privacy', '/terms'])

export function authGated(path, account) {
  if (AUTH_FREE.has(path)) return false
  return needsAuth(account)
}
