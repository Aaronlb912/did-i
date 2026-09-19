import { hallHeat } from './hall-feel.js'
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
import { shortLabel } from './board-json.js'

export { streakLength } from './achievements.js'

const WELCOME_KEY = 'did-i-welcome'

export function welcomeSeen() {
  try {
    return localStorage.getItem(WELCOME_KEY) === '1'
  } catch {
    return true
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
  if (!row.answer) return { state: 'hole', row }
  if (row.answer.status === 'yes') return { state: 'yes', row }
  if (row.answer.status === 'late') return { state: 'late', row }
  if (row.answer.status === 'skip') return { state: 'skip', row }
  return { state: 'hole', row }
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
  if (datePart === today) return clock ? `Today ${clock}` : 'Today'
  if (datePart === yesterday) return clock ? `Yesterday ${clock}` : 'Yesterday'
  const date = parseIsoDate(datePart)
  if (!date) return raw
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return clock ? `${day}, ${clock}` : day
}

export function tomorrowAsk(book, now = new Date()) {
  const next = comingDays(book, now, 2).find((night) => !night.isToday)
  if (!next || !next.due.length) return ''
  if (next.due.length === 1) return `Tomorrow: ${shortLabel(next.due[0].lamp)}.`
  return `Tomorrow: ${next.due.length} questions.`
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
      kicker: 'No questions yet',
      title: 'No questions yet.',
      body: 'Pick a usual question, or write your own.',
      face: '',
    }
  }
  if (!due.length) {
    return {
      kind: 'off',
      kicker: 'Today',
      title: 'Nothing is due today.',
      body: 'Your questions are waiting for their day.',
      face: '',
    }
  }
  if (allClearTonight(book, now)) {
    const heat = hallHeat(book, now)
    const later = tomorrowAsk(book, now)
    return {
      kind: 'on',
      kicker: 'Done',
      title: 'That is everything for tonight.',
      body: later ? `Streak is ${heat} of 5. ${later}` : `Streak is ${heat} of 5. Come back tomorrow.`,
      face: '',
    }
  }
  if (ready.length) {
    const first = ready[0]
    return {
      kind: 'ask',
      kicker: ready.length === 1 ? 'One left' : `${ready.length} left`,
      title: first.lamp.question,
      body:
        ready.length === 1
          ? 'One more and the streak goes up.'
          : `${open.length} still open. Finish them and the streak goes up.`,
      face: first.lamp.id,
    }
  }
  if (waiting.length) {
    const next = [...waiting]
      .filter((row) => row.lamp.askAfter)
      .sort((a, b) => a.lamp.askAfter.localeCompare(b.lamp.askAfter))[0]
    return {
      kind: 'wait',
      kicker: 'Not yet',
      title: 'Nothing to answer right now.',
      body: next
        ? `${shortLabel(next.lamp)} opens at ${clockWords(next.lamp.askAfter)}.`
        : 'These open later tonight.',
      face: '',
    }
  }
  return {
    kind: 'ask',
    kicker: 'Tonight',
    title: 'Open tonight.',
    body: '',
    face: '',
  }
}

export function clockWords(timePart) {
  const match = String(timePart).match(/^(\d{1,2}):(\d{2})/)
  if (!match) return ''
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
