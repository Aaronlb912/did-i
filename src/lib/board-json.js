import { t } from './i18n.js'
import { readPrefs } from './prefs.js'
import { activeDeadline, isOnceBy, mustSwipeDeadline } from './lamp-deadline.js'
import { trimWas, addDaysIso, boardDate, formatBoardDate, isoDate } from './recurrence.js'
import { normalizePurse } from './purse.js'
import { capSkips } from './travel.js'
import { dayPreset } from './hang-schedule.js'

export { activeDeadline, isOnceBy, mustSwipeDeadline } from './lamp-deadline.js'

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const WAS_CADENCE = new Set(['daily', 'weekly', 'monthly', 'every_n'])

function cleanWas(was) {
  if (!Array.isArray(was)) return []
  return trimWas(was
    .filter((old) => old && ISO_DAY.test(String(old.until)) && WAS_CADENCE.has(old.cadence))
    .map((old) => ({
      until: String(old.until),
      cadence: old.cadence,
      weekdays: Array.isArray(old.weekdays) ? old.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [],
      monthDay: old.monthDay === 'last' ? 'last' : Number.isInteger(Number(old.monthDay)) && old.monthDay !== '' ? Number(old.monthDay) : '',
      everyN: Number.isInteger(Number(old.everyN)) && old.everyN !== '' ? Number(old.everyN) : '',
      everyNAnchor: ISO_DAY.test(String(old.everyNAnchor)) ? String(old.everyNAnchor) : '',
      ...(Number.isInteger(old.perWeek) && old.perWeek >= 1 && old.perWeek <= 6 ? { perWeek: old.perWeek } : {}),
    }))
    .sort((x, y) => (x.until < y.until ? -1 : 1)))
}

export function newLampId() {
  return uid('di')
}

export function newBoardId() {
  return uid('board')
}

export function newAnswerId() {
  return uid('ans')
}

const LEGACY_KINDS = ['house', 'pills', 'money', 'people', 'other']
// Topics live in lamp.kind as one comma-separated string ("Pets, Morning").
const KIND_MAX = 160
export const QUESTION_MAX = 120
const TOPICS_MAX = 8
const CADENCES = ['daily', 'weekly', 'monthly', 'once', 'every_n', 'every']
const SLOTS = ['morning', 'whenever', 'night']

export function slotFromAskAfter(askAfter) {
  const after = asString(askAfter).trim()
  if (!after) return 'whenever'
  const hour = Number(after.split(':')[0])
  if (Number.isNaN(hour)) return 'whenever'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'whenever'
  return 'night'
}
const SECOND_TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const STATUSES = ['yes', 'skip', 'late']
const SEND_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PRIORITIES = ['high', 'normal', 'low']

export function lampPriority(lamp) {
  return PRIORITIES.includes(lamp?.priority) ? lamp.priority : 'normal'
}

// High first, low last. Anything else keeps the order it came in.
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 }

export function byPriority(rows) {
  return [...rows]
    .map((row, at) => ({ row, at }))
    .sort((a, b) => {
      const gap =
        PRIORITY_RANK[lampPriority(a.row.lamp)] - PRIORITY_RANK[lampPriority(b.row.lamp)]
      return gap || a.at - b.at
    })
    .map((item) => item.row)
}

function askKey(lamp) {
  const after = asString(lamp?.askAfter).trim()
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(after) ? after : ''
}

// The order someone set by hand on Questions. Questions never moved have none
// and come after the ones that were.
export function lampOrder(lamp) {
  const n = Number(lamp?.order)
  return lamp?.order !== '' && lamp?.order != null && Number.isFinite(n) ? n : Infinity
}

