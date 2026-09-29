// The plain math behind RollNumber, kept apart so node can test it.

/** Columns for a roll from one number to another, left to right, blank-padded. */
export function rollColumns(from, to) {
  const a = String(Math.max(0, Math.floor(Number(from) || 0)))
  const b = String(Math.max(0, Math.floor(Number(to) || 0)))
  const width = Math.max(a.length, b.length)
  const pa = a.padStart(width, ' ')
  const pb = b.padStart(width, ' ')
  return Array.from({ length: width }, (_, i) => ({ from: pa[i], to: pb[i] }))
}

// Strip index of a character: 0 is blank, 1-10 are the digits 0-9. The strip
// repeats at 11, so every character also sits 11 further down.
function stripIndex(char) {
  return char === ' ' ? 0 : Number(char) + 1
}

/**
 * Where a column starts, where it rolls to (`wide`), and where it settles
 * (`to`, the same character in the first half of the strip). Going up it
 * always rolls forward, going down always back.
 */
export function rollStops(fromChar, toChar, up) {
  const a = stripIndex(fromChar)
  const b = stripIndex(toChar)
  if (a === b) return { from: b, to: b, wide: b }
  if (up) return { from: a, to: b, wide: b < a ? b + 11 : b }
  return { from: b > a ? a + 11 : a, to: b, wide: b }
}
