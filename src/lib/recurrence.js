import { mustSwipeDeadline } from './lamp-deadline.js'
import { DAY_FOLD, GRACE_END, GRACE_FIRST_UNTIL, wallClock } from './zone.js'
import { awayOn, readPrefs } from './prefs.js'
import { travelSkipped } from './travel.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

export function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Answer times: new ones are UTC ("...Z"), old ones are zoneless local
// wall clock. Date.parse reads both right, so compare and bucket by these,
// never by the raw string.
export function stampMs(value) {
  const raw = String(value || '')
  if (!/^\d{4}-\d\d-\d\dT/.test(raw)) return 0
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? 0 : ms
}

// The phone's local day an answer time falls on.
export function stampDay(value) {
  const ms = stampMs(value)
  return ms ? isoDate(new Date(ms)) : String(value || '').slice(0, 10)
}

export function parseIsoDate(value) {
  const raw = String(value == null ? '' : value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

// The fold hour used to be a setting. It is not one any more: the night
// ends at midnight in the person's timezone. Callers still pass their old
// value and it is ignored on purpose.
export function boardDate(now = new Date()) {
  const local = wallClock(now)
  if (local.getHours() < DAY_FOLD) {
    local.setDate(local.getDate() - 1)
  }
  return isoDate(new Date(local.getFullYear(), local.getMonth(), local.getDate()))
}

// Last night, while its grace period runs (midnight to 9am); '' otherwise.
export function graceNightIso(now = new Date()) {
  if (wallClock(now).getHours() >= GRACE_END) return ''
  return addDaysIso(boardDate(now), -1)
}

// A tap on the streak note (or on yesterday's reminder) during grace puts last
// night's cards first on Today, the same as before 5am. It holds until yesterday
// is answered, grace ends or the app goes to the background. Only Today reads it:
// voice answers and the widget keep the clock rule.
let graceFocusNight = ''
let graceFocusLampId = ''
const graceFocusWatchers = new Set()
export function askGraceFocus(now = new Date(), lampId = '') {
  graceFocusNight = graceNightIso(now)
  graceFocusLampId = lampId ? String(lampId) : ''
  graceFocusWatchers.forEach((fn) => fn())
}
export function clearGraceFocus() {
  graceFocusNight = ''
  graceFocusLampId = ''
}
// The question whose reminder was tapped, shown first among yesterday's.
export function graceFocusLamp(now = new Date()) {
  return graceFocused(now) ? graceFocusLampId : ''
}
export function graceFocused(now = new Date()) {
  const night = graceNightIso(now)
  return Boolean(night) && night === graceFocusNight
}
export function onGraceFocus(fn) {
  graceFocusWatchers.add(fn)
  return () => graceFocusWatchers.delete(fn)
}

// Before 5am last night's open questions come first.
export function graceFirst(now = new Date()) {
  return Boolean(graceNightIso(now)) && wallClock(now).getHours() < GRACE_FIRST_UNTIL
}

// The oldest night that can still be answered: last night during its grace
// period, tonight otherwise.
export function openFloorIso(now = new Date()) {
  return graceNightIso(now) || boardDate(now)
}

// A night can still take answers: tonight, or last night in its grace period.
export function nightOpen(dateIso, now = new Date()) {
  return Boolean(dateIso) && dateIso >= openFloorIso(now)
}

// The word for an answer: a skip reads "Not yet" while its night is open and
// "Nope" once it closed. A closed night with no answer reads "Nope" too.
// Returns 'notYet', 'nope', the status itself, or '' (open, not answered).
export function answerWord(status, isOpen) {
  if (status === 'skip') return isOpen ? 'notYet' : 'nope'
  if (!status) return isOpen ? '' : 'nope'
  return status
}

export function addDaysIso(iso, days) {
  const date = parseIsoDate(iso)
  if (!date) return ''
  date.setDate(date.getDate() + days)
  return isoDate(date)
}

export function daysBetween(fromIso, toIso) {
  const from = parseIsoDate(fromIso)
  const to = parseIsoDate(toIso)
  if (!from || !to) return null
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

export function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function periodKeyFor(lamp, dateIso) {
  const date = parseIsoDate(dateIso)
  if (!date) return ''
  lamp = scheduleAt(lamp, dateIso)
  if (lamp.cadence === 'monthly') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
  }
  if (lamp.cadence === 'once') return `once:${lamp.id}`
  return dateIso
}

// Once the night turns, its answers are final. Unanswered ones close as nope
// (closePastNights) and nothing can mark them later.
export function periodPassed(lamp, periodKey, todayIso) {
  if (!lamp || !periodKey || !todayIso) return false
  if (lamp.cadence === 'once') {
    const day = String((lamp.onceWhen === 'by' ? lamp.dueBy : lamp.onceOn) || lamp.createdOn || '').trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && day < todayIso
  }
  // By the key's shape, not today's schedule: a day kept from before a switch
  // to monthly is still a day, and this month's key is still open.
  if (periodKey.length === 7) return periodKey < todayIso.slice(0, 7)
  return periodKey < todayIso
}

// A repeating question keeps the schedules it had before an edit (was), so
// changing Mondays to daily does not make every past day a miss.
// was is oldest first; until is the first day of the next schedule.
export const WAS_KEEP = 4
// Over the cap, keep the oldest schedule (it covers the longest stretch of
// past days) and the newest ones. The dropped middle stretch reads as every so
// often, so none of its days turn into misses under a later schedule.
export function trimWas(was) {
  if (was.length <= WAS_KEEP) return was
  const gap = { until: was[was.length - WAS_KEEP + 1].until }
  for (const key of WAS_FIELDS) gap[key] = ''
  gap.cadence = 'every'
  return [was[0], gap, ...was.slice(-(WAS_KEEP - 2))]
}
const WAS_CADENCES = new Set(['daily', 'weekly', 'monthly', 'every_n'])
const WAS_FIELDS = ['cadence', 'weekdays', 'monthDay', 'everyN', 'everyNAnchor', 'perWeek']

export function scheduleAt(lamp, dateIso) {
  const was = lamp?.was
  if (!was || !was.length || !(dateIso < was[was.length - 1].until)) return lamp
  for (const old of was) if (dateIso < old.until) return { ...lamp, ...old, was: null }
  return lamp
}

// The was list for an edit made today: old's schedule holds until today.
export function keepPastSchedule(old, next, todayIso, answeredToday = false) {
  const was = Array.isArray(old?.was) ? old.was : []
  // Every so often and once keep the history: an edit back must not lose it.
  if (!WAS_CADENCES.has(next.cadence) && !was.length && !WAS_CADENCES.has(old?.cadence)) return []
  // Every so often has no missed days: before the edit, past days stay not due.
  // A one-time question made repeating is the same: no past day became a miss.
  if (!old || !(WAS_CADENCES.has(old.cadence) || old.cadence === 'every' || old.cadence === 'once')) return was
  if (!old.createdOn || old.createdOn >= todayIso) return was
  if (WAS_FIELDS.every((key) => JSON.stringify(old[key] ?? '') === JSON.stringify(next[key] ?? ''))) return was
  // Edited twice today: the first edit's old schedule is the one past days had.
  if (was.length && was[was.length - 1].until >= todayIso) return was
  // Daily to monthly (or back) changes today's key from the day to the month,
  // so today's answer would be left behind. Today keeps the old schedule.
  // So does today's answer when the new days leave today out.
  const reshaped = (old.cadence === 'monthly') !== (next.cadence === 'monthly') || (answeredToday && !isDueOn({ ...next, was: null, archived: false }, todayIso))
  const entry = { until: reshaped && isDueOn({ ...old, archived: false }, todayIso) ? addDaysIso(todayIso, 1) : todayIso }
  for (const key of WAS_FIELDS) entry[key] = old[key] ?? ''
  if (old.cadence === 'once') entry.cadence = 'every'
  return trimWas([...was, entry])
}

// A day inside a pause since resumed ([from, until) pairs on lamp.pauses).
export function inPause(lamp, iso) {
  return Boolean(lamp?.pauses?.some(([from, until]) => iso >= from && iso < until)) || awayOn(iso)
}

export function isDueOn(lamp, dateIso) {
  if (!lamp || lamp.archived) return false
  const date = parseIsoDate(dateIso)
  if (!date) return false
  if (awayOn(dateIso)) return false
  if (lamp.endsOn && dateIso > lamp.endsOn) return false
  if (lamp.was) lamp = scheduleAt(lamp, dateIso)
  // Times a week: isDueOn stays false, like every so often. dueTonight asks
  // perWeekDueOn, which needs the book.
  if (isPerWeek(lamp)) return false
  switch (lamp.cadence) {
    case 'daily':
      return true
    case 'weekly': {
      const days = Array.isArray(lamp.weekdays) ? lamp.weekdays : []
      return days.includes(date.getDay())
    }
    case 'monthly': {
      const last = lastDayOfMonth(date.getFullYear(), date.getMonth())
      let day = lamp.monthDay === 'last' ? last : Number(lamp.monthDay)
      if (!Number.isFinite(day) || day < 1) return false
      if (day > last) day = last
      return date.getDate() === day
    }
    case 'once': {
      if (lamp.onceWhen === 'by') {
        const dueBy = String(lamp.dueBy || '').trim()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueBy)) return true
        const start = String(lamp.createdOn || '').trim()
        if (start && dateIso < start) return false
        return dateIso <= dueBy
      }
      const on = String(lamp.onceOn || '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(on)) return on === dateIso
      return true
    }
    case 'every_n': {
      const n = Number(lamp.everyN)
      if (!Number.isInteger(n) || n < 2) return false
      if (!parseIsoDate(lamp.everyNAnchor)) return false
      const diff = daysBetween(lamp.everyNAnchor, dateIso)
      if (diff == null || diff < 0) return false
      return diff % n === 0
    }
    default:
      return false
  }
}

function isOnceClosed(book, lampId) {
  return (book.answers || []).some(
    (answer) =>
      answer.lampId === lampId &&
      (answer.status === 'yes' || answer.status === 'skip' || answer.status === 'late'),
  )
}

// Looking an answer up used to walk the whole list, and the streak walk
// does that thousands of times for one screen. The index hangs off the
// answers array itself, so editing a book throws it away on its own.
const byLampAndNight = new WeakMap()

function answerIndex(rows) {
  let found = byLampAndNight.get(rows)
  if (!found) {
    found = new Map()
    for (const answer of rows) {
      const key = `${answer.lampId}\u0000${answer.periodKey}`
      if (!found.has(key)) found.set(key, answer)
    }
    byLampAndNight.set(rows, found)
  }
  return found
}

export function answerFor(book, lampId, periodKey) {
  const rows = book?.answers
  if (!rows || !rows.length) return undefined
  return answerIndex(rows).get(`${lampId}\u0000${periodKey}`)
}

// "Every so often" questions (cadence 'every'): no fixed nights. One comes
// up once everyDays (or the gap learned from its last few Dids) has passed
// since the last Did, or right away if it was never done. isDueOn stays
// false for them, so streak, catch-up and calendar walks leave them out.
export const EVERY_PICKS = [7, 14, 30]

export function isEvery(lamp) {
  return lamp?.cadence === 'every'
}

// Each question's Did nights, oldest first. Hangs off the answers array like
// answerIndex, so an edit drops it on its own.
const didNightsMemo = new WeakMap()

function didNightsOf(book, lampId) {
  const rows = book?.answers
  if (!rows || !rows.length) return []
  let byLamp = didNightsMemo.get(rows)
  if (!byLamp) {
    byLamp = new Map()
    for (const answer of rows) {
      if (answer.status !== 'yes' && answer.status !== 'late') continue
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(answer.periodKey || ''))) continue
      let list = byLamp.get(answer.lampId)
      if (!list) byLamp.set(answer.lampId, (list = []))
      list.push(answer.periodKey)
    }
    for (const list of byLamp.values()) list.sort()
    didNightsMemo.set(rows, byLamp)
  }
  return byLamp.get(lampId) || []
}

