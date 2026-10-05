// The "how coins work" sheet: recent nights' coins, read from your answers
// with the same rules as coinsFor (did 2, late 1, nope 0, first PAID_TAPS
// paid answers a night, nothing for a question made that night).
import { addDaysIso, boardDate } from './recurrence.js'
import { gemWeekKey, PAID_TAPS } from './purse.js'

export function coinNights(shelf, now = new Date(), days = 7) {
  const boards = shelf?.boards || []
  const fold = (boards.find((b) => b.id === shelf?.currentId) || boards[0])?.dayFoldHour ?? 0
  const today = boardDate(now, fold)
  const oldest = addDaysIso(today, -(days - 1))
  const byNight = new Map()
  for (const book of boards) {
    const born = new Map((book.lamps || []).map((lamp) => [lamp.id, String(lamp.createdOn || '')]))
    // Paid taps count per book, as coinsFor does.
    const taps = new Map()
    for (const answer of book.answers || []) {
      if (answer.status !== 'yes' && answer.status !== 'late') continue
      const night = String(answer.periodKey || '').slice(0, 10)
      if (night < oldest || night > today) continue
      const made = born.get(answer.lampId) || ''
      if (made && made >= night) continue
      const list = taps.get(night)
      if (list) list.push(answer)
      else taps.set(night, [answer])
    }
    for (const [night, list] of taps) {
      list.sort((a, b) => String(a.answeredAt || '').localeCompare(String(b.answeredAt || '')))
      const coins = list.slice(0, PAID_TAPS).reduce((sum, a) => sum + (a.status === 'yes' ? 2 : 1), 0)
      byNight.set(night, (byNight.get(night) || 0) + coins)
    }
  }
  return [...byNight.entries()]
    .map(([night, coins]) => ({ night, coins }))
    .sort((a, b) => (a.night < b.night ? 1 : -1))
}

// Whether this week's gem is already earned.
export function gemThisWeek(gemWeek, now = new Date(), fold = 0) {
  return Boolean(gemWeek) && gemWeek === gemWeekKey(now, fold)
}
