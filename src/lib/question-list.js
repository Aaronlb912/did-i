import { shortLabel } from './board-json.js'
import { dueTonight } from './recurrence.js'

export function rowId(row) {
  return `${row.boardId}:${row.lamp.id}`
}

// Tonight's state for every row, from one dueTonight() per tag rather than
// one per row: 'did', 'late', 'nope', 'open', or '' when not asked tonight.
export function tonightStates(rows, clock) {
  const byBook = new Map()
  for (const row of rows) {
    if (!byBook.has(row.boardId)) byBook.set(row.boardId, row.book)
  }
  const states = new Map()
  for (const [boardId, book] of byBook) {
    for (const due of dueTonight(book, clock)) {
      const status = due.answer?.status
      const state = status === 'yes' ? 'did' : status === 'late' ? 'late' : status === 'skip' ? 'nope' : 'open'
      states.set(`${boardId}:${due.lamp.id}`, state)
    }
  }
  return states
}

// Every note written on a day of each question, joined, per answers array.
// Built in one pass and kept until the answers change, so a keystroke costs a lookup.
const noteText = new WeakMap()
function dayNotes(book, lampId) {
  const answers = book?.answers
  if (!answers) return ''
  let byLamp = noteText.get(answers)
  if (!byLamp) {
    byLamp = new Map()
    for (const answer of answers) {
      if (!answer.note) continue
      byLamp.set(answer.lampId, `${byLamp.get(answer.lampId) || ''} ${answer.note}`)
    }
    noteText.set(answers, byLamp)
  }
  return byLamp.get(lampId) || ''
}

function blobOf(row) {
  const lamp = row.lamp
  return [lamp.question, lamp.short, lamp.kind, lamp.notes, row.tag, shortLabel(lamp), dayNotes(row.book, lamp.id)]
    .map((part) => String(part || ''))
    .join(' ')
    .toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
}

// Every word typed has to appear somewhere in the question, its names, notes, day notes or tag.
export function searchRows(rows, query) {
  const words = String(query || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return rows
  return rows.filter((row) => {
    const blob = blobOf(row)
    return words.every((word) => blob.includes(word))
  })
}

// The question line only adds something when it says more than the short name.
export function questionAddsToName(lamp) {
  const bare = String(lamp?.question || '')
    .toLowerCase()
    .replace(/^did i\s+/, '')
    .replace(/[?.!\s]+$/, '')
    .trim()
  return bare !== shortLabel(lamp).toLowerCase().trim()
}
