import { hallHeat } from './hall-feel.js'
import { weNight } from './we-nights.js'
import { allClearTonight, askedBy, boardDate, countedTonightRows, dueTonight } from './recurrence.js'

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

// Midnight, while tonight is still open and a streak is going: the grace
// period for the previous night has started and runs until 9am.
export function graceRiskFire(book, now = new Date(), heat) {
  if (!streakAtRisk(book, now, heat)) return null
  const dateIso = boardDate(now)
  const [year, month, day] = dateIso.split('-').map(Number)
  const at = new Date(year, month - 1, day + 1, 0, 0, 0, 0)
  if (at.getTime() <= now.getTime()) return null
  return { at: at.getTime(), tag: `grace-risk:${dateIso}` }
}
