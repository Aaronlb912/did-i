import { noteSessionUser, readAccountUserId } from './session-id.js'
import { useEffect, useState } from 'react'
import { cloud, cloudSetUp } from './cloud.js'
import { appMiss, t } from './i18n.js'
import { saveTogetherPeople } from './together-widget.js'
import { removeAvatar } from './avatar.js'
import { removeAllProofFiles } from './proofs.js'
import { forgetAccountCaches, forgetPendingLinks } from './account-cache.js'
import { dropEarnedCoins } from './purse.js'
import { clearGifts } from './gift-inbox.js'
import { endAnswerKeys } from './answer-key.js'

const DEVICE_KEY = 'did-i-device'

function madeUpKey() {
  const bytes = new Uint8Array(8)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  return [...bytes].map((n) => n.toString(16).padStart(2, '0')).join('')
}

const OLD_DEVICE_KEY = 'did-i-device-old'
// Per-phone flags a restored backup must not carry (native/lib/ping-primer.js).
const RESTORED_DROP = ['did-i-ping-primer', 'did-i-ping-primer-again']

// The phone app sets a stable id from the phone itself (native/bootstrap.js),
// so a reinstall or the Dev app is still the same phone. A random key from
// before is handed over once, so its row can be dropped (takeOldDeviceKey).
export function deviceKey() {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    const stable = globalThis.__didIStableDeviceId
    if (stable && saved !== stable) {
      // A stable id from another phone means a restored backup: that phone is
      // still live, so its row stays, and its reminder ask does not count here.
      if (saved && /^[ai]-/.test(saved)) {
        for (const key of RESTORED_DROP) localStorage.removeItem(key)
      } else if (saved) localStorage.setItem(OLD_DEVICE_KEY, saved)
      localStorage.setItem(DEVICE_KEY, stable)
      return stable
    }
    if (saved) return saved
    const next = madeUpKey()
    localStorage.setItem(DEVICE_KEY, next)
    return next
  } catch {
    return 'this-phone'
  }
}

export function takeOldDeviceKey() {
  try {
    const old = localStorage.getItem(OLD_DEVICE_KEY) || ''
    if (old) localStorage.removeItem(OLD_DEVICE_KEY)
    return old
  } catch {
    return ''
  }
}

export function devicePlatform() {
  const native = globalThis.__didIPlatform
  if (native === 'ios' || native === 'android') return native
  return 'web'
}

export function deviceLabel() {
  const platform = devicePlatform()
  const named = globalThis.__didIDeviceName
  if (platform !== 'web' && typeof named === 'string' && named) return named.slice(0, 80)
  if (platform === 'android') return t('device.android')
  if (platform === 'ios') return t('device.ios')
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
  if (/iPhone|iPad/i.test(agent)) return t('device.safariIphone')
  if (/Android/i.test(agent)) return t('device.browserAndroid')
  if (/Mac OS X/i.test(agent)) return t('device.browserMac')
  if (/Windows/i.test(agent)) return t('device.browserWindows')
  return t('device.browser')
}

export function deviceModel() {
  const model = globalThis.__didIDeviceModel
  return typeof model === 'string' ? model.slice(0, 80) : ''
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value))
}

function mapAuthMiss(error) {
  if (!error) return ''
  const msg = String(error.message || error).toLowerCase()
  const status = error.status
  if (status === 429 || /rate limit|too many|over_email_send_rate_limit/i.test(msg)) return 'often'
  if (/signups not allowed|signup.*disabled/i.test(msg)) return 'signupOff'
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(msg)) return 'badEmail'
  if (/expired|otp_expired/i.test(msg)) return 'codeExpired'
  if (/invalid.*otp|token.*invalid|otp.*invalid|invalid login/i.test(msg)) return 'codeBad'
  if (/cancel/i.test(msg)) return 'cancel'
  return 'sendFail'
}

