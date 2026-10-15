// "Hey Siri, answer Did I" / "Hey Google, I did stretch in Did I" arrive as
// didi://answer?q=stretch&a=did. The spoken words rarely match the question
// exactly ("stretch" for "Did I stretch tonight?"), so pick tonight's open
// question that shares the most words with them.

import { readShelf } from './board-shelf.js'
import { graceRowsFor } from './grace.js'
import { dueTonight, graceFirst, graceNightIso, rowDoneTonight } from './recurrence.js'

const SMALL = new Set(['did', 'i', 'a', 'an', 'the', 'my', 'to', 'tonight', 'today', 'it', 'do', 'in', 'of', 'and', 'yes', 'no', 'not', 'didnt'])

function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !SMALL.has(word))
}

// did / nope from what the assistant passed; anything else means no answer.
export function spokenAnswer(raw) {
  const text = String(raw || '').trim().toLowerCase()
  if (['did', 'yes', 'done', 'true', 'y'].includes(text)) return 'did'
  if (['nope', 'no', 'skip', 'false', 'n', 'not'].includes(text)) return 'nope'
  return ''
}

// The best open question for the words, or null when nothing is close.
// `rows` is [{ lamp, ... }] from waitingTonight.
export function matchSpoken(said, rows) {
  const want = words(said)
  if (!want.length) return rows.length === 1 ? rows[0] : null
  let best = null
  let bestScore = 0
  for (const row of rows) {
    const have = new Set(words(row.lamp?.question))
    if (!have.size) continue
    let hits = 0
    for (const word of want) {
      if (have.has(word) || [...have].some((h) => h.length > 3 && (h.startsWith(word) || word.startsWith(h)))) hits += 1
    }
    // Share of the spoken words found, nudged toward shorter questions.
    const score = hits / want.length + hits / (have.size * 10)
    if (score > bestScore) {
      best = row
      bestScore = score
    }
  }
  return bestScore >= 0.5 ? best : null
}

// Every question tonight not answered yet, across all tags, including ones
// whose ask time has not come: saying "I did" early counts. A Not yet is
// still open. In last night's grace period its open questions are in too,
// first while graceFirst (ties go to the earlier row).
export function openTonight(now = new Date(), shelf = readShelf()) {
  const books = (shelf.boards || []).filter((book) => !book.archived)
  const tonight = books.flatMap((book) => dueTonight(book, now)).filter((row) => !rowDoneTonight(row))
  const night = graceNightIso(now)
  if (!night) return tonight
  const last = graceRowsFor(books, night)
  return graceFirst(now) ? [...last, ...tonight] : [...tonight, ...last]
}
