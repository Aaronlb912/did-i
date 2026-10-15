import { cloud } from './cloud.js'
import { demoLampIds } from './demo-strip.js'
import { answerStamp } from './board-ops.js'
import { answeredAtIso, cleanAmount } from './board-json.js'
import { stampMs } from './recurrence.js'

// Answers move one at a time instead of riding along with the whole
// shelf. Two marks in localStorage do the bookkeeping:
//   mark  the newest answeredAt this phone has already sent up
//   seen  the newest updated_at this phone has already pulled down

const MARK = 'did-i-answers-sent'
const SEEN = 'did-i-answers-seen'
const CHUNK = 500
// Set once every answer has been resent with a zoned time. Older apps sent
// local times with no zone, which the server reads as UTC.
const ZONED = 'did-i-answers-zoned'

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

function zoned(value) {
  const ms = stampMs(value)
  return ms ? new Date(ms).toISOString() : value || ''
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
        a: zoned(answer.answeredAt),
        n: answer.note || '',
        e: zoned(answer.noteAt),
        // Always sent, null when there is none, so the server can tell a
        // cleared amount from an older app that never sends one.
        m: cleanAmount(answer.amount),
      })
    }
  }
  return out
}

// Everything answered since the last successful send. Normally one row.
export function answersToSend(shelf, all = false) {
  const mark = all ? '' : read(MARK)
  const rows = rowsOf(shelf)
  const since = stampMs(mark)
  return since ? rows.filter((row) => stampMs(rowStamp(row)) > since) : rows
}

// The tap or the note, whichever changed last.
function rowStamp(row) {
  return stampMs(row.e) > stampMs(row.a) ? row.e : row.a
}

export async function pushAnswers(shelf, all = false) {
  const db = cloud()
  if (!db) return { sent: 0, miss: '' }
  const fresh = !read(ZONED)
  const rows = answersToSend(shelf, all || fresh)
  if (!rows.length) {
    if (fresh) write(ZONED, '1')
    return { sent: 0, miss: '' }
  }

  let newest = read(MARK)
  // A row stamped in the future (another phone with a fast clock) must not
  // push the mark past answers this phone has yet to make.
  const now = Date.now()
  for (let at = 0; at < rows.length; at += CHUNK) {
    const slice = rows.slice(at, at + CHUNK)
    const { error } = await db.rpc('put_answers', { rows: slice })
    if (error) return { sent: at, miss: error.message }
    for (const row of slice) {
      const ms = Math.min(stampMs(rowStamp(row)), now)
      if (ms > stampMs(newest)) newest = new Date(ms).toISOString()
    }
  }
  write(MARK, newest)
  if (fresh) write(ZONED, '1')
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
      homeOf.get(row.lamp_id) || boards.find((item) => item.id === row.board_id) || boards[0]
    if (!book) continue
    const at = book.answers.findIndex(
      (item) => item.lampId === row.lamp_id && item.periodKey === row.period_key,
    )
    const mine = at >= 0 ? book.answers[at] : null
    const theirs = { answeredAt: row.answered_at || '', noteAt: row.note_at || '' }
    if (mine && stampMs(answerStamp(mine)) >= stampMs(answerStamp(theirs))) continue
    const next = {
      id: mine?.id || `ans-${row.lamp_id}-${row.period_key}`,
      lampId: row.lamp_id,
      periodKey: row.period_key,
      status: row.status,
      answeredAt: row.answered_at || '',
      note: row.note || '',
      ...(row.note_at ? { noteAt: row.note_at } : {}),
      // No amount column yet (answers.sql not applied) reads as no amount.
      ...(cleanAmount(row.amount) !== null ? { amount: cleanAmount(row.amount) } : {}),
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
  // Supabase caps a read at 1000 rows by default; a bigger page would come
  // back short and look like the end.
  const PAGE = 1000
  const data = []
  // Paged by stamp, not offset: rows written while paging would shift an
  // offset and skip some. Offset only steps past a page that is all one stamp.
  let cursor = since
  let from = 0
  for (;;) {
    let query = db
      .from('answer_log')
      // '*' so this read works before and after note_at is added (answers.sql).
      .select('*')
      .order('updated_at', { ascending: true })
      .range(from, from + PAGE - 1)
    // Greater-or-equal on purpose. A batch written in one statement shares
    // a timestamp, and skipping past it would drop the rest of the batch.
    // Re-reading the boundary costs a few rows; applying one twice is free.
    if (cursor) query = query.gte('updated_at', cursor)
    const { data: page, error } = await query
    if (error) return { shelf, changed: 0, miss: error.message }
    data.push(...(page || []))
    if (!page || page.length < PAGE) break
    const last = page[page.length - 1].updated_at
    if (last !== cursor) {
      cursor = last
      from = 0
    } else {
      from += PAGE
    }
  }
  const next = applyAnswers(shelf, data)
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
    // Stamps may be old zoneless strings or UTC ISO, so the server can't
    // compare them as text. Read, compare in JS, then delete by key. A tap
    // landing between the read and the delete would be lost; rare enough.
    const { data, error: readError } = await db
      .from('answer_log')
      .select('answered_at, note_at')
      .eq('lamp_id', lampId)
      .eq('period_key', periodKey)
      .maybeSingle()
    if (readError) throw new Error(readError.message)
    if (!data) {
      if (row.length) await db.rpc('put_answers', { rows: row })
      return
    }
    const at = Math.max(stampMs(data.answered_at) || 0, stampMs(data.note_at) || 0)
    if (at > stampMs(now)) return
    const { error } = await db
      .from('answer_log')
      .delete()
      .eq('lamp_id', lampId)
      .eq('period_key', periodKey)
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
