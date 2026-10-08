import { addDaysIso, answerFor, isDueOn, periodKeyFor, periodNight, previousDueDate, recentPeriodKeys } from './recurrence.js'

function didStatus(status) {
  return status === 'yes' || status === 'late'
}


// The one streak rule for a question: Did and late Did keep it going; a nope
// or a missed night ends it. Tonight counts once answered, and an unanswered
// tonight does not break it yet. Every per-question streak uses this.
export function questionStreak(book, lamp, dateIso, cap = 400) {
  if (!lamp || !dateIso) return 0
  if (lamp.cadence === 'once') return didStatus(answerFor(book, lamp.id, periodKeyFor(lamp, dateIso))?.status) ? 1 : 0
  const live = { ...lamp, archived: false }
  let cursor = isDueOn(live, dateIso) ? dateIso : previousDueDate(live, dateIso)
  if (cursor === dateIso && !answerFor(book, lamp.id, periodKeyFor(lamp, dateIso))) cursor = previousDueDate(live, dateIso)
  let count = 0
  while (cursor && count < cap) {
    if (!didStatus(answerFor(book, lamp.id, periodKeyFor(lamp, cursor))?.status)) break
    count += 1
    cursor = previousDueDate(live, cursor)
  }
  return count
}

// The longest run this question ever had, same rule as questionStreak.
// Walks due nights back to the question's first; callers memoize it.
export function bestQuestionStreak(book, lamp, dateIso, cap = 1000) {
  if (!lamp || !dateIso) return 0
  if (lamp.cadence === 'once') return questionStreak(book, lamp, dateIso)
  const live = { ...lamp, archived: false }
  let first = String(lamp.createdOn || '').slice(0, 10)
  if (!first) {
    for (const answer of book?.answers || []) {
      if (answer.lampId !== lamp.id || !answer.periodKey) continue
      const night = periodNight(lamp, answer.periodKey)
      if (night && (!first || night < first)) first = night
    }
  }
  if (first && lamp.cadence === 'monthly') first = `${first.slice(0, 7)}-01`
  let cursor = isDueOn(live, dateIso) ? dateIso : previousDueDate(live, dateIso)
  let best = 0
  let run = 0
  let steps = 0
  while (cursor && steps < cap && (!first || cursor >= first)) {
    if (didStatus(answerFor(book, lamp.id, periodKeyFor(lamp, cursor))?.status)) {
      run += 1
      if (run > best) best = run
    } else if (cursor !== dateIso) {
      run = 0
    }
    steps += 1
    cursor = previousDueDate(live, cursor)
  }
  return best
}

// One question's record for its page: the DID streak, and how many of its
// recent due nights were DID. Tonight only counts once it is answered.
export function lampRecord(book, lamp, dateIso, days = 30) {
  if (!lamp) return { streak: 0, did: 0, asked: 0, tonight: '', due: false }
  const tonightKey = periodKeyFor(lamp, dateIso)
  const tonight = answerFor(book, lamp.id, tonightKey)?.status || ''
  // A paused question keeps its history on show, so count its nights as if live.
  const keys = recentPeriodKeys({ ...lamp, archived: false }, dateIso, days).filter((key) => key !== tonightKey || tonight)
  let did = 0
  for (const key of keys) {
    if (didStatus(answerFor(book, lamp.id, key)?.status)) did += 1
  }
  const streak = questionStreak(book, lamp, dateIso)
  return { streak, did, asked: keys.length, tonight, due: !lamp.archived && isDueOn(lamp, dateIso) }
}

// One question's last few weeks, oldest first: how many due nights each week
// were DID. Tonight only counts once it is answered. Once and monthly
// questions have no weekly shape, so they get none.
export function lampWeeks(book, lamp, dateIso, weeks = 8) {
  if (!lamp || lamp.cadence === 'once' || lamp.cadence === 'monthly' || !dateIso) return []
  const live = { ...lamp, archived: false }
  const created = String(lamp.createdOn || '').slice(0, 10)
  const out = []
  for (let w = 0; w < weeks; w += 1) {
    const from = addDaysIso(dateIso, -(weeks * 7 - 1) + w * 7)
    let due = 0
    let did = 0
    for (let d = 0; d < 7; d += 1) {
      const iso = d ? addDaysIso(from, d) : from
      if (created && iso < created) continue
      if (!isDueOn(live, iso)) continue
      const status = answerFor(book, lamp.id, periodKeyFor(lamp, iso))?.status || ''
      if (iso === dateIso && !status) continue
      due += 1
      if (didStatus(status)) did += 1
    }
    out.push({ from, due, did })
  }
  // Weeks before the question had anything due are not a trend, just blanks.
  const first = out.findIndex((week) => week.due > 0)
  return first < 0 ? [] : out.slice(first)
}

// This question's answers, newest night first, each with its readable night.
export function lampNights(book, lamp) {
  if (!lamp) return []
  return (book?.answers || [])
    .filter((answer) => answer.lampId === lamp.id && answer.periodKey)
    .map((answer) => ({ answer, night: periodNight(lamp, answer.periodKey) }))
    .sort((a, b) => b.night.localeCompare(a.night) || String(b.answer.periodKey).localeCompare(String(a.answer.periodKey)))
}