// How many Did nights fall before dateIso (strictly, or on it with `upTo`).
function didCountBefore(list, dateIso, upTo = false) {
  let lo = 0
  let hi = list.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (upTo ? list[mid] <= dateIso : list[mid] < dateIso) lo = mid + 1
    else hi = mid
  }
  return lo
}

// The newest Did night before dateIso ('' if none). upTo includes dateIso.
export function lastDidNight(book, lampId, dateIso, upTo = false) {
  const list = didNightsOf(book, lampId)
  const count = didCountBefore(list, dateIso, upTo)
  return count ? list[count - 1] : ''
}

// The usual gap, learned from the last few Dids before dateIso: the median of
// up to 5 gaps, once there are at least 3. 0 until then.
const LEARN_GAPS = 5
export function learnedGap(book, lampId, dateIso, upTo = false) {
  const list = didNightsOf(book, lampId)
  const count = didCountBefore(list, dateIso, upTo)
  if (count < 4) return 0
  const from = Math.max(0, count - LEARN_GAPS - 1)
  const gaps = []
  for (let i = from + 1; i < count; i += 1) gaps.push(daysBetween(list[i - 1], list[i]))
  gaps.sort((a, b) => a - b)
  const mid = gaps.length >> 1
  const median = gaps.length % 2 ? gaps[mid] : Math.round((gaps[mid - 1] + gaps[mid]) / 2)
  return median >= 1 ? median : 0
}

