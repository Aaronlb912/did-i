import { addDaysIso, isoDate, stampMs } from './recurrence.js'
import { readAccountUserId } from './session-id.js'
import { deviceZone, wallClock } from './zone.js'

// Flying west over the date line jumps the calendar: leave LA on the 14th,
// land in Tokyo on the 16th, and the 15th was never anyone's tonight. Such a
// night is kept on each folder (travelSkips). On it, a question with a Did
// counts as usual, a tapped Not yet is still a Not yet, and one left open (or
// closed by the app on its own) is stepped over like a night before the
// question existed. Only a change of zone can mark one; a clock set ahead or
// a DST change (same zone) never does.

// The last zone and night this phone saw, the nights it skipped, and when it
// last skipped one. Kept on the phone, not synced: two phones in two places
// must not read each other's zone as a trip. Its skips are folded into every
// folder on each close, so a folder that lost them (an older app's sync)
// gets them back.
const SEEN_KEY = 'did-i-zone-seen'
// At most one skip a week, so 60 is over a year: dropping the oldest never
// lands inside a streak anyone still has.
export const TRAVEL_SKIP_MAX = 60
const WEEK_MS = 7 * 24 * 3600000
// Only a west-bound date-line crossing: from a zone behind UTC to one at
// least this far ahead of it. LA to Tokyo is 16 hours, Hawaii to Auckland 23.
const JUMP_HOURS = 14

function nightIn(now, zone) {
  return isoDate(wallClock(now, zone))
}

function utcOffset(now, zone) {
  return (wallClock(now, zone) - wallClock(now, 'UTC')) / 3600000
}

export function capSkips(list) {
  const clean = (Array.isArray(list) ? list : []).map(String).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
  return [...new Set(clean)].sort().slice(-TRAVEL_SKIP_MAX)
}

// seen: { zone, night, skips, skipAt } from the last look; known: skips
// already on the shelf (any phone). Returns the next seen. One night is
// skipped when the zone moved from behind UTC to far ahead of it, the last
// night seen is the one just before the skipped night (days at home without
// opening the app stay real nights), and no skip in the last week, on this
// phone or on the shelf.
export function travelStep(seen, zone, now = new Date(), known = []) {
  const skips = capSkips(seen?.skips)
  const skipAt = Number(seen?.skipAt) || 0
  if (!zone) return { zone: seen?.zone || '', night: seen?.night || '', skips, skipAt }
  const night = nightIn(now, zone)
  const from = seen?.zone && seen.zone !== zone && seen.night ? seen.zone : ''
  if (!from) return { zone, night: seen?.zone === zone && seen.night > night ? seen.night : night, skips, skipAt }
  const lost = addDaysIso(night, -1)
  const westOverDateLine =
    utcOffset(now, from) < 0 && utcOffset(now, zone) > 0 && utcOffset(now, zone) - utcOffset(now, from) >= JUMP_HOURS
  const latest = capSkips([...skips, ...(known || [])]).pop()
  const rested = now.getTime() - skipAt >= WEEK_MS && !(latest && addDaysIso(latest, 7) >= lost)
  if (westOverDateLine && seen.night === addDaysIso(lost, -1) && rested) {
    return { zone, night, skips: capSkips([...skips, lost]), skipAt: now.getTime() }
  }
  return { zone, night, skips, skipAt }
}

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || 'null')
  } catch {
    return null
  }
}

// Notes the phone's zone and returns the travel-skipped nights it knows.
// The skips belong to the account signed in when they were made. Ones made
// signed out ('') go to the next account, as a signed-out shelf does; a
// different account on this phone starts with none.
export function noteZone(now = new Date(), zone = deviceZone(), owner = readAccountUserId(), known = []) {
  const stored = readSeen()
  const was = stored?.owner || ''
  const mine = !was || was === owner
  const seen = stored && !mine ? { ...stored, skips: [] } : stored
  const next = { ...travelStep(seen, zone, now, known), owner: owner || was }
  if (next.owner !== was || next.zone !== seen?.zone || next.night !== seen?.night || next.skipAt !== (Number(seen?.skipAt) || 0)) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next))
    } catch {
      // Detection waits for the next open.
    }
  }
  return next.skips
}

// Sign out: the skips go with the account; zone and night stay.
export function forgetTravelSkips() {
  const seen = readSeen()
  if (!seen) return
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ ...seen, skips: [], skipAt: 0, owner: '' }))
  } catch {
    // ok
  }
}

// The folder with the phone's skipped nights folded in. Same object when
// nothing is new, so memoized walks keep their cache.
export function withTravelSkips(book, skips) {
  if (!skips.length) return book
  const have = Array.isArray(book.travelSkips) ? book.travelSkips : []
  if (skips.every((day) => have.includes(day))) return book
  return { ...book, travelSkips: capSkips([...have, ...skips]) }
}

// One Set per list, so walks over many nights do not scan the list each time.
const skipSets = new WeakMap()
export function travelSkipped(book, iso) {
  const list = book?.travelSkips
  if (!list || !list.length) return false
  let set = skipSets.get(list)
  if (!set) {
    set = new Set(list)
    skipSets.set(list, set)
  }
  return set.has(iso)
}

// The app's own close stamps a Not yet at the start of a night (daily.js
// nightStart), local midnight on whichever phone did it: a quarter-hour mark
// no later than 12 hours after that date's UTC midnight. A one-time "by"
// question is stamped at the start of the day it was made, earlier still. A
// tap lands on a whole minute almost never, let alone a quarter hour.
export function autoClosed(answer, iso) {
  if (!answer || answer.status !== 'skip') return false
  const at = stampMs(answer.answeredAt)
  const day = Date.parse(`${iso}T00:00:00Z`)
  if (!at || !day || at % 900000 !== 0) return false
  return at <= day + 12 * 3600000
}

// A night's rows with the ones a travel skip steps over taken out.
export function travelRows(book, iso, rows) {
  return travelSkipped(book, iso) ? rows.filter((row) => travelNightState(row.answer, iso) !== 'none') : rows
}

// Did we on a skipped night: a done one counts like a Did, an open one is stepped over.
export function travelWe(skipped, we) {
  return skipped && !(we.due && we.clear) ? { due: 0, clear: true } : we
}

// How one question's answer reads on a travel-skipped night: 'did' counts
// as usual, 'nope' (a tapped Not yet) is still a Not yet, 'none' is stepped over.
export function travelNightState(answer, iso) {
  const status = answer?.status
  if (status === 'yes' || status === 'late') return 'did'
  if (status === 'skip' && !autoClosed(answer, iso)) return 'nope'
  return 'none'
}