export function accountMissText(bad) {
  if (!bad) return ''
  const key = {
    off: 'account.offBody',
    often: 'account.tooOften',
    badEmail: 'account.missEmail',
    codeBad: 'account.missCode',
    codeExpired: 'account.codeExpired',
    signupOff: 'account.signupOff',
    sendFail: 'account.sendFail',
    cancel: '',
    appleFail: 'auth.appleFail',
    appleUnavailable: 'auth.appleUnavailable',
    googleFail: 'auth.googleFail',
    googleUnavailable: 'auth.googleUnavailable',
    reviewerBad: 'auth.reviewerBad',
    net: 'confirm.miss',
  }[bad]
  return key ? t(key) : bad
}

export async function sendCode(email) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.auth.signInWithOtp({
    email: cleanEmail(email),
    options: { shouldCreateUser: true },
  })
  if (!error) return { miss: '' }
  return { miss: mapAuthMiss(error) }
}

export async function checkCode(email, code) {
  const db = cloud()
  if (!db) return { miss: 'off', user: null }
  const token = String(code || '').replace(/\D/g, '')
  if (token.length < 6) return { miss: 'codeBad', user: null }
  const { data, error } = await db.auth.verifyOtp({
    email: cleanEmail(email),
    token,
    type: 'email',
  })
  return { miss: error ? mapAuthMiss(error) : '', user: data?.user || null }
}

// Store review accounts only: reviewers cannot receive an email code.
// Never creates an account; the account has to exist with a password already.
export async function signInReviewer(email, password) {
  const db = cloud()
  if (!db) return { miss: 'off', user: null }
  if (!looksLikeEmail(email) || !password) return { miss: 'reviewerBad', user: null }
  const { data, error } = await db.auth.signInWithPassword({ email: cleanEmail(email), password: String(password) })
  if (!error) return { miss: '', user: data?.user || null }
  const bad = mapAuthMiss(error)
  return { miss: bad === 'often' ? bad : 'reviewerBad', user: null }
}

// This device's push token, dropped before sign out. Loaded late: a static
// import makes a cycle on the phone (Metro swaps in native/shim/push.js).
// Capped at 3s and failures ignored, so sign out never stalls.
export async function dropPushToken(ms = 3000) {
  let timer
  try {
    await Promise.race([
      import('./push.js').then(({ dropToken }) => dropToken()),
      new Promise((resolve) => { timer = setTimeout(resolve, ms) }),
    ])
  } catch {
    // ignore
  } finally {
    clearTimeout(timer)
  }
}

// When this phone signed itself out. The sign out event that follows is not
// "signed out somewhere else" (cloud-sync.js sessionMissing).
let leavingAt = 0
export function leftHereLately(now = Date.now()) {
  return now - leavingAt < 60000
}

export async function signOutHere() {
  const db = cloud()
  if (!db) return
  // This device's push token and answer key go first, while the session can
  // still reach the account.
  leavingAt = Date.now()
  await Promise.all([dropPushToken(), endAnswerKeys(deviceKey())])
  // signOut() defaults to global, which would end the session on every other device.
  await db.auth.signOut({ scope: 'local' })
  // The home screen widget must not keep showing this account's people.
  saveTogetherPeople([])
  forgetAccountCaches()
  forgetPendingLinks()
  clearGifts()
  // Coins queued for this account must not be credited to the next one.
  dropEarnedCoins()
}

// Every device's push token for this account, in one update, so signed out
// phones stop getting reminders. Capped at 3s and failures ignored.
export async function dropAllPushTokens(ms = 3000) {
  const db = cloud()
  if (!db) return
  let timer
  try {
    await Promise.race([
      (async () => {
        const { data } = await db.auth.getSession()
        const id = data?.session?.user?.id
        if (id) await db.from('devices').update({ push_token: null }).eq('user_id', id)
      })(),
      new Promise((resolve) => { timer = setTimeout(resolve, ms) }),
    ])
  } catch {
    // ignore
  } finally {
    clearTimeout(timer)
  }
}

