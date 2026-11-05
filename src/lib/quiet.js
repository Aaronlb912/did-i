// Quiet hours with no imports, so the service worker (src/sw.js) can use it.

function minutesOf(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return h * 60 + m
}

// Quiet hours that start and end together do nothing, so the end moves an hour on.
export function quietToFor(from, to) {
  if (from !== to || !/^\d\d:\d\d$/.test(from)) return to
  return `${String((Number(from.slice(0, 2)) + 1) % 24).padStart(2, '0')}:${from.slice(3)}`
}

// A reminder that would land in quiet hours moves to when they end.
export function quietEnd(at, prefs) {
  if (!prefs?.quietOn) return at
  const from = minutesOf(prefs.quietFrom)
  const to = minutesOf(prefs.quietTo)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return at
  const now = at.getHours() * 60 + at.getMinutes()
  const quiet = from < to ? now >= from && now < to : now >= from || now < to
  if (!quiet) return at
  const end = new Date(at.getFullYear(), at.getMonth(), at.getDate(), Math.floor(to / 60), to % 60, 0, 0)
  if (end.getTime() <= at.getTime()) end.setDate(end.getDate() + 1)
  return end
}

// The worker's check before a reminder: off in settings, or quiet hours now,
// means say nothing. No saved prefs (page never armed) keeps the old way.
export function swMayPing(prefs, now = new Date()) {
  if (!prefs) return true
  if (Array.isArray(prefs.pingsOff) && prefs.pingsOff.includes('reminders')) return false
  return quietEnd(now, prefs) === now
}

const LAST_CALL_HOUR = 21
const MIN = 60 * 1000

// When a high question still open gets its last call, or null for none.
// Usually 21:00. If quiet hours cover 21:00, 30 minutes before they start,
// but only past the question's own time plus 30 minutes. A question set for
// 21:00 or later gets it an hour after its time, if that is before quiet
// hours and still the same calendar day. `at` is the question's time or null.
export function lastCallAt(year, month, date, at, prefs, now) {
  const day = (h, m = 0) => new Date(year, month - 1, date, h, m, 0, 0)
  const clear = (when) => when.getTime() > now.getTime() && quietEnd(when, prefs).getTime() === when.getTime()
  if (at && at.getHours() >= LAST_CALL_HOUR) {
    const when = new Date(at.getTime() + 60 * MIN)
    return when.getDate() === date && clear(when) ? when : null
  }
  const nine = day(LAST_CALL_HOUR)
  if (at && nine.getTime() <= at.getTime()) return null
  if (quietEnd(nine, prefs).getTime() === nine.getTime()) return clear(nine) ? nine : null
  const from = minutesOf(prefs.quietFrom)
  if (from > LAST_CALL_HOUR * 60) return null
  const when = day(0, from - 30)
  if (at && when.getTime() <= at.getTime() + 30 * MIN) return null
  return clear(when) ? when : null
}

const HOUR = 60 * MIN
const FOLD = 0
const EARLY_HOURS = 3

// The end of the app day a time belongs to: the next fold hour after it.
function dayEnd(at, fold = FOLD) {
  const end = new Date(at.getFullYear(), at.getMonth(), at.getDate(), fold, 0, 0, 0)
  if (end.getTime() <= at.getTime()) end.setDate(end.getDate() + 1)
  return end
}

// Whole hours from `at` to the end of its day, rounded down.
export function hoursLeft(at, fold = FOLD) {
  return Math.floor((dayEnd(at, fold).getTime() - at.getTime()) / HOUR)
}

// The note text key and values for "{n} left". No hours count: the day stays open past midnight.
export function leftNote(n) {
  return { key: 'notif.stillOpenMany', vars: { n } }
}

// The earlier grouped note, 3 hours before the day folds. Quiet hours that
// cover it pull it to 30 minutes before they start, or drop it.
export function earlyCallAt(year, month, date, prefs, now, fold = FOLD) {
  const clear = (when) => when.getTime() > now.getTime() && quietEnd(when, prefs).getTime() === when.getTime()
  const end = new Date(year, month - 1, date + 1, fold, 0, 0, 0)
  const want = new Date(end.getTime() - EARLY_HOURS * HOUR)
  if (quietEnd(want, prefs).getTime() === want.getTime()) return clear(want) ? want : null
  const when = new Date(year, month - 1, date, 0, minutesOf(prefs.quietFrom) - 30, 0, 0)
  // A quiet range that starts after midnight would put the note at the start of the day.
  if (when.getTime() >= want.getTime() || when.getTime() < new Date(year, month - 1, date, fold, 0, 0, 0).getTime()) return null
  return clear(when) ? when : null
}

// Cap order, first kept first: question reminders (second times after the
// first ones), then day nudges, then
// last calls, then the earlier note. Each group goes soonest first.
export function capSpare(note) {
  if (note.earlyCall) return 3
  if (note.lateCall) return 2
  if (note.second) return 0.5
  return note.nudge ? 1 : 0
}

// Fills the cap in that order. `over` says something was cut.
export function capNotes(notes, limit) {
  const sorted = [...notes].sort((a, b) => capSpare(a) - capSpare(b) || a.trigger.date - b.trigger.date)
  return { kept: sorted.slice(0, Math.max(0, limit)), over: sorted.length > limit }
}
