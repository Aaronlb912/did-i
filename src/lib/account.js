import { useEffect, useState } from 'react'
import { cloud, cloudSetUp } from './cloud.js'
import { t } from './i18n.js'
import { saveTogetherPeople } from './together-widget.js'
import { removeAvatar } from './avatar.js'
import { forgetAccountCaches } from './account-cache.js'

const DEVICE_KEY = 'did-i-device'

function madeUpKey() {
  const bytes = new Uint8Array(8)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  return [...bytes].map((n) => n.toString(16).padStart(2, '0')).join('')
}

const OLD_DEVICE_KEY = 'did-i-device-old'

// The phone app sets a stable id from the phone itself (native/bootstrap.js),
// so a reinstall or the Dev app is still the same phone. A random key from
// before is handed over once, so its row can be dropped (takeOldDeviceKey).
export function deviceKey() {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    const stable = globalThis.__didIStableDeviceId
    if (stable && saved !== stable) {
      if (saved) localStorage.setItem(OLD_DEVICE_KEY, saved)
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

export async function signOutHere() {
  const db = cloud()
  if (!db) return
  // signOut() defaults to global, which would end the session on every other device.
  await db.auth.signOut({ scope: 'local' })
  // The home screen widget must not keep showing this account's people.
  saveTogetherPeople([])
  forgetAccountCaches()
}

export async function signOutEverywhere() {
  const db = cloud()
  if (!db) return
  // The server has to end the other sessions; if it could not, say so.
  const { error } = await db.auth.signOut({ scope: 'global' })
  if (error) throw error
  saveTogetherPeople([])
  forgetAccountCaches()
}

export async function deleteAccount() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  // Photo files live in storage, which delete_me cannot reach; take them first.
  await removeAvatar().catch(() => {})
  const { error } = await db.rpc('delete_me')
  if (error) return { miss: error.message }
  await db.auth.signOut()
  saveTogetherPeople([])
  forgetAccountCaches()
  return { miss: '' }
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
    db.auth.getSession().then(
      ({ data }) => {
        lastUser = data?.session?.user || null
        if (alive) setState((was) => (was.ready && was.user?.id === lastUser?.id ? was : { ready: true, user: lastUser }))
      },
      () => {
        lastUser = null
        if (alive) setState({ ready: true, user: null })
      },
    )
    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      lastUser = session?.user || null
      if (alive) setState((was) => (was.ready && was.user?.id === lastUser?.id ? was : { ready: true, user: lastUser }))
    })
    return () => {
      alive = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return { ...state, on: cloudSetUp(), email: state.user?.email || '' }
}
