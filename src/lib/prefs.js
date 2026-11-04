import { useEffect, useState } from 'react'
import { stampSavedAt } from './saved-at.js'
import { savePrefsForSw } from './board-store.js'
import { quietEnd, quietToFor } from './quiet.js'
import { boardDate } from './recurrence.js'

const KEY = 'did-i-prefs'
const THEMES = new Set(['dark', 'light', 'phone'])
const CLOCKS = new Set(['phone', '12', '24'])
const LOCALES = new Set(['en', 'es', 'fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko'])
const listeners = new Set()

export const THEME_IDS = ['dark', 'light', 'phone']
export const CLOCK_IDS = ['phone', '12', '24']
export const LOCALE_IDS = ['en', 'es', 'fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko']
// Notification kinds a person can turn off. The first four are scheduled on
// the phone; the rest are pushes, and the server reads prefs.pingsOff too
// (push_wanted in supabase/push.sql), so keep the names in step.
export const PING_KINDS = ['reminders', 'day', 'streakRisk', 'streakHit', 'sends', 'we', 'cheers', 'friends', 'family', 'didi']

const QUIET_TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function blankPrefs() {
  return {
    theme: 'dark',
    locale: 'en',
    clock: 'phone',
    lessMotion: false,
    // Gentle mode: streak numbers hidden from the person themself. Streaks are
    // still counted and stored, and friends and family see the same as before.
    gentle: false,
    // One free miss a week: the first missed day each week is kept like a freeze.
    freeMiss: false,
    // App days the free miss was on: [from, to|null]. Days outside a span never get one.
    freeMissSpans: [],
    diagnosticsAsked: false,
    shareDiagnostics: false,
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
    // How long Later on a reminder waits, in minutes (notify-answer.js LATER_MINUTES).
    laterMin: 60,
    // One push the morning a shop drop goes live. Off until asked for in the
    // shop; the server reads it (queue_drop_pushes in supabase/shop-drops.sql).
    dropPings: false,
    // Hour of the family summary push on the person's clock. The server reads
    // profiles.family_hour (supabase/family-summary.sql); this mirrors it.
    familyHour: 21,
    // The morning ask card on Tonight (morning-ask.js).
    morningAsk: true,
    // When its nudge comes (day-nudges.js MORNING_AT_TIMES, 5:00 to 11:30).
    morningAt: '08:00',
    // When the afternoon Not yet nudge comes (day-nudges.js AFTERNOON_AT_TIMES, 12:00 to 17:30).
    afternoonAt: '13:30',
    // Away mode: [from, until) day pairs, each up to AWAY_MAX days, newest 8.
    // Every question is paused on those days (recurrence.js isDueOn, inPause).
    away: [],
  }
}

