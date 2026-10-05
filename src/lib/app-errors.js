import { cloud } from './cloud.js'
import { devicePlatform } from './account.js'
import { diagnosticsOn } from './diagnostics.js'

// Failed syncs go to public.app_errors: a kind, a short code, the app
// version and platform. No user id, never question text or names. Only with crash
// reports switched on, and at most one row a minute from this phone.
let appVersion = ''
let lastAt = 0
const GAP_MS = 60 * 1000

export function setErrorAppVersion(version) {
  appVersion = String(version || '').slice(0, 20)
}

// A short code from an error, never its full message (it can hold data).
export function errorCode(error) {
  const raw = String(error?.code || error?.message || error || 'unknown')
  const word = raw.match(/[A-Za-z0-9_.:-]+/)?.[0] || 'unknown'
  return word.slice(0, 80)
}

export async function recordAppError(kind, error, now = Date.now()) {
  if (!diagnosticsOn()) return false
  if (now - lastAt < GAP_MS) return false
  const db = cloud()
  if (!db) return false
  lastAt = now
  try {
    const { error: bad } = await db.from('app_errors').insert({
      kind,
      code: errorCode(error),
      app_version: appVersion,
      platform: String(devicePlatform() || '').slice(0, 20),
    })
    return !bad
  } catch {
    return false
  }
}
