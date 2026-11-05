// First run and the first nights: what to pick, when someone is still new,
// and the one-time moments after night one. Plain data in, plain data out.
import { blankLamp, didQuestion } from './board-json.js'
import { hangInto } from './board-ops.js'
import { hangStarter } from './starters.js'
import { addDaysIso, boardDate } from './recurrence.js'
import { accountSessionOn, readAccountUserId } from './session-id.js'
import { daysSinceFirstAnswer, daysSinceLastAnswer } from './come-back.js'

// Every pack question fits, so taking all packs never silently drops one.
export const FIRST_PICKS_MAX = 12
export const FIRST_TIME = '21:00'
// Coaching lines show until someone has answered on this many nights.
export const NEW_NIGHTS = 3

const NIGHT_ONE_KEY = 'did-i-night-one'
const FIRST_MISS_KEY = 'did-i-first-miss'
const SIGN_IN_NUDGE_KEY = 'did-i-sign-in-nudge'
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function nightOf(answer) {
  const key = String(answer?.periodKey || '')
  return DATE_KEY.test(key) ? key : ''
}

// Picks are keyed by question so a starter and a pack item with the same
// words count once. Past the cap, the tap does nothing.
export function togglePick(picks, item, max = FIRST_PICKS_MAX) {
  const list = picks || []
  if (!item?.question) return list
  if (list.some((pick) => pick.question === item.question)) {
    return list.filter((pick) => pick.question !== item.question)
  }
  if (list.length >= max) return list
  return [...list, item]
}

// How much of a pack is picked: 'all', 'some' or 'none'.
export function packState(picks, pack) {
  const items = pack?.items || []
  const on = items.filter((item) => (picks || []).some((pick) => pick.question === item.question)).length
  if (!on) return 'none'
  return on === items.length ? 'all' : 'some'
}

// A pack tap adds its questions, or takes them all off when every one is
// already picked. Other picks stay either way.
export function togglePack(picks, pack, max = FIRST_PICKS_MAX) {
  const list = picks || []
  const items = pack?.items || []
  if (packState(list, pack) === 'all') {
    return list.filter((pick) => !items.some((item) => item.question === pick.question))
  }
  let next = list
  for (const item of items) {
    if (!next.some((pick) => pick.question === item.question)) next = togglePick(next, item, max)
  }
  return next
}

// Adds the picks (and a typed question, if any) with one reminder time.
// Hands back the new book and the first question's id for the face.
export function firstRunBook(book, picks, own, askAfter, now = new Date()) {
  let next = book
  const ids = []
  // A pack item keeps its own time for the reminder. Typed questions and
  // items with none take the picked time.
  const times = new Map()
  for (const pick of picks || []) {
    const before = new Set((next.lamps || []).map((lamp) => lamp.id))
    next = hangStarter(next, pick, now, true)
    const added = (next.lamps || []).find((lamp) => !before.has(lamp.id))
    if (added) {
      ids.push(added.id)
      times.set(added.id, String(pick.askAfter || '').trim() || askAfter || '')
    }
  }
  const sameAsOwn = (lamp) => didQuestion(lamp.question).toLowerCase() === didQuestion(own?.question).toLowerCase()
  if (own?.question && !(next.lamps || []).some(sameAsOwn)) {
    const lamp = {
      ...blankLamp(now),
      question: own.question,
      short: own.short || own.question,
      cadence: 'daily',
      slot: 'whenever',
    }
    next = hangInto(next, lamp)
    ids.push(lamp.id)
    times.set(lamp.id, askAfter || '')
  }
  // Open now on the setup day; the time gate starts tomorrow (askFrom).
  const askFrom = addDaysIso(boardDate(now), 1)
  next = {
    ...next,
    lamps: (next.lamps || []).map((lamp) => (times.get(lamp.id) ? { ...lamp, askAfter: times.get(lamp.id), askFrom } : lamp)),
  }
  return { book: next, faceId: ids[0] || '' }
}

