import { answeredAtIso, duplicateLamp, newAnswerId } from './board-json.js'
import { activeLook } from './active-look.js'
import { fireCheer, noteCheer, normalizePurse, cheerPlayOf, payTap } from './purse.js'

export function putAnswer(book, row, status, clock = new Date()) {
  if (!row || !row.lamp) return book
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

export function hangInto(book, lamp, editing) {
  if (!lamp) return book
  if (editing) {
    return {
      ...book,
      lamps: (book.lamps || []).map((item) => (item.id === lamp.id ? lamp : item)),
    }
  }
  return { ...book, lamps: [...(book.lamps || []), lamp] }
}

export function takeDown(book, lamp) {
  if (!lamp) return book
  return {
    ...book,
    lamps: (book.lamps || []).filter((item) => item.id !== lamp.id),
    answers: (book.answers || []).filter((item) => item.lampId !== lamp.id),
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
    out.push({ ...now, lamps, answers })
  }
  return out
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

