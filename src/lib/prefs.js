import { useEffect, useState } from 'react'
import { stampSavedAt } from './saved-at.js'

const KEY = 'did-i-prefs'
const THEMES = new Set(['dark', 'light', 'phone'])
const CLOCKS = new Set(['phone', '12', '24'])
const LOCALES = new Set(['en', 'es', 'fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko'])
const listeners = new Set()

export const THEME_IDS = ['dark', 'light', 'phone']
export const CLOCK_IDS = ['phone', '12', '24']
export const LOCALE_IDS = ['en', 'es', 'fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko']

function blankPrefs() {
  return {
    theme: 'dark',
    locale: 'en',
    clock: 'phone',
    lessMotion: false,
    diagnosticsAsked: false,
    shareDiagnostics: false,
    widgetLookMode: 'tag',
    widgetLookId: 'lime',
    widgetOpenOnly: false,
  }
}

export function deviceLocale() {
  try {
    const raw =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : typeof navigator !== 'undefined'
          ? navigator.language
          : 'en'
    const code = String(raw || 'en').split('-')[0].toLowerCase()
    return LOCALES.has(code) ? code : 'en'
  } catch {
    return 'en'
  }
}

function cleanPrefs(raw) {
  const next = blankPrefs()
  if (THEMES.has(raw?.theme)) next.theme = raw.theme
  if (LOCALES.has(raw?.locale)) next.locale = raw.locale
  if (CLOCKS.has(raw?.clock)) next.clock = raw.clock
  if (raw?.lessMotion === true) next.lessMotion = true
  if (raw?.diagnosticsAsked === true) next.diagnosticsAsked = true
  if (raw?.shareDiagnostics === true) next.shareDiagnostics = true
  if (raw?.widgetLookMode === 'pick') next.widgetLookMode = 'pick'
  if (typeof raw?.widgetLookId === 'string') {
    const id = raw.widgetLookId.trim()
    if (
      [
        'lime',
        'ink',
        'brass',
        'night',
        'moss',
        'plum',
        'rose',
        'steel',
        'wine',
        'glow',
        'ember',
        'frost',
        'pulse',
        'jade',
        'indigo',
        'clay',
        'sky',
        'orchid',
        'chalk',
      ].includes(id)
    ) {
      next.widgetLookId = id
    }
  }
  if (raw?.widgetOpenOnly === true) next.widgetOpenOnly = true
  return next
}

export function readPrefs() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const next = cleanPrefs({ ...blankPrefs(), locale: deviceLocale() })
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    }
    return cleanPrefs(JSON.parse(raw))
  } catch {
    return blankPrefs()
  }
}

export function writePrefs(patch, fromCloud = false) {
  const next = cleanPrefs({ ...readPrefs(), ...patch })
  localStorage.setItem(KEY, JSON.stringify(next))
  if (!fromCloud) stampSavedAt()
  clockCache = null
  listeners.forEach((fn) => fn(next))
  applyPrefsToDocument(next)
  return next
}

function phoneUses24h() {
  try {
    const opts = new Intl.DateTimeFormat([], { hour: 'numeric' }).resolvedOptions()
    if (opts.hourCycle) return opts.hourCycle === 'h23' || opts.hourCycle === 'h24'
    return opts.hour12 === false
  } catch {
    return false
  }
}

let clockCache = null

// 12 or 24 hour, from the clock setting. "Phone" follows the device.
export function uses24h() {
  if (clockCache == null) {
    const clock = readPrefs().clock
    clockCache = clock === '24' || (clock === 'phone' && phoneUses24h())
  }
  return clockCache
}

export function onPrefs(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function isReactNative() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
}

export function resolveTheme(theme) {
  if (theme === 'phone') {
    if (isReactNative()) {
      const scheme = globalThis.__didIAppearance?.getColorScheme?.()
      return scheme === 'light' ? 'light' : 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme === 'light' ? 'light' : 'dark'
}

export function applyPrefsToDocument(prefs) {
  const next = prefs || readPrefs()
  if (typeof document === 'undefined') return
  document.documentElement.lang = next.locale
  document.documentElement.dataset.theme = resolveTheme(next.theme)
  const reduce =
    next.lessMotion ||
    (typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  if (reduce) document.documentElement.dataset.reduceMotion = ''
  else delete document.documentElement.dataset.reduceMotion
}

export function usePrefs() {
  const [prefs, setPrefs] = useState(readPrefs)
  useEffect(() => onPrefs(setPrefs), [])
  return prefs
}

export function useTheme() {
  const prefs = usePrefs()
  const [theme, setTheme] = useState(() => resolveTheme(prefs.theme))

  useEffect(() => {
    function sync() {
      const next = resolveTheme(prefs.theme)
      setTheme(next)
      if (typeof document !== 'undefined') document.documentElement.dataset.theme = next
    }
    sync()
    const appearance = globalThis.__didIAppearance
    if (appearance?.addChangeListener) {
      const sub = appearance.addChangeListener(sync)
      return () => sub.remove()
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: light)')
      media.addEventListener('change', sync)
      return () => media.removeEventListener('change', sync)
    }
    return undefined
  }, [prefs.theme])

  return theme
}