// Tonight's order: questions with no set time first (they can be asked all
// evening), then by ask time. A hand-set order comes next, then priority.
export function byAskTime(rows) {
  return byPriority(rows)
    .map((row, at) => ({ row, at }))
    .sort((a, b) => {
      const time = askKey(a.row.lamp).localeCompare(askKey(b.row.lamp))
      if (time) return time
      const ao = lampOrder(a.row.lamp)
      const bo = lampOrder(b.row.lamp)
      if (ao !== bo) return ao === Infinity ? 1 : bo === Infinity ? -1 : ao - bo
      return a.at - b.at
    })
    .map((item) => item.row)
}

// Sets the hand order for these lamps (ids in the new order) across books.
export function setLampOrder(books, ids) {
  const rank = new Map(ids.map((id, at) => [id, at]))
  return books.map((book) => {
    const lamps = book.lamps || []
    if (!lamps.some((lamp) => rank.has(lamp.id) && lamp.order !== rank.get(lamp.id))) return book
    return {
      ...book,
      lamps: lamps.map((lamp) => (rank.has(lamp.id) ? { ...lamp, order: rank.get(lamp.id) } : lamp)),
    }
  })
}

// Low never buzzes. High gets a second nudge late if it is still open.
export function lampBuzzes(lamp) {
  return lampNotifyOn(lamp) && lampPriority(lamp) !== 'low'
}

export function lampNudgesLate(lamp) {
  return lampBuzzes(lamp) && lampPriority(lamp) === 'high'
}

export function lampNotifyOn(lamp) {
  return lamp?.notify !== false
}

export function dueByUrgency(lamp, dateIso) {
  const dueBy = activeDeadline(lamp, dateIso)
  if (!dueBy) return ''
  if (dueBy === dateIso) return 'today'
  if (dueBy === addDaysIso(dateIso, 1)) return 'soon'
  return ''
}

export function prepQuestionRows(rows, { dateIso, deadlineOnly = false }) {
  let out = rows
  if (deadlineOnly) out = out.filter((row) => activeDeadline(row.lamp, dateIso))
  return [...out].sort((a, b) => {
    const aDue = activeDeadline(a.lamp, dateIso)
    const bDue = activeDeadline(b.lamp, dateIso)
    if (aDue && bDue) return aDue.localeCompare(bDue)
    if (aDue) return -1
    if (bDue) return 1
    return 0
  })
}

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
    kind: '',
    cadence: 'daily',
    weekdays: [],
    monthDay: '',
    everyN: '',
    everyNAnchor: '',
    everyDays: '',
    onceOn: '',
    onceWhen: 'on',
    dueBy: '',
    askAfter: '',
    slot: 'whenever',
    notes: '',
    priority: 'normal',
    notify: true,
    archived: false,
    createdOn: isoDate(now),
  }
}

export function blankBook() {
  return {
    version: 1,
    title: t('tags.general'),
    keeperName: '',
    dayFoldHour: 0,
    quietMode: false,
    clickSound: false,
    inkNote: '',
    lamps: [],
    answers: [],
    unlocked: [],
    opens: [],
    archived: false,
    coins: 0,
    gems: 0,
    cheers: ['lime'],
    cheerOn: 'lime',
    looks: ['lime'],
    lookOn: 'lime',
    buddies: [],
    buddyOn: '',
    friendCheers: 0,
  }
}

export function emptyBoard() {
  return blankBook()
}

// When the user last edited this question or folder (ISO). Sync keeps the later edit.
function cleanAt(value) {
  const at = asString(value).trim()
  return at && Number.isFinite(Date.parse(at)) ? at : ''
}

