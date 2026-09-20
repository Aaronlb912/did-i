import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { cloud, cloudSetUp } from './cloud.js'

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
  try {
    if (Capacitor.isNativePlatform()) return Capacitor.getPlatform()
  } catch {
    // Fall through to the browser guess.
  }
  return 'web'
}

export function deviceLabel() {
  const platform = devicePlatform()
  if (platform === 'android') return 'Android app'
  if (platform === 'ios') return 'iPhone app'
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
  if (/iPhone|iPad/i.test(agent)) return 'Safari on iPhone'
  if (/Android/i.test(agent)) return 'Browser on Android'
  if (/Mac OS X/i.test(agent)) return 'Browser on Mac'
  if (/Windows/i.test(agent)) return 'Browser on Windows'
  return 'Browser'
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(value))
}

export async function sendCode(email) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.auth.signInWithOtp({
    email: cleanEmail(email),
    options: { shouldCreateUser: true },
  })
  return { miss: error ? error.message : '' }
}

export async function checkCode(email, code) {
  const db = cloud()
  if (!db) return { miss: 'off', user: null }
  const { data, error } = await db.auth.verifyOtp({
    email: cleanEmail(email),
    token: String(code || '').replace(/\D/g, ''),
    type: 'email',
  })
  return { miss: error ? error.message : '', user: data?.user || null }
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
    db.auth.getSession().then(({ data }) => {
      if (alive) setState({ ready: true, user: data?.session?.user || null })
    })
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
