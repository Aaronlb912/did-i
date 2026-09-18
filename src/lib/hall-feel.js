import { addDaysIso, allClearTonight, boardDate, dueTonight, parseIsoDate } from './recurrence.js'

function noonOn(iso) {
  const date = parseIsoDate(iso)
  if (!date) return null
  date.setHours(12, 0, 0, 0)
  return date
}

export function hallHeat(book, now = new Date()) {
  if (!book) return 0
  let cursor = boardDate(now, book.dayFoldHour)
  let heat = 0
  for (let step = 0; step < 40 && heat < 5; step += 1) {
    const at = noonOn(cursor)
    if (!at) break
    const due = dueTonight(book, at)
    if (due.length === 0) {
      cursor = addDaysIso(cursor, -1)
      continue
    }
    if (!allClearTonight(book, at)) break
    heat += 1
    cursor = addDaysIso(cursor, -1)
  }
  return heat
}

export function filamentLevel(book, lampId) {
  const n = (book.answers || []).filter(
    (answer) => answer.lampId === lampId && (answer.status === 'yes' || answer.status === 'late'),
  ).length
  if (n >= 20) return 4
  if (n >= 10) return 3
  if (n >= 4) return 2
  if (n >= 1) return 1
  return 0
}

export function hallHour(now = new Date()) {
  const hour = now.getHours()
  if (hour >= 20 || hour < 4) return 'night'
  return 'day'
}