export function normalizeLamp(raw) {
  const lamp = raw && typeof raw === 'object' ? raw : {}
  const kind = asString(lamp.kind).trim().slice(0, KIND_MAX)
  const cadence = CADENCES.includes(lamp.cadence) ? lamp.cadence : 'daily'
  const askAfter = asString(lamp.askAfter).trim()
  const slot = askAfter
    ? slotFromAskAfter(askAfter)
    : SLOTS.includes(lamp.slot)
      ? lamp.slot
      : 'whenever'
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
  const everyDaysRaw = Number(lamp.everyDays)
  const everyDays = cadence === 'every' && Number.isInteger(everyDaysRaw) && everyDaysRaw >= 1 && everyDaysRaw <= 365 ? everyDaysRaw : ''
  return {
    id: asString(lamp.id) || newLampId(),
    question: asString(lamp.question).trim().slice(0, QUESTION_MAX),
    short: asString(lamp.short).trim(),
    kind,
    cadence,
    weekdays,
    monthDay,
    everyN,
    everyNAnchor: asString(lamp.everyNAnchor).trim(),
    everyDays,
    onceOn: asString(lamp.onceOn).trim(),
    onceWhen: cadence === 'once' && lamp.onceWhen === 'by' ? 'by' : cadence === 'once' ? 'on' : '',
    dueBy:
      cadence === 'once' && lamp.onceWhen === 'by' ? asString(lamp.dueBy).trim() : '',
    askAfter,
    // First day askAfter holds; before it the question is open all day.
    ...(askAfter && /^\d{4}-\d{2}-\d{2}$/.test(asString(lamp.askFrom).trim()) ? { askFrom: asString(lamp.askFrom).trim() } : {}),
    // A second reminder time. Only with a first one. Builds without it drop it on save.
    ...(askAfter && SECOND_TIME.test(asString(lamp.askAfter2).trim()) && asString(lamp.askAfter2).trim() !== askAfter ? { askAfter2: asString(lamp.askAfter2).trim() } : {}),
    // Last day it is asked. After it the question is not due; its history stays.
    ...(cadence !== 'once' && /^\d{4}-\d{2}-\d{2}$/.test(asString(lamp.endsOn).trim()) ? { endsOn: asString(lamp.endsOn).trim() } : {}),
    slot,
    notes: asString(lamp.notes).slice(0, 500),
    priority: lampPriority(lamp),
    notify: lampNotifyOn(lamp),
    archived: asBool(lamp.archived),
    // The day it was paused, so its record stops counting from there.
    ...(asBool(lamp.archived) && /^\d{4}-\d{2}-\d{2}$/.test(asString(lamp.pausedOn).trim()) ? { pausedOn: asString(lamp.pausedOn).trim() } : {}),
    ...(asPauses(lamp.pauses).length ? { pauses: asPauses(lamp.pauses) } : {}),
    ...(Number.isInteger(Number(lamp.order)) && lamp.order !== '' && lamp.order != null && Number(lamp.order) >= 0
      ? { order: Math.min(Number(lamp.order), 9999) }
      : {}),
    createdOn: asString(lamp.createdOn).trim() || isoDate(new Date()),
    ...(cleanAt(lamp.at) ? { at: cleanAt(lamp.at) } : {}),
    // Schedules it had before an edit (recurrence.js scheduleAt).
    ...(cleanWas(lamp.was).length ? { was: cleanWas(lamp.was) } : {}),
    // Put on your tonight for you (a Did you auto-added from family or a
    // friend you allow): a did counts, a nope or no answer does not count
    // against you. Only set when true, so other questions are unchanged.
    ...(asBool(lamp.optional) ? { optional: true } : {}),
    // Kept for a later N-times-a-week cadence, so an older build's save does not drop it.
    ...(Number.isInteger(Number(lamp.perWeek)) && lamp.perWeek !== '' && lamp.perWeek != null && Number(lamp.perWeek) >= 1 && Number(lamp.perWeek) <= 6 ? { perWeek: Number(lamp.perWeek) } : {}),
    // Added from the morning ask (morning-ask.js); the server keeps 30 a day.
    ...(asBool(lamp.morning) && cadence === 'once' ? { morning: true } : {}),
    // Kept from a did you; fromName is who sent it, when known.
    ...(asBool(lamp.fromDidYou) ? { fromDidYou: true } : {}),
    ...(asBool(lamp.fromDidYou) && asString(lamp.fromName).trim()
      ? { fromName: asString(lamp.fromName).trim().slice(0, 40) }
      : {}),
    // The send it was kept from, so its sender can see the answers
    // (send-answers.js); shareOff when the keeper turned that off.
    ...(asBool(lamp.fromDidYou) && SEND_ID.test(asString(lamp.fromId)) ? { fromId: asString(lamp.fromId).toLowerCase() } : {}),
    ...(asBool(lamp.fromDidYou) && SEND_ID.test(asString(lamp.sendId)) ? { sendId: asString(lamp.sendId).toLowerCase() } : {}),
    ...(asBool(lamp.fromDidYou) && asBool(lamp.shareOff) ? { shareOff: true } : {}),
    ...(asBool(lamp.fromDidYou) && asBool(lamp.wantsPhoto) ? { wantsPhoto: true } : {}),
    // Put on one night's tonight by Did I itself: answer it if you like, it
    // never counts for or against a streak.
    ...(asBool(lamp.fromDidI) ? { fromDidI: true } : {}),
    // The starter idea it was added from (starters.js), so the idea stays
    // taken in any language.
    ...(/^[a-z]{1,20}$/.test(asString(lamp.idea)) ? { idea: asString(lamp.idea) } : {}),
    // Track an amount: the note sheet asks for a number too. Only set when on.
    ...(asBool(lamp.trackAmount)
      ? { trackAmount: true, ...(amountUnitOf(lamp) ? { amountUnit: amountUnitOf(lamp) } : {}) }
      : {}),
  }
}

