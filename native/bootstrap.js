// React Native already defines global.window (it aliases global), so this
// file augments what is there instead of replacing it. The shared code in
// src/lib talks to localStorage, window events, and CustomEvent; without
// these the cloud sync throws before it ever pushes the shelf back.

import Constants from 'expo-constants'
import { AccessibilityInfo, Appearance, AppState, Platform } from 'react-native'
import { hookErrorReport } from '../src/lib/report.js'
import { devServerUrl, makeLocation } from './location-shim.js'
import { phoneMatchMedia } from './lib/reduce-media.js'

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
// Session storage lasts one launch, like a browser tab, so the app PIN asks
// again after the app is closed.
function memoryKv() {
  const mem = new Map()
  return {
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => mem.set(key, String(value)),
    removeItem: (key) => mem.delete(key),
    clear: () => mem.clear(),
  }
}
if (!global.sessionStorage) global.sessionStorage = memoryKv()

// One id per phone that survives a reinstall (and the Dev app), so Account
// does not list the same phone again and again. Hashed: the phone's own id
// never leaves it.
function hashId(text) {
  let a = 0x811c9dc5
  let b = 0x01000193
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193) >>> 0
    b = Math.imul(b ^ c, 0x811c9dc5) >>> 0
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')
}
try {
  const app = require('expo-application')
  if (Platform.OS === 'android' && typeof app.getAndroidId === 'function') {
    const id = app.getAndroidId()
    if (typeof id === 'string' && id.length > 4) globalThis.__didIStableDeviceId = `a-${hashId(String(id))}`
  } else if (Platform.OS === 'ios' && typeof app.getIosIdForVendorAsync === 'function') {
    Promise.resolve(app.getIosIdForVendorAsync())
      .then((id) => {
        if (typeof id === 'string' && id.length > 4) globalThis.__didIStableDeviceId = `i-${hashId(String(id).toLowerCase())}`
      })
      .catch(() => {})
  }
} catch {
  // Keeps the saved random key, as before.
}

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

if (typeof win.matchMedia !== 'function') win.matchMedia = phoneMatchMedia(AccessibilityInfo)

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
