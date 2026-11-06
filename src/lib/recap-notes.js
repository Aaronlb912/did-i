import { noteDay } from './hall-pages.js'
import { stampMs } from './recurrence.js'
import { scopedBooks } from './tags.js'

// Up to `limit` notes written on the days of `week` (weekStripNights rows),
// newest day first. The day is the one Notes files it under (noteDay), so a
// note sits in the same week in both. Notes on deleted questions drop out.
export function recapNotes(boards, week, tagId = '', limit = 3) {
  const from = week?.[0]?.iso || ''
  const to = week?.[week.length - 1]?.iso || ''
  if (!from || !to) return []
  const found = []
  for (const book of scopedBooks(boards, tagId)) {
    let lamps = null
    for (const answer of book.answers || []) {
      if (!String(answer.note || '').trim()) continue
      lamps = lamps || new Map((book.lamps || []).map((lamp) => [lamp.id, lamp]))
      const lamp = lamps.get(answer.lampId)
      if (!lamp) continue
      const day = noteDay({ lamp, answer })
      if (day.length !== 10 || day < from || day > to) continue
      found.push({ day, lamp, answer })
    }
  }
  const at = (row) => stampMs(row.answer.noteAt) || stampMs(row.answer.answeredAt)
  found.sort((a, b) => b.day.localeCompare(a.day) || at(b) - at(a))
  return found.slice(0, limit)
}
