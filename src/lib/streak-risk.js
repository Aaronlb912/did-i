import { hallHeat } from './hall-feel.js'
import { weNight } from './we-nights.js'
import { allClearTonight, boardDate, countedTonightRows, dueTonight } from './recurrence.js'

export const STREAK_RISK_HOUR = 21

export function streakAtRisk(book, now = new Date()) {
  if (!book) return false
  const heat = hallHeat(book, now)
  if (heat <= 0) return false
  const we = weNight(boardDate(now, book.dayFoldHour))
  if (we.due && !we.clear) return true
  if (allClearTonight(book, now)) return false
  return countedTonightRows(dueTonight(book, now)).length > 0
}

export function streakRiskFire(book, now = new Date()) {
  if (!streakAtRisk(book, now)) return null
  const dateIso = boardDate(now)
  const [year, month, day] = dateIso.split('-').map(Number)
  const at = new Date(year, month - 1, day, STREAK_RISK_HOUR, 0, 0, 0)
  if (at.getTime() <= now.getTime()) return null
  return {
    at: at.getTime(),
    tag: `streak-risk:${dateIso}`,
    id: `streak-risk:${dateIso}`,
    question: '',
    streakRisk: true,
  }
}
