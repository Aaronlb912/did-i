import { addDaysIso, isoDate } from './recurrence.js'
import { readAccountUserId } from './session-id.js'
import { deviceZone, wallClock } from './zone.js'

// Flying west over the date line jumps the calendar: leave LA on the 14th,
// land in Tokyo on the 16th, and the 15th was never anyone's tonight. Such a
// night is kept on each folder (travelSkips) and every walk steps over it like
// a night before the question existed. Only a change of zone can mark one;
// a clock set ahead or a DST change (same zone) never does.

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

// seen: { zone, night, skips, skipAt } from the last look. Returns the next.
// One night is skipped when the zone moved from behind UTC to far ahead of
// it, the last night seen is the one just before the skipped night (days at
// home without opening the app stay real nights), and no skip in a week.
export function travelStep(seen, zone, now = new Date()) {
  const skips = capSkips(seen?.skips)
  const skipAt = Number(seen?.skipAt) || 0
  if (!zone) return { zone: seen?.zone || '', night: seen?.night || '', skips, skipAt }
  const night = nightIn(now, zone)
  const from = seen?.zone && seen.zone !== zone && seen.night ? seen.zone : ''
  if (!from) return { zone, night: seen?.zone === zone && seen.night > night ? seen.night : night, skips, skipAt }
  const lost = addDaysIso(night, -1)
  const westOverDateLine =
    utcOffset(now, from) < 0 && utcOffset(now, zone) > 0 && utcOffset(now, zone) - utcOffset(now, from) >= JUMP_HOURS
  if (westOverDateLine && seen.night === addDaysIso(lost, -1) && now.getTime() - skipAt >= WEEK_MS) {
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
// The skips belong to the account signed in when they were made ('' signed
// out); another account on this phone starts with none.
export function noteZone(now = new Date(), zone = deviceZone(), owner = readAccountUserId()) {
  const stored = readSeen()
  const mine = (stored?.owner || '') === owner
  const seen = stored && !mine ? { ...stored, skips: [] } : stored
  const next = { ...travelStep(seen, zone, now), owner }
  if (!mine || next.zone !== seen?.zone || next.night !== seen?.night || next.skipAt !== (Number(seen?.skipAt) || 0)) {
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
    localStorage.setItem(SEEN_KEY, JSON.stringify({ ...seen, skips: [], owner: '' }))
  } catch {
    // ok
  }
}

// Nights this folder has any answer on (any phone): never skipped.
function answeredNights(book) {
  const out = new Set()
  for (const answer of book?.answers || []) out.add(String(answer?.periodKey || '').slice(0, 10))
  return out
}

// The skips that still hold for a folder: capped, none on an answered night.
export function folderSkips(book, list) {
  const clean = capSkips(list)
  if (!clean.length) return clean
  const answered = answeredNights(book)
  return clean.filter((day) => !answered.has(day))
}

// The folder with the phone's skipped nights folded in. Same object when
// nothing is new, so memoized walks keep their cache.
export function withTravelSkips(book, skips) {
  const have = Array.isArray(book.travelSkips) ? book.travelSkips : []
  const next = folderSkips(book, [...have, ...skips])
  if (next.length === have.length && next.every((day, i) => day === have[i])) return book
  return { ...book, travelSkips: next }
}

export function travelSkipped(book, iso) {
  const list = book?.travelSkips
  return Boolean(list && list.length && list.includes(iso))
}
