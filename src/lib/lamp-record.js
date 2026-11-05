import { t } from './i18n.js'
import { readPrefs } from './prefs.js'
import { addDaysIso, answerFor, graceNightIso, inPause, isDueOn, everyBest, everyStreak, isEvery, isPerWeek, perWeekBest, perWeekStreak, periodKeyFor, periodNight, periodPassed, previousDueDate, recentPeriodKeys } from './recurrence.js'
import { travelNightState, travelSkipped } from './travel.js'

function didStatus(status) {
  return status === 'yes' || status === 'late'
}


// A period left open after the question was paused was never asked: it
// neither counts nor breaks. A month counts as paused if it ends after pausedOn.
export function pausedOpen(lamp, key, answer) {
  if (!lamp || didStatus(answer?.status)) return false
  const paused = lamp.archived && lamp.pausedOn
  if (!paused && !lamp.pauses?.length) return false
  const month = /^\d{4}-\d{2}$/.test(key)
  if (paused && !answer && (month ? `${key}-31` : periodNight(lamp, key)) >= lamp.pausedOn) return true
  // An earlier pause, since resumed: those days were never asked either. A
  // Not yet there was closed by an older build on resume, not tapped.
  // A month counts as paused the same way: the pause reached into it and ran past its due day.
  if (month) return Boolean(lamp.pauses?.some(([from, until]) => `${key}-31` >= from && until > monthDueDay(lamp, key)))
  return inPause(lamp, periodNight(lamp, key))
}

// The day a monthly question was due in that month.
function monthDueDay(lamp, key) {
  const live = { ...lamp, archived: false }
  for (let day = 1; day <= 31; day += 1) {
    const iso = `${key}-${String(day).padStart(2, '0')}`
    if (isDueOn(live, iso)) return iso
  }
  return `${key}-31`
}

// The one streak rule for a question: Did and late Did keep it going; a nope
// or a missed night ends it. Tonight counts once answered, and an unanswered
// tonight does not break it yet. Every per-question streak uses this.
export function questionStreak(book, lamp, dateIso, cap = 400, now = new Date()) {
  if (!lamp || !dateIso) return 0
  if (isEvery(lamp)) return everyStreak(book, lamp, dateIso, cap)
  if (isPerWeek(lamp)) return perWeekStreak(book, lamp, dateIso, cap)
  if (lamp.cadence === 'once') return didStatus(answerFor(book, lamp.id, periodKeyFor(lamp, dateIso))?.status) ? 1 : 0
  const live = { ...lamp, archived: false }
  let cursor = isDueOn(live, dateIso) ? dateIso : previousDueDate(live, dateIso)
  if (cursor === dateIso && !answerFor(book, lamp.id, periodKeyFor(lamp, dateIso))) cursor = previousDueDate(live, dateIso)
  // Last night is still open until the grace hour: unanswered, it does not break the run yet.
  const grace = openGrace(dateIso, now)
  let count = 0
  while (cursor && count < cap) {
    const answer = answerFor(book, lamp.id, periodKeyFor(lamp, cursor))
    // Left open on a night skipped by travel, or last night still in grace: neither counts nor breaks.
    if ((travelSkipped(book, cursor) && travelNightState(answer, cursor) === 'none') || (cursor === grace && !answer) || monthOpen(lamp, periodKeyFor(lamp, cursor), answer, dateIso) || pausedOpen(lamp, periodKeyFor(lamp, cursor), answer)) {
      cursor = previousDueDate(live, cursor)
      continue
    }
    if (!didStatus(answer?.status)) break
    count += 1
    cursor = previousDueDate(live, cursor)
  }
  return count
}

// The longest run this question ever had, same rule as questionStreak.
// Walks due nights back to the question's first; callers memoize it.
// A monthly question left open this month neither counts nor breaks until the month ends.
function monthOpen(lamp, key, answer, todayIso) {
  return lamp.cadence === 'monthly' && !answer && !periodPassed(lamp, key, todayIso)
}

function openGrace(dateIso, now) {
  const grace = graceNightIso(now)
  return grace && addDaysIso(grace, 1) === dateIso ? grace : ''
}

export function bestQuestionStreak(book, lamp, dateIso, cap = 1000, now = new Date()) {
  if (!lamp || !dateIso) return 0
  if (isEvery(lamp)) return everyBest(book, lamp, dateIso)
  if (isPerWeek(lamp)) return perWeekBest(book, lamp, dateIso)
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
  const grace = openGrace(dateIso, now)
  let best = 0
  let run = 0
  let steps = 0
  while (cursor && steps < cap && (!first || cursor >= first)) {
    const answer = answerFor(book, lamp.id, periodKeyFor(lamp, cursor))
    if ((travelSkipped(book, cursor) && travelNightState(answer, cursor) === 'none') || monthOpen(lamp, periodKeyFor(lamp, cursor), answer, dateIso) || pausedOpen(lamp, periodKeyFor(lamp, cursor), answer)) {
      steps += 1
      cursor = previousDueDate(live, cursor)
      continue
    }
    if (didStatus(answer?.status)) {
      run += 1
      if (run > best) best = run
    } else if (cursor !== dateIso && !(cursor === grace && !answer)) {
      run = 0
    }
    steps += 1
    cursor = previousDueDate(live, cursor)
  }
  return best
}

