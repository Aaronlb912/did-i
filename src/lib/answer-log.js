import { cloud } from './cloud.js'
import { demoLampIds } from './demo-strip.js'
import { answerStamp } from './board-ops.js'
import { answeredAtIso } from './board-json.js'

// Answers move one at a time instead of riding along with the whole
// shelf. Two marks in localStorage do the bookkeeping:
//   mark  the newest answeredAt this phone has already sent up
//   seen  the newest updated_at this phone has already pulled down

const MARK = 'did-i-answers-sent'
const SEEN = 'did-i-answers-seen'
const CHUNK = 500

function read(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // The app still runs if storage is blocked. It just resends.
  }
}

export function forgetAnswerMarks() {
  write(MARK, '')
  write(SEEN, '')
}

function rowsOf(shelf) {
  const out = []
  for (const book of shelf?.boards || []) {
    for (const answer of book.answers || []) {
      if (!answer.lampId || !answer.periodKey) continue
      out.push({
        b: book.id,
        l: answer.lampId,
        p: answer.periodKey,
        s: answer.status || 'yes',
        a: answer.answeredAt || '',
        n: answer.note || '',
        e: answer.noteAt || '',
      })
    }
  }
  return out
}

// Everything answered since the last successful send. Normally one row.
export function answersToSend(shelf, all = false) {
  const mark = all ? '' : read(MARK)
  const rows = rowsOf(shelf)
  return mark ? rows.filter((row) => rowStamp(row) > mark) : rows
}

// The tap or the note, whichever changed last.
function rowStamp(row) {
  return row.e > row.a ? row.e : row.a
}

export async function pushAnswers(shelf, all = false) {
  const db = cloud()
  if (!db) return { sent: 0, miss: '' }
  const rows = answersToSend(shelf, all)
  if (!rows.length) return { sent: 0, miss: '' }

  let newest = read(MARK)
  for (let at = 0; at < rows.length; at += CHUNK) {
    const slice = rows.slice(at, at + CHUNK)
    const { error } = await db.rpc('put_answers', { rows: slice })
    if (error) return { sent: at, miss: error.message }
    for (const row of slice) if (rowStamp(row) > newest) newest = rowStamp(row)
  }
  write(MARK, newest)
  return { sent: rows.length, miss: '' }
}

// Fold rows from the account into the shelf this phone is holding.
// A later answeredAt wins, the same rule two phones already used.
export function applyAnswers(shelf, rows) {
  if (!rows?.length) return { shelf, changed: 0 }
  const boards = (shelf.boards || []).map((book) => ({ ...book, answers: [...(book.answers || [])] }))
  const homeOf = new Map()
  for (const book of boards) {
    for (const lamp of book.lamps || []) homeOf.set(lamp.id, book)
  }
  // A question deleted here keeps its old rows on the server until the next
  // prune. Those must not come back as answers.
  const dead = new Set()
  for (const book of boards) {
    for (const item of book.gone || []) if (!item.back && !homeOf.has(item.id)) dead.add(item.id)
  }

  let changed = 0
  for (const row of rows) {
    if (dead.has(row.lamp_id)) continue
    const book =
      boards.find((item) => item.id === row.board_id) || homeOf.get(row.lamp_id) || boards[0]
    if (!book) continue
    const at = book.answers.findIndex(
      (item) => item.lampId === row.lamp_id && item.periodKey === row.period_key,
    )
    const mine = at >= 0 ? book.answers[at] : null
    const theirs = { answeredAt: row.answered_at || '', noteAt: row.note_at || '' }
    if (mine && answerStamp(mine) >= answerStamp(theirs)) continue
    const next = {
      id: mine?.id || `ans-${row.lamp_id}-${row.period_key}`,
      lampId: row.lamp_id,
      periodKey: row.period_key,
      status: row.status,
      answeredAt: row.answered_at || '',
      note: row.note || '',
      ...(row.note_at ? { noteAt: row.note_at } : {}),
    }
    if (at >= 0) book.answers[at] = next
    else book.answers.push(next)
    changed += 1
  }
  return { shelf: { ...shelf, boards }, changed }
}

export async function pullAnswers(shelf) {
  const db = cloud()
  if (!db) return { shelf, changed: 0, miss: '' }
  const since = read(SEEN)
  let query = db
    .from('answer_log')
    // '*' so this read works before and after note_at is added (answers.sql).
    .select('*')
    .order('updated_at', { ascending: true })
    .limit(5000)
  // Greater-or-equal on purpose. A batch written in one statement shares
  // a timestamp, and skipping past it would drop the rest of the batch.
  // Re-reading the boundary costs a few rows; applying one twice is free.
  if (since) query = query.gte('updated_at', since)

  const { data, error } = await query
  if (error) return { shelf, changed: 0, miss: error.message }
  const next = applyAnswers(shelf, data || [])
  if (data?.length) write(SEEN, data[data.length - 1].updated_at)
  return { ...next, miss: '' }
}

// Undo of a tap. A later answeredAt always wins a pull, so the row the tap
// sent up has to go, and the answer from before the tap (if any) goes back.
// It runs again a moment later in case the tap's own send was still on its
// way. Only rows from before the undo go, so a new tap since then stays.
export async function takeBackAnswer(book, lampId, periodKey) {
  const db = cloud()
  if (!db || !lampId || !periodKey) return
  const now = answeredAtIso()
  const before = (book?.answers || []).find((item) => item.lampId === lampId && item.periodKey === periodKey)
  const row = before ? rowsOf({ boards: [{ ...book, answers: [before] }] }) : []
  const once = async () => {
    const { error } = await db
      .from('answer_log')
      .delete()
      .eq('lamp_id', lampId)
      .eq('period_key', periodKey)
      .lte('answered_at', now)
    if (error) throw new Error(error.message)
    if (row.length) await db.rpc('put_answers', { rows: row })
  }
  await once()
  await new Promise((done) => setTimeout(done, 4000))
  await once()
}

// Rows the sample board left behind on a real account.
export async function purgeDemoAnswers() {
  const db = cloud()
  if (!db) return { miss: '' }
  const ids = demoLampIds()
  if (!ids.length) return { miss: '' }
  const { error } = await db.from('answer_log').delete().in('lamp_id', ids)
  return { miss: error ? error.message : '' }
}

// Answers for questions that no longer exist anywhere.
export async function pruneAnswers(shelf) {
  const db = cloud()
  if (!db) return
  const keep = []
  for (const book of shelf?.boards || []) {
    for (const lamp of book.lamps || []) keep.push(lamp.id)
  }
  if (!keep.length) return
  await db.rpc('prune_answers', { keep })
}

// The document that goes up now carries structure only.
export function shelfWithoutAnswers(shelf) {
  return {
    ...shelf,
    boards: (shelf.boards || []).map((book) => {
      const { answers, ...rest } = book
      return rest
    }),
  }
}
