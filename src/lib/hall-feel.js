import { weFirstNight, weNight, weNightsStamp } from './we-nights.js'
import { addDaysIso, answerFor, boardDate, daysBetween, countedTonightRows, dueClearTonight, dueTonight, graceNightIso, inPause, isDueOn, isEvery, onceDoneNight, oncePastCounts, parseIsoDate, periodKeyFor, periodPassed, weekStartOf } from './recurrence.js'
import { scopedBooks } from './tags.js'
import { travelNightState, travelSkipped, travelWe } from './travel.js'
import { awayOn, readPrefs } from './prefs.js'
import { LOOKS_LATE, wallClock } from './zone.js'

// A question only counts on nights it existed: one added today must not make
// last night look missed, or adding a new daily question cuts the streak.
// Every so often questions have no streak, so they never count here.
// A one-time question counts only on the night its Did was tapped (or its
// due day). Once its day passes it is archived, but the night it was due
// keeps its answer, missed or not, so a miss does not vanish with it.
// On a night skipped by travel only answered questions count: a Did as
// usual, a tapped Not yet as a Not yet. The rest are not due, as before the start.
// A monthly question due earlier this month with no Did yet (unanswered or
// Not yet) is not a miss until the month ends, same as the grace night. Once
// it ends, a Not yet on its day counts as a miss (monthWait comes off).
export function dueThatNight(book, iso, at, now = new Date()) {
  const skipped = travelSkipped(book, iso)
  const today = boardDate(now, book.dayFoldHour)
  return dueTonight(withPastOnce(book), at).filter((row) => {
    if (row.lamp.cadence === 'monthly' && (!row.answer || row.answer.status === 'skip') && !periodPassed(row.lamp, row.periodKey, today)) return false
    if (skipped && travelNightState(row.answer, iso) === 'none') return false
    if (isEvery(row.lamp) || (row.lamp.createdOn && row.lamp.createdOn > iso)) return false
    if (row.lamp.pauses && inPause(row.lamp, iso) && row.answer?.status !== 'yes' && row.answer?.status !== 'late') return false
    const done = onceDoneNight(row.lamp, row.answer)
    return !done || done === iso
  }).map((row) => (row.monthWait ? { ...row, monthWait: false } : row)).concat(archivedDids(book, iso))
}

// An archived daily, weekly, every-N-days or monthly question keeps the nights it was done, so
// archiving it does not shorten the streak. Unanswered nights stay out.
const REPEATS = new Set(['daily', 'weekly', 'every_n', 'monthly'])
function archivedDids(book, iso) {
  const rows = []
  for (const lamp of book.lamps || []) {
    if (!lamp.archived || !REPEATS.has(lamp.cadence)) continue
    if (!isDueOn({ ...lamp, archived: false }, iso)) continue
    const periodKey = periodKeyFor(lamp, iso)
    const answer = answerFor(book, lamp.id, periodKey)
    if (answer?.status === 'yes' || answer?.status === 'late') rows.push({ lamp, dateIso: iso, periodKey, answer })
    // Paused on a known day: nights before it keep their misses too, same as the year view.
    else if (lamp.pausedOn && iso < lamp.pausedOn && !inPause(lamp, iso) && !(lamp.createdOn && lamp.createdOn > iso) && !(travelSkipped(book, iso) && travelNightState(answer, iso) === 'none')) {
      rows.push({ lamp, dateIso: iso, periodKey, answer })
    }
  }
  return rows
}

// The book with answered, archived one-time questions put back, so past
// nights are judged with them. Memoized per book.
const pastOnceByBook = new WeakMap()
function withPastOnce(book) {
  let out = pastOnceByBook.get(book)
  if (out) return out
  const back = (lamp) => lamp.archived && oncePastCounts(lamp, answerFor(book, lamp.id, `once:${lamp.id}`))
  const lamps = book.lamps || []
  out = lamps.some(back) ? { ...book, lamps: lamps.map((lamp) => (back(lamp) ? { ...lamp, archived: false } : lamp)) } : book
  pastOnceByBook.set(book, out)
  return out
}

