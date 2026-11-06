// The grace period for the previous night: until 9am, last night's questions
// that are still open (no answer, or a nope you can still turn into a did).
import { addDaysIso, countedTonightRows, dueTonight, isPerWeek, monthCarryRow, parseIsoDate, rowDoneTonight } from './recurrence.js'

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
  // Times a week and a monthly Not yet do not hold the day but can still turn
  // into a Did. A monthly one whose month goes on today is on Today's cards
  // already; one whose month ended last night gets the morning too.
  const month = addDaysIso(nightIso, 1).slice(0, 7)
  return (books || []).flatMap((book) => {
    const due = dueTonight(book, at)
    const counted = new Set(countedTonightRows(due))
    const rows = due.filter((row) => counted.has(row) || isPerWeek(row.lamp) || row.monthWait)
    if (month !== nightIso.slice(0, 7)) {
      for (const lamp of book.lamps || []) {
        const carry = lamp.cadence === 'monthly' || lamp.was ? monthCarryRow(book, lamp, nightIso) : null
        if (carry) rows.push(carry)
      }
    }
    return rows
      .filter((row) => !rowDoneTonight(row) && row.periodKey !== month && (!row.lamp.createdOn || row.lamp.createdOn <= nightIso))
      .map((row) => ({ ...row, boardId: book.id, tag: book.title, book }))
  })
}