// The learned gap may lengthen the picked one, never shorten it.
export function everyGap(book, lamp, dateIso) {
  const days = Number(lamp?.everyDays)
  const picked = Number.isInteger(days) && days >= 1 ? days : 0
  const learned = learnedGap(book, lamp?.id, dateIso)
  return learned ? Math.max(learned, picked) : picked || 7
}

// Times a week (daily cadence with perWeek 1-6): asked each day of the week
// (Monday first) until it has that many Dids, then not till next week.
export function isPerWeek(lamp) {
  const n = Number(lamp?.perWeek)
  return lamp?.cadence === 'daily' && Number.isInteger(n) && n >= 1 && n <= 6
}

export function weekStartOf(dateIso) {
  const date = parseIsoDate(dateIso)
  return date ? addDaysIso(dateIso, -((date.getDay() + 6) % 7)) : ''
}

// Dids in the week holding dateIso, up to dateIso (before it with upTo false).
export function perWeekDone(book, lampId, dateIso, upTo = true) {
  const start = weekStartOf(dateIso)
  if (!start) return 0
  const list = didNightsOf(book, lampId)
  return didCountBefore(list, dateIso, upTo) - didCountBefore(list, start)
}

export function perWeekDueOn(book, lamp, dateIso) {
  if (lamp?.was) lamp = scheduleAt(lamp, dateIso)
  if (!isPerWeek(lamp) || lamp.archived || awayOn(dateIso)) return false
  const created = String(lamp.createdOn || '').slice(0, 10)
  if (created && dateIso < created) return false
  return perWeekDone(book, lamp.id, dateIso, false) < Number(lamp.perWeek)
}