function noonOn(iso) {
  const date = parseIsoDate(iso)
  if (!date) return null
  date.setHours(12, 0, 0, 0)
  return date
}

export function hallHeat(book, now = new Date()) {
  if (!book) return 0
  let cursor = boardDate(now, book.dayFoldHour)
  // Last night, while it can still be answered, waits like tonight does.
  const grace = graceNightIso(now)
  let heat = 0
  for (let step = 0; step < 40 && heat < 5; step += 1) {
    const at = noonOn(cursor)
    if (!at) break
    const rows = dueThatNight(book, cursor, at, now)
    if (countedTonightRows(rows).length === 0) {
      cursor = addDaysIso(cursor, -1)
      continue
    }
    // Tonight still open is not a break yet; it just does not count.
    if (!dueClearTonight(rows)) {
      if (step > 0 && cursor !== grace) break
      cursor = addDaysIso(cursor, -1)
      continue
    }
    heat += 1
    cursor = addDaysIso(cursor, -1)
  }
  return heat
}

export function shelfHeat(boards, now = new Date(), tagId = '') {
  return clearNightsInARow(boards, now, tagId, 5, 40)
}

// Cleared nights in a row, counting tonight only once it is clear: what the
// streak says out loud, so it keeps counting past the five the room shows.
// Stops at the first night left open, before the first question was made,
// or after three years of nights.
export function shelfStreak(boards, now = new Date(), tagId = '') {
  return clearNightsInARow(boards, now, tagId, 1100, 1100)
}

// The night the oldest question was made, or '' when one has no date.
// Did wes done before the first question still count, so they move the floor back.
function firstNight(books) {
  const own = ownFirstNight(books)
  const we = weFirstNight()
  return own && we && we < own ? we : own
}

function ownFirstNight(books) {
  let first = ''
  for (const book of books) {
    for (const lamp of book.lamps || []) {
      const made = String(lamp.createdOn || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(made)) return ''
      if (!first || made < first) first = made
    }
  }
  return first
}

// The last night before tonight that had questions due, if it was left open
// and ended a streak: { night, was }. Tonight never counts, so adding a
// question or undoing an answer after finishing does not read as a break.
export function lastBrokenNight(boards, now = new Date()) {
  const books = scopedBooks(boards, '')
  if (!books.length) return null
  // Last night is still in its grace period: nothing is judged yet.
  if (graceNightIso(now)) return null
  let night = addDaysIso(boardDate(now, books[0].dayFoldHour), -1)
  let found = false
  for (let step = 0; step < 40 && !found; step += 1) {
    const at = noonOn(night)
    if (!at) return null
    if (weNight(night).due || books.some((book) => countedTonightRows(dueThatNight(book, night, at, now)).length)) found = true
    else night = addDaysIso(night, -1)
  }
  if (!found) return null
  // A freeze covered it: the streak went on.
  if (freezeState(boards, now).kept.has(night)) return null
  if (clearNightsInARow(boards, noonOn(night), '', 1, 1, false) > 0) return null
  const was = clearNightsInARow(boards, noonOn(addDaysIso(night, -1)), '', 1100, 1100, false)
  return was > 0 ? { night, was } : null
}

// Two or more days in a row with questions due and none finished, ending
// yesterday: { night, days }. A freeze covers a day, so it is not away.
// lastBrokenNight is null in this case (nothing before it was clear), so the
// two cards never overlap.
export function daysAway(boards, now = new Date()) {
  const books = scopedBooks(boards, '')
  if (!books.length || graceNightIso(now)) return null
  const floor = firstNight(books)
  const frozen = freezeState(boards, now).kept
  const last = addDaysIso(boardDate(now, books[0].dayFoldHour), -1)
  let night = last
  let days = 0
  for (let step = 0; step < 40; step += 1) {
    if (floor && night < floor) break
    const at = noonOn(night)
    if (!at) break
    const { due, clear } = nightTally(books, night, at, '', now)
    if (due && (clear || frozen.has(night))) break
    if (due) days += 1
    night = addDaysIso(night, -1)
  }
  return days >= 2 ? { night: last, days } : null
}

