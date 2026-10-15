import { addDaysIso, isoDate } from './recurrence.js'
import { deviceZone, wallClock } from './zone.js'

// Flying west over the date line jumps the calendar: leave LA on the 14th,
// land in Tokyo on the 16th, and the 15th was never anyone's tonight. Such a
// night is kept on each folder (travelSkips) and every walk steps over it like
// a night before the question existed. Only a change of zone can mark one;
// a clock set ahead or a DST change (same zone) never does.

// The last zone and night this phone saw. Kept on the phone, not synced: two
// phones in two places must not read each other's zone as a trip.
const SEEN_KEY = 'did-i-zone-seen'
export const TRAVEL_SKIP_MAX = 30
// Smaller jumps cannot lose a whole night.
const JUMP_HOURS = 12

function nightIn(now, zone) {
  return isoDate(wallClock(now, zone))
}

export function capSkips(list) {
  const clean = (Array.isArray(list) ? list : []).map(String).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
  return [...new Set(clean)].sort().slice(-TRAVEL_SKIP_MAX)
}

// seen: { zone, night, skips } from the last look. Returns the next one.
// Skipped: nights after the last one seen and before tonight in the new zone,
// and only when the new zone is at least half a day ahead.
export function travelStep(seen, zone, now = new Date()) {
  const skips = capSkips(seen?.skips)
  if (!zone) return { zone: seen?.zone || '', night: seen?.night || '', skips }
  const night = nightIn(now, zone)
  const from = seen?.zone && seen.zone !== zone && seen.night ? seen.zone : ''
  if (!from) return { zone, night: seen?.zone === zone && seen.night > night ? seen.night : night, skips }
  const ahead = (wallClock(now, zone) - wallClock(now, from)) / 3600000
  const added = []
  if (ahead >= JUMP_HOURS) {
    // A jump under a day loses at most the night before tonight; older
    // nights were lived in the old zone and close as usual.
    for (let back = ahead >= 24 ? 2 : 1; back >= 1; back -= 1) {
      const day = addDaysIso(night, -back)
      if (day > seen.night) added.push(day)
    }
  }
  return { zone, night, skips: added.length ? capSkips([...skips, ...added]) : skips }
}

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || 'null')
  } catch {
    return null
  }
}

// Notes the phone's zone and returns the travel-skipped nights it knows.
export function noteZone(now = new Date(), zone = deviceZone()) {
  const seen = readSeen()
  const next = travelStep(seen, zone, now)
  if (next.zone !== seen?.zone || next.night !== seen?.night || next.skips.length !== (seen?.skips || []).length) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next))
    } catch {
      // Detection waits for the next open.
    }
  }
  return next.skips
}

// The folder with the phone's skipped nights folded in. Same object when
// nothing is new, so memoized walks keep their cache.
export function withTravelSkips(book, skips) {
  if (!skips.length) return book
  const have = Array.isArray(book.travelSkips) ? book.travelSkips : []
  if (skips.every((day) => have.includes(day))) return book
  return { ...book, travelSkips: capSkips([...have, ...skips]) }
}

export function travelSkipped(book, iso) {
  const list = book?.travelSkips
  return Boolean(list && list.length && list.includes(iso))
}