// One question's record for its page: the DID streak, and how many of its
// recent due nights were DID. Tonight only counts once it is answered.
export function lampRecord(book, lamp, dateIso, days = 30, now = new Date()) {
  if (!lamp) return { streak: 0, did: 0, asked: 0, tonight: '', due: false }
  const tonight = answerFor(book, lamp.id, periodKeyFor(lamp, dateIso))?.status || ''
  const { did, asked } = recordCounts(book, lamp, dateIso, days, now)
  const streak = questionStreak(book, lamp, dateIso, 400, now)
  return { streak, did, asked, tonight, due: !lamp.archived && isDueOn(lamp, dateIso) }
}

// Did and asked counts alone, without the streak walk.
function recordCounts(book, lamp, dateIso, days, now) {
  const tonightKey = periodKeyFor(lamp, dateIso)
  const grace = openGrace(dateIso, now)
  // A paused question keeps its history on show, so count its nights as if live.
  // Tonight, and last night while its grace runs, count only once answered.
  const keys = recentPeriodKeys({ ...lamp, archived: false }, dateIso, days)
    .filter((key) => (key !== tonightKey && !(grace && periodNight(lamp, key) === grace)) || answerFor(book, lamp.id, key))
    // Nights after it was paused were never asked.
    .filter((key) => !pausedOpen(lamp, key, answerFor(book, lamp.id, key)))
    // Travel days left open count neither way, same as the streak.
    .filter((key) => {
      const iso = periodNight(lamp, key)
      return !(travelSkipped(book, iso) && travelNightState(answerFor(book, lamp.id, key), iso) === 'none')
    })
  let did = 0
  for (const key of keys) {
    if (didStatus(answerFor(book, lamp.id, key)?.status)) did += 1
  }
  return { did, asked: keys.length }
}

// Percent of due days Did in a lampRecord, or null under 3 due days.
export function lampRate(record) {
  if (!record || record.asked < 3) return null
  return Math.round((record.did / record.asked) * 100)
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
      if (!isDueOn(live, iso)) continue
      const answer = answerFor(book, lamp.id, periodKeyFor(lamp, iso))
      if (travelSkipped(book, iso) && travelNightState(answer, iso) === 'none') continue
      const status = answer?.status || ''
      if (iso === dateIso && !status) continue
      if (pausedOpen(lamp, iso, answer)) continue
      due += 1
      if (didStatus(status)) did += 1
    }
    out.push({ from, due, did })
  }
  // Weeks before the question had anything due are not a trend, just blanks.
  const first = out.findIndex((week) => week.due > 0)
  return first < 0 ? [] : out.slice(first)
}

// One question's last few months as a grid, one cell per day, oldest first and
// starting on `firstDay` (0 = Sunday). Each cell is did, not (Not yet), miss
// (due, no answer), or '' (not due, before it was added, paused, away, or
// today still open). byDay tallies Did of due per weekday. Callers memoize.
export function lampDays(book, lamp, dateIso, weeks = 26, firstDay = 0) {
  const empty = { days: [], byDay: [] }
  if (!lamp || lamp.cadence === 'once' || lamp.cadence === 'monthly' || isEvery(lamp) || !dateIso) return empty
  const live = { ...lamp, archived: false }
  const created = String(lamp.createdOn || '').slice(0, 10)
  const back = (new Date(`${dateIso}T12:00:00`).getDay() - firstDay + 7) % 7
  const start = addDaysIso(dateIso, -((weeks - 1) * 7 + back))
  const byDay = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, due: 0, did: 0 }))
  const days = []
  let any = false
  for (let i = 0; ; i += 1) {
    const iso = addDaysIso(start, i)
    if (iso > dateIso) break
    let state = ''
    if (!(created && iso < created) && isDueOn(live, iso)) {
      const answer = answerFor(book, lamp.id, periodKeyFor(lamp, iso))
      const status = answer?.status || ''
      const away = travelSkipped(book, iso) && travelNightState(answer, iso) === 'none'
      if (!away && !(iso === dateIso && !status) && !pausedOpen(lamp, iso, answer)) {
        state = didStatus(status) ? 'did' : status ? 'not' : 'miss'
        const tally = byDay[new Date(`${iso}T12:00:00`).getDay()]
        tally.due += 1
        if (state === 'did') tally.did += 1
        any = true
      }
    }
    days.push({ iso, state })
  }
  return any ? { days, byDay } : empty
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

// 1.5 reads 1,5 in German. One formatter per language, kept.
const numberFormats = new Map()
export function amountNumber(n) {
  const locale = readPrefs().locale || 'en'
  if (!numberFormats.has(locale)) numberFormats.set(locale, new Intl.NumberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }))
  return numberFormats.get(locale).format(n)
}

// "3 glasses", or just "3" when the question has no unit.
export function amountWords(amount, unit = '') {
  if (typeof amount !== 'number') return ''
  const u = String(unit || '').trim()
  return u ? `${amountNumber(amount)} ${u}` : amountNumber(amount)
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
  const n = amountNumber(average)
  return u ? t('amounts.avg', { n, unit: u }) : t('amounts.avgPlain', { n })
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

// Questions that run on days (not times a week, not every so often).
export function isDayCadence(lamp) {
  return Boolean(lamp) && !isPerWeek(lamp) && !isEvery(lamp)
}

// Did rate over the last 30 days across live questions, same window as the
// question page. Null under 3 due days. asked is the due days counted.
export function shelfRate30(books, dateIso, now = new Date()) {
  let did = 0
  let asked = 0
  for (const one of books || []) {
    for (const lamp of one.lamps || []) {
      if (lamp.archived) continue
      const rec = recordCounts(one, lamp, dateIso, 30, now)
      did += rec.did
      asked += rec.asked
    }
  }
  const rate = lampRate({ did, asked })
  return rate == null ? null : { rate, did, asked }
}