export const AWAY_MAX = 14
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
function isoPlus(iso, days) {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + days))
  return d.toISOString().slice(0, 10)
}
// Ranges merge when they touch. A day counts only while the 59 days before
// it hold fewer than AWAY_MAX kept days, so one day at a time cannot hold a
// streak forever. Ranges end more than 400 days back are forgotten.
export const AWAY_WINDOW = 60
function cleanAway(list) {
  if (!Array.isArray(list)) return []
  const floor = isoPlus(new Date().toISOString().slice(0, 10), -400)
  const pairs = []
  for (const pair of list) {
    const [from, until] = Array.isArray(pair) ? pair : []
    if (!ISO_DAY.test(from || '') || !ISO_DAY.test(until || '') || until <= from || until < floor) continue
    const cap = isoPlus(from, AWAY_MAX)
    pairs.push([from, until > cap ? cap : until])
  }
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  const days = new Set()
  const out = []
  for (const [from, until] of pairs) {
    for (let day = from; day < until; day = isoPlus(day, 1)) {
      if (days.has(day)) continue
      let near = 0
      for (let back = 1; back < AWAY_WINDOW; back += 1) if (days.has(isoPlus(day, -back))) near += 1
      if (near >= AWAY_MAX) continue
      days.add(day)
      const last = out[out.length - 1]
      if (last && last[1] === day) last[1] = isoPlus(day, 1)
      else out.push([day, isoPlus(day, 1)])
    }
  }
  return out
}
// Cached for the night math, which asks per day: refreshed on read and write.
let awayCache = []
let awayText = ''
let awayLoaded = false
function holdAway(prefs) {
  awayLoaded = true
  awayCache = prefs.away || []
  awayText = JSON.stringify(awayCache)
}
// The headless widget task and a wake never read prefs first, so load on first use.
function loadAway() {
  if (awayLoaded) return
  awayLoaded = true
  readPrefs()
}
export function awayOn(iso) {
  loadAway()
  for (const [from, until] of awayCache) if (iso >= from && iso < until) return true
  return false
}
// Part of every memo key that walks days, so a change refreshes cached walks.
export function awayKey() {
  loadAway()
  return awayText
}
// The days of the picked stretch the 14-in-60 limit still allows (0 to 14).
export function awayLeft(prefs, startIso) {
  const have = new Set(awayDays(prefs.away))
  const after = awayDays(cleanAway([...(prefs.away || []), [startIso, isoPlus(startIso, AWAY_MAX)]]))
  return after.filter((day) => !have.has(day)).length
}
function awayDays(list) {
  return cleanAway(list).flatMap(([from, until]) => {
    const days = []
    for (let day = from; day < until; day = isoPlus(day, 1)) days.push(day)
    return days
  })
}
// The patch that goes away until the picked day (1 to 14 days out). It starts
// tomorrow when something was already answered today, so that answer stays.
// Past the 14-in-60 limit the end is cut short; no days left gives {}.
export function awayStart(prefs, todayIso, untilIso, answeredToday = false) {
  if (!ISO_DAY.test(untilIso || '') || untilIso <= todayIso || untilIso > isoPlus(todayIso, AWAY_MAX)) return {}
  const from = answeredToday ? isoPlus(todayIso, 1) : todayIso
  if (untilIso <= from) return {}
  const was = cleanAway(prefs.away)
  const away = cleanAway([...was, [from, untilIso]])
  return JSON.stringify(away) === JSON.stringify(was) ? {} : { away }
}
// Back now: today is asked again. Days already away stay skipped.
export function awayEnd(prefs, todayIso) {
  return { away: cleanAway(prefs.away).flatMap(([from, until]) => (until <= todayIso ? [[from, until]] : from < todayIso ? [[from, todayIso]] : [])) }
}
// The range running today or coming up, or null.
export function awayNow(prefs, todayIso) {
  return cleanAway(prefs.away).find(([, until]) => until > todayIso) || null
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

const MISS_SPANS_MAX = 20
function cleanMissSpans(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const pair of list) {
    const [from, to] = Array.isArray(pair) ? pair : []
    if (!ISO_DAY.test(from || '')) continue
    if (to !== null && (!ISO_DAY.test(to || '') || to <= from)) continue
    out.push([from, to])
  }
  out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return out.slice(-MISS_SPANS_MAX)
}

function cleanPrefs(raw) {
  const next = blankPrefs()
  if (THEMES.has(raw?.theme)) next.theme = raw.theme
  if (LOCALES.has(raw?.locale)) next.locale = raw.locale
  if (CLOCKS.has(raw?.clock)) next.clock = raw.clock
  if (raw?.lessMotion === true) next.lessMotion = true
  if (raw?.gentle === true) next.gentle = true
  if (raw?.freeMiss === true) next.freeMiss = true
  next.freeMissSpans = cleanMissSpans(raw?.freeMissSpans)
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
        'maple',
        'fig',
        'oat',
        'cranberry',
        'saffron',
        'pine',
        'iris',
        'lagoon',
        'cocoa',
        'emerald',
        'candy',
        'denim',
        'magenta',
        'copper',
        'lilac',
        'lemon',
        'peacock',
        'rosewood',
        'sunset',
        'twilight',
        'fog',
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
  next.quietTo = quietToFor(next.quietFrom, next.quietTo)
  if ([15, 30, 60].includes(raw?.laterMin)) next.laterMin = raw.laterMin
  if (raw?.dropPings === true) next.dropPings = true
  if (raw?.morningAsk === false) next.morningAsk = false
  if (/^(0[5-9]|1[01]):(00|30)$/.test(raw?.morningAt || '')) next.morningAt = raw.morningAt
  if (/^(1[2-7]):(00|30)$/.test(raw?.afternoonAt || '')) next.afternoonAt = raw.afternoonAt
  next.away = cleanAway(raw?.away)
  if (Number.isInteger(raw?.familyHour) && raw.familyHour >= 0 && raw.familyHour <= 23) next.familyHour = raw.familyHour
  // Synced with the account, so a reinstall does not show the dots legend again.
  if (raw?.jewelKeySeen === true) next.jewelKeySeen = true
  // The one-time "how to swipe" popup on Home (native/components/SwipeIntro.jsx).
  if (raw?.swipeIntroSeen === true) next.swipeIntroSeen = true
  // The first-open card swipe before sign-in (native/components/FirstSwipe.jsx).
  if (raw?.openingSeen === true) next.openingSeen = true
  // Swipes counted by older builds; a phone that reached 3 skips the popup. No longer written.
  if (Number.isInteger(raw?.swipesLearned) && raw.swipesLearned > 0) next.swipesLearned = Math.min(raw.swipesLearned, 3)
  // When each setting was last changed on a phone, so two phones merge key by key.
  if (raw?.at && typeof raw.at === 'object') {
    const at = {}
    for (const [key, when] of Object.entries(raw.at)) {
      if (/^[a-zA-Z]{1,30}$/.test(key) && typeof when === 'string' && when.length <= 30) at[key] = when
    }
    next.at = at
  }
  return next
}

