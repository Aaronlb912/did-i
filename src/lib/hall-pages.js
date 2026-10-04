import { hallHeat, shelfStreak } from './hall-feel.js'
import {
  addDaysIso,
  allClearTonight,
  boardDate,
  dueTonight,
  faceReadyTonight,
  formatBoardDate,
  isoDate,
  parseIsoDate,
  unansweredTonight,
  waitingTonight,
} from './recurrence.js'
import { mustSwipeDeadline, shortLabel } from './board-json.js'
import { t } from './i18n.js'
import { uses24h } from './prefs.js'
import { scopedBooks, tagOnRow } from './tags.js'

export { streakLength } from './achievements.js'

const WELCOME_KEY = 'did-i-welcome'

export function welcomeSeen() {
  try {
    return localStorage.getItem(WELCOME_KEY) === '1'
  } catch {
    return true
  }
}

// The grace period explainer shows once, the first time it means something.
const GRACE_SEEN_KEY = 'did-i-grace-seen'
export function graceExplained() {
  try {
    return localStorage.getItem(GRACE_SEEN_KEY) === '1'
  } catch {
    return true
  }
}
export function markGraceExplained() {
  try {
    localStorage.setItem(GRACE_SEEN_KEY, '1')
  } catch {
    // Shows again next time; harmless.
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_KEY, '1')
  } catch {
    // Board still opens.
  }
}

function noonOn(iso) {
  const date = parseIsoDate(iso)
  if (!date) return null
  date.setHours(12, 0, 0, 0)
  return date
}

// A question you added on Friday was not something you missed on Monday.
function dueOnNight(book, iso, at) {
  return dueTonight(book, at).filter((row) => !row.lamp.createdOn || row.lamp.createdOn <= iso)
}

// The first night anything happened: the oldest question's made date or the
// oldest answer. Nights before it are blank on the calendar, not missed.
const startMemo = new WeakMap()
function startNight(book) {
  if (startMemo.has(book)) return startMemo.get(book)
  let first = ''
  for (const lamp of book.lamps || []) {
    const made = String(lamp.createdOn || '').slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(made) && (!first || made < first)) first = made
  }
  for (const answer of book.answers || []) {
    const night = String(answer.periodKey || '').slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(night) && (!first || night < first)) first = night
  }
  startMemo.set(book, first)
  return first
}

function nightMarks(books, iso, today) {
  // Future nights and nights before you started stay blank.
  if (iso > today) return { due: 0, on: false, miss: false, empty: true }
  books = books.filter((book) => {
    const start = startNight(book)
    return start ? iso >= start : iso === today
  })
  const at = noonOn(iso)
  let dueCount = 0
  let clear = true
  for (const book of books) {
    // A deadline still days away is optional, so it does not break the night.
    const due = at ? dueOnNight(book, iso, at).filter((row) => mustSwipeDeadline(row.lamp, row.dateIso)) : []
    dueCount += due.length
    if (due.length && !due.every((row) => row.answer)) clear = false
  }
  return {
    due: dueCount,
    on: dueCount > 0 && clear,
    miss: dueCount > 0 && !clear && iso < today,
    empty: dueCount === 0,
  }
}

// What tomorrow night holds, for the done card: how many questions it asks
// and the earliest time one opens. `from` is empty when any of them is open
// all evening, since "from 8:00 PM" would then be wrong.
export function tomorrowPreview(boards, now = new Date(), tagId = '') {
  const books = scopedBooks(boards, tagId)
  if (!books.length) return { count: 0, from: '' }
  const iso = addDaysIso(boardDate(now, books[0].dayFoldHour), 1)
  const at = noonOn(iso)
  if (!at) return { count: 0, from: '' }
  const rows = books
    .flatMap((book) => dueOnNight(book, iso, at))
    .filter((row) => mustSwipeDeadline(row.lamp, row.dateIso))
  const times = rows.map((row) => String(row.lamp.askAfter || '').trim())
  const from = rows.length && times.every((time) => /^\d{2}:\d{2}$/.test(time)) ? [...times].sort()[0] : ''
  if (rows.length) return { count: rows.length, from }
  // Nothing tomorrow: the next night anything is due, within two weeks.
  for (let day = 1; day <= 13; day += 1) {
    const later = addDaysIso(iso, day)
    const laterAt = noonOn(later)
    if (laterAt && books.some((book) => dueOnNight(book, later, laterAt).some((row) => mustSwipeDeadline(row.lamp, row.dateIso)))) return { count: 0, from: '', next: later }
  }
  return { count: 0, from: '' }
}

