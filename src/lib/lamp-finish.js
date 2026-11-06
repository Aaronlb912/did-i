import { t } from './i18n.js'
import { readPrefs } from './prefs.js'
import { bestQuestionStreak, isDayCadence, lampNights, questionStreak } from './lamp-record.js'
import { boardDate, daysBetween, formatMonthYear, isPerWeek, weekStartOf } from './recurrence.js'

// What a streak counts for a question: 'weeks' (times a week), 'days'
// (daily or set weekdays), or '' for the rest (every so often, monthly, once).
export function streakUnit(lamp) {
  if (!lamp) return ''
  if (isPerWeek(lamp)) return 'weeks'
  return lamp.cadence === 'daily' || lamp.cadence === 'weekly' ? 'days' : ''
}

// An end date set in advance gets one moment when it passes: the popup shows
// once per question and end date, only for endings in the last 7 days (so an
// update does not bring up old ones). A tap on Done is marked seen when it is
// made, so it never pops up for the person who ended it.
export const FINISH_DAYS = 7

export function finishKey(lamp) {
  return `${lamp.id}:${lamp.endsOn}`
}

// [{ book, lamp }] not yet shown. `seen` is a Set of finishKey values.
export function finishedToShow(boards, seen, now = new Date()) {
  const out = []
  for (const book of boards || []) {
    if (book.archived) continue
    const today = boardDate(now, book.dayFoldHour)
    for (const lamp of book.lamps || []) {
      if (!lamp.endsOn || lamp.archived || lamp.cadence === 'once' || seen.has(finishKey(lamp))) continue
      const ago = daysBetween(lamp.endsOn, today)
      if (ago != null && ago >= 1 && ago <= FINISH_DAYS) out.push({ book, lamp })
    }
  }
  return out
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
