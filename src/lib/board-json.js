import { boardDate, isoDate } from './recurrence.js'

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function newLampId() {
  return uid('di')
}

export function newAnswerId() {
  return uid('ans')
}

const KINDS = ['house', 'pills', 'money', 'people', 'other']
const CADENCES = ['daily', 'weekly', 'monthly', 'once', 'every_n']
const SLOTS = ['morning', 'whenever', 'night']
const STATUSES = ['yes', 'skip', 'late']

function asString(value) {
  return String(value == null ? '' : value)
}

function asBool(value) {
  return Boolean(value)
}

export function blankLamp(now = new Date()) {
  return {
    id: newLampId(),
    question: '',
    short: '',
    kind: 'other',
    cadence: 'daily',
    weekdays: [],
    monthDay: '',
    everyN: '',
    everyNAnchor: '',
    onceOn: '',
    askAfter: '',
    slot: 'whenever',
    notes: '',
    archived: false,
    createdOn: isoDate(now),
  }
}

export function blankBook() {
  return {
    version: 1,
    title: 'My hall',
    dayFoldHour: 4,
    quietMode: false,
    inkNote: '',
    lamps: [],
    answers: [],
    unlocked: [],
  }
}

export function emptyBoard() {
  return blankBook()
}

export function normalizeLamp(raw) {
  const lamp = raw && typeof raw === 'object' ? raw : {}
  const kind = KINDS.includes(lamp.kind) ? lamp.kind : 'other'
  const cadence = CADENCES.includes(lamp.cadence) ? lamp.cadence : 'daily'
  const slot = SLOTS.includes(lamp.slot) ? lamp.slot : 'whenever'
  const weekdays = Array.isArray(lamp.weekdays)
    ? lamp.weekdays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6)
    : []
  let monthDay = lamp.monthDay
  if (monthDay !== 'last') {
    const n = Number(monthDay)
    monthDay = Number.isInteger(n) && n >= 1 && n <= 31 ? n : ''
  }
  const everyNRaw = Number(lamp.everyN)
  const everyN = Number.isInteger(everyNRaw) && everyNRaw >= 2 ? everyNRaw : ''
  return {
    id: asString(lamp.id) || newLampId(),
    question: asString(lamp.question).trim(),
    short: asString(lamp.short).trim(),
    kind,
    cadence,
    weekdays,
    monthDay,
    everyN,
    everyNAnchor: asString(lamp.everyNAnchor).trim(),
    onceOn: asString(lamp.onceOn).trim(),
    askAfter: asString(lamp.askAfter).trim(),
    slot,
    notes: asString(lamp.notes),
    archived: asBool(lamp.archived),
    createdOn: asString(lamp.createdOn).trim() || isoDate(new Date()),
  }
}

export function normalizeAnswer(raw) {
  const answer = raw && typeof raw === 'object' ? raw : {}
  const status = STATUSES.includes(answer.status) ? answer.status : 'yes'
  return {
    id: asString(answer.id) || newAnswerId(),
    lampId: asString(answer.lampId),
    periodKey: asString(answer.periodKey),
    status,
    answeredAt: asString(answer.answeredAt),
    note: asString(answer.note),
  }
}

export function normalizeBook(raw) {
  const book = raw && typeof raw === 'object' ? raw : {}
  const fold = Number(book.dayFoldHour)
  return {
    version: 1,
    title: asString(book.title).trim() || 'My hall',
    dayFoldHour: Number.isInteger(fold) && fold >= 0 && fold <= 12 ? fold : 4,
    quietMode: asBool(book.quietMode),
    inkNote: asString(book.inkNote),
    lamps: Array.isArray(book.lamps) ? book.lamps.map(normalizeLamp) : [],
    answers: Array.isArray(book.answers) ? book.answers.map(normalizeAnswer) : [],
    unlocked: Array.isArray(book.unlocked)
      ? book.unlocked.map((id) => asString(id)).filter(Boolean)
      : [],
  }
}

export function shortLabel(lamp) {
  const short = asString(lamp.short).trim()
  if (short) return short
  const question = asString(lamp.question).trim()
  const cleaned = question.replace(/^did i\s+/i, '').replace(/\?+$/, '').trim()
  if (!cleaned) return 'Lamp'
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function missLamp(lamp) {
  if (!asString(lamp.question).trim()) return 'The question is empty.'
  if (lamp.cadence === 'weekly' && !(lamp.weekdays && lamp.weekdays.length)) {
    return 'A weekly lamp needs a weekday.'
  }
  if (lamp.cadence === 'monthly' && lamp.monthDay !== 'last' && !lamp.monthDay) {
    return 'A monthly lamp needs a day.'
  }
  if (lamp.cadence === 'every_n') {
    const n = Number(lamp.everyN)
    if (!Number.isInteger(n) || n < 2) return 'Every N needs a number of 2 or more.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asString(lamp.everyNAnchor))) {
      return 'Every N needs a start date.'
    }
  }
  const after = asString(lamp.askAfter).trim()
  if (after && !/^([01]\d|2[0-3]):[0-5]\d$/.test(after)) {
    return 'Ask after has to be a time like 20:00, or blank.'
  }
  return ''
}

export function parseBookText(text) {
  try {
    const parsed = JSON.parse(text)
    return { ok: true, book: normalizeBook(parsed) }
  } catch {
    return { ok: false, reason: 'That file is not a Did I board.' }
  }
}

export function downloadBook(book) {
  const blob = new Blob([JSON.stringify(book, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = boardDate(new Date(), book.dayFoldHour)
  const slug = String(book.title || 'hall')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'hall'
  link.href = url
  link.download = `${slug}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export function answeredAtIso(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${isoDate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function addUnlock(book, id) {
  if (book.unlocked.includes(id)) return book
  return { ...book, unlocked: [...book.unlocked, id] }
}

export function duplicateLamp(lamp, now = new Date()) {
  const copy = normalizeLamp(lamp)
  copy.id = newLampId()
  copy.createdOn = isoDate(now)
  copy.archived = false
  const short = shortLabel(copy)
  if (!copy.short) copy.short = short
  copy.short = `${copy.short} copy`
  return copy
}

export function cadenceLine(lamp) {
  if (lamp.cadence === 'daily') return 'Every day'
  if (lamp.cadence === 'weekly') {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const days = (lamp.weekdays || []).map((day) => names[day]).filter(Boolean)
    if (!days.length) return 'Weekly'
    return days.join(', ')
  }
  if (lamp.cadence === 'monthly') {
    if (lamp.monthDay === 'last') return 'Last day of the month'
    if (lamp.monthDay) return `Monthly on the ${lamp.monthDay}`
    return 'Monthly'
  }
  if (lamp.cadence === 'once') return 'Once'
  if (lamp.cadence === 'every_n') return `Every ${lamp.everyN} days`
  return lamp.cadence
}
