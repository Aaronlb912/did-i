// Brain dump: one typed list becomes several one-day questions for review.
import { QUESTION_MAX } from './board-json.js'

// Splits on commas, new lines, semicolons and " and ". Drops a leading
// "did i" and a trailing "?", caps each piece, and drops empties and repeats.
export function splitDump(text) {
  const seen = new Set()
  const out = []
  for (const raw of String(text || '').split(/[,;\n\r]+|\s+and\s+/i)) {
    const piece = raw
      .trim()
      .replace(/^did\s+i\s+/i, '')
      .replace(/\s*\?+$/, '')
      .trim()
      .slice(0, QUESTION_MAX)
      .trim()
    const key = piece.toLowerCase()
    if (!piece || seen.has(key)) continue
    seen.add(key)
    out.push(piece)
  }
  return out
}
