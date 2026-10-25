import { askedBy, dueTonight, rowDoneTonight } from './recurrence.js'

// Two daytime nudges, local time, on top of the per-question reminders.
export const DAY_NUDGE_TIMES = ['09:00', '13:30']
export const DAY_NUDGE_LINES = 4
// With the morning ask on, its nudge takes the first slot at a time the person picks.
export const MORNING_AT_DEFAULT = '08:00'
export const MORNING_AT_TIMES = Array.from({ length: 14 }, (_, i) => `${String(5 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
const NEAR_MS = 60 * 60 * 1000

// Nudge times for the next `days` days. A day with nothing open (every
// question Did, or none due) gets none, nor does a time within an hour of a
// question's own reminder. `reminders` are the Dates the phone already set;
// `shift` is quiet hours (afterQuiet), and a nudge it would move is dropped.
export function dayNudges(books, now, { days = 7, reminders = [], shift = (at) => at, times = DAY_NUDGE_TIMES } = {}) {
  const list = (Array.isArray(books) ? books : [books]).filter(Boolean)
  const near = reminders.map((at) => at.getTime())
  const out = []
  for (let ahead = 0; ahead < days; ahead += 1) {
    times.forEach((hhmm, slot) => {
      const [h, m] = hhmm.split(':').map(Number)
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead, h, m, 0, 0)
      if (at.getTime() <= now.getTime()) return
      if (shift(at).getTime() !== at.getTime()) return
      if (near.some((ms) => Math.abs(ms - at.getTime()) < NEAR_MS)) return
      // Today reads the live answers; later days have none yet, so any due question counts.
      const open = list.some((book) => askedBy(dueTonight(book, at), at).some((row) => !rowDoneTonight(row)))
      if (!open) return
      const day = Math.floor(Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) / 86400000)
      out.push({ at, slot, line: ((day * 2 + slot) % DAY_NUDGE_LINES) + 1 })
    })
  }
  return out
}