export function nightDueRows(boards, iso, tagId = '') {
  const books = scopedBooks(boards, tagId)
  const at = noonOn(iso)
  if (!at) return []
  return books.flatMap((book) => dueOnNight(book, iso, at).map((row) => tagOnRow(book, row)))
}

export function weekNights(book, now = new Date(), days = 7) {
  const today = boardDate(now, book.dayFoldHour)
  const nights = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const iso = addDaysIso(today, -i)
    const at = noonOn(iso)
    nights.push({
      iso,
      label: formatBoardDate(iso),
      weekday: weekdayShort(iso),
      dayNum: dayNumber(iso),
      isToday: iso === today,
      due: at ? dueTonight(book, at) : [],
      hallOn: at ? allClearTonight(book, at) : false,
    })
  }
  return nights
}

export function weekStripNights(boards, now = new Date(), tagId = '', weekShift = 0) {
  const books = scopedBooks(boards, tagId)
  const fold = (books[0] || boards?.[0])?.dayFoldHour
  const today = boardDate(now, fold)
  const end = addDaysIso(today, weekShift * 7)
  const nights = []
  for (let i = 6; i >= 0; i -= 1) {
    const iso = addDaysIso(end, -i)
    const marks = nightMarks(books, iso, today)
    nights.push({
      iso,
      weekday: weekdayShort(iso),
      dayNum: dayNumber(iso),
      isToday: iso === today,
      ...marks,
    })
  }
  return nights
}

export function monthStripNights(boards, now = new Date(), tagId = '', monthShift = 0) {
  const books = scopedBooks(boards, tagId)
  const fold = (books[0] || boards?.[0])?.dayFoldHour
  const today = boardDate(now, fold)
  const todayDate = parseIsoDate(today) || now
  const start = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthShift, 1)
  const pad = start.getDay()
  const last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const nights = []
  for (let i = 0; i < pad; i += 1) {
    nights.push({
      iso: `pad-${i}`,
      pad: true,
      dayNum: '',
      isToday: false,
      on: false,
      miss: false,
      empty: true,
    })
  }
  for (let day = 1; day <= last; day += 1) {
    const iso = isoDate(new Date(start.getFullYear(), start.getMonth(), day))
    nights.push({
      iso,
      pad: false,
      dayNum: String(day),
      isToday: iso === today,
      ...nightMarks(books, iso, today),
    })
  }
  while (nights.length % 7 !== 0) {
    nights.push({
      iso: `pad-end-${nights.length}`,
      pad: true,
      dayNum: '',
      isToday: false,
      on: false,
      miss: false,
      empty: true,
    })
  }
  return { start, nights }
}

export function comingDays(book, now = new Date(), days = 7) {
  const today = boardDate(now, book.dayFoldHour)
  const nights = []
  for (let i = 0; i < days; i += 1) {
    const iso = addDaysIso(today, i)
    const at = noonOn(iso)
    nights.push({
      iso,
      label: formatBoardDate(iso),
      weekday: weekdayLong(iso),
      isToday: iso === today,
      due: at ? dueTonight(book, at) : [],
    })
  }
  return nights
}

export function weekLamps(nights) {
  const seen = []
  const lamps = []
  for (const night of nights) {
    for (const row of night.due) {
      if (seen.includes(row.lamp.id)) continue
      seen.push(row.lamp.id)
      lamps.push(row.lamp)
    }
  }
  return lamps
}

