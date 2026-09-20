import { snoozedNow } from './snooze.js'
import { DAY_FOLD, wallClock } from './zone.js'

function pad(value) {
  return String(value).padStart(2, '0')
}

export function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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
// ends at 4 in the morning where the person is. Callers still pass their
// old value and it is ignored on purpose.
export function boardDate(now = new Date()) {
  const local = wallClock(now)
  if (local.getHours() < DAY_FOLD) {
    local.setDate(local.getDate() - 1)
  }
  return isoDate(new Date(local.getFullYear(), local.getMonth(), local.getDate()))
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

export function dueTonight(book, now = new Date()) {
  const dateIso = boardDate(now, book.dayFoldHour)
  const lamps = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived) continue
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
  if (!lamp || lamp.cadence === 'once') return ''
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
    if (lamp.archived || lamp.cadence === 'once') continue
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
// waiting if its time has not come round yet, or if it was pushed to
// later tonight.
function standingBy(row, now) {
  return !askAfterPassed(row.lamp, now) || snoozedNow(row.lamp.id, row.periodKey, now)
}

export function faceReadyTonight(book, now = new Date()) {
  return unansweredTonight(book, now).filter((row) => !standingBy(row, now))
}

export function waitingTonight(book, now = new Date()) {
  return unansweredTonight(book, now).filter((row) => standingBy(row, now))
}

export function allClearTonight(book, now = new Date()) {
  const due = dueTonight(book, now)
  return due.length > 0 && due.every((row) => row.answer)
}

export function formatBoardDate(iso) {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function recentPeriodKeys(lamp, dateIso, count = 7) {
  if (lamp.cadence === 'once') return [`once:${lamp.id}`]
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
