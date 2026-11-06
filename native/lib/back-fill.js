import { putAnswer } from '../../src/lib/board-ops.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { shelfStreak } from '../../src/lib/hall-feel.js'
import { STREAK_MILESTONES } from '../../src/lib/streak-milestones.js'
import { markStreakSeen } from '../../src/lib/streak-moments.js'
import { addDaysIso, isDueOn, isPerWeek, periodKeyFor } from '../../src/lib/recurrence.js'

// "Already doing this?" on a new question: how many days back to count, and
// which shapes it fits (every day, or certain weekdays).
export const BACK_MAX = 7

export function backFits(lamp) {
  return (lamp?.cadence === 'daily' && !isPerWeek(lamp)) || (lamp?.cadence === 'weekly' && (lamp.weekdays || []).length > 0)
}

// The question starts n days ago. `dateIso` is today's day.
export function backLamp(lamp, n, dateIso) {
  return n > 0 && backFits(lamp) ? { ...lamp, createdOn: addDaysIso(dateIso, -Math.min(BACK_MAX, n)) } : lamp
}

// Each of those n days the schedule makes due gets a Late Did: past, so no
// coins and no cheer. `lamp` is the one backLamp returned.
// Days added after the fact are not today's work: a streak milestone they
// already reach is marked seen, so its moment does not play for them.
// boards: the folders as they will be saved.
export function markAddedStreak(boards, clock = new Date()) {
  const streak = shelfStreak(boards || [], clock)
  for (const m of STREAK_MILESTONES) if (streak >= m) markStreakSeen('milestone', String(m))
}

// One folder after a back-fill, with the rest of the shelf.
export function markBookStreak(book, clock = new Date()) {
  const boards = readShelf().boards || []
  markAddedStreak(boards.some((item) => item.id === book.id) ? boards.map((item) => (item.id === book.id ? book : item)) : [...boards, book], clock)
}

export function backFill(book, lamp, n, dateIso, clock = new Date()) {
  let next = book
  for (let back = 1; back <= Math.min(BACK_MAX, n); back += 1) {
    const iso = addDaysIso(dateIso, -back)
    if (!isDueOn(lamp, iso)) continue
    next = putAnswer(next, { lamp, periodKey: periodKeyFor(lamp, iso), dateIso: iso }, 'late', clock, true)
  }
  return next
}
