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
// Notification kinds a person can turn off. The first three are scheduled on
// the phone; the rest are pushes, and the server reads prefs.pingsOff too
// (push_wanted in supabase/push.sql), so keep the names in step.
export const PING_KINDS = ['reminders', 'streakRisk', 'streakHit', 'sends', 'we', 'cheers', 'friends', 'family', 'didi']

const QUIET_TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function blankPrefs() {
  return {
    theme: 'dark',
    locale: 'en',
    clock: 'phone',
    lessMotion: false,
    diagnosticsAsked: false,
    shareDiagnostics: false,
    matchWallpaper: false,
    widgetLookMode: 'tag',
    widgetLookId: 'lime',
    widgetOpenOnly: false,
    pingsOff: [],
    // Pushes say who, not what (push_private in supabase/did-we-guard.sql).
    pingsPrivate: false,
    // Quiet hours: no pushes or reminders from quietFrom to quietTo, in the
    // person's own time. The server reads these too (push_quiet in supabase/push.sql).
    quietOn: false,
    quietFrom: '22:00',
    quietTo: '07:00',
    // One push the morning a shop drop goes live. Off until asked for in the
    // shop; the server reads it (queue_drop_pushes in supabase/shop-drops.sql).
    dropPings: false,
    // Hour of the family summary push on the person's clock. The server reads
    // profiles.family_hour (supabase/family-summary.sql); this mirrors it.
    familyHour: 21,
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
  if (raw?.matchWallpaper === true) next.matchWallpaper = true
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
        'maple',
        'fig',
        'oat',
      ].includes(id)
    ) {
      next.widgetLookId = id
    }
  }
  if (raw?.widgetOpenOnly === true) next.widgetOpenOnly = true
  if (Array.isArray(raw?.pingsOff)) next.pingsOff = PING_KINDS.filter((kind) => raw.pingsOff.includes(kind))
  if (raw?.pingsPrivate === true) next.pingsPrivate = true
  if (raw?.quietOn === true) next.quietOn = true
  if (QUIET_TIME.test(raw?.quietFrom || '')) next.quietFrom = raw.quietFrom
  if (QUIET_TIME.test(raw?.quietTo || '')) next.quietTo = raw.quietTo
  if (raw?.dropPings === true) next.dropPings = true
  if (Number.isInteger(raw?.familyHour) && raw.familyHour >= 0 && raw.familyHour <= 23) next.familyHour = raw.familyHour
  // Synced with the account, so a reinstall does not show the dots legend again.
  if (raw?.jewelKeySeen === true) next.jewelKeySeen = true
  // The one-time "how to swipe" popup on Home (native/components/SwipeIntro.jsx).
  if (raw?.swipeIntroSeen === true) next.swipeIntroSeen = true
  // The first-open card swipe before sign-in (native/components/FirstSwipe.jsx).
  if (raw?.openingSeen === true) next.openingSeen = true
  // Swipes counted by older builds; a phone that reached 3 skips the popup. No longer written.
  if (Number.isInteger(raw?.swipesLearned) && raw.swipesLearned > 0) next.swipesLearned = Math.min(raw.swipesLearned, 3)
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

// English follows the device (US 12h, UK 24h). Other app languages use
// their own habit, so German shows 09:00, not "9:00 vorm."
function phoneUses24h(locale) {
  try {
    const tag = locale && locale !== 'en' ? [locale] : []
    const opts = new Intl.DateTimeFormat(tag, { hour: 'numeric' }).resolvedOptions()
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
    const { clock, locale } = readPrefs()
    clockCache = clock === '24' || (clock === 'phone' && phoneUses24h(locale))
  }
  return clockCache
}

export function pingOn(kind) {
  return !readPrefs().pingsOff.includes(kind)
}

function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// A reminder that would land in quiet hours moves to when they end.
export function afterQuiet(at, prefs = readPrefs()) {
  if (!prefs.quietOn) return at
  const from = minutesOf(prefs.quietFrom)
  const to = minutesOf(prefs.quietTo)
  if (from === to) return at
  const now = at.getHours() * 60 + at.getMinutes()
  const quiet = from < to ? now >= from && now < to : now >= from || now < to
  if (!quiet) return at
  const end = new Date(at.getFullYear(), at.getMonth(), at.getDate(), Math.floor(to / 60), to % 60, 0, 0)
  if (end.getTime() <= at.getTime()) end.setDate(end.getDate() + 1)
  return end
}

// Re-render prefs readers without saving, e.g. after a language file loads.
export function bumpPrefs() {
  const next = readPrefs()
  listeners.forEach((fn) => fn(next))
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