// Different nights with any answer, counting up to `stopAt`.
export function answeredNights(shelf, stopAt = NEW_NIGHTS) {
  const nights = new Set()
  for (const item of shelf || []) {
    for (const answer of item.answers || []) {
      const night = nightOf(answer)
      if (night) nights.add(night)
      if (nights.size >= stopAt) return nights.size
    }
  }
  return nights.size
}

// New people see coaching lines until they have answered on 3 nights.
export function isNewShelf(shelf) {
  return answeredNights(shelf, NEW_NIGHTS) < NEW_NIGHTS
}

// Tonight is cleared and no night before it has an answer.
export function isNightOne(shelf, dateIso) {
  if (!dateIso) return false
  let tonight = false
  for (const item of shelf || []) {
    for (const answer of item.answers || []) {
      const night = nightOf(answer)
      if (!night) continue
      if (night < dateIso) return false
      if (night === dateIso) tonight = true
    }
  }
  return tonight
}

// The day-one moment is stored with the day it showed, so it stays all that
// day (a remount keeps it) and never comes back on another. An old '1' means
// it showed on some earlier day.
export function nightOneDay() {
  try {
    return localStorage.getItem(NIGHT_ONE_KEY) || ''
  } catch {
    // No storage: treat as seen so nothing nags.
    return '1'
  }
}
export const nightOneSeen = () => nightOneDay() !== ''
export function markNightOneSeen(dateIso = '1') {
  try {
    localStorage.setItem(NIGHT_ONE_KEY, dateIso)
  } catch {
    // Shows again next time; harmless.
  }
}

// Week one, one missed day: a calm line on Today, that one day only, once ever.
// seenDay is the day it was first shown ('' for never).
export function showFirstMiss(shelf, dateIso, seenDay = '') {
  if (seenDay && seenDay !== dateIso) return false
  const since = daysSinceFirstAnswer(shelf, dateIso)
  return since >= 2 && since < 7 && daysSinceLastAnswer(shelf, dateIso) === 2
}
export function firstMissDay() {
  try {
    return localStorage.getItem(FIRST_MISS_KEY) || ''
  } catch {
    return '1'
  }
}
export function markFirstMissSeen(dateIso) {
  try {
    localStorage.setItem(FIRST_MISS_KEY, dateIso)
  } catch {
    // Shows again next time; harmless.
  }
}
// Later snoozes the sign-in card for a week, not for good: an account is what
// keeps the questions if the phone is lost. (An old '1' counts as long ago.)
const SIGN_IN_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
export function signInNudgeSeen(now = Date.now()) {
  try {
    const at = Number(localStorage.getItem(SIGN_IN_NUDGE_KEY))
    return at > 1 && now - at < SIGN_IN_SNOOZE_MS
  } catch {
    return true
  }
}
export function markSignInNudgeSeen(now = Date.now()) {
  try {
    localStorage.setItem(SIGN_IN_NUDGE_KEY, String(now))
  } catch {
    // Shows again next time; harmless.
  }
}

// The sign-in card: after a cleared night, not signed in, not dismissed.
export function showSignInNudge({ signedIn, cloud, nightDone, dismissed }) {
  return Boolean(cloud && nightDone && !signedIn && !dismissed)
}

// The widget tip: one sheet, once ever, after the first day every question is
// Did (all clear), or from day 2 on. Any show, or a widget already on the home screen, ends it.
const WIDGET_TIP_KEY = 'did-i-widget-tip'
export const WIDGET_TIP_MAX = 1
export const WIDGET_TIP_GAP_DAYS = 3

function dayNumber(iso) {
  return DATE_KEY.test(iso || '') ? Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000) : NaN
}

// Counts distinct days opened. The same day again changes nothing.
export function countWidgetTipDay(state, today) {
  const tip = state || {}
  if (!DATE_KEY.test(today || '') || tip.lastDay === today) return tip
  return { ...tip, days: (tip.days || 0) + 1, lastDay: today }
}

export function shouldShowWidgetTip({ state, today, hasQuestion, widgetPlaced, busy, allClear }) {
  const tip = state || {}
  // All clear, or from the second day opened: not every question has to be Did.
  if (tip.done || widgetPlaced || !hasQuestion || busy || (!allClear && (tip.days || 0) < 2)) return false
  return (tip.shown || 0) < WIDGET_TIP_MAX
}

