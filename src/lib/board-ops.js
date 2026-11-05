import { PAUSES_MAX, answeredAtIso, cleanAmount, duplicateLamp, newAnswerId } from './board-json.js'
import { activeLook } from './active-look.js'
import { fireCheer, noteCheer, normalizePurse, cheerPlayOf, payTap } from './purse.js'
import { addDaysIso, answerFor, boardDate, didStatusForRow, inPause, nightOpen, openFloorIso, periodPassed, stampMs } from './recurrence.js'
import { readShelf } from './board-shelf.js'

// Pausing notes the day, so the question's record stops counting there.
// Edits stamp `at` so sync keeps the later edit of a question (shelf-merge.js).
// Answers live in book.answers and never touch it.
export function stampEdit(item, clock = new Date()) {
  return { ...item, at: clock.toISOString() }
}

function withPause(lamp, archived, clock = new Date()) {
  if (Boolean(lamp.archived) === archived) return lamp
  const { pausedOn, ...rest } = lamp
  if (archived) return stampEdit({ ...rest, archived, pausedOn: boardDate(clock) }, clock)
  // Resumed: the paused days stay out of the streak, [from, until).
  const until = boardDate(clock)
  const pauses = pausedOn && pausedOn < until ? [...(lamp.pauses || []), [pausedOn, until]].slice(-PAUSES_MAX) : lamp.pauses
  return stampEdit({ ...rest, archived, ...(pauses?.length ? { pauses } : {}) }, clock)
}

// Set on every saved answer so a reload never lands mid-answer (native/lib/ota-refresh.js).
export let lastAnswerAt = 0

export function putAnswer(book, row, status, clock = new Date(), past = false) {
  if (!row || !row.lamp) return book
  if (!past && periodPassed(row.lamp, row.periodKey, openFloorIso(clock))) {
    // A past night only takes the closing nope, and only while it is empty.
    if (status !== 'skip' || answerFor(book, row.lamp.id, row.periodKey)) return book
  }
  const prev = (book.answers || []).find((item) => item.lampId === row.lamp.id && item.periodKey === row.periodKey)
  // Once a Did, always counted: flipping Did, Not yet, Did never pays twice.
  const counted = status === 'yes' || status === 'late' || prev?.paid === true || prev?.status === 'yes' || prev?.status === 'late'
  lastAnswerAt = Date.now()
  const answer = {
    id: newAnswerId(),
    lampId: row.lamp.id,
    periodKey: row.periodKey,
    status,
    // Stamped now, so sync keeps it over an older Not yet; past keeps it out of today's paid taps.
    answeredAt: answeredAtIso(clock),
    ...(past ? { past: true } : {}),
    // Changing the answer keeps the day's note and amount.
    note: prev?.note || '',
    ...(prev?.note && prev.noteAt ? { noteAt: prev.noteAt } : {}),
    ...(cleanAmount(prev?.amount) !== null ? { amount: prev.amount } : {}),
    ...(counted ? { paid: true } : {}),
  }
  const next = {
    ...book,
    answers: [
      ...(book.answers || []).filter(
        (item) => !(item.lampId === row.lamp.id && item.periodKey === row.periodKey),
      ),
      answer,
    ],
  }
  // An older day pays no coins and plays no cheer; the streak still counts it.
  if (past) return next
  const paid = payTap(book, next, row, status, clock, () => (readShelf().boards || []).filter((item) => item.id !== book.id))
  if (status !== 'yes' && status !== 'late') return paid
  const cheered = noteCheer(paid)
  const purse = normalizePurse(cheered)
  if (purse.cheerOn) {
    fireCheer(purse.cheerOn, cheerPlayOf(cheered, purse.cheerOn), activeLook(cheered))
  }
  return cheered
}

// How many days back the calendar sheet still takes an answer.
export const PAST_DAYS = 7

// A day inside the last 7, not today: its live, due questions can be answered.
export function pastAnswerOpen(row, clock = new Date()) {
  const iso = row?.dateIso
  if (!row?.lamp || !iso) return false
  const today = boardDate(clock)
  if (iso >= today || iso < addDaysIso(today, -PAST_DAYS)) return false
  return !row.lamp.archived && !inPause(row.lamp, iso)
}