export async function signOutEverywhere() {
  const db = cloud()
  if (!db) return
  await Promise.all([dropPushToken(), dropAllPushTokens(), endAnswerKeys(null)])
  // The server has to end the other sessions; if it could not, say so.
  leavingAt = Date.now()
  const { error } = await db.auth.signOut({ scope: 'global' })
  if (error) {
    // Still signed in here: put this phone's push token back, or its pushes stop.
    await import('./push.js').then(({ syncPushTokenIfAllowed }) => syncPushTokenIfAllowed()).catch(() => {})
    throw error
  }
  saveTogetherPeople([])
  forgetAccountCaches()
  forgetPendingLinks()
  clearGifts()
  // Coins queued for this account must not be credited to the next one.
  dropEarnedCoins()
}

export async function deleteAccount() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  // Photo files go through the Storage API (SQL cannot delete them), and
  // before the delete, while the account can still see its own folder.
  const files = await removeAllProofFiles()
  if (files.miss) return { miss: 'account.syncMiss' }
  // Sign in with Apple: take Did I off the Apple ID first, while the session
  // can still call the function. A miss is logged and the delete goes on.
  const apple = await import('./apple-sign-in.js').then(({ revokeAppleSignIn }) => revokeAppleSignIn()).catch(() => ({ miss: 'appleFail' }))
  if (apple?.miss) console.warn('apple revoke', apple.miss)
  const { error } = await db.rpc('delete_me')
  if (error) return { miss: appMiss(error, 'account.syncMiss') }
  // Only once the delete went through: a failed delete keeps its photo.
  // delete_me tries storage too; this catches what it missed.
  await removeAvatar().catch(() => {})
  // The account's keys went with it (cascade); take this phone's copy too.
  await endAnswerKeys(null)
  leavingAt = Date.now()
  await db.auth.signOut({ scope: 'local' })
  saveTogetherPeople([])
  forgetAccountCaches()
  forgetPendingLinks()
  clearGifts()
  // Coins queued for this account must not be credited to the next one.
  dropEarnedCoins()
  return { miss: '' }
}

// The signed-in user from the saved session, without a network call to the
// server. Gives up after a moment: a mail must not wait on a slow refresh.
export async function sessionUser(ms = 1500) {
  const db = cloud()
  if (!db) return null
  try {
    const { data } = await Promise.race([db.auth.getSession(), new Promise((resolve) => setTimeout(() => resolve({}), ms))])
    return data?.session?.user || null
  } catch {
    return null
  }
}

export async function readUser() {
  const db = cloud()
  if (!db) return null
  const { data } = await db.auth.getUser()
  return data?.user || null
}

// Last session seen by any screen. A screen that mounts later starts from
// it instead of flashing the signed-out page while getSession resolves.
let lastUser

export function useAccount() {
  const [state, setState] = useState(() =>
    lastUser === undefined ? { ready: !cloudSetUp(), user: null } : { ready: true, user: lastUser },
  )

  useEffect(() => {
    const db = cloud()
    if (!db) return undefined
    let alive = true
    // A failed refresh offline is not a sign out: keep the account we knew.
    // Only SIGNED_OUT below clears it.
    const keep = () => lastUser || (readAccountUserId() ? { id: readAccountUserId() } : null)
    db.auth.getSession().then(
      ({ data, error }) => {
        lastUser = data?.session?.user || (error ? keep() : null)
        noteSessionUser(lastUser?.id)
        if (alive) setState((was) => (was.ready && was.user?.id === lastUser?.id ? was : { ready: true, user: lastUser }))
      },
      () => {
        lastUser = keep()
        if (alive) setState({ ready: true, user: lastUser })
      },
    )
    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      lastUser = session?.user || null
      noteSessionUser(lastUser?.id)
      if (alive) setState((was) => (was.ready && was.user?.id === lastUser?.id ? was : { ready: true, user: lastUser }))
    })
    return () => {
      alive = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return { ...state, on: cloudSetUp(), email: state.user?.email || '' }
}