// How many questions were due on a night (checked at noon) and whether they
// were all done. dueTonight is the costly part of a streak walk, and the
// answer only changes when the book does: every edit makes a new book object,
// so the WeakMap drops stale nights on its own.
const nightsByBook = new WeakMap()
function nightOf(book, iso, at, now = new Date()) {
  let nights = nightsByBook.get(book)
  if (!nights) {
    nights = new Map()
    nightsByBook.set(book, nights)
  }
  // The month is part of the key: an open month turns into a miss when it ends.
  const memoKey = `${iso}|${boardDate(now, book.dayFoldHour).slice(0, 7)}`
  let night = nights.get(memoKey)
  if (!night) {
    const rows = dueThatNight(book, iso, at, now)
    const counted = countedTonightRows(rows).length
    night = { counted, clear: counted > 0 && dueClearTonight(rows) }
    nights.set(memoKey, night)
  }
  return night
}

// waitTonight: an open first night is skipped, not a break, because it can
// still be finished. Looking back at a finished night, it is a break.
function clearNightsInARow(boards, now, tagId, cap, lookBack, waitTonight = true) {
  const books = scopedBooks(boards, tagId)
  if (!books.length) return 0
  const floor = firstNight(books)
  let cursor = boardDate(now, books[0].dayFoldHour)
  const grace = waitTonight ? graceNightIso(now) : ''
  // Freezes keep the overall streak only, never a tag's.
  const frozen = tagId ? null : freezeState(boards, now).kept
  let heat = 0
  for (let step = 0; step < lookBack && heat < cap; step += 1) {
    if (floor && cursor < floor) break
    const at = noonOn(cursor)
    if (!at) break
    const { due: dueCount, clear } = nightTally(books, cursor, at, tagId, now)
    if (dueCount === 0) {
      cursor = addDaysIso(cursor, -1)
      continue
    }
    if (!clear) {
      if (frozen && step > 0 && frozen.has(cursor)) {
        cursor = addDaysIso(cursor, -1)
        continue
      }
      if ((step > 0 && cursor !== grace) || !waitTonight) break
      cursor = addDaysIso(cursor, -1)
      continue
    }
    heat += 1
    cursor = addDaysIso(cursor, -1)
  }
  return heat
}

// The longest overall streak ever, same rules as shelfStreak: nights with
// nothing due are skipped, a freeze keeps the run, an open night ends it.
// Tonight and a night still in grace never end a run. One walk, oldest night
// bounded by the first question, so callers memoize it per night.
export function bestShelfStreak(boards, now = new Date(), lookBack = 1100) {
  const books = scopedBooks(boards, '')
  if (!books.length) return 0
  const floor = firstNight(books)
  const tonight = boardDate(now, books[0].dayFoldHour)
  const grace = graceNightIso(now)
  const frozen = freezeState(boards, now).kept
  let cursor = tonight
  let run = 0
  let best = 0
  for (let step = 0; step < lookBack; step += 1) {
    if (floor && cursor < floor) break
    const at = noonOn(cursor)
    if (!at) break
    const { due, clear } = nightTally(books, cursor, at, '', now)
    if (due && clear) {
      run += 1
      if (run > best) best = run
    } else if (due && !(frozen && frozen.has(cursor)) && cursor !== tonight && cursor !== grace) {
      run = 0
    }
    cursor = addDaysIso(cursor, -1)
  }
  return best
}

// The longest streak inside one calendar year: a past year ends on Dec 31,
// this year on today, and nothing before Jan 1 counts. 0 for a future year.
export function bestShelfStreakIn(boards, year, now = new Date()) {
  const books = scopedBooks(boards, '')
  if (!books.length) return 0
  const today = boardDate(now, books[0].dayFoldHour)
  const jan = `${year}-01-01`
  const dec = `${year}-12-31`
  const last = today < dec ? today : dec
  if (last < jan) return 0
  return bestShelfStreak(boards, last === today ? now : noonOn(last), daysBetween(jan, last) + 1)
}

