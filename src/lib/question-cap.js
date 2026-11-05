// One account holds at most this many questions, stopped ones included
// (supabase/question-cap.sql refuses a save that raises the count past it).
export const QUESTION_CAP = 300

export function questionCount(boards) {
  let n = 0
  for (const book of boards || []) n += Array.isArray(book?.lamps) ? book.lamps.length : 0
  return n
}

export function questionRoom(boards) {
  return Math.max(0, QUESTION_CAP - questionCount(boards))
}

// A write that raises the count past the cap. Same rule as the database
// trigger: a shelf already over it still saves edits that do not add.
export function overCap(before, after) {
  const n = questionCount(after)
  return n > QUESTION_CAP && n > questionCount(before)
}