// The calendar sheet's answer for an older day. Did saves as Late. Last night
// in its grace period takes the normal path.
export function putPastAnswer(book, row, status, clock = new Date()) {
  if (!pastAnswerOpen(row, clock)) return book
  const cur = answerFor(book, row.lamp.id, row.periodKey)?.status
  if (status === 'yes' ? cur === 'yes' || cur === 'late' : cur === status) return book
  if (nightOpen(row.dateIso, clock)) return putAnswer(book, row, status === 'yes' ? didStatusForRow(row) : status, clock)
  return putAnswer(book, row, status === 'yes' ? 'late' : status, clock, true)
}

// Undo for a past-day change: puts the earlier status back on the day's answer,
// stamped now so a sync keeps it over the change. Pays nothing; past keeps it
// out of today's paid taps. Note, amount and paid stay as they are now.
export function restorePastAnswer(book, prev, clock = new Date()) {
  const cur = answerFor(book, prev?.lampId, prev?.periodKey)
  if (!cur) return book
  lastAnswerAt = Date.now()
  const back = { ...cur, id: newAnswerId(), status: prev.status, answeredAt: answeredAtIso(clock), past: true }
  return { ...book, answers: (book.answers || []).map((item) => (item === cur ? back : item)) }
}

// The gone list is how a sync knows a question was taken off this tag on
// purpose (see shelf-merge.js). Putting one back adds a newer back entry.
function noteGone(book, ids, back, clock = new Date()) {
  const at = clock.toISOString()
  const marks = [...ids].map((id) => (back ? { id, at, back: true } : { id, at }))
  return [...marks, ...(book.gone || []).filter((item) => !ids.has(item.id))]
}

function wasGone(book, ids) {
  return (book.gone || []).some((item) => ids.has(item.id) && !item.back)
}

export function hangInto(book, saved, editing) {
  if (!saved) return book
  const lamp = stampEdit(saved)
  if (editing) {
    return {
      ...book,
      lamps: (book.lamps || []).map((item) => (item.id === lamp.id ? lamp : item)),
    }
  }
  const ids = new Set([lamp.id])
  return {
    ...book,
    // A double tap on Add another saves the same id twice; keep one.
    lamps: [...(book.lamps || []).filter((item) => item.id !== lamp.id), lamp],
    ...(wasGone(book, ids) ? { gone: noteGone(book, ids, true) } : {}),
  }
}

export function takeDown(book, lamp, clock = new Date()) {
  if (!lamp) return book
  return {
    ...book,
    lamps: (book.lamps || []).filter((item) => item.id !== lamp.id),
    answers: (book.answers || []).filter((item) => item.lampId !== lamp.id),
    gone: noteGone(book, new Set([lamp.id]), false, clock),
  }
}

// Many questions at once, across folders. picks are { boardId, lampId }.
// kind is stop, ask, or delete. Hands back only the folders that changed.
export function bulkLamps(books, picks, kind) {
  const byBook = new Map()
  for (const pick of picks) {
    if (!byBook.has(pick.boardId)) byBook.set(pick.boardId, new Set())
    byBook.get(pick.boardId).add(pick.lampId)
  }
  const out = []
  for (const book of books) {
    const ids = byBook.get(book.id)
    if (!ids) continue
    if (kind === 'delete') {
      out.push({
        ...book,
        lamps: (book.lamps || []).filter((item) => !ids.has(item.id)),
        answers: (book.answers || []).filter((item) => !ids.has(item.lampId)),
        gone: noteGone(book, ids, false),
      })
    } else {
      const archived = kind === 'stop'
      out.push({
        ...book,
        lamps: (book.lamps || []).map((item) => (ids.has(item.id) ? withPause(item, archived) : item)),
      })
    }
  }
  return out
}

// Takes a bulk edit back. The picked questions go back to how they were in
// before; anything else that changed since stays as it is now.
export function undoBulkLamps(books, before, picks) {
  const picked = new Set(picks.map((pick) => pick.lampId))
  const out = []
  for (const old of before) {
    const now = books.find((book) => book.id === old.id)
    if (!now) continue
    const nowLamps = new Map((now.lamps || []).map((item) => [item.id, item]))
    const lamps = (old.lamps || [])
      .map((item) => (picked.has(item.id) ? stampEdit(item) : nowLamps.get(item.id)))
      .filter(Boolean)
    const kept = new Set(lamps.map((item) => item.id))
    for (const item of now.lamps || []) if (!kept.has(item.id)) lamps.push(item)
    const have = new Set((now.answers || []).map((item) => `${item.lampId}|${item.periodKey}`))
    const answers = [
      ...(now.answers || []),
      ...(old.answers || []).filter(
        (item) => picked.has(item.lampId) && !have.has(`${item.lampId}|${item.periodKey}`),
      ),
    ]
    const back = new Set(lamps.map((item) => item.id).filter((id) => picked.has(id)))
    out.push({ ...now, lamps, answers, ...(wasGone(now, back) ? { gone: noteGone(now, back, true) } : {}) })
  }
  return out
}