// How many things were due on a night across books, and whether all were did.
function nightTally(books, iso, at, tagId = '', now = new Date()) {
  let due = 0
  let clear = true
  for (const book of books) {
    const night = nightOf(book, iso, at, now)
    due += night.counted
    if (night.counted && !night.clear) clear = false
  }
  // Did wes due for you that night: only your own did counts.
  const we = travelWe(awayOn(iso) || books.some((book) => travelSkipped(book, iso)), weNight(iso, tagId))
  due += we.due
  if (we.due && !we.clear) clear = false
  return { due, clear }
}

// Earned streak freezes. Every 14 cleared nights in a row earns one, up to
// two held. A held freeze covers the next missed night: the streak goes on
// but does not grow. nights is 'clear' | 'miss' | 'none' in date order.
// weekly (One free miss a week): an array of week keys, one per night. The
// first miss in each week is kept without spending a held freeze. Those days
// come back in `free`, apart from `frozen` (days a held freeze covered).
export const FREEZE_EVERY = 14
export const FREEZE_MAX = 2
export function walkFreezes(nights, every = FREEZE_EVERY, max = FREEZE_MAX, start = null, weekly = null) {
  let run = start?.run || 0
  let held = start?.held || 0
  let weekUsed = start?.weekUsed || ''
  const frozen = []
  const free = []
  for (let i = 0; i < nights.length; i += 1) {
    const state = nights[i]
    if (state === 'clear') {
      run += 1
      if (run % every === 0 && held < max) held += 1
    } else if (state === 'miss') {
      if (weekly && weekly[i] && weekly[i] !== weekUsed) {
        weekUsed = weekly[i]
        free.push(i)
      } else if (held > 0) {
        held -= 1
        frozen.push(i)
      } else run = 0
    }
  }
  return weekly ? { run, held, frozen, free, weekUsed } : { run, held, frozen }
}

// A freeze was really earned when more are held and the run crossed a new
// multiple of 14. A used freeze coming back after a late Did raises what is
// held without that, and earns nothing. seen* are the stored values or null.
export function freezeEarnedNow(seenHeld, held, seenRun, run, every = FREEZE_EVERY) {
  if (seenHeld == null || seenRun == null) return false
  // A run lower than the seen one broke while the app was closed and started again.
  const before = run < Number(seenRun) ? 0 : Number(seenRun)
  return held > Number(seenHeld) && Math.floor(run / every) > Math.floor(before / every)
}

// Nights left until the next freeze, from the run walkFreezes counts.
// 0 when the most a person can hold is already held.
export function nightsToNextFreeze(run, held = 0, every = FREEZE_EVERY, max = FREEZE_MAX) {
  if (held >= max) return 0
  const n = Math.max(0, Math.floor(Number(run) || 0))
  return every - (n % every)
}

// The first night anything happened: the oldest made date or answer.
function startOf(books, today) {
  let first = firstNight(books)
  if (first) return first
  for (const book of books) {
    for (const answer of book.answers || []) {
      const night = String(answer.periodKey || '').slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(night) && (!first || night < first)) first = night
    }
  }
  return first || today
}

