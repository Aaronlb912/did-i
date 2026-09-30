import { addDaysIso, boardDate, countedTonightRows, dueClearTonight, dueTonight, parseIsoDate } from './recurrence.js'
import { scopedBooks } from './tags.js'
import { LOOKS_LATE, wallClock } from './zone.js'

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
    const rows = dueTonight(book, at)
    if (countedTonightRows(rows).length === 0) {
      cursor = addDaysIso(cursor, -1)
      continue
    }
    // Tonight still open is not a break yet; it just does not count.
    if (!dueClearTonight(rows)) {
      if (step > 0) break
      cursor = addDaysIso(cursor, -1)
      continue
    }
    heat += 1
    cursor = addDaysIso(cursor, -1)
  }
  return heat
}

export function shelfHeat(boards, now = new Date(), tagId = '') {
  return clearNightsInARow(boards, now, tagId, 5, 40)
}

// Cleared nights in a row, counting tonight only once it is clear: what the
// streak says out loud, so it keeps counting past the five the room shows.
// Stops at the first night left open, before the first question was made,
// or after three years of nights.
export function shelfStreak(boards, now = new Date(), tagId = '') {
  return clearNightsInARow(boards, now, tagId, 1100, 1100)
}

// The night the oldest question was made, or '' when one has no date.
function firstNight(books) {
  let first = ''
  for (const book of books) {
    for (const lamp of book.lamps || []) {
      const made = String(lamp.createdOn || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(made)) return ''
      if (!first || made < first) first = made
    }
  }
  return first
}

// The last night before tonight that had questions due, if it was left open
// and ended a streak: { night, was }. Tonight never counts, so adding a
// question or undoing an answer after finishing does not read as a break.
export function lastBrokenNight(boards, now = new Date()) {
  const books = scopedBooks(boards, '')
  if (!books.length) return null
  let night = addDaysIso(boardDate(now, books[0].dayFoldHour), -1)
  let found = false
  for (let step = 0; step < 40 && !found; step += 1) {
    const at = noonOn(night)
    if (!at) return null
    if (books.some((book) => countedTonightRows(dueTonight(book, at)).length)) found = true
    else night = addDaysIso(night, -1)
  }
  if (!found) return null
  if (clearNightsInARow(boards, noonOn(night), '', 1, 1, false) > 0) return null
  const was = clearNightsInARow(boards, noonOn(addDaysIso(night, -1)), '', 1100, 1100, false)
  return was > 0 ? { night, was } : null
}

// How many questions were due on a night (checked at noon) and whether they
// were all done. dueTonight is the costly part of a streak walk, and the
// answer only changes when the book does: every edit makes a new book object,
// so the WeakMap drops stale nights on its own.
const nightsByBook = new WeakMap()
function nightOf(book, iso, at) {
  let nights = nightsByBook.get(book)
  if (!nights) {
    nights = new Map()
    nightsByBook.set(book, nights)
  }
  let night = nights.get(iso)
  if (!night) {
    const rows = dueTonight(book, at)
    const counted = countedTonightRows(rows).length
    night = { counted, clear: counted > 0 && dueClearTonight(rows) }
    nights.set(iso, night)
  }
  return night
}

// waitTonight: an open first night is skipped, not a break, because it can
// still be finished. Looking back at a finished night, it is a break.
function clearNightsInARow(boards, now, tagId, cap, lookBack, waitTonight = true) {
  const books = scopedBooks(boards, tagId)
  if (!books.length) return 0
  const floor = firstNight(books)
  let cursor = boardDate(now, books[0].dayFoldHour)
  let heat = 0
  for (let step = 0; step < lookBack && heat < cap; step += 1) {
    if (floor && cursor < floor) break
    const at = noonOn(cursor)
    if (!at) break
    let dueCount = 0
    let clear = true
    for (const book of books) {
      const night = nightOf(book, cursor, at)
      dueCount += night.counted
      if (night.counted && !night.clear) clear = false
    }
    if (dueCount === 0) {
      cursor = addDaysIso(cursor, -1)
      continue
    }
    if (!clear) {
      if (step > 0 || !waitTonight) break
      cursor = addDaysIso(cursor, -1)
      continue
    }
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
  const hour = wallClock(now).getHours()
  if (hour >= 20 || hour < LOOKS_LATE) return 'night'
  return 'day'
}
