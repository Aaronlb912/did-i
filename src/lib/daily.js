import { putAnswer } from './board-ops.js'
import {
  addDaysIso,
  answerFor,
  boardDate,
  inPause,
  isEvery,
  previousDueDate,
  parseIsoDate,
  periodKeyFor,
  periodPassed,
  graceNightIso,
  openFloorIso,
} from './recurrence.js'
import { noteZone, travelSkipped, withTravelSkips } from './travel.js'

const CLOSE_CAP = 400

// The auto-close nope is stamped at the start of its night so a real tap
// from any device wins every newer-wins compare.
function nightStart(dateIso) {
  const date = parseIsoDate(dateIso)
  if (!date) return new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export function nightEnd(dateIso) {
  const date = parseIsoDate(dateIso)
  if (!date) return new Date()
  date.setHours(23, 59, 59, 0)
  return date
}

function closeOnceRows(book, now) {
  const today = boardDate(now, book.dayFoldHour)
  const yesterday = addDaysIso(today, -1)
  const rows = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived || lamp.cadence !== 'once') continue
    const periodKey = periodKeyFor(lamp, today)
    if (answerFor(book, lamp.id, periodKey)) continue
    if (lamp.onceWhen === 'by') {
      const dueBy = String(lamp.dueBy || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueBy) || dueBy >= today) continue
      rows.push({
        lamp,
        dateIso: dueBy,
        periodKey: periodKeyFor(lamp, dueBy),
        answer: null,
      })
      continue
    }
    const on = String(lamp.onceOn || '').trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(on)) {
      if (on >= today) continue
      rows.push({ lamp, dateIso: on, periodKey, answer: null })
      continue
    }
    const created = String(lamp.createdOn || '').trim() || today
    if (created >= today) continue
    rows.push({ lamp, dateIso: yesterday, periodKey, answer: null })
  }
  return rows
}

// Every unanswered due night before today, newest first, back to the first
// one with an answer (older ones were closed then) or the day the question
// was made, at most CLOSE_CAP each. Last night stays open in the grace
// period; a night lost to the date line is stepped over.
function firstAnswerNight(book, lampId) {
  let first = ''
  for (const answer of book.answers || []) {
    if (answer.lampId !== lampId) continue
    const night = String(answer.periodKey || '').slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(night) && (!first || night < first)) first = night
  }
  return first
}

function missedRows(book, now, skipped) {
  const today = boardDate(now, book.dayFoldHour)
  const grace = graceNightIso(now)
  const rows = []
  for (const lamp of book.lamps || []) {
    if (lamp.archived || lamp.cadence === 'once' || isEvery(lamp)) continue
    const seen = new Set()
    // An old question with no createdOn: back to its first answer, or only
    // last night when it has none, so a missing date never makes 400 nopes.
    const floor = String(lamp.createdOn || '').slice(0, 10) || firstAnswerNight(book, lamp.id)
    let iso = previousDueDate(lamp, today)
    for (let step = 0; iso && step < CLOSE_CAP; step += 1, iso = previousDueDate(lamp, iso)) {
      if (floor ? iso < floor : step > 0) break
      // A paused day is left out of the record, not closed as Not yet.
      if (iso === grace || skipped(iso) || inPause(lamp, iso)) continue
      const periodKey = periodKeyFor(lamp, iso)
      if (seen.has(periodKey)) continue
      if (answerFor(book, lamp.id, periodKey)) break
      seen.add(periodKey)
      rows.push({ lamp, dateIso: iso, periodKey, answer: null })
    }
  }
  return rows
}

// Unanswered due nights before today become nope when the day turns, every
// one of them, not just last night. A night skipped by flying over the date
// line is left alone.
export function closePastNights(book, now = new Date(), skips = noteZone(now, undefined, undefined, book?.travelSkips)) {
  let next = withTravelSkips(book, skips)
  let changed = next !== book
  const travelled = next
  for (const row of missedRows(travelled, now, (iso) => travelSkipped(travelled, iso))) {
    next = putAnswer(next, row, 'skip', nightStart(row.dateIso))
    changed = true
  }
  for (const row of closeOnceRows(next, now)) {
    if (row.dateIso === graceNightIso(now) || travelSkipped(next, row.dateIso)) continue
    if (answerFor(next, row.lamp.id, row.periodKey)) continue
    // A 'by' question spans created..due. Stamped at the window's start, a
    // Did tapped on any earlier day in it still wins a merge.
    const lamp = row.lamp
    const at = lamp.onceWhen === 'by' ? String(lamp.createdOn || '').slice(0, 10) || row.dateIso : row.dateIso
    next = putAnswer(next, row, 'skip', nightStart(at))
    changed = true
  }
  // A one-time question whose day (or due date) is behind us is done
  // asking: it moves to "no longer asking" instead of sitting in the list.
  const today = boardDate(now, next.dayFoldHour)
  const floor = openFloorIso(now)
  const spent = (next.lamps || []).filter(
    (lamp) => !lamp.archived && lamp.cadence === 'once' && periodPassed(lamp, periodKeyFor(lamp, today), floor),
  )
  if (spent.length) {
    const ids = new Set(spent.map((lamp) => lamp.id))
    next = { ...next, lamps: next.lamps.map((lamp) => (ids.has(lamp.id) ? { ...lamp, archived: true } : lamp)) }
    changed = true
  }
  return changed ? next : book
}

export function closeShelfPastNights(shelf, now = new Date()) {
  // Skips any phone already made count toward the one-a-week limit.
  const skips = noteZone(now, undefined, undefined, (shelf.boards || []).flatMap((book) => book.travelSkips || []))
  return {
    ...shelf,
    boards: (shelf.boards || []).map((book) => closePastNights(book, now, skips)),
  }
}

export function noteOpen(book, now = new Date()) {
  const day = boardDate(now, book.dayFoldHour)
  const opens = Array.isArray(book.opens) ? book.opens.filter(Boolean) : []
  if (opens.includes(day)) return book
  return { ...book, opens: [...opens, day].slice(-120) }
}

export function showedNights(book) {
  return (book.opens || []).length
}

export function freshMarks(before, after) {
  const old = new Set(before || [])
  return (after || []).filter((id) => !old.has(id))
}
