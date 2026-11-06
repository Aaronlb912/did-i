import { takeBackAnswer } from './answer-log.js'
import { allClearTonight, answerFor, perWeekOn, scheduleAt, stampMs } from './recurrence.js'
import { coinsFor, normalizePurse, notePaid } from './purse.js'
import { reportRejection } from './report.js'
import { accountSessionOn } from './session-id.js'
import { milestoneReached } from './streak-milestones.js'
import { clearStreakSeen } from './streak-moments.js'

// Only a Did on today's own day can be changed: not a monthly or
// per-week question (one Did there counts toward more than today), and not
// yesterday's.
export function canChangeToday(lamp, periodKey, dateIso) {
  if (!lamp || !periodKey || periodKey !== dateIso) return false
  const cadence = scheduleAt(lamp, dateIso).cadence
  if (cadence === 'monthly' || cadence === 'once') return false
  return !perWeekOn(lamp, dateIso)
}

// A Did set back to open before the day ends, from the pill or the question's
// page. The answer goes and so does what it paid, the way Undo does it:
// signed out, the coins that Did earned come off (worked out again from the
// taps made before it, since the cap of paid taps a day decides it); signed
// in, the server keeps the coins and the paid mark keeps a second Did from
// paying twice. `others` is the shelf's other folders, read when signed out.
export function reopenAnswer(book, lampId, periodKey, clock = new Date(), others = []) {
  const ans = answerFor(book, lampId, periodKey)
  if (!ans || ans.past || (ans.status !== 'yes' && ans.status !== 'late')) return book
  const at = stampMs(ans.answeredAt)
  const earlier = (one) => ({
    ...one,
    answers: (one.answers || []).filter(
      (item) => !(item.lampId === lampId && item.periodKey === periodKey) && (!stampMs(item.answeredAt) || stampMs(item.answeredAt) < at),
    ),
  })
  const lamp = (book.lamps || []).find((item) => item.id === lampId)
  const paid = accountSessionOn() ? 0 : coinsFor(ans.status, earlier(book), { lamp, periodKey }, clock, others.map(earlier))
  // Signed in, a second Did on this question must not pay again, even when
  // the first one never reached the paid list (the widget, the watch).
  if (accountSessionOn()) notePaid(`${book.id}:${lampId}:${periodKey}`)
  const cheered = Boolean(normalizePurse(book).cheerOn)
  return {
    ...book,
    answers: (book.answers || []).filter((item) => !(item.lampId === lampId && item.periodKey === periodKey)),
    coins: Math.max(0, (Number(book.coins) || 0) - paid),
    ...(cheered ? { cheerUses: Math.max(0, (Number(book.cheerUses) || 0) - 1) } : {}),
  }
}

// What follows the change, as for Undo: a cleared day plays its moment again
// on the next clear, and the server drops the answer too.
export function settleReopen(before, after, { lampId, periodKey, dateIso, streak = 0, clock = new Date() }) {
  if (allClearTonight(before, clock) && !allClearTonight(after, clock)) {
    clearStreakSeen('hit', dateIso)
    const reached = milestoneReached(streak)
    if (reached) clearStreakSeen('milestone', String(reached))
  }
  takeBackAnswer(after, lampId, periodKey).catch(reportRejection('reopen-answer'))
}