export function weekCell(night, lamp) {
  const row = night.due.find((item) => item.lamp.id === lamp.id)
  if (!row) return { state: 'off', row: null }
  // Before the question was made it was never due.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(lamp.createdOn || '')) && night.iso < lamp.createdOn) return { state: 'off', row: null }
  // Tonight is still open, not missed.
  if (!row.answer && night.isToday) return { state: 'open', row }
  if (!row.answer) return { state: 'hole', row }
  if (row.answer.status === 'yes') return { state: 'yes', row }
  if (row.answer.status === 'late') return { state: 'late', row }
  if (row.answer.status === 'skip') return { state: 'skip', row }
  return { state: 'hole', row }
}

// Seven nights across the folders in view ('' is every folder).
export function shelfWeekNights(boards, now = new Date(), tagId = '', days = 7) {
  const books = scopedBooks(boards, tagId)
  if (!books.length) return []
  const per = books.map((book) => weekNights(book, now, days))
  return per[0].map((night, at) => ({
    ...night,
    due: per.flatMap((nights) => nights[at]?.due || []),
  }))
}

// Every answer across the folders in view, newest first.
export function shelfFeedRows(boards, tagId = '') {
  return scopedBooks(boards, tagId)
    .flatMap((book) => feedRows(book))
    .sort((a, b) => String(b.answer.answeredAt).localeCompare(String(a.answer.answeredAt)))
}

export function shelfStatsCounts(boards, now = new Date(), tagId = '') {
  const books = scopedBooks(boards, tagId)
  const sum = { hung: 0, down: 0, did: 0, late: 0, skip: 0 }
  for (const book of books) {
    const answers = book.answers || []
    sum.hung += (book.lamps || []).filter((lamp) => !lamp.archived).length
    sum.down += (book.lamps || []).filter((lamp) => lamp.archived).length
    sum.did += answers.filter((answer) => answer.status === 'yes').length
    sum.late += answers.filter((answer) => answer.status === 'late').length
    sum.skip += answers.filter((answer) => answer.status === 'skip').length
  }
  return { ...sum, heat: books.length ? shelfStreak(books, now) : 0 }
}

// Streak goals in order: the two early marks, then the streak tiers.
const STREAK_GOALS = [3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365, 500, 730, 1000]
export function nextStreakGoal(n) {
  return STREAK_GOALS.find((goal) => goal > n) || 0
}

export function feedRows(book) {
  const lamps = book.lamps || []
  return [...(book.answers || [])]
    .sort((a, b) => String(b.answeredAt).localeCompare(String(a.answeredAt)))
    .map((answer) => ({
      answer,
      lamp: lamps.find((item) => item.id === answer.lampId) || null,
    }))
}

export function statsCounts(book, now = new Date()) {
  const answers = book.answers || []
  return {
    hung: (book.lamps || []).filter((lamp) => !lamp.archived).length,
    down: (book.lamps || []).filter((lamp) => lamp.archived).length,
    did: answers.filter((answer) => answer.status === 'yes').length,
    late: answers.filter((answer) => answer.status === 'late').length,
    skip: answers.filter((answer) => answer.status === 'skip').length,
    heat: hallHeat(book, now),
  }
}

const SLOT_ORDER = { morning: 0, whenever: 1, night: 2 }

export function bySlot(rows) {
  return [...rows].sort((a, b) => {
    const left = SLOT_ORDER[a.lamp.slot] ?? 1
    const right = SLOT_ORDER[b.lamp.slot] ?? 1
    return left - right
  })
}

export function tapWhen(answeredAt, now = new Date()) {
  const raw = String(answeredAt || '')
  const [datePart, timePart] = raw.split('T')
  if (!datePart) return ''
  const clock = timePart ? clockWords(timePart) : ''
  const today = isoDate(now)
  const yesterday = addDaysIso(today, -1)
  if (datePart === today) return clock ? t('time.todayAt', { clock }) : t('time.today')
  if (datePart === yesterday) return clock ? t('time.yesterdayAt', { clock }) : t('time.yesterday')
  const date = parseIsoDate(datePart)
  if (!date) return raw
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return clock ? `${day}, ${clock}` : day
}

