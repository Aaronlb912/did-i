import { askAfterPassed, dueTonight } from './recurrence.js'
import { mustSwipeDeadline } from './lamp-deadline.js'

// Tonight's questions the watch has no card for, counted the way the cards
// are picked (the same deadline rule as the widget).
export function offCards(shelf, items, now = new Date()) {
  if (!shelf) return { done: 0, later: 0 }
  const listed = new Set(items.map((item) => `${item.id}|${item.night}`))
  let done = 0
  let later = 0
  for (const book of shelf.boards || []) {
    if (book?.archived) continue
    for (const row of dueTonight(book, now)) {
      if (!row?.lamp || !mustSwipeDeadline(row.lamp, row.dateIso)) continue
      if (listed.has(`${row.lamp.id}|${row.periodKey}`)) continue
      if (row.answer) done += 1
      else if (!askAfterPassed(row.lamp, now)) later += 1
    }
  }
  return { done, later }
}