// An amount on one night's answer, and the unit a question counts it in.
// The server holds the same range (answer_log_amount in answers.sql).
export const AMOUNT_MAX = 100000
export const UNIT_MAX = 24

export function amountUnitOf(lamp) {
  return asString(lamp?.amountUnit).replace(/\s+/g, ' ').trim().slice(0, UNIT_MAX)
}

// A number from 0 to AMOUNT_MAX, two places at most, or null. A comma reads as a decimal point.
// "1,500" and "1.500,5" are thousands; a lone comma otherwise is a decimal point.
// Where the app's language writes 1,5 for one and a half, "1,250" is 1.25.
const COMMA_DECIMAL = new Set(['de', 'es', 'fr', 'it', 'pt'])
function decimalText(text) {
  const dot = text.lastIndexOf('.')
  const comma = text.lastIndexOf(',')
  if (dot >= 0 && comma >= 0) return dot > comma ? text.replace(/,/g, '') : text.replace(/\./g, '').replace(',', '.')
  // There a dot groups thousands: "1.500" is fifteen hundred, not one and a half.
  if (/^\d{1,3}(\.\d{3})+$/.test(text) && COMMA_DECIMAL.has(readPrefs().locale)) return text.replace(/\./g, '')
  if (/^\d{1,3}(,\d{3})+$/.test(text) && !COMMA_DECIMAL.has(readPrefs().locale)) return text.replace(/,/g, '')
  return text.replace(',', '.')
}

export function cleanAmount(value) {
  if (value === null || value === undefined) return null
  const text = typeof value === 'number' ? String(value) : decimalText(String(value).trim())
  if (!text) return null
  const n = Number(text)
  if (!Number.isFinite(n) || n < 0 || n > AMOUNT_MAX) return null
  return Math.round(n * 100) / 100
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
    // When the note was last saved; answeredAt stays the tap.
    ...(asString(answer.noteAt) ? { noteAt: asString(answer.noteAt) } : {}),
    ...(cleanAmount(answer.amount) !== null ? { amount: cleanAmount(answer.amount) } : {}),
    // This night was a Did once, so it counts toward the night's paid taps
    // even after it turns into a Not yet (purse.js payTap).
    ...(answer.paid === true ? { paid: true } : {}),
    // A Not yet made with no answer on this phone; a Did elsewhere beats it (board-ops.js mergeAnswer).
    ...(answer.first === true && status === 'skip' ? { first: true } : {}),
  }
}