// A day the question was not asked: paused, Away, or skipped for travel.
function closedDay(book, lamp, iso) {
  return inPause(lamp, iso) || travelSkipped(book, iso)
}

// Dids a week needs: the full count, less for the days it was not asked.
// 0 when the whole week was closed (it counts neither way).
function weekNeed(book, lamp, start) {
  let open = 0
  for (let i = 0; i < 7; i += 1) if (!closedDay(book, lamp, addDaysIso(start, i))) open += 1
  if (!open) return 0
  return Math.max(1, Math.ceil((Number(lamp.perWeek) * open) / 7))
}

// One past week judged by the schedule it ran under (the newer one when a
// change split it). A times-a-week schedule needs its count; any other needs a
// Did on every day it asked. need 0 means the week does not count either way.
function weekScore(book, lamp, start, list) {
  const sched = lamp.was ? scheduleAt(lamp, addDaysIso(start, 6)) : lamp
  if (isPerWeek(sched)) {
    return { need: weekNeed(book, sched, start), done: didCountBefore(list, addDaysIso(start, 6), true) - didCountBefore(list, start) }
  }
  let need = 0
  let done = 0
  for (let i = 0; i < 7; i += 1) {
    const iso = addDaysIso(start, i)
    if (!isDueOn(sched, iso) || closedDay(book, sched, iso)) continue
    need += 1
    if (didCountBefore(list, iso, true) > didCountBefore(list, iso)) done += 1
  }
  return { need, done }
}

