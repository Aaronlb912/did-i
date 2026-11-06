import { DAY_NAMES } from './answers-csv.js'
import { NOTE_MAX, PAST_DAYS } from './board-ops.js'
import { QUESTION_MAX, SHORT_MAX, UNIT_MAX, answeredAtIso, cleanAmount, didQuestion, newAnswerId, newBoardId, newLampId, normalizeLamp } from './board-json.js'
import { folderNameKey } from './board-shelf.js'
import { t } from './i18n.js'
import { addDaysIso, answerFor, boardDate, didStatusForRow, isDueOn, isPerWeek, lastDayOfMonth, parseIsoDate, periodKeyFor } from './recurrence.js'

// A spreadsheet or another habit app's export, read as a shelf the backup
// merge understands (shelf-merge.js planBackupLoad). Needs a question column.
const FOLDER_MAX = 60
const STATUS = new Map([
  ...['did', 'yes', 'done', 'true', '1', '2', 'x', '\u2713', '\u2714'].map((word) => [word, 'yes']),
  ['late', 'late'],
  ...['not yet', 'skip', 'no', '0', 'false'].map((word) => [word, 'skip']),
])

// RFC 4180: quoted cells, doubled quotes, CRLF, LF or CR rows. A semicolon
// file (spreadsheets in some languages) reads the same way.
function parseCsv(text) {
  const src = String(text).replace(/^\uFEFF/, '')
  const first = src.split(/\r\n|\n|\r/, 1)[0]
  const sep = first.split(';').length > first.split(',').length ? ';' : ','
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i]
    if (quoted) {
      if (c !== '"') cell += c
      else if (src[i + 1] === '"') {
        cell += '"'
        i += 1
      } else quoted = false
    } else if (c === '"' && cell === '') quoted = true
    else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1
      row.push(cell)
      cell = ''
      rows.push(row)
      row = []
    } else cell += c
  }
  if (cell !== '' || row.length) rows.push([...row, cell])
  return rows.filter((line) => line.some((value) => value.trim() !== ''))
}

// csvCell puts a ' in front of a cell a spreadsheet would run as a formula.
function clean(value) {
  return String(value ?? '').replace(/^'(?=[=+\-@\t\r])/, '').trim()
}

// Same words as shelf-merge.js questionKey, so a question matches the way a synced one does.
function questionKey(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// Year first (2026-11-05, 2026/11/05, a month alone). A full time with a zone
// reads as this phone's day. 05.11.2026 is day first. With slashes, a part
// over 12 says which is the day; 05/11/2026 could be either, so it stays unread.
function parseDay(text, today) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const when = new Date(text)
    if (!Number.isNaN(when.getTime())) return boardDate(when)
  }
  const dm = text.match(/^(\d{1,2})([./])(\d{1,2})\2(\d{4})(?!\d)/)
  if (dm) {
    const a = Number(dm[1])
    const b = Number(dm[3])
    let day = 0
    let month = 0
    if (dm[2] === '.' || a > 12 || a === b) [day, month] = [a, b]
    else if (b > 12) [day, month] = [b, a]
    else return ''
    const iso = dm[4] + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
    return parseIsoDate(iso) ? iso : ''
  }
  const m = text.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?(?!\d)/)
  if (!m) return ''
  const pad = (n) => String(n).padStart(2, '0')
  if (m[3]) {
    const iso = `${m[1]}-${pad(m[2])}-${pad(m[3])}`
    return parseIsoDate(iso) ? iso : ''
  }
  // A month alone (a monthly question's key): its last day, or today within it.
  if (Number(m[2]) < 1 || Number(m[2]) > 12) return ''
  const iso = `${m[1]}-${pad(m[2])}-${pad(lastDayOfMonth(Number(m[1]), Number(m[2]) - 1))}`
  return iso > today && iso.slice(0, 7) === today.slice(0, 7) ? today : iso
}