// Questions taken off this tag, so a sync with an older phone does not bring
// them back. back: true means it was put back later; the newest entry wins.
const GONE_MAX = 300

export function normalizeGone(list) {
  if (!Array.isArray(list)) return []
  const latest = new Map()
  for (const raw of list) {
    const id = asString(raw?.id).trim()
    const at = asString(raw?.at)
    if (!id || !at) continue
    const prev = latest.get(id)
    if (!prev || at > prev.at) latest.set(id, { id, at, ...(raw.back ? { back: true } : {}) })
  }
  return [...latest.values()].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, GONE_MAX)
}

export function normalizeBook(raw) {
  const book = raw && typeof raw === 'object' ? raw : {}
  const purse = normalizePurse(book)
  return {
    version: 1,
    id: asString(book.id).trim() || newBoardId(),
    title: asString(book.title).trim() || t('tags.general'),
    keeperName: asString(book.keeperName).trim(),
    dayFoldHour: 0,
    quietMode: asBool(book.quietMode),
    clickSound: asBool(book.clickSound),
    inkNote: asString(book.inkNote),
    archived: asBool(book.archived),
    ...(Number.isFinite(book.order) ? { order: book.order } : {}),
    ...(cleanAt(book.at) ? { at: cleanAt(book.at) } : {}),
    lamps: Array.isArray(book.lamps) ? book.lamps.map(normalizeLamp) : [],
    answers: Array.isArray(book.answers) ? book.answers.map(normalizeAnswer) : [],
    gone: normalizeGone(book.gone),
    unlocked: Array.isArray(book.unlocked)
      ? book.unlocked.map((id) => asString(id)).filter(Boolean)
      : [],
    opens: Array.isArray(book.opens)
      ? book.opens.map((day) => asString(day).trim()).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
      : [],
    travelSkips: capSkips(book.travelSkips),
    coins: purse.coins,
    gems: purse.gems,
    cheers: purse.cheers,
    cheerOn: purse.cheerOn,
    cheerUses: purse.cheerUses,
    cheerStage: purse.cheerStage,
    cheerStages: purse.cheerStages,
    cheerPlayStages: purse.cheerPlayStages,
    looks: purse.looks,
    lookOn: purse.lookOn,
    buddies: purse.buddies,
    buddyOn: purse.buddyOn,
    accessories: purse.accessories,
    worn: purse.worn,
    frames: purse.frames,
    frame: purse.frame,
    friendCheers: purse.friendCheers,
    wish: purse.wish,
    ...(Object.keys(purse.later).length ? { later: purse.later } : {}),
  }
}


export function topicLabel(topic) {
  return LEGACY_KINDS.includes(topic) ? t(`hang.kind.${topic}`) : topic
}

// A question's topics, trimmed, no repeats (case-insensitive), at most TOPICS_MAX.
export function topicsOf(lamp) {
  const seen = new Set()
  const out = []
  for (const raw of asString(lamp?.kind).split(',')) {
    const topic = raw.trim()
    const key = topic.toLowerCase()
    if (!topic || seen.has(key)) continue
    seen.add(key)
    out.push(topic)
    if (out.length >= TOPICS_MAX) break
  }
  return out
}

export function joinTopics(list) {
  return topicsOf({ kind: (list || []).join(',') }).join(', ').slice(0, KIND_MAX)
}

// Every topic used on the shelf, for picking and filtering.
export function shelfTopics(boards) {
  const seen = new Map()
  for (const book of boards || []) {
    for (const lamp of book.lamps || []) {
      for (const topic of topicsOf(lamp)) {
        const key = topic.toLowerCase()
        if (!seen.has(key)) seen.set(key, topic)
      }
    }
  }
  return [...seen.values()].sort((a, b) => topicLabel(a).localeCompare(topicLabel(b)))
}

