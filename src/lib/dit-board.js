import { shortLabel } from './board-json.js'
import { periodKeyFor } from './recurrence.js'

// Every DID answer on every tag for one night, deduped by label.
export function didTonightLabels(shelf, night) {
  const out = []
  const seen = new Set()
  for (const book of shelf?.boards || []) {
    for (const lamp of book.lamps || []) {
      if (lamp.archived) continue
      const key = periodKeyFor(lamp, night)
      const answer = (book.answers || []).find(
        (row) => row.lampId === lamp.id && row.periodKey === key,
      )
      if (!answer || (answer.status !== 'yes' && answer.status !== 'late')) continue
      const label = shortLabel(lamp)
      if (!label || seen.has(label.toLowerCase())) continue
      seen.add(label.toLowerCase())
      out.push(label)
    }
  }
  return out
}

export function activeLook(book) {
  if (!book) return 'lime'
  const looks = Array.isArray(book.looks) ? book.looks : ['lime']
  const pick = String(book.lookOn || 'lime')
  return looks.includes(pick) ? pick : book.lookOn || 'lime'
}

export function activeBuddy(book) {
  if (!book) return ''
  const buddies = Array.isArray(book.buddies) ? book.buddies : []
  const pick = String(book.buddyOn || '')
  return buddies.includes(pick) ? pick : ''
}
