import { PAST_DAYS } from './board-ops.js'
import { pausedOpen } from './lamp-record.js'
import { addDaysIso, answerFor, everyDueOn, inPause, isDueOn, isEvery, monthKey, nightOpen, perWeekDueOn, perWeekOn, periodKeyFor, periodPassed } from './recurrence.js'
import { travelNightState, travelSkipped } from './travel.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

// One month of nights for this question, laid out from the locale's first weekday. Each cell is
// 'did', 'late', 'nope', 'missed', 'open' (tonight, not answered) or '' (not asked).
// gentle: a missed night is blank, the same as a night it was not asked.
// ask: a blank day inside the last 7 that was due and has no answer; it still takes a tap.
export function lampMonthCells(book, lamp, dateIso, y, m, gentle = false, weekStart = 0) {
  const shown = { ...lamp, archived: false }
  const made = /^\d{4}-\d{2}-\d{2}$/.test(String(lamp.createdOn || '')) ? lamp.createdOn : ''
  const days = new Date(y, m + 1, 0, 12).getDate()
  const lead = (new Date(y, m, 1, 12).getDay() - weekStart + 7) % 7
  const cells = Array.from({ length: lead }, () => null)
  const floor = addDaysIso(dateIso, -PAST_DAYS)
  for (let d = 1; d <= days; d += 1) {
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`
    let state = ''
    let ask = false
    const inWindow = iso < dateIso && iso >= floor && !lamp.archived && !inPause(lamp, iso)
    // Every so often: only the nights it was done show; nothing reads missed.
    if (isEvery(lamp) || perWeekOn(lamp, iso)) {
      const status = iso <= dateIso ? answerFor(book, lamp.id, iso)?.status : ''
      state = status === 'yes' ? 'did' : status === 'late' ? 'late' : status === 'skip' ? 'nope' : ''
      // Same rule as the calendar sheet: only a day an answer would count.
      if (!state && inWindow) ask = isEvery(lamp) ? everyDueOn(book, lamp, iso) : perWeekDueOn(book, lamp, iso)
    } else if (iso <= dateIso && (!made || iso >= made) && isDueOn(shown, iso)) {
      const answer = answerFor(book, lamp.id, periodKeyFor(lamp, iso))
      const status = answer?.status
      // A day skipped for travel and left open is not a miss, same as the streak.
      const away = (travelSkipped(book, iso) && travelNightState(answer, iso) === 'none') || (monthKey(periodKeyFor(lamp, iso)) && !answer && !periodPassed(lamp, periodKeyFor(lamp, iso), dateIso)) || pausedOpen(lamp, periodKeyFor(lamp, iso), answer)
      state = away
        ? ''
        : status === 'yes' ? 'did' : status === 'late' ? 'late' : status === 'skip' ? 'nope' : nightOpen(iso) ? 'open' : gentle ? '' : 'missed'
      if (!state && !away && inWindow) ask = true
    }
    cells.push(ask ? { iso, day: d, state, ask } : { iso, day: d, state })
  }
  return cells
}