export function hasAnyTopic(lamp, picks) {
  if (!picks?.length) return true
  const mine = topicsOf(lamp).map((topic) => topic.toLowerCase())
  return picks.some((pick) => mine.includes(pick.toLowerCase()))
}

export function kindLabel(lamp) {
  return topicsOf(lamp).map(topicLabel).join(', ')
}

export function shortFromQuestion(question, max = 0) {
  const text = asString(question).trim()
  if (!text) return ''
  const cleaned = text.replace(/^did i\s+/i, '').replace(/\?+$/, '').trim()
  if (!cleaned) return ''
  const out = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  return max > 0 ? out.slice(0, max) : out
}

// Whatever finishes "Did I ___" becomes a whole question. A pasted
// "Did I lock the door?" does not double up.
export function didQuestion(raw) {
  const text = asString(raw)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^did i\b\s*/i, '')
    .replace(/\?+$/, '')
    .trim()
  if (!text) return ''
  // Only a plain word ("Lock") loses its capital, the one a phone adds at the
  // start. Acronyms, names with digits or inner capitals stay as typed.
  const first = text.split(' ')[0]
  const rest = /^\p{Lu}\p{Ll}+$/u.test(first) ? text.charAt(0).toLowerCase() + text.slice(1) : text
  return `Did I ${rest}?`
}

// Words that start a habit someone wants to stop ("no sugar", "quit vaping").
// Asked that way, a clean day is a Not yet. Whole words only: "notice" is fine.
export function soundsStop(raw) {
  const text = asString(raw).trim().replace(/^did i\b\s*/i, '')
  return /^(no|not|stop|quit|don['\u2019]?t|never|avoid)(?![\p{L}\p{N}])/iu.test(text)
}

export function shortLabel(lamp) {
  const short = asString(lamp?.short).trim()
  if (short) return short
  const cleaned = shortFromQuestion(lamp?.question)
  if (!cleaned) return t('lamp.unnamed')
  return cleaned
}

export function missLamp(lamp) {
  if (!asString(lamp.question).trim()) return 'hang.miss.empty'
  if (lamp.cadence === 'weekly' && !(lamp.weekdays && lamp.weekdays.length)) {
    return 'hang.miss.weekday'
  }
  if (lamp.cadence === 'monthly' && lamp.monthDay !== 'last' && !lamp.monthDay) {
    return 'hang.miss.monthDay'
  }
  if (lamp.cadence === 'once') {
    if (isOnceBy(lamp)) {
      const dueBy = asString(lamp.dueBy).trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueBy)) return 'hang.miss.dueBy'
      const start = asString(lamp.createdOn).trim()
      if (start && dueBy < start) return 'hang.miss.dueByBefore'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(asString(lamp.onceOn))) {
      return 'hang.miss.onceOn'
    } else {
      // A day before the question existed would never be asked.
      const start = asString(lamp.createdOn).trim() || isoDate(new Date())
      if (lamp.onceOn < start) return 'hang.miss.onceOn'
    }
  }
  if (lamp.cadence === 'every_n') {
    const n = Number(lamp.everyN)
    if (!Number.isInteger(n) || n < 2) return 'hang.miss.everyN'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asString(lamp.everyNAnchor))) {
      return 'hang.miss.everyNStart'
    }
  }
  if (lamp.cadence === 'every') {
    const n = Number(lamp.everyDays)
    if (!Number.isInteger(n) || n < 1 || n > 365) return 'hang.miss.everyDays'
  }
  const after = asString(lamp.askAfter).trim()
  if (after && !/^([01]\d|2[0-3]):[0-5]\d$/.test(after)) {
    return 'hang.miss.askAfter'
  }
  const second = asString(lamp.askAfter2).trim()
  if (second && !SECOND_TIME.test(second)) return 'hang.miss.askAfter'
  return ''
}