// The words answersCsv writes in its repeats column (repeatsText), or null.
export function parseRepeats(text, anchor = '') {
  const [kind, ...rest] = clean(text).toLowerCase().split(':')
  const arg = rest.join(':').trim()
  const days = arg
    .split(/[\s,/]+/)
    .map((name) => DAY_NAMES.indexOf(name.slice(0, 3)))
    .filter((day) => day >= 0)
  const n = Number(arg)
  if (kind === 'daily' && !arg) return { cadence: 'daily' }
  if ((kind === 'weekly' || kind === 'daily') && days.length) return { cadence: 'weekly', weekdays: [...new Set(days)].sort() }
  if (kind === 'perweek' && Number.isInteger(n) && n >= 1 && n <= 6) return { cadence: 'daily', perWeek: n }
  if (kind === 'everyn' && Number.isInteger(n) && n >= 2 && anchor) return { cadence: 'every_n', everyN: n, everyNAnchor: anchor }
  if (kind === 'monthly' && (arg === 'last' || (Number.isInteger(n) && n >= 1 && n <= 31))) return { cadence: 'monthly', monthDay: arg === 'last' ? 'last' : n }
  if (kind === 'often' && Number.isInteger(n) && n >= 1 && n <= 365) return { cadence: 'every', everyDays: n }
  if (kind === 'once') {
    const by = arg.startsWith('by:')
    const day = (by ? arg.slice(3) : arg).trim()
    if (day && !parseIsoDate(day)) return null
    return { cadence: 'once', onceWhen: by ? 'by' : 'on', ...(by ? { dueBy: day } : { onceOn: day }) }
  }
  return null
}

