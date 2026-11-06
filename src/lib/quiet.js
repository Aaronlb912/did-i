// Quiet hours with no imports, so the service worker (src/sw.js) can use it.

const MIN = 60 * 1000

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

// The time of day (HH:MM) a question time rings at when quiet hours move it,
// or '' when it rings as set.
export function quietMovedTo(hhmm, prefs) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(hhmm || ''))) return ''
  const at = new Date(2001, 0, 1, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3)), 0, 0)
  const to = quietEnd(at, prefs)
  if (to.getTime() === at.getTime()) return ''
  return `${String(to.getHours()).padStart(2, '0')}:${String(to.getMinutes()).padStart(2, '0')}`
}

// Quiet hours off: a Later that lands between midnight and 7:00 waits until
// 7:00, still inside yesterday's 9:00 close. Quiet hours on already move it.
export const LATER_HOLD_HOUR = 7
export function laterHold(at, prefs) {
  if (prefs?.quietOn) return quietEnd(at, prefs)
  if (at.getHours() >= LATER_HOLD_HOUR) return at
  return new Date(at.getFullYear(), at.getMonth(), at.getDate(), LATER_HOLD_HOUR, 0, 0, 0)
}

// A Later on the same minute as that question's own note, or a streak note:
// the Later is the one buzz. `data` is the Later's data, `at` its time in ms.
// Same night only: yesterday's Later at 7:00 never takes today's 7:00 reminder.
export function laterClash(note, data, at) {
  const when = note?.trigger?.date
  if (!(when instanceof Date) || Math.floor(when.getTime() / MIN) !== Math.floor(at / MIN)) return false
  const d = note.content?.data || {}
  if (d.streakRisk) return true
  if (d.night !== data?.night) return false
  if (data?.weId) return d.weId === data.weId
  return Boolean(data?.lampId) && !d.weId && d.lampId === data.lampId
}

// Three or more question reminders on one minute become one note opening
// Today. Their Did buttons go with them; one buzz beats a stack.
export const ASK_GROUP_MIN = 3
export function askGroups(notes, isAsk) {
  const at = new Map()
  for (const note of notes) {
    if (!isAsk(note)) continue
    const key = note.trigger.date.getTime()
    at.set(key, [...(at.get(key) || []), note])
  }
  return [...at.values()].filter((group) => group.length >= ASK_GROUP_MIN)
}

// The worker's check before a reminder: off in settings, or quiet hours now,
// means say nothing. No saved prefs (page never armed) keeps the old way.
export function swMayPing(prefs, now = new Date()) {
  if (!prefs) return true
  if (Array.isArray(prefs.pingsOff) && prefs.pingsOff.includes('reminders')) return false
  return quietEnd(now, prefs) === now
}

const LAST_CALL_HOUR = 21

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

// Fills the cap in that order. Notes before `soonUntil` (a time in ms) all
// come first, so a far day never pushes out today's last call. `over` says
// something was cut.
export function capNotes(notes, limit, soonUntil = 0) {
  const rank = (note) => (note.trigger.date < soonUntil ? -10 : 0) + capSpare(note)
  const sorted = [...notes].sort((a, b) => rank(a) - rank(b) || a.trigger.date - b.trigger.date)
  return { kept: sorted.slice(0, Math.max(0, limit)), over: sorted.length > limit }
}