// A full timestamp (e.g. the last cloud save, stored as UTC) in the phone's
// own time: "today at 10:08 PM", "yesterday at …", "Sep 23, …".
export function stampWhen(stamp, now = new Date()) {
  const date = new Date(String(stamp || ''))
  if (Number.isNaN(date.getTime())) return ''
  const two = (n) => String(n).padStart(2, '0')
  return tapWhen(`${isoDate(date)}T${two(date.getHours())}:${two(date.getMinutes())}`, now)
}

export function tomorrowAsk(book, now = new Date()) {
  const next = comingDays(book, now, 2).find((night) => !night.isToday)
  if (!next || !next.due.length) return ''
  if (next.due.length === 1) {
    return t('home.tomorrowOne', { name: shortLabel(next.due[0].lamp) })
  }
  return t('home.tomorrowMany', { n: next.due.length })
}

export function homeLine(book, now = new Date()) {
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)
  const due = dueTonight(book, now)
  const ready = faceReadyTonight(book, now)
  const waiting = waitingTonight(book, now)
  const open = unansweredTonight(book, now)

  if (!hung.length) {
    return {
      kind: 'empty',
      kicker: t('home.status.empty'),
      title: t('home.line.empty'),
      body: t('home.body.empty'),
      face: '',
    }
  }
  if (!due.length) {
    return {
      kind: 'off',
      kicker: t('home.status.off'),
      title: t('home.line.off'),
      body: t('home.body.off'),
      face: '',
    }
  }
  if (allClearTonight(book, now)) {
    const later = tomorrowAsk(book, now)
    return {
      kind: 'on',
      kicker: t('home.status.on'),
      title: t('home.line.on'),
      body: later ? t('home.body.onLater', { later }) : t('home.body.on'),
      face: '',
    }
  }
  if (ready.length) {
    const first = ready[0]
    return {
      kind: 'ask',
      kicker:
        ready.length === 1
          ? t('home.ask.oneLeft')
          : t('home.ask.nLeft', { n: ready.length }),
      title: first.lamp.question,
      body:
        ready.length === 1
          ? t('home.body.askOne')
          : t('home.body.askMany', { n: open.length }),
      face: first.lamp.id,
    }
  }
  if (waiting.length) {
    const next = [...waiting]
      .filter((row) => row.lamp.askAfter)
      .sort((a, b) => a.lamp.askAfter.localeCompare(b.lamp.askAfter))[0]
    return {
      kind: 'wait',
      kicker: t('home.status.wait'),
      title: t('home.line.wait'),
      body: next
        ? t('home.body.waitOne', {
            name: shortLabel(next.lamp),
            time: clockWords(next.lamp.askAfter),
          })
        : t('home.body.waitMany'),
      face: '',
    }
  }
  return {
    kind: 'ask',
    kicker: t('home.status.ask'),
    title: t('home.line.ask'),
    body: '',
    face: '',
  }
}

export function clockWords(timePart) {
  const match = String(timePart).match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
  if (uses24h()) return `${match[1].padStart(2, '0')}:${match[2]}`
  let hour = Number(match[1])
  const suffix = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${hour}:${match[2]} ${suffix}`
}

export function matchLamps(book, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  const lamps = book.lamps || []
  if (!q) return lamps
  return lamps.filter((lamp) => {
    const blob = [lamp.question, lamp.short, lamp.kind, lamp.notes, shortLabel(lamp)]
      .join(' ')
      .toLowerCase()
    return blob.includes(q)
  })
}

function weekdayLong(iso) {
  const date = parseIsoDate(iso)
  if (!date) return ''
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function weekdayShort(iso) {
  const date = parseIsoDate(iso)
  if (!date) return ''
  return date.toLocaleDateString('en-US', { weekday: 'narrow' })
}

function dayNumber(iso) {
  const date = parseIsoDate(iso)
  if (!date) return ''
  return String(date.getDate())
}
