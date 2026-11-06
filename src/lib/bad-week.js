import { closedByItself } from './come-back.js'
import { addDaysIso } from './recurrence.js'

// A few days in a row of tapped Not yet is a rough patch, not a failure.
// Today's Not yet card offers a calmer way through it, once a day.
export const BAD_WEEK_DAYS = 3
const KEY = 'did-i-bad-week-seen'
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

// Days in a row, ending on dateIso, where every answer was a Not yet the person
// tapped: a day with any Did does not count and ends the run. The Not yet the
// app writes for a day that closed unanswered is not a tap. A day with nothing
// due (isDue says so) is walked over; a due day with no tap ends the run.
// One pass over the shelf; callers memoize on [shelf, dateIso].
export function notYetRun(shelf, dateIso, isDue = () => true) {
  if (!DATE_KEY.test(String(dateIso || ''))) return 0
  const days = new Map()
  for (const item of shelf || []) {
    for (const answer of item?.answers || []) {
      const key = String(answer?.periodKey || '')
      if (!DATE_KEY.test(key)) continue
      if (answer.status === 'yes' || answer.status === 'late') days.set(key, 'did')
      else if (answer.status === 'skip' && !closedByItself(answer) && days.get(key) !== 'did') days.set(key, 'notYet')
    }
  }
  let run = 0
  let day = dateIso
  for (let step = 0; step < 40; step += 1, day = addDaysIso(day, -1)) {
    const state = days.get(day)
    if (state === 'did') break
    if (state === 'notYet') run += 1
    else if (isDue(day)) break
  }
  return run
}

export function badWeekSeen(dateIso) {
  try {
    return localStorage.getItem(KEY) === dateIso
  } catch {
    return true
  }
}

export function markBadWeekSeen(dateIso) {
  try {
    localStorage.setItem(KEY, dateIso)
  } catch {
    // Shows again next open; harmless.
  }
}
