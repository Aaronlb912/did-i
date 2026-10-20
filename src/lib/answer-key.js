import { cloud, cloudEndpoint } from './cloud.js'

// This device's answer key (supabase/answer-keys.sql): it lets a widget or
// watch tap reach the account while the app is closed, and does nothing
// else. The key goes straight to the phone's secure store (iOS Keychain,
// Android Keystore) through the native shell; JS never keeps it.

const MADE = 'did-i-answer-key'
// A fresh key now and then, so an old one does not live for ever.
const KEEP_MS = 7 * 86400000

let store = null

// native/answer-key-store.js sets { save(json), clear() }. The website never does.
export function setAnswerKeyStore(next) {
  store = next || null
}

function read() {
  try {
    return localStorage.getItem(MADE) || ''
  } catch {
    return ''
  }
}

function write(value) {
  try {
    localStorage.setItem(MADE, value)
  } catch {
    // Asks again next time.
  }
}

// After a sync lands: make a key unless this device already holds a recent
// one for this account. Failures are quiet; taps still sync when the app opens.
export async function refreshAnswerKey(userId, device, now = Date.now()) {
  const db = cloud()
  const where = cloudEndpoint()
  if (!store || !db || !where || !userId || !device) return
  const [who, on, at] = read().split('|')
  if (who === userId && on === device && now - Number(at) < KEEP_MS) return
  try {
    const { data, error } = await db.rpc('make_answer_key', { device })
    if (error || typeof data !== 'string' || !/^[0-9a-f]{64}$/.test(data)) return
    // Marked even when the store says no (a build without the app group):
    // asking again every sync would only burn keys against the daily cap.
    write(`${userId}|${device}|${now}`)
    await store.save(JSON.stringify({ key: data, url: where.url, anon: where.anon }))
  } catch {
    // Tried again on the next sync.
  }
}

// The session ended on its own (expired, signed out elsewhere): drop the
// phone's copy so widget and watch taps stop posting to that account.
export function forgetAnswerKey() {
  write('')
  try {
    Promise.resolve(store?.clear()).catch(() => {})
  } catch {
    // ok
  }
}

// Sign out: the key leaves the phone, and the account ends it (this device's,
// or every device's when device is null). Call while the session still works.
export async function endAnswerKeys(device) {
  write('')
  try {
    await store?.clear()
  } catch {
    // ok
  }
  const db = cloud()
  if (!db) return
  let timer
  try {
    // A stalled network must not hold up sign out.
    await Promise.race([
      db.rpc('revoke_answer_keys', device ? { device } : {}),
      new Promise((resolve) => { timer = setTimeout(resolve, 3000) }),
    ])
  } catch {
    // The key is already off this phone; the server copy is only a hash.
  } finally {
    clearTimeout(timer)
  }
}