// Moves picked questions, with their answers and notes, into one folder.
// Same steps as moving one from its edit form (saveLamp). Undo is the
// same call with the picks pointing back. Hands back only changed folders.
export function moveLamps(books, picks, targetId) {
  const target = books.find((book) => book.id === targetId)
  if (!target) return []
  const changed = new Map()
  const latest = (book) => changed.get(book.id) || book
  let dest = target
  for (const pick of picks) {
    if (pick.boardId === targetId) continue
    const source = books.find((book) => book.id === pick.boardId)
    const lamp = source && (latest(source).lamps || []).find((item) => item.id === pick.lampId)
    if (!lamp) continue
    const from = latest(source)
    const answers = (from.answers || []).filter((item) => item.lampId === lamp.id)
    changed.set(source.id, takeDown(from, lamp))
    dest = {
      ...hangInto(dest, lamp, false),
      answers: [...(dest.answers || []).filter((item) => item.lampId !== lamp.id), ...answers],
    }
  }
  if (dest === target) return []
  // An empty folder is parked (archived); a question moving in brings it back.
  changed.set(targetId, { ...dest, archived: false })
  return [...changed.values()]
}

export function toggleArchive(book, lamp, clock = new Date()) {
  if (!lamp) return book
  return {
    ...book,
    lamps: (book.lamps || []).map((item) =>
      item.id === lamp.id ? withPause(item, !item.archived, clock) : item,
    ),
  }
}

export function hangCopy(book, lamp, clock = new Date()) {
  const copy = duplicateLamp(lamp, clock)
  return {
    book: { ...book, lamps: [...(book.lamps || []), copy] },
    copy,
  }
}


// A short line on one night's answer ("Charged it at work"). Saving it sets
// noteAt and leaves answeredAt (the tap) alone. Sync keeps whichever copy
// has the newer answerStamp. The server keeps up to 500; we keep less.
export const NOTE_MAX = 120

// The newest change to an answer: the tap or its note.
export function answerStamp(answer) {
  const tap = String(answer?.answeredAt || '')
  const note = String(answer?.noteAt || '')
  return stampMs(note) > stampMs(tap) ? note : tap
}

// Two copies of one answer: the tap (status, answeredAt) and the note (note,
// noteAt, amount) each come from the copy that changed them last, so an old
// tap with a newer note never puts back an answer another phone replaced.
// Ties keep a.
export function mergeAnswer(a, b) {
  const tapB = stampMs(b?.answeredAt) > stampMs(a?.answeredAt)
  const noteB = stampMs(b?.noteAt) > stampMs(a?.noteAt)
  if (tapB === noteB) return tapB ? b : a
  const tap = tapB ? b : a
  const side = noteB ? b : a
  const { note: _n, noteAt: _t, amount: _m, ...rest } = tap
  return {
    ...rest,
    note: side.note || '',
    ...(side.noteAt ? { noteAt: side.noteAt } : {}),
    ...(cleanAmount(side.amount) !== null ? { amount: side.amount } : {}),
  }
}

// amount: leave it out to keep the night's amount; '' or null clears it.
// It travels with the note and moves noteAt the same way.
export function setAnswerNote(book, lampId, periodKey, note, clock = new Date(), amount) {
  const text = String(note || '').replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX)
  const answers = book.answers || []
  const at = answers.findIndex((item) => item.lampId === lampId && item.periodKey === periodKey)
  if (at < 0) return book
  const was = cleanAmount(answers[at].amount)
  const count = amount === undefined ? was : cleanAmount(amount)
  if ((answers[at].note || '') === text && count === was) return book
  const prev = answerStamp(answers[at])
  let stamp = answeredAtIso(clock)
  if (prev && stampMs(stamp) <= stampMs(prev)) {
    const last = new Date(prev)
    if (!Number.isNaN(last.getTime())) stamp = answeredAtIso(new Date(last.getTime() + 1000))
  }
  const next = [...answers]
  const { amount: _was, ...rest } = answers[at]
  next[at] = { ...rest, note: text, noteAt: stamp, ...(count !== null ? { amount: count } : {}) }
  return { ...book, answers: next }
}
