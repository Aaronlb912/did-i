import { hallHeat } from './hall-feel.js'
import { weNight } from './we-nights.js'
import { allClearTonight, askedBy, boardDate, countedTonightRows, dueTonight, graceNightIso } from './recurrence.js'

export const STREAK_RISK_HOUR = 21

// heat: the streak to protect. Callers pass shelfStreak, which carries a
// streak across a frozen night; this one book's hallHeat (the fallback) stops there.
// at: when the warning fires; questions still waiting then do not count.
// Without it every open question counts (the midnight warning: all have asked by then).
export function streakAtRisk(book, now = new Date(), heat, at = null) {
  if (!book) return false
  const going = heat === undefined ? hallHeat(book, now) : Number(heat) || 0
  if (going <= 0) return false
  const we = weNight(boardDate(now, book.dayFoldHour))
  if (we.due && !we.clear) return true
  if (allClearTonight(book, now)) return false
  const rows = countedTonightRows(dueTonight(book, now))
  return (at ? askedBy(rows, at) : rows).length > 0
}

export function streakRiskFire(book, now = new Date(), heat) {
  const dateIso = boardDate(now)
  const [year, month, day] = dateIso.split('-').map(Number)
  const at = new Date(year, month - 1, day, STREAK_RISK_HOUR, 0, 0, 0)
  if (!streakAtRisk(book, now, heat, at)) return null
  if (at.getTime() <= now.getTime()) return null
  return {
    at: at.getTime(),
    tag: `streak-risk:${dateIso}`,
    id: `streak-risk:${dateIso}`,
    question: '',
    streakRisk: true,
  }
}

// 7am, while tonight is still open and a streak is going: the grace
// period for the previous night is running and ends at 9am.
export const GRACE_RISK_HOUR = 7

// Between midnight and 7am, this morning's note for last night. A reschedule
// after midnight (any answer) would otherwise only build tomorrow's.
export function lastNightGraceFire(book, now = new Date(), heat) {
  const graceIso = graceNightIso(now)
  if (!graceIso || now.getHours() >= GRACE_RISK_HOUR) return null
  const [y, m, d] = graceIso.split('-').map(Number)
  if (!streakAtRisk(book, new Date(y, m - 1, d, 12), heat)) return null
  return { at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), GRACE_RISK_HOUR, 0, 0, 0).getTime(), tag: `grace-risk:${graceIso}` }
}

export function graceRiskFire(book, now = new Date(), heat) {
  if (!streakAtRisk(book, now, heat)) return null
  const dateIso = boardDate(now)
  const [year, month, day] = dateIso.split('-').map(Number)
  const at = new Date(year, month - 1, day + 1, GRACE_RISK_HOUR, 0, 0, 0)
  if (at.getTime() <= now.getTime()) return null
  return { at: at.getTime(), tag: `grace-risk:${dateIso}` }
}