// Weeks in a row with all their Dids. A finished current week counts; an
// unfinished one does not break the run yet. Weeks fully paused or away are
// stepped past; a part-paused week needs fewer Dids.
export function perWeekStreak(book, lamp, dateIso, cap = 1100) {
  if (!isPerWeek(lamp)) return 0
  const list = didNightsOf(book, lamp.id)
  let start = weekStartOf(dateIso)
  let count = 0
  let week = weekScore(book, lamp, start, list)
  if (week.need && week.done >= week.need) count = 1
  start = addDaysIso(start, -7)
  for (let steps = 0; count < cap && steps < cap * 2; steps += 1) {
    week = weekScore(book, lamp, start, list)
    if (week.need) {
      if (week.done < week.need) break
      count += 1
    }
    start = addDaysIso(start, -7)
  }
  return count
}

// The longest run of weeks with all their Dids, same rule as perWeekStreak.
export function perWeekBest(book, lamp, dateIso, cap = 1000) {
  if (!isPerWeek(lamp)) return 0
  const list = didNightsOf(book, lamp.id)
  if (!list.length) return 0
  const current = weekStartOf(dateIso)
  let start = weekStartOf(list[0])
  let best = 0
  let run = 0
  for (let steps = 0; start <= current && steps < cap; steps += 1) {
    const week = weekScore(book, lamp, start, list)
    if (week.need) {
      if (week.done >= week.need) {
        run += 1
        if (run > best) best = run
      } else if (start !== current) run = 0
    }
    start = addDaysIso(start, 7)
  }
  return best
}

// Days between two dates, less the days the question was not asked.
function openGapDays(book, lamp, from, to) {
  let days = daysBetween(from, to)
  for (let iso = addDaysIso(from, 1); iso <= to; iso = addDaysIso(iso, 1)) if (closedDay(book, lamp, iso)) days -= 1
  return days
}

// Every so often: Dids in a row, each within the gap of the one before, and
// the newest within the gap of today. Paused, away and travel days in between
// do not count toward a gap.
export function everyStreak(book, lamp, dateIso, cap = 1100) {
  if (!isEvery(lamp)) return 0
  const list = didNightsOf(book, lamp.id)
  let at = didCountBefore(list, dateIso, true) - 1
  if (at < 0) return 0
  const gap = everyGap(book, lamp, dateIso)
  if (openGapDays(book, lamp, list[at], dateIso) > gap) return 0
  let count = 1
  while (at > 0 && count < cap && openGapDays(book, lamp, list[at - 1], list[at]) <= gap) {
    count += 1
    at -= 1
  }
  return count
}

