import { cloudSetUp } from './cloud.js'

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
  // A fresh install has no session yet. Waiting on `ready` used to open
  // Tonight first, and a hung session check left no way to sign in.
  return true
}

const AUTH_FREE = new Set(['/privacy', '/terms'])

export function authGated(path, account) {
  if (AUTH_FREE.has(path)) return false
  return needsAuth(account)
}
