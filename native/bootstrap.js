// React Native already defines global.window (it aliases global), so this
// file augments what is there instead of replacing it. The shared code in
// src/lib talks to localStorage, window events, and CustomEvent; without
// these the cloud sync throws before it ever pushes the shelf back.

import Constants from 'expo-constants'
import { AccessibilityInfo, Appearance, AppState, Platform } from 'react-native'
import { hookErrorReport } from '../src/lib/report.js'
import { devServerUrl, makeLocation } from './location-shim.js'

// Hermes has no document. Shared web code checks typeof document, but some
// paths still touch document.documentElement after the guard.
if (typeof global.document === 'undefined') {
  const root = { dataset: {}, lang: 'en' }
  global.document = {
    documentElement: root,
    body: {},
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => ({ click: () => {}, href: '', download: '' }),
    querySelector: () => null,
  }
}

const mem = new Map()
let store = null
let mmkvTried = false

function mmkvStore() {
  if (mmkvTried) return store
  mmkvTried = true
  try {
    const { createMMKV } = require('react-native-mmkv')
    store = createMMKV({ id: 'did-i' })
  } catch (error) {
    console.warn('mmkv unavailable', error?.message || error)
    store = null
  }
  return store
}

function storageBox() {
  return mmkvStore() || mem
}

globalThis.__didIPlatform = Platform.OS
globalThis.__didIAppearance = Appearance
globalThis.__didIExpoExtra = Constants.expoConfig?.extra || {}

globalThis.__didIOnVisible = (fn) => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') fn()
  })
  return () => sub.remove()
}

// Supabase's refresh timer stalls while the app is in the background. Stop it
// there and restart on return so the session renews right away.
// cloud.js is required lazily: it reads the Expo extra set above.
AppState.addEventListener('change', (state) => {
  const db = require('../src/lib/cloud.js').cloud()
  if (!db) return
  if (state === 'active') db.auth.startAutoRefresh()
  else db.auth.stopAutoRefresh()
})

function kv(prefix) {
  return {
    getItem: (key) => {
      const id = `${prefix}${key}`
      try {
        const box = storageBox()
        if (box.getString) return box.getString(id) ?? null
        return box.get(id) ?? null
      } catch {
        return mem.get(id) ?? null
      }
    },
    setItem: (key, value) => {
      const id = `${prefix}${key}`
      try {
        const box = storageBox()
        if (box.set) box.set(id, value)
        else mem.set(id, value)
      } catch {
        mem.set(id, value)
      }
    },
    removeItem: (key) => {
      const id = `${prefix}${key}`
      try {
        const box = storageBox()
        if (box.remove) box.remove(id)
        else mem.delete(id)
      } catch {
        mem.delete(id)
      }
    },
    clear: () => {
      try {
        const box = storageBox()
        if (box.clearAll) box.clearAll()
        else mem.clear()
      } catch {
        mem.clear()
      }
    },
  }
}

if (!global.localStorage) global.localStorage = kv('ls:')
// Nothing stored yet means a new install (native/invite-capture.js).
global.__didIFreshInstall =
  global.localStorage.getItem('did-i-shelf') == null && global.localStorage.getItem('did-i-prefs') == null
if (!global.sessionStorage) global.sessionStorage = kv('ss:')

if (!global.window) global.window = global

const win = global.window

if (!win.location) win.location = makeLocation(devServerUrl())

class NativeCustomEvent {
  constructor(type, options = {}) {
    this.type = String(type)
    this.detail = options.detail
    this.defaultPrevented = false
  }

  preventDefault() {
    this.defaultPrevented = true
  }
}
global.CustomEvent = NativeCustomEvent
win.CustomEvent = NativeCustomEvent

// A real bus. The old stub accepted only hashchange and threw every other
// listener away, so SHELF_IN from cloud sync never reached the shelf.
const listeners = new Map()

function addListener(type, fn) {
  if (typeof fn !== 'function') return
  const key = String(type)
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(fn)
}

function removeListener(type, fn) {
  listeners.get(String(type))?.delete(fn)
}

function fire(event) {
  const type = typeof event === 'string' ? event : event?.type
  if (!type) return true
  const payload = typeof event === 'string' ? { type } : event
  for (const fn of listeners.get(String(type)) || []) {
    try {
      fn(payload)
    } catch {
      // One bad listener must not stop the rest.
    }
  }
  return !payload?.defaultPrevented
}

win.addEventListener = addListener
win.removeEventListener = removeListener
win.dispatchEvent = fire

// The phone's Reduce Motion answers `prefers-reduced-motion`, so the shared
// useReduceMotion honours it next to the app's own Less motion setting.
// Every other query stays unmatched: colour scheme comes from Appearance.
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
let systemReduce = false
const reduceListeners = new Set()
function setSystemReduce(next) {
  const value = Boolean(next)
  if (value === systemReduce) return
  systemReduce = value
  reduceListeners.forEach((fn) => {
    try {
      fn({ matches: value, media: REDUCE_QUERY })
    } catch {
      // One bad listener must not stop the rest.
    }
  })
}
try {
  AccessibilityInfo.isReduceMotionEnabled?.().then(setSystemReduce, () => {})
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', setSystemReduce)
} catch {
  // No accessibility module (tests, a stripped binary): motion stays on.
}

function reduceMedia() {
  return {
    get matches() {
      return systemReduce
    },
    media: REDUCE_QUERY,
    addEventListener: (_type, fn) => reduceListeners.add(fn),
    removeEventListener: (_type, fn) => reduceListeners.delete(fn),
    addListener: (fn) => reduceListeners.add(fn),
    removeListener: (fn) => reduceListeners.delete(fn),
  }
}

if (typeof win.matchMedia !== 'function') {
  win.matchMedia = (query) =>
    String(query).replace(/\s+/g, ' ').trim() === REDUCE_QUERY
      ? reduceMedia()
      : {
          matches: false,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
        }
}

export function emitHashChange(hash) {
  win.location.hash = hash
  fire({ type: 'hashchange' })
}

export function emit(type, detail) {
  const event = new global.CustomEvent(type, { detail })
  if (event.detail == null) event.detail = detail
  fire(event)
}

win.__didIEmit = emit

hookErrorReport()
