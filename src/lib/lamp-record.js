import { t } from './i18n.js'
import { addDaysIso, answerFor, isDueOn, isEvery, periodKeyFor, periodNight, previousDueDate, recentPeriodKeys } from './recurrence.js'
import { travelSkipped } from './travel.js'

function didStatus(status) {
  return status === 'yes' || status === 'late'
}


// The one streak rule for a question: Did and late Did keep it going; a nope
// or a missed night ends it. Tonight counts once answered, and an unanswered
// tonight does not break it yet. Every per-question streak uses this.
export function questionStreak(book, lamp, dateIso, cap = 400) {
  if (!lamp || !dateIso || isEvery(lamp)) return 0
  if (lamp.cadence === 'once') return didStatus(answerFor(book, lamp.id, periodKeyFor(lamp, dateIso))?.status) ? 1 : 0
  const live = { ...lamp, archived: false }
  let cursor = isDueOn(live, dateIso) ? dateIso : previousDueDate(live, dateIso)
  if (cursor === dateIso && !answerFor(book, lamp.id, periodKeyFor(lamp, dateIso))) cursor = previousDueDate(live, dateIso)
  let count = 0
  while (cursor && count < cap) {
    // A night skipped by travel neither counts nor breaks.
    if (travelSkipped(book, cursor)) {
      cursor = previousDueDate(live, cursor)
      continue
    }
    if (!didStatus(answerFor(book, lamp.id, periodKeyFor(lamp, cursor))?.status)) break
    count += 1
    cursor = previousDueDate(live, cursor)
  }
  return count
}

// The longest run this question ever had, same rule as questionStreak.
// Walks due nights back to the question's first; callers memoize it.
export function bestQuestionStreak(book, lamp, dateIso, cap = 1000) {
  if (!lamp || !dateIso || isEvery(lamp)) return 0
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
    if (travelSkipped(book, cursor)) {
      steps += 1
      cursor = previousDueDate(live, cursor)
      continue
    }
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
  if (!lamp || lamp.cadence === 'once' || lamp.cadence === 'monthly' || isEvery(lamp) || !dateIso) return []
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
      if (!isDueOn(live, iso) || travelSkipped(book, iso)) continue
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

// The last few nights this question was Did (late Did too), newest first,
// with the note and amount. Callers memoize it on [book, lamp].
export function lastDidTimes(book, lamp, n = 5) {
  const out = []
  for (const { answer, night } of lampNights(book, lamp)) {
    if (!didStatus(answer.status)) continue
    out.push({
      night,
      periodKey: answer.periodKey,
      note: String(answer.note || ''),
      amount: typeof answer.amount === 'number' ? answer.amount : null,
    })
    if (out.length >= n) break
  }
  return out
}

// "3 glasses", or just "3" when the question has no unit.
export function amountWords(amount, unit = '') {
  if (typeof amount !== 'number') return ''
  const u = String(unit || '').trim()
  return u ? `${amount} ${u}` : String(amount)
}

// A friendly average: whole numbers from 10 up, one decimal under that.
export function roundAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
}

// "About 6 glasses a night" from lampAmounts().average; '' with none.
export function amountAverageLine(average, unit = '') {
  if (average == null) return ''
  const u = String(unit || '').trim()
  return u ? t('amounts.avg', { n: average, unit: u }) : t('amounts.avgPlain', { n: average })
}

// Amounts for a question's page: the average over Did nights with an amount
// in the last avgDays nights, and one bar per night for the last chartDays,
// oldest first (amount null when there is none). One pass over the answers;
// callers memoize it on [book, lamp, dateIso].
export function lampAmounts(book, lamp, dateIso, chartDays = 14, avgDays = 30) {
  const empty = { average: null, count: 0, bars: [], max: 0 }
  if (!lamp || !lamp.trackAmount || !dateIso) return empty
  const avgFrom = addDaysIso(dateIso, -(avgDays - 1))
  const chartFrom = addDaysIso(dateIso, -(chartDays - 1))
  const byNight = new Map()
  let sum = 0
  let count = 0
  for (const { answer, night } of lampNights(book, lamp)) {
    if (!night || night > dateIso || night < avgFrom) continue
    if (!didStatus(answer.status) || typeof answer.amount !== 'number') continue
    if (byNight.has(night)) continue
    byNight.set(night, answer.amount)
    sum += answer.amount
    count += 1
  }
  const bars = []
  let max = 0
  for (let d = 0; d < chartDays; d += 1) {
    const night = d ? addDaysIso(chartFrom, d) : chartFrom
    const amount = byNight.has(night) ? byNight.get(night) : null
    if (amount !== null && amount > max) max = amount
    bars.push({ night, amount })
  }
  return { average: count ? roundAmount(sum / count) : null, count, bars, max }
}
