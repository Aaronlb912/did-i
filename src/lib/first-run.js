// First run and the first nights: what to pick, when someone is still new,
// and the one-time moments after night one. Plain data in, plain data out.
import { blankLamp } from './board-json.js'
import { hangInto } from './board-ops.js'
import { hangStarter } from './starters.js'

export const FIRST_PICKS_MAX = 3
export const FIRST_TIME = '21:00'
// Coaching lines show until someone has answered on this many nights.
export const NEW_NIGHTS = 3

const NIGHT_ONE_KEY = 'did-i-night-one'
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

// A pack fills the picks with its questions, up to the cap.
export function pickPack(pack, max = FIRST_PICKS_MAX) {
  return (pack?.items || []).slice(0, max)
}

// Adds the picks (and a typed question, if any) with one reminder time.
// Hands back the new book and the first question's id for the face.
export function firstRunBook(book, picks, own, askAfter, now = new Date()) {
  let next = book
  const ids = []
  for (const pick of picks || []) {
    const before = new Set((next.lamps || []).map((lamp) => lamp.id))
    next = hangStarter(next, pick, now, true)
    const added = (next.lamps || []).find((lamp) => !before.has(lamp.id))
    if (added) ids.push(added.id)
  }
  if (own?.question) {
    const lamp = {
      ...blankLamp(now),
      question: own.question,
      short: own.short || own.question,
      cadence: 'daily',
      slot: 'whenever',
    }
    next = hangInto(next, lamp)
    ids.push(lamp.id)
  }
  if (askAfter) {
    const set = new Set(ids)
    next = { ...next, lamps: (next.lamps || []).map((lamp) => (set.has(lamp.id) ? { ...lamp, askAfter } : lamp)) }
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

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    // No storage: treat as seen so nothing nags.
    return true
  }
}

function writeFlag(key) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Shows again next time; harmless.
  }
}

export const nightOneSeen = () => readFlag(NIGHT_ONE_KEY)
export const markNightOneSeen = () => writeFlag(NIGHT_ONE_KEY)
export const signInNudgeSeen = () => readFlag(SIGN_IN_NUDGE_KEY)
export const markSignInNudgeSeen = () => writeFlag(SIGN_IN_NUDGE_KEY)

// The sign-in card: after a cleared night, not signed in, not dismissed.
export function showSignInNudge({ signedIn, cloud, nightDone, dismissed }) {
  return Boolean(cloud && nightDone && !signedIn && !dismissed)
}
