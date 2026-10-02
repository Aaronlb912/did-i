import { t } from './i18n.js'
import { activeDeadline, isOnceBy, mustSwipeDeadline } from './lamp-deadline.js'
import { addDaysIso, boardDate, formatBoardDate, isoDate } from './recurrence.js'
import { normalizePurse } from './purse.js'

export { activeDeadline, isOnceBy, mustSwipeDeadline } from './lamp-deadline.js'

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
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
const TOPICS_MAX = 8
const CADENCES = ['daily', 'weekly', 'monthly', 'once', 'every_n']
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
const STATUSES = ['yes', 'skip', 'late']
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

// Tonight's order: questions with no set time first (they can be asked all
// evening), then by ask time. Priority breaks ties.
export function byAskTime(rows) {
  return byPriority(rows)
    .map((row, at) => ({ row, at }))
    .sort((a, b) => askKey(a.row.lamp).localeCompare(askKey(b.row.lamp)) || a.at - b.at)
    .map((item) => item.row)
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
    onceWhen: cadence === 'once' && lamp.onceWhen === 'by' ? 'by' : cadence === 'once' ? 'on' : '',
    dueBy:
      cadence === 'once' && lamp.onceWhen === 'by' ? asString(lamp.dueBy).trim() : '',
    askAfter,
    slot,
    notes: asString(lamp.notes),
    priority: lampPriority(lamp),
    notify: lampNotifyOn(lamp),
    archived: asBool(lamp.archived),
    createdOn: asString(lamp.createdOn).trim() || isoDate(new Date()),
    // Put on your tonight for you (a Did you auto-added from family or a
    // friend you allow): a did counts, a nope or no answer does not count
    // against you. Only set when true, so other questions are unchanged.
    ...(asBool(lamp.optional) ? { optional: true } : {}),
    // Kept from a did you; fromName is who sent it, when known.
    ...(asBool(lamp.fromDidYou) ? { fromDidYou: true } : {}),
    ...(asBool(lamp.fromDidYou) && asString(lamp.fromName).trim()
      ? { fromName: asString(lamp.fromName).trim().slice(0, 40) }
      : {}),
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
    lamps: Array.isArray(book.lamps) ? book.lamps.map(normalizeLamp) : [],
    answers: Array.isArray(book.answers) ? book.answers.map(normalizeAnswer) : [],
    gone: normalizeGone(book.gone),
    unlocked: Array.isArray(book.unlocked)
      ? book.unlocked.map((id) => asString(id)).filter(Boolean)
      : [],
    opens: Array.isArray(book.opens)
      ? book.opens.map((day) => asString(day).trim()).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day))
      : [],
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
    friendCheers: purse.friendCheers,
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
  const rest = /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1)
  return `Did I ${rest}?`
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
    }
  }
  if (lamp.cadence === 'every_n') {
    const n = Number(lamp.everyN)
    if (!Number.isInteger(n) || n < 2) return 'hang.miss.everyN'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asString(lamp.everyNAnchor))) {
      return 'hang.miss.everyNStart'
    }
  }
  const after = asString(lamp.askAfter).trim()
  if (after && !/^([01]\d|2[0-3]):[0-5]\d$/.test(after)) {
    return 'hang.miss.askAfter'
  }
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
  copy.short = `${copy.short} ${t('lamp.copySuffix')}`
  return copy
}

export function cadenceLine(lamp) {
  if (lamp.cadence === 'daily') return t('cadence.daily')
  if (lamp.cadence === 'weekly') {
    const days = (lamp.weekdays || []).map((day) => t(`hang.day.${day}`)).filter(Boolean)
    if (!days.length) return t('cadence.weekly')
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
  if (lamp.cadence === 'every_n') return t('cadence.everyN', { n: lamp.everyN })
  return lamp.cadence
}