// local: this phone's shelf. Returns { shelf, old } or null when the file has
// no question column or no questions. Answers older than the past-answer
// window (today back PAST_DAYS) are counted in old, not saved; a future day is
// dropped. Kept ones are saved the way a changed past day is: Did is Late, never paid.
export function csvShelf(text, local, clock = new Date()) {
  const rows = parseCsv(text)
  if (!rows.length) return null
  const names = rows[0].map((name) => clean(name).toLowerCase())
  const col = (...keys) => {
    for (const key of keys) if (names.includes(key)) return names.indexOf(key)
    return -1
  }
  const at = {
    question: col('question', 'habit', 'name', 'title'),
    date: col('date', 'day'),
    answer: col('answer', 'status', 'value', 'done'),
    short: col('short name', 'short'),
    note: col('note', 'notes'),
    amount: col('amount'),
    unit: col('unit'),
    folder: col('folder'),
    repeats: col('repeats'),
    started: col('started'),
  }
  if (at.question < 0) return null
  const today = boardDate(clock)
  const floor = addDaysIso(today, -PAST_DAYS)
  const stamp = answeredAtIso(clock)
  const questions = new Map()
  let old = 0
  let bad = 0
  for (const row of rows.slice(1)) {
    const cell = (i) => (i < 0 ? '' : clean(row[i]))
    // A Did we note from an export: not a question of yours.
    if (cell(at.repeats).toLowerCase() === 'did we') continue
    const text = didQuestion(cell(at.question).slice(0, QUESTION_MAX))
    if (!text) continue
    const folder = cell(at.folder).slice(0, FOLDER_MAX)
    const key = `${folderNameKey(folder)}|${questionKey(text)}`
    if (!questions.has(key)) questions.set(key, { text, raw: cell(at.question), folder, short: '', repeats: '', started: '', unit: '', amount: false, days: new Map() })
    const q = questions.get(key)
    q.short ||= cell(at.short).slice(0, SHORT_MAX)
    q.repeats ||= cell(at.repeats)
    q.started ||= parseDay(cell(at.started), today)
    q.unit ||= cell(at.unit).replace(/\s+/g, ' ').slice(0, UNIT_MAX)
    // No answer column: a row is a day it was done, the way many apps export.
    const status = at.answer < 0 ? 'yes' : STATUS.get(cell(at.answer).toLowerCase())
    const day = parseDay(cell(at.date), today)
    if (status && !day && cell(at.date)) bad += 1
    if (!status || !day || day > today) continue
    if (day < floor) {
      old += 1
      continue
    }
    const amount = cleanAmount(cell(at.amount))
    if (amount !== null) q.amount = true
    q.days.set(day, { status, note: cell(at.note).replace(/\s+/g, ' ').slice(0, NOTE_MAX), amount })
  }
  if (!questions.size) return null

  const books = Array.isArray(local?.boards) ? local.boards : []
  const current = books.find((book) => book.id === local?.currentId) || books[0]
  const outs = new Map()
  const boardFor = (folder) => {
    const key = folderNameKey(folder)
    const here = folder ? books.find((book) => folderNameKey(book.title) === key) : current
    const slot = here ? here.id : `new:${key}`
    if (!outs.has(slot)) outs.set(slot, { id: here ? here.id : newBoardId(), title: here ? here.title : folder || t('tags.general'), lamps: [], answers: [], here })
    return outs.get(slot)
  }

  for (const q of questions.values()) {
    const out = boardFor(q.folder)
    const same = new Set([questionKey(q.text), questionKey(q.raw)])
    const lamps = out.here?.lamps || []
    const twin = lamps.find((lamp) => !lamp.archived && same.has(questionKey(lamp.question))) || lamps.find((lamp) => same.has(questionKey(lamp.question)))
    let lamp = twin
    if (!lamp) {
      const anchor = q.started && q.started <= today ? q.started : [...q.days.keys()].sort()[0] || today
      lamp = normalizeLamp({
        id: newLampId(),
        question: q.text,
        short: q.short,
        createdOn: today,
        ...(parseRepeats(q.repeats, anchor) || { cadence: 'daily' }),
        ...(q.amount ? { trackAmount: true, amountUnit: q.unit } : {}),
      })
    }
    out.lamps.push(lamp)
    // One answer per period (a monthly question's days share one); the later row wins.
    const kept = new Map()
    for (const [day, got] of [...q.days].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const periodKey = periodKeyFor(lamp, day)
      const prev = twin ? answerFor(out.here, lamp.id, periodKey) : undefined
      // A Did here is never turned into a Not yet, and the same answer adds nothing.
      if (prev && (prev.status === 'yes' || prev.status === 'late' || prev.status === got.status)) continue
      const isToday = day === today
      kept.set(periodKey, {
        id: newAnswerId(),
        lampId: lamp.id,
        periodKey,
        status: got.status === 'yes' ? (isToday ? didStatusForRow({ answer: prev }) : 'late') : got.status,
        answeredAt: stamp,
        ...(isToday ? {} : { past: true }),
        // A file's Not yet never beats a Did saved on another phone.
        ...(got.status === 'skip' ? { first: true } : {}),
        note: got.note,
        ...(got.amount !== null ? { amount: got.amount } : {}),
      })
    }
    out.answers.push(...kept.values())
    // The question starts at the run of Dids just before its start (today for
    // a new one), so those days count. It stops at the first due day without a
    // Did: starting earlier would make that day a miss and break the streak.
    // Answers before the run stay saved. Only every day or set weekdays; other
    // schedules start today.
    const days = (lamp.cadence === 'daily' && !isPerWeek(lamp)) || (lamp.cadence === 'weekly' && (lamp.weekdays || []).length > 0)
    const from = twin ? twin.createdOn || today : today
    const open = { ...lamp, createdOn: floor, archived: false, endsOn: '', pausedUntil: '' }
    let start = from
    for (let day = addDaysIso(from, -1); days && day >= floor; day = addDaysIso(day, -1)) {
      if (!isDueOn(open, day)) continue
      const key = periodKeyFor(lamp, day)
      const got = kept.get(key) || (twin ? answerFor(out.here, lamp.id, key) : undefined)
      if (got?.status !== 'yes' && got?.status !== 'late') break
      start = day
    }
    if (start < from) out.lamps[out.lamps.length - 1] = { ...lamp, createdOn: start, ...(twin ? { at: stamp } : {}) }
  }
  const boards = [...outs.values()].map(({ id, title, lamps, answers }) => ({ id, title, lamps, answers }))
  return { shelf: { currentId: outs.has(current?.id) ? current.id : boards[0].id, boards }, old, bad }
}
