// React Native already defines global.window (it aliases global), so this
// file augments what is there instead of replacing it. The shared code in
// src/lib talks to localStorage, window events, and CustomEvent; without
// these the cloud sync throws before it ever pushes the shelf back.

import Constants from 'expo-constants'
import { Appearance, AppState, Platform } from 'react-native'
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

if (typeof win.matchMedia !== 'function') {
  win.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  })
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
