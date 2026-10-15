// The grace period for the previous night: until 9am, last night's questions
// that are still open (no answer, or a nope you can still turn into a did).
import { countedTonightRows, dueTonight, parseIsoDate, rowDoneTonight } from './recurrence.js'

function noonOn(iso) {
  const date = parseIsoDate(iso)
  if (!date) return null
  date.setHours(12, 0, 0, 0)
  return date
}

export function graceRowsFor(books, nightIso) {
  const at = noonOn(nightIso)
  if (!at) return []
  // A night lost to travel is offered too: a Did tapped before 9am counts.
  return (books || []).flatMap((book) =>
    countedTonightRows(dueTonight(book, at))
      .filter((row) => !rowDoneTonight(row) && (!row.lamp.createdOn || row.lamp.createdOn <= nightIso))
      .map((row) => ({ ...row, boardId: book.id, tag: book.title, book })),
  )
}
