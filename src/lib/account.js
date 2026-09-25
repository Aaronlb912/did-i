import { useEffect, useState } from 'react'
import { cloud, cloudSetUp } from './cloud.js'
import { t } from './i18n.js'

const DEVICE_KEY = 'did-i-device'

function madeUpKey() {
  const bytes = new Uint8Array(8)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  return [...bytes].map((n) => n.toString(16).padStart(2, '0')).join('')
}

export function deviceKey() {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    if (saved) return saved
    const next = madeUpKey()
    localStorage.setItem(DEVICE_KEY, next)
    return next
  } catch {
    return 'this-phone'
  }
}

export function devicePlatform() {
  const native = globalThis.__didIPlatform
  if (native === 'ios' || native === 'android') return native
  return 'web'
}

export function deviceLabel() {
  const platform = devicePlatform()
  if (platform === 'android') return t('device.android')
  if (platform === 'ios') return t('device.ios')
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
  if (/iPhone|iPad/i.test(agent)) return t('device.safariIphone')
  if (/Android/i.test(agent)) return t('device.browserAndroid')
  if (/Mac OS X/i.test(agent)) return t('device.browserMac')
  if (/Windows/i.test(agent)) return t('device.browserWindows')
  return t('device.browser')
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

export async function signOutHere() {
  const db = cloud()
  if (!db) return
  await db.auth.signOut()
}

export async function signOutEverywhere() {
  const db = cloud()
  if (!db) return
  await db.auth.signOut({ scope: 'global' })
}

export async function deleteAccount() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('delete_me')
  if (error) return { miss: error.message }
  await db.auth.signOut()
  return { miss: '' }
}

export async function readUser() {
  const db = cloud()
  if (!db) return null
  const { data } = await db.auth.getUser()
  return data?.user || null
}

export function useAccount() {
  const [state, setState] = useState({ ready: !cloudSetUp(), user: null })

  useEffect(() => {
    const db = cloud()
    if (!db) return undefined
    let alive = true
    db.auth.getSession().then(
      ({ data }) => {
        if (alive) setState({ ready: true, user: data?.session?.user || null })
      },
      () => {
        if (alive) setState({ ready: true, user: null })
      },
    )
    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      if (alive) setState({ ready: true, user: session?.user || null })
    })
    return () => {
      alive = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return { ...state, on: cloudSetUp(), email: state.user?.email || '' }
}