// Walks every night from the start, forward, so every device and the web
// land on the same freezes. Tonight and a night still in its grace period
// are not judged yet. Memoized on the shelf, the night and Did we nights.
const freezeMemo = new WeakMap()
const NO_FREEZE = { held: 0, run: 0, frozen: new Set(), free: new Set(), kept: new Set() }
export function freezeState(boards, now = new Date()) {
  if (!boards || typeof boards !== 'object') return NO_FREEZE
  const books = scopedBooks(boards, '')
  if (!books.length) return NO_FREEZE
  const today = boardDate(now, books[0].dayFoldHour)
  const grace = graceNightIso(now)
  const prefs = readPrefs()
  let spans = prefs.freeMissSpans || []
  if (prefs.freeMiss === true && !spans.length) spans = [[today, null]]
  const weekly = spans.length > 0
  const spanKey = weekly ? `w${JSON.stringify(spans)}` : ''
  const inSpan = (iso) => spans.some(([from, to]) => from <= iso && (to === null || iso < to))
  const key = `${today}|${grace}|${weNightsStamp()}|${spanKey}`
  let byKey = freezeMemo.get(boards)
  if (!byKey) {
    byKey = new Map()
    freezeMemo.set(boards, byKey)
  }
  const hit = byKey.get(key)
  if (hit) return hit
  const walkNights = (from, to, start) => {
    const isos = []
    const states = []
    let cursor = from
    for (let step = 0; step <= 1100 && cursor < to; step += 1) {
      const at = noonOn(cursor)
      if (!at) break
      const { due, clear } = nightTally(books, cursor, at, '', now)
      isos.push(cursor)
      states.push(!due ? 'none' : clear ? 'clear' : cursor === today || cursor === grace ? 'none' : 'miss')
      cursor = addDaysIso(cursor, 1)
    }
    const walk = walkFreezes(states, FREEZE_EVERY, FREEZE_MAX, start, weekly ? isos.map((iso) => (inSpan(iso) ? weekStartOf(iso) : '')) : null)
    return {
      run: walk.run,
      held: walk.held,
      weekUsed: walk.weekUsed,
      frozen: [...(start?.frozen || []), ...walk.frozen.map((i) => isos[i])],
      free: [...(start?.free || []), ...(walk.free || []).map((i) => isos[i])],
    }
  }
  // Nights before last night are settled. Their walk is kept by what they
  // hold, so a tap tonight (a new shelf object) walks only the last nights.
  const settledTo = addDaysIso(today, -1)
  const sign = `${spanKey}|${settledTo}|${weNightsStamp()}|${pastSign(books, settledTo)}`
  let past = settledMemo.get(sign)
  if (!past) {
    let first = startOf(books, today)
    const floor = addDaysIso(today, -1100)
    if (first < floor) first = floor
    past = walkNights(first, settledTo, null)
    if (settledMemo.size > 4) settledMemo.clear()
    settledMemo.set(sign, past)
  }
  const walk = walkNights(settledTo, addDaysIso(today, 1), past)
  // kept: every day that did not break the streak, freeze or free miss.
  const out = { held: walk.held, run: walk.run, frozen: new Set(walk.frozen), free: new Set(walk.free), kept: new Set([...walk.frozen, ...walk.free]) }
  if (byKey.size > 8) byKey.clear()
  byKey.set(key, out)
  return out
}

// A cheap fingerprint of everything that decides the settled nights: the
// questions and every answer filed before `before`.
const settledMemo = new Map()
function pastSign(books, before) {
  let hash = 7
  const mix = (text) => {
    for (let i = 0; i < text.length; i += 1) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0
  }
  for (const book of books) {
    mix(`|${book.id}|${book.dayFoldHour}|${(book.travelSkips || []).join(',')}`)
    for (const lamp of book.lamps || []) {
      mix(JSON.stringify(lamp))
    }
    // Answers are hashed once each and summed, so a tap does not rehash years.
    let sum = 0
    let count = 0
    for (const answer of book.answers || []) {
      if (!answer || !(String(answer.periodKey || '') < before)) continue
      count += 1
      sum = (sum + answerSign(answer)) | 0
    }
    mix(`|${count}|${sum}`)
  }
  return hash
}

const answerSigns = new WeakMap()
function answerSign(answer) {
  let sign = answerSigns.get(answer)
  if (sign === undefined) {
    const text = `${answer.lampId}|${answer.periodKey}|${answer.status}|${answer.answeredAt || ''}`
    sign = 17
    for (let i = 0; i < text.length; i += 1) sign = (Math.imul(sign, 31) + text.charCodeAt(i)) | 0
    answerSigns.set(answer, sign)
  }
  return sign
}

export function filamentLevel(book, lampId) {
  const n = (book.answers || []).filter(
    (answer) => answer.lampId === lampId && (answer.status === 'yes' || answer.status === 'late'),
  ).length
  if (n >= 20) return 4
  if (n >= 10) return 3
  if (n >= 4) return 2
  if (n >= 1) return 1
  return 0
}

export function hallHour(now = new Date()) {
  const hour = wallClock(now).getHours()
  if (hour >= 20 || hour < LOOKS_LATE) return 'night'
  return 'day'
}
