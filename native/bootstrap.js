import { MMKV } from 'react-native-mmkv'

// React Native already defines global.window (it aliases global), so this
// file augments what is there instead of replacing it. The shared code in
// src/lib talks to localStorage, window events, and CustomEvent; without
// these the cloud sync throws before it ever pushes the shelf back.

const store = new MMKV({ id: 'did-i' })

function kv(prefix) {
  return {
    getItem: (key) => store.getString(`${prefix}${key}`) ?? null,
    setItem: (key, value) => {
      store.set(`${prefix}${key}`, value)
    },
    removeItem: (key) => {
      store.delete(`${prefix}${key}`)
    },
    clear: () => {
      store.clearAll()
    },
  }
}

if (!global.localStorage) global.localStorage = kv('ls:')
if (!global.sessionStorage) global.sessionStorage = kv('ss:')

if (!global.window) global.window = global

const win = global.window

if (!win.location) win.location = { hash: '#/' }

if (typeof global.CustomEvent !== 'function') {
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
}

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
  fire(new global.CustomEvent(type, { detail }))
}