// The longest run of Dids each within the gap of the one before.
export function everyBest(book, lamp, dateIso) {
  if (!isEvery(lamp)) return 0
  const list = didNightsOf(book, lamp.id)
  const count = didCountBefore(list, dateIso, true)
  if (!count) return 0
  const gap = everyGap(book, lamp, dateIso)
  let best = 1
  let run = 1
  for (let i = 1; i < count; i += 1) {
    run = openGapDays(book, lamp, list[i - 1], list[i]) <= gap ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}

// Due on dateIso: never done, or the gap has passed since the last Did.
export function everyDueOn(book, lamp, dateIso) {
  if (!isEvery(lamp) || lamp.archived || awayOn(dateIso)) return false
  const created = String(lamp.createdOn || '').slice(0, 10)
  if (created && dateIso < created) return false
  const last = lastDidNight(book, lamp.id, dateIso)
  if (!last) return true
  return daysBetween(last, dateIso) >= everyGap(book, lamp, dateIso)
}

// Days since the last Did, counting dateIso itself; null if never done.
export function daysSinceDid(book, lampId, dateIso, upTo = true) {
  const last = lastDidNight(book, lampId, dateIso, upTo)
  return last ? daysBetween(last, dateIso) : null
}

export function dueTonight(book, now = new Date()) {
  const dateIso = boardDate(now, book.dayFoldHour)
  const lamps = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived) continue
    // Past its end date it is no longer asked, like a finished one-time question.
    if (lamp.endsOn && dateIso > lamp.endsOn) continue
    if (isEvery(lamp)) {
      // Answered tonight stays on tonight (Did shows done, Not yet asks again).
      const answer = answerFor(book, lamp.id, dateIso) || null
      if (answer || everyDueOn(book, lamp, dateIso)) lamps.push({ lamp, dateIso, periodKey: dateIso, answer })
      continue
    }
    if (isPerWeek(lamp)) {
      const answer = answerFor(book, lamp.id, dateIso) || null
      if (answer || perWeekDueOn(book, lamp, dateIso)) lamps.push({ lamp, dateIso, periodKey: dateIso, answer })
      continue
    }
    if (!isDueOn(lamp, dateIso)) continue
    const periodKey = periodKeyFor(lamp, dateIso)
    const answer = answerFor(book, lamp.id, periodKey) || null
    if (lamp.cadence === 'once' && isOnceClosed(book, lamp.id) && !answer) continue
    lamps.push({
      lamp,
      dateIso,
      periodKey,
      answer,
    })
  }
  return lamps
}

// A one-time question with a window (due by, or no day at all) is due every
// night of it, but its one answer is shared by all of them. A Did counts on
// the night it was tapped only, so it cannot clear the other nights too.
// '' when that rule does not apply (fixed day, or not done).
export function onceDoneNight(lamp, answer) {
  if (lamp?.cadence !== 'once') return ''
  if (answer?.status !== 'yes' && answer?.status !== 'late') return ''
  if (lamp.onceWhen !== 'by' && /^\d{4}-\d{2}-\d{2}$/.test(String(lamp.onceOn || '').trim())) return ''
  const at = new Date(String(answer.answeredAt || ''))
  if (answer.answeredAt && !Number.isNaN(at.getTime())) {
    const night = boardDate(at)
    // A grace tap after the last night counts on the last night.
    const dueBy = lamp.onceWhen === 'by' ? String(lamp.dueBy || '').trim() : ''
    return /^\d{4}-\d{2}-\d{2}$/.test(dueBy) && night > dueBy ? dueBy : night
  }
  const day = String(lamp.dueBy || lamp.createdOn || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
}

// Whether an archived one-time question still counts on past nights: a Did,
// or a Not yet on a fixed-day question. Shared by the streak walk and marks.
export function oncePastCounts(lamp, answer) {
  if (lamp?.cadence !== 'once' || !answer) return false
  if (answer.status === 'yes' || answer.status === 'late') return true
  return lamp.onceWhen !== 'by' && /^\d{4}-\d{2}-\d{2}$/.test(String(lamp.onceOn || '').trim())
}

// A morning question's time is only its reminder: it is on Tonight all day.
export function askAfterPassed(lamp, now = new Date()) {
  if (lamp?.morning) return true
  if (lamp?.askFrom && boardDate(now) < lamp.askFrom) return true
  const after = String(lamp?.askAfter || '').trim()
  if (!after) return true
  const match = after.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return true
  const local = wallClock(now)
  if (local.getHours() < DAY_FOLD) return true
  const minutes = local.getHours() * 60 + local.getMinutes()
  const target = Number(match[1]) * 60 + Number(match[2])
  return minutes >= target
}

export function previousDueDate(lamp, dateIso) {
  if (!lamp || lamp.cadence === 'once' || isEvery(lamp)) return ''
  // Every 90 days needs a look back of 90, not 62, including a past schedule.
  const gap = (one) => (one?.cadence === 'every_n' ? Number(one.everyN) || 0 : 0)
  const back = Math.max(62, gap(lamp), ...(lamp.was || []).map(gap))
  // A monthly day moved later can be due twice in one month: one key, one day.
  // Only from a due day: mid-month, this month's earlier due day is the one.
  const month = isDueOn(lamp, dateIso) ? periodKeyFor(lamp, dateIso) : ''
  for (let i = 1; i <= back; i += 1) {
    const iso = addDaysIso(dateIso, -i)
    if (isDueOn(lamp, iso) && !(month.length === 7 && iso.startsWith(month))) return iso
  }
  return ''
}

// skipped(iso): a night to look past (one lost to travel), so the real
// previous due night still closes.
export function catchUpRows(book, now = new Date(), skipped = null) {
  const dateIso = boardDate(now, book.dayFoldHour)
  const rows = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived || lamp.cadence === 'once' || isEvery(lamp)) continue
    let prevIso = previousDueDate(lamp, dateIso)
    for (let step = 0; skipped && prevIso && skipped(prevIso) && step < 3; step += 1) prevIso = previousDueDate(lamp, prevIso)
    if (prevIso && skipped && skipped(prevIso)) continue
    if (!prevIso || inPause(lamp, prevIso)) continue
    if (lamp.createdOn && prevIso < lamp.createdOn) continue
    const periodKey = periodKeyFor(lamp, prevIso)
    if (answerFor(book, lamp.id, periodKey)) continue
    rows.push({
      lamp,
      dateIso: prevIso,
      periodKey,
      answer: null,
    })
  }
  return rows
}

