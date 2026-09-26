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
