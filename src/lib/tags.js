import { mustSwipeDeadline } from './lamp-deadline.js'
import { catchUpRows, dueTonight } from './recurrence.js'

export function tagOnRow(book, row) {
  return {
    ...row,
    boardId: book.id,
    tag: book.title,
    book,
  }
}

// A tag filter is '' (every tag) or tag ids joined with commas ("a,b").
export function tagIdsOf(tagId) {
  return String(tagId || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export function joinTagIds(ids) {
  return [...new Set(ids)].filter(Boolean).join(',')
}

export function scopedBooks(boards, tagId) {
  const ids = tagIdsOf(tagId)
  if (!ids.length) return boards || []
  return (boards || []).filter((book) => ids.includes(book.id))
}

export function taggedDue(boards, clock, tagId) {
  return scopedBooks(boards, tagId).flatMap((book) =>
    dueTonight(book, clock).map((row) => tagOnRow(book, row)),
  )
}

export function taggedCatchUp(boards, clock, tagId) {
  return scopedBooks(boards, tagId).flatMap((book) =>
    catchUpRows(book, clock).map((row) => tagOnRow(book, row)),
  )
}

// Folders in the order the person set (book.order). A folder with no order
// counts as its place in the list, so old data keeps creation order.
export function sortFolders(boards) {
  return (boards || [])
    .map((book, at) => ({ book, at, rank: Number.isFinite(book.order) ? book.order : at }))
    .sort((a, b) => a.rank - b.rank || a.at - b.at)
    .map((item) => item.book)
}

// Moves one folder up (-1) or down (1). Hands back only the folders whose
// order changed, each stamped so sync keeps the newer copy.
export function moveFolder(boards, id, step, stamp = new Date().toISOString()) {
  const list = sortFolders(boards)
  const from = list.findIndex((book) => book.id === id)
  const to = Math.max(0, Math.min(list.length - 1, from + step))
  if (from < 0 || to === from) return []
  const [one] = list.splice(from, 1)
  list.splice(to, 0, one)
  return list.flatMap((book, at) => (book.order === at ? [] : [{ ...book, order: at, at: stamp }]))
}

// `ids` is the whole hand-set order. Moves `a` to where `b` sits among `own`
// (one folder's questions); every other id keeps its slot.
export function moveWithin(ids, own, a, b, step) {
  const mine = new Set(own)
  const slots = ids.flatMap((id, at) => (mine.has(id) ? [at] : []))
  const sub = slots.map((at) => ids[at])
  if (!sub.includes(a) || !sub.includes(b) || a === b) return ids
  sub.splice(sub.indexOf(a), 1)
  const bi = sub.indexOf(b)
  sub.splice(step < 0 ? bi : bi + 1, 0, a)
  const out = [...ids]
  slots.forEach((at, k) => {
    out[at] = sub[k]
  })
  return out
}

export function taggedLamps(boards, tagId) {
  return scopedBooks(boards, tagId).flatMap((book) =>
    (book.lamps || []).map((lamp) => ({
      lamp,
      boardId: book.id,
      tag: book.title,
      book,
    })),
  )
}

// A deadline does not count as left until its due night.
export function leftoverOn(boards, clock, tagId) {
  return taggedDue(boards, clock, tagId).filter(
    (row) => !row.answer && mustSwipeDeadline(row.lamp, row.dateIso),
  ).length
}

export function rowKey(row) {
  return `${row.boardId || row.book?.id || ''}:${row.lamp.id}`
}
