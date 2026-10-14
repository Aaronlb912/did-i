import { mustSwipeDeadline } from './lamp-deadline.js'
import { DAY_FOLD, GRACE_END, GRACE_FIRST_UNTIL, wallClock } from './zone.js'
import { readPrefs } from './prefs.js'

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
  const ms = Date.parse(String(value || ''))
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
  if (lamp.cadence === 'monthly') return periodKey < todayIso.slice(0, 7)
  return periodKey < todayIso
}

export function isDueOn(lamp, dateIso) {
  if (!lamp || lamp.archived) return false
  const date = parseIsoDate(dateIso)
  if (!date) return false
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

export function everyGap(book, lamp, dateIso) {
  const days = Number(lamp?.everyDays)
  return learnedGap(book, lamp?.id, dateIso) || (Number.isInteger(days) && days >= 1 ? days : 7)
}

// Due on dateIso: never done, or the gap has passed since the last Did.
export function everyDueOn(book, lamp, dateIso) {
  if (!isEvery(lamp) || lamp.archived) return false
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
    if (isEvery(lamp)) {
      // Answered tonight stays on tonight (Did shows done, Not yet asks again).
      const answer = answerFor(book, lamp.id, dateIso) || null
      if (answer || everyDueOn(book, lamp, dateIso)) lamps.push({ lamp, dateIso, periodKey: dateIso, answer })
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

export function askAfterPassed(lamp, now = new Date()) {
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
  for (let i = 1; i <= 62; i += 1) {
    const iso = addDaysIso(dateIso, -i)
    if (isDueOn(lamp, iso)) return iso
  }
  return ''
}

export function catchUpRows(book, now = new Date()) {
  const dateIso = boardDate(now, book.dayFoldHour)
  const rows = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived || lamp.cadence === 'once' || isEvery(lamp)) continue
    const prevIso = previousDueDate(lamp, dateIso)
    if (!prevIso) continue
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
// night open.
export function countedTonightRows(rows) {
  return (rows || []).filter(
    (row) =>
      !row?.lamp?.fromDidI &&
      ((!row?.lamp?.optional && !isEvery(row?.lamp)) || rowDoneTonight(row)) &&
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
