import { putAnswer } from './board-ops.js'
import {
  addDaysIso,
  answerFor,
  boardDate,
  catchUpRows,
  parseIsoDate,
  periodKeyFor,
} from './recurrence.js'

const CLOSE_CAP = 400

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

// Unanswered due nights before today become nope when the day turns.
export function closePastNights(book, now = new Date()) {
  let next = book
  let changed = false
  for (let step = 0; step < CLOSE_CAP; step += 1) {
    const rows = catchUpRows(next, now)
    if (!rows.length) break
    for (const row of rows) {
      next = putAnswer(next, row, 'skip', nightEnd(row.dateIso))
      changed = true
    }
  }
  for (const row of closeOnceRows(next, now)) {
    if (answerFor(next, row.lamp.id, row.periodKey)) continue
    next = putAnswer(next, row, 'skip', nightEnd(row.dateIso))
    changed = true
  }
  return changed ? next : book
}

export function closeShelfPastNights(shelf, now = new Date()) {
  return {
    ...shelf,
    boards: (shelf.boards || []).map((book) => closePastNights(book, now)),
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