export function unansweredTonight(book, now = new Date()) {
  return dueTonight(book, now).filter((row) => !row.answer)
}

// Ready and waiting are two halves of the same list. A question is
// waiting if its time has not come round yet.
function standingBy(row, now) {
  return !askAfterPassed(row.lamp, now)
}

// Rows whose ask time has come by `at`. Pushes use it so a question that
// still waits at the push time does not count as open.
export function askedBy(rows, at) {
  return (rows || []).filter((row) => askAfterPassed(row.lamp, at))
}

export function faceReadyTonight(book, now = new Date()) {
  const due = dueTonight(book, now)
  const open = due.filter((row) => !row.answer && !standingBy(row, now))
  const noped = due.filter((row) => row.answer?.status === 'skip')
  return [...open, ...noped]
}

export function faceSwipeTonight(book, now = new Date()) {
  return faceReadyTonight(book, now).filter((row) => mustSwipeDeadline(row.lamp, row.dateIso))
}

// The nope that ends a lap. Open questions come first in the stack, so the
// lap is over once nothing open is left ahead of this card.
export function shouldFinishAfterNope(ready, row, at) {
  if (at < 0 || !ready?.length) return false
  const othersOpen = ready.some((item, index) => index !== at && !item.answer)
  if (othersOpen) return false
  // Never answered, and it was the last open one.
  if (!row?.answer) return true
  // Already noped, so this is a second look. Ask when the stack wraps.
  return at === ready.length - 1
}

export function finishStackCount(ready) {
  const open = ready.filter((row) => !row.answer).length
  if (open) return open
  return ready.filter((row) => row.answer?.status === 'skip').length
}

export function waitingTonight(book, now = new Date()) {
  return unansweredTonight(book, now).filter((row) => standingBy(row, now))
}

// For reminder scheduling. On the setup day the card is open all day (askFrom
// is tomorrow), but its ask time is still ahead, so the ask note still goes.
export function pingWaitingTonight(book, now = new Date()) {
  const today = boardDate(now, book.dayFoldHour)
  return unansweredTonight(book, now).filter((row) => standingBy(row, now) || (row.lamp?.askFrom && today < row.lamp.askFrom))
}

export function rowDoneTonight(row) {
  const status = row?.answer?.status
  return status === 'yes' || status === 'late'
}

// A DID on a card you already noped tonight counts as late, not a fresh yes.
export function didStatusForRow(row) {
  return row?.answer?.status === 'skip' ? 'late' : 'yes'
}

function requiredTonightRows(rows) {
  return rows.filter((row) => mustSwipeDeadline(row.lamp, row.dateIso))
}

