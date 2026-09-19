import { addDaysIso, boardDate, dueTonight, parseIsoDate } from './recurrence.js'

export function noteOpen(book, now = new Date()) {
  const day = boardDate(now, book.dayFoldHour)
  const opens = Array.isArray(book.opens) ? book.opens.filter(Boolean) : []
  if (opens.includes(day)) return book
  return { ...book, opens: [...opens, day].slice(-120) }
}

export function showedNights(book) {
  return (book.opens || []).length
}

export function cameBackAfterHole(book, now = new Date()) {
  const today = boardDate(now, book.dayFoldHour)
  const yesterday = addDaysIso(today, -1)
  const at = parseIsoDate(yesterday)
  if (!at) return false
  at.setHours(12, 0, 0, 0)
  const due = dueTonight(book, at).filter(
    (row) => !row.lamp.createdOn || row.lamp.createdOn <= yesterday,
  )
  if (!due.length) return false
  if (due.every((row) => row.answer)) return false
  return (book.opens || []).includes(today)
}

export function freshMarks(before, after) {
  const old = new Set(before || [])
  return (after || []).filter((id) => !old.has(id))
}