export function readWidgetTip() {
  try {
    const raw = JSON.parse(localStorage.getItem(WIDGET_TIP_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    // No storage: count it as done so nothing nags.
    return { done: true }
  }
}

export function writeWidgetTip(state) {
  try {
    localStorage.setItem(WIDGET_TIP_KEY, JSON.stringify(state))
  } catch {
    // Shows again next time; harmless.
  }
}

// The morning ask card: offDay is a Not today, addedDay a day something was
// added from it. Either hides it for the rest of that day (an add only once
// Tonight is left, so more can be added right away).
const MORNING_KEY = 'did-i-morning-ask'
const MORNING_FOCUS_KEY = 'did-i-morning-focus'

export function shouldShowMorningAsk({ state, today, on, open, busy, addedHere }) {
  const day = state || {}
  if (!on || !open || busy || day.offDay === today) return false
  return day.addedDay !== today || Boolean(addedHere)
}

export function readMorningAsk() {
  try {
    const raw = JSON.parse(localStorage.getItem(MORNING_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export function writeMorningAsk(state) {
  try {
    localStorage.setItem(MORNING_KEY, JSON.stringify(state))
  } catch {
    // Shows again next time; harmless.
  }
}

// The 9:00 nudge asks Tonight to focus the card's field once.
export function askMorningFocus() {
  try {
    localStorage.setItem(MORNING_FOCUS_KEY, '1')
  } catch {
    // The card still shows; only the focus is lost.
  }
}

export function takeMorningFocus() {
  try {
    const on = localStorage.getItem(MORNING_FOCUS_KEY) === '1'
    if (on) localStorage.removeItem(MORNING_FOCUS_KEY)
    return on
  } catch {
    return false
  }
}

// The coach-mark tour (src/lib/tour-steps.js): per part 'new' (never shown),
// 'seen' (Not now or skipped) or 'done'. A part's coins are claimed once, on
// its first finish; <part>Claim stays 'pending' until the server pays.
// Kept per account (signed out has its own), so one account's progress or
// pending coins never carry to another.
export const tourWho = () => (accountSessionOn() ? readAccountUserId() : '')
const tourKey = (who) => `did-i-tour:${who || 'out'}`

// The signed-out tour moves to the first account that signs in here: its
// 'sign in for coins' claim is paid there, and the tour does not play again.
// Only fields the account has not set yet are taken.
function adoptOutTour(who) {
  const out = localStorage.getItem(tourKey(''))
  if (!who || !out) return
  const parsed = JSON.parse(out)
  const from = parsed && typeof parsed === 'object' ? parsed : {}
  const kept = JSON.parse(localStorage.getItem(tourKey(who)) || '{}')
  const next = { ...(kept && typeof kept === 'object' ? kept : {}) }
  for (const [k, v] of Object.entries(from)) if (next[k] === undefined || next[k] === 'new') next[k] = v
  localStorage.setItem(tourKey(who), JSON.stringify(next))
  // Signed out keeps its progress, so signing out does not replay the tour,
  // but its claims went to this account and never go to another.
  const rest = Object.fromEntries(Object.entries(from).filter(([k]) => !k.endsWith('Claim')))
  localStorage.setItem(tourKey(''), JSON.stringify(rest))
}

export function readTour(who = tourWho()) {
  try {
    adoptOutTour(who)
    const raw = JSON.parse(localStorage.getItem(tourKey(who)) || '{}')
    const tour = raw && typeof raw === 'object' ? raw : {}
    return { basics: 'new', more: 'new', ...tour }
  } catch {
    // No storage: count it as done so nothing nags.
    return { basics: 'done', more: 'done' }
  }
}

export function writeTour(patch, who = tourWho()) {
  try {
    localStorage.setItem(tourKey(who), JSON.stringify({ ...readTour(who), ...patch }))
  } catch {
    // Shows again next time; harmless.
  }
}