export function parseBookText(text) {
  try {
    const parsed = JSON.parse(text)
    return { ok: true, book: normalizeBook(parsed) }
  } catch {
    return { ok: false, reason: 'settings.loadMiss' }
  }
}

export function downloadBook(book) {
  const blob = new Blob([JSON.stringify(book, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = boardDate(new Date(), book.dayFoldHour)
  const slug = String(book.title || 'board')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'board'
  link.href = url
  link.download = `${slug}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

// UTC. Rows saved before this are zoneless local time; read them with stampMs.
export function answeredAtIso(now = new Date()) {
  return now.toISOString()
}

export function addUnlock(book, id) {
  if (book.unlocked.includes(id)) return book
  return { ...book, unlocked: [...book.unlocked, id] }
}

// The short name field's length limit.
export const SHORT_MAX = 24

// A size guard, not a rule: dropping a span would turn its days into misses.
export const PAUSES_MAX = 64

// Resumed pauses as [from, until) day pairs, newest PAUSES_MAX.
function asPauses(list) {
  if (!Array.isArray(list)) return []
  const day = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  return list.filter((pair) => Array.isArray(pair) && day(pair[0]) && day(pair[1]) && pair[0] < pair[1]).map(([from, until]) => [from, until]).slice(-PAUSES_MAX)
}

export function duplicateLamp(lamp, now = new Date()) {
  const copy = normalizeLamp(lamp)
  copy.id = newLampId()
  copy.createdOn = isoDate(now)
  copy.archived = false
  delete copy.pausedOn
  delete copy.pauses
  // Trim the name first so " copy" always fits inside the limit.
  const suffix = ` ${t('lamp.copySuffix')}`
  const full = shortLabel(copy)
  const room = Math.max(0, SHORT_MAX - suffix.length)
  if (full.length <= room) {
    copy.short = `${full}${suffix}`
    return copy
  }
  // Cut on a word and mark the cut, so a word is never swapped for "copy".
  const cut = full.slice(0, room - 1)
  const word = cut.lastIndexOf(' ') > 0 ? cut.slice(0, cut.lastIndexOf(' ')) : cut
  copy.short = `${word.trim()}…${suffix}`
  return copy
}

export function cadenceLine(lamp) {
  if (lamp.cadence === 'daily') return t('cadence.daily')
  if (lamp.cadence === 'weekly') {
    const days = (lamp.weekdays || []).map((day) => t(`hang.day.${day}`)).filter(Boolean)
    if (!days.length) return t('cadence.weekly')
    const preset = dayPreset(lamp.weekdays)
    if (preset) return t(`cadence.${preset}`)
    return days.join(', ')
  }
  if (lamp.cadence === 'monthly') {
    if (lamp.monthDay === 'last') return t('cadence.monthlyLast')
    if (lamp.monthDay) return t('cadence.monthlyOn', { day: lamp.monthDay })
    return t('cadence.monthly')
  }
  if (lamp.cadence === 'once') {
    if (isOnceBy(lamp)) {
      const due = asString(lamp.dueBy).trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        return t('cadence.onceBy', { date: formatBoardDate(due) })
      }
      return t('cadence.once')
    }
    const on = asString(lamp.onceOn).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(on)) return t('cadence.onceOn', { date: formatBoardDate(on) })
    return t('cadence.once')
  }
  if (lamp.cadence === 'daily' && Number(lamp.perWeek) >= 1) return Number(lamp.perWeek) === 1 ? t('cadence.perWeekOne') : t('cadence.perWeek', { n: lamp.perWeek })
  if (lamp.cadence === 'every') return Number(lamp.everyDays) >= 1 ? t('cadence.every', { n: lamp.everyDays }) : t('hang.every')
  if (lamp.cadence === 'every_n') return Number(lamp.everyN) >= 2 ? t('cadence.everyN', { n: lamp.everyN }) : t('hang.everyN')
  return lamp.cadence
}
