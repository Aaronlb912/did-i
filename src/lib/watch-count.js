import { boardDate, countedTonightRows, dueTonight, rowDoneTonight } from './recurrence.js'
import { weNight } from './we-nights.js'

// The watch's "2 of 4" and ring, counted the way Today's meter counts them
// (nightProgress): tonight's counted questions on every folder plus Did wes,
// done meaning Did or late. counted: the card keys (`id|night`) that count;
// last night's grace cards and others Today leaves out are cards, not count.
// done and later: counted questions with no card, answered or still to come.
export function watchCount(shelf, items, now = new Date()) {
  const counted = new Set()
  if (!shelf) return { counted, done: 0, later: 0 }
  const listed = new Set(items.map((item) => `${item.id}|${item.night}`))
  let done = 0
  let later = 0
  for (const book of shelf.boards || []) {
    if (book?.archived) continue
    for (const row of countedTonightRows(dueTonight(book, now))) {
      const key = `${row.lamp.id}|${row.periodKey}`
      if (listed.has(key)) counted.add(key)
      else if (rowDoneTonight(row)) done += 1
      else later += 1
    }
  }
  // Did wes count on Today too; the watch has no card for them.
  const we = weNight(boardDate(now))
  done += we.done
  later += Math.max(0, we.due - we.done)
  return { counted, done, later }
}