// What counts for tonight: everything you chose, and an optional question
// (put on your tonight for you) only once you said did. A night with nothing
// but an unanswered optional one is like a night with nothing due.
// One Did I put on a night's tonight never counts, did or nope. A deadline
// question before its day is the same as an optional one: it counts once
// answered, so adding one never clears the night by itself. An every so
// often question counts the same way: a Did helps, Not yet never holds the
// night open. A due by question done on an earlier night is not due on later
// nights of its window (as in the streak walk, dueThatNight), so it cannot
// clear them on its own.
function doneOtherNight(row) {
  if (row?.lamp?.cadence !== 'once') return false
  const done = onceDoneNight(row.lamp, row.answer)
  return Boolean(done) && done !== row.dateIso
}

// Counts only once you said Did: a question put on your tonight for you, or one
// someone sent you (Not yet or no answer is like a night with nothing due).
export function countsOnlyOnDid(lamp) {
  return Boolean(lamp?.optional || lamp?.fromDidYou)
}

export function countedTonightRows(rows) {
  return (rows || []).filter(
    (row) =>
      !row?.lamp?.fromDidI &&
      !doneOtherNight(row) &&
      ((!countsOnlyOnDid(row?.lamp) && !isEvery(row?.lamp)) || rowDoneTonight(row)) &&
      (mustSwipeDeadline(row.lamp, row.dateIso) || rowDoneTonight(row)),
  )
}

export function allClearTonight(book, now = new Date()) {
  const due = countedTonightRows(dueTonight(book, now))
  if (!due.length) return false
  const required = requiredTonightRows(due)
  if (!required.length) return true
  return required.every(rowDoneTonight)
}

export function dueClearTonight(rows) {
  const due = countedTonightRows(rows)
  if (!due.length) return false
  const required = requiredTonightRows(due)
  if (!required.length) return true
  return required.every(rowDoneTonight)
}

// Dates read in the app's language, not always English.
export function dateTag() {
  const code = readPrefs().locale
  if (code === 'zh') return 'zh-CN'
  return !code || code === 'en' ? 'en-US' : code
}

export function formatBoardDate(iso) {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return date.toLocaleDateString(dateTag(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// The day an answer belongs to. Once questions key on the question id
// ("once:abc"), so read the day off the question; monthly keys get the 1st.
export function periodNight(lamp, periodKey) {
  const key = String(periodKey || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key
  if (/^\d{4}-\d{2}$/.test(key)) return `${key}-01`
  if (key.startsWith('once:')) {
    const day = String((lamp?.onceWhen === 'by' ? lamp?.dueBy : lamp?.onceOn) || lamp?.createdOn || '').slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
  }
  return ''
}

// An answer's night for people to read: "Thu, Oct 1", or "Oct 2026" for a
// monthly one. Never the raw key.
export function periodLabel(lamp, periodKey) {
  const key = String(periodKey || '')
  if (/^\d{4}-\d{2}$/.test(key)) {
    const date = parseIsoDate(`${key}-01`)
    return date ? date.toLocaleDateString(dateTag(), { month: 'short', year: 'numeric' }) : ''
  }
  const night = periodNight(lamp, key)
  return night ? formatBoardDate(night) : ''
}

export function recentPeriodKeys(lamp, dateIso, count = 7) {
  if (lamp.cadence === 'once') return [`once:${lamp.id}`]
  if (isEvery(lamp)) return []
  const created = String(lamp.createdOn || '').trim()
  if (lamp.cadence === 'monthly') {
    const date = parseIsoDate(dateIso)
    if (!date) return []
    const keys = []
    const createdMonth = created ? created.slice(0, 7) : ''
    for (let i = count - 1; i >= 0; i -= 1) {
      const next = new Date(date.getFullYear(), date.getMonth() - i, 1)
      const key = `${next.getFullYear()}-${pad(next.getMonth() + 1)}`
      if (createdMonth && key < createdMonth) continue
      // A month that ended before it turned monthly was asked by day, not by month.
      if (`${key}-31` < (lamp.was?.[lamp.was.length - 1]?.until || '') && scheduleAt(lamp, `${key}-01`).cadence !== 'monthly') continue
      keys.push(key)
    }
    return keys
  }
  const keys = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const iso = addDaysIso(dateIso, -i)
    if (created && iso < created) continue
    if (isDueOn(lamp, iso)) keys.push(periodKeyFor(lamp, iso))
  }
  return keys
}
