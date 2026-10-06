import { answeredAtIso, duplicateLamp, newAnswerId } from './board-json.js'
import { activeLook } from './active-look.js'
import { fireCheer, noteCheer, normalizePurse, cheerPlayOf, payTap } from './purse.js'
import { answerFor, openFloorIso, periodPassed } from './recurrence.js'

export function putAnswer(book, row, status, clock = new Date()) {
  if (!row || !row.lamp) return book
  if (periodPassed(row.lamp, row.periodKey, openFloorIso(clock))) {
    // A past night only takes the closing nope, and only while it is empty.
    if (status !== 'skip' || answerFor(book, row.lamp.id, row.periodKey)) return book
  }
  const answer = {
    id: newAnswerId(),
    lampId: row.lamp.id,
    periodKey: row.periodKey,
    status,
    answeredAt: answeredAtIso(clock),
    note: '',
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
  const paid = payTap(book, next, row, status, clock)
  if (status !== 'yes' && status !== 'late') return paid
  const cheered = noteCheer(paid)
  const purse = normalizePurse(cheered)
  if (purse.cheerOn) {
    fireCheer(purse.cheerOn, cheerPlayOf(cheered, purse.cheerOn), activeLook(cheered))
  }
  return cheered
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

export function hangInto(book, lamp, editing) {
  if (!lamp) return book
  if (editing) {
    return {
      ...book,
      lamps: (book.lamps || []).map((item) => (item.id === lamp.id ? lamp : item)),
    }
  }
  const ids = new Set([lamp.id])
  return {
    ...book,
    lamps: [...(book.lamps || []), lamp],
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
        lamps: (book.lamps || []).map((item) => (ids.has(item.id) ? { ...item, archived } : item)),
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
      .map((item) => (picked.has(item.id) ? item : nowLamps.get(item.id)))
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

export function toggleArchive(book, lamp) {
  if (!lamp) return book
  return {
    ...book,
    lamps: (book.lamps || []).map((item) =>
      item.id === lamp.id ? { ...item, archived: !item.archived } : item,
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
  return note > tap ? note : tap
}

export function setAnswerNote(book, lampId, periodKey, note, clock = new Date()) {
  const text = String(note || '').replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX)
  const answers = book.answers || []
  const at = answers.findIndex((item) => item.lampId === lampId && item.periodKey === periodKey)
  if (at < 0 || (answers[at].note || '') === text) return book
  const prev = answerStamp(answers[at])
  let stamp = answeredAtIso(clock)
  if (prev && stamp <= prev) {
    const last = new Date(prev)
    if (!Number.isNaN(last.getTime())) stamp = answeredAtIso(new Date(last.getTime() + 1000))
  }
  const next = [...answers]
  next[at] = { ...answers[at], note: text, noteAt: stamp }
  return { ...book, answers: next }
}