// Two phones' settings, merged one setting at a time: the later change wins.
// A setting neither phone stamped (older builds) follows the newer shelf.
export function mergePrefs(local, remote, remoteNewer = false) {
  const mine = cleanPrefs(local)
  const theirs = cleanPrefs(remote)
  const out = { ...mine, at: { ...mine.at } }
  const keys = new Set([...Object.keys(mine), ...Object.keys(theirs)])
  keys.delete('at')
  for (const key of keys) {
    const ours = mine.at?.[key] || ''
    const other = theirs.at?.[key] || ''
    if (other > ours || (!other && !ours && remoteNewer)) {
      if (key in theirs) out[key] = theirs[key]
      else delete out[key]
      if (other) out.at[key] = other
    }
  }
  return cleanPrefs(out)
}

export function readPrefs() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const next = cleanPrefs({ ...blankPrefs(), locale: deviceLocale() })
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    }
    const clean = cleanPrefs(JSON.parse(raw))
    if (clean.freeMiss === true && !clean.freeMissSpans.length) {
      // Pin the start once, so the free miss does not move with today.
      const stamp = clean.at?.freeMiss
      const from = stamp && !Number.isNaN(new Date(stamp).getTime()) ? new Date(stamp) : new Date()
      clean.freeMissSpans = [[boardDate(from), null]]
      clean.at = { ...clean.at, freeMissSpans: stamp || new Date().toISOString() }
      localStorage.setItem(KEY, JSON.stringify(clean))
    }
    holdAway(clean)
    return clean
  } catch {
    return blankPrefs()
  }
}

export function writePrefs(patch, fromCloud = false) {
  const was = readPrefs()
  let merged = { ...was, ...patch }
  if (!fromCloud && patch && 'freeMiss' in patch && (patch.freeMiss === true) !== (was.freeMiss === true)) {
    const today = boardDate(new Date())
    const spans = cleanMissSpans(patch.freeMissSpans ?? was.freeMissSpans).map((s) => [...s])
    const open = spans[spans.length - 1]
    if (patch.freeMiss === true) {
      if (!open || open[1] !== null) spans.push([today, null])
    } else if (open && open[1] === null) {
      if (today > open[0]) open[1] = today
      else spans.pop()
    }
    merged = { ...merged, freeMissSpans: spans }
  }
  const next = cleanPrefs(merged)
  if (!fromCloud) {
    const now = new Date().toISOString()
    next.at = { ...next.at }
    for (const key of new Set([...Object.keys(patch || {}), 'freeMissSpans'])) {
      if (key !== 'at' && JSON.stringify(was[key]) !== JSON.stringify(next[key])) next.at[key] = now
    }
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  holdAway(next)
  savePrefsForSw(next)
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

export function gentleOn() {
  return readPrefs().gentle === true
}

export function pingOn(kind) {
  return !readPrefs().pingsOff.includes(kind)
}

// A reminder that would land in quiet hours moves to when they end.
export function afterQuiet(at, prefs = readPrefs()) {
  return quietEnd(at, prefs)
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
