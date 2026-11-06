import { t } from './i18n.js'
import { readPrefs } from './prefs.js'
import { bestQuestionStreak, isDayCadence, lampNights, questionStreak } from './lamp-record.js'
import { formatMonthYear, isPerWeek, weekStartOf } from './recurrence.js'

// What a streak counts for a question: 'weeks' (times a week), 'days'
// (daily or set weekdays), or '' for the rest (every so often, monthly, once).
export function streakUnit(lamp) {
  if (!lamp) return ''
  if (isPerWeek(lamp)) return 'weeks'
  return lamp.cadence === 'daily' || lamp.cadence === 'weekly' ? 'days' : ''
}

// The record said out loud before a question ends: how many Dids, since
// when, and the best run. '' when it has no Did yet.
export function finishLine(book, lamp, dateIso) {
  const dids = lampNights(book, lamp).filter(({ answer }) => answer.status === 'yes' || answer.status === 'late')
  if (!dids.length) return ''
  if (dids.length === 1) return t('lamp.doneRecordOne')
  const since = formatMonthYear(dids[dids.length - 1].night)
  const record = t('lamp.doneRecordN', { n: dids.length, since })
  const unit = streakUnit(lamp)
  // Gentle mode hides streak numbers, here too.
  const gentle = readPrefs().gentle === true
  const best = !gentle && unit && (unit === 'weeks' || isDayCadence(lamp)) ? bestQuestionStreak(book, lamp, dateIso) : 0
  if (best < 2) return record
  return `${record} ${t(unit === 'weeks' ? 'lamp.doneBestWeeks' : 'lamp.doneBestDays', { n: best })}`
}

// After an edit that moves a question between days and times a week: the
// streak now counts the other unit. '' when the unit stays.
export function unitChangeLine(book, before, after, dateIso) {
  const was = streakUnit(before)
  const now = streakUnit(after)
  if (!was || !now || was === now || readPrefs().gentle === true) return ''
  const n = questionStreak(book, after, dateIso)
  const weeks = now === 'weeks'
  if (n < 1) return t(weeks ? 'lamp.unitWeeksNone' : 'lamp.unitDaysNone')
  return t(weeks ? 'lamp.unitWeeks' : 'lamp.unitDays', { n })
}

// Switching to times a week, or lowering the count, partway through a week:
// the new count counts from this week. A raised count binds from next week
// (a split week keeps the smaller count). Not on a Monday, a new week anyway.
export function countsFromThisWeek(before, perWeek, dateIso) {
  if (!before || weekStartOf(dateIso) === dateIso) return false
  return !isPerWeek(before) || Number(perWeek) < Number(before.perWeek)
}
