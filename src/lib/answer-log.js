import { cloud } from './cloud.js'
import { demoLampIds } from './demo-strip.js'
import { answerStamp, mergeAnswer } from './board-ops.js'
import { answeredAtIso, cleanAmount, normalizeGone } from './board-json.js'
import { stampMs } from './recurrence.js'
import { readAccountUserId } from './session-id.js'

// Answers move one at a time instead of riding along with the whole
// shelf. Two marks in localStorage do the bookkeeping:
//   mark  the newest answeredAt this phone has already sent up
//   seen  the newest updated_at this phone has already pulled down

const MARK = 'did-i-answers-sent'
const SEEN = 'did-i-answers-seen'
// Last undo note read (supabase/answer-undos.sql).
const SEEN_UNDO = 'did-i-answers-undo-seen'
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
  write(SEEN_UNDO, '')
  write(UNDO, '')
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
  // The phone clock went back past the mark: new taps would look already sent.
  if (stampMs(read(MARK)) > Date.now()) write(MARK, '')
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
  // Same for a deleted folder: its rows must not land in the first folder.
  const deadTags = new Set(normalizeGone(shelf.goneTags).filter((item) => !item.back).map((item) => item.id))

  const indexOf = new Map()
  let changed = 0
  for (const row of rows) {
    if (dead.has(row.lamp_id)) continue
    if (!homeOf.has(row.lamp_id) && deadTags.has(row.board_id)) continue
    const book =
      homeOf.get(row.lamp_id) || boards.find((item) => item.id === row.board_id) || boards[0]
    if (!book) continue
    // One index per book, not a findIndex per row: a big pull is thousands of rows.
    let index = indexOf.get(book)
    if (!index) {
      index = new Map()
      book.answers.forEach((item, i) => {
        const key = `${item.lampId}|${item.periodKey}`
        if (!index.has(key)) index.set(key, i)
      })
      indexOf.set(book, index)
    }
    const key = `${row.lamp_id}|${row.period_key}`
    const at = index.has(key) ? index.get(key) : -1
    const mine = at >= 0 ? book.answers[at] : null
    const pulled = {
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
    // The tap and the note each from the copy that changed them last.
    const merged = mine ? mergeAnswer(mine, pulled) : pulled
    if (mine && merged === mine) continue
    const next = {
      ...merged,
      id: mine?.id || pulled.id,
      // A Did here, then a Not yet from another phone: still counted as paid,
      // so the next Did here does not pay again (purse.js payTap).
      ...(merged.status !== 'yes' && merged.status !== 'late' && (mine?.paid === true || mine?.status === 'yes' || mine?.status === 'late') ? { paid: true } : {}),
    }
    if (at >= 0) book.answers[at] = next
    else index.set(key, book.answers.push(next) - 1)
    changed += 1
  }
  return { shelf: { ...shelf, boards }, changed }
}

// An undo on another device ({ lamp, period, at, noteAt } rows gone from the
// account). Only that exact answer (same stamp) is dropped: a newer one made
// here, or the older answer the undo put back, stays. Running it twice is free.
export function dropSentAnswers(shelf, gone) {
  const upTo = new Map()
  for (const row of Array.isArray(gone) ? gone : []) {
    const at = stampMs(answerStamp({ answeredAt: row?.at || '', noteAt: row?.noteAt || '' }))
    if (row?.lamp && row?.period && at) upTo.set(`${row.lamp}|${row.period}`, at)
  }
  if (!upTo.size) return { shelf, changed: 0 }
  let changed = 0
  const boards = (shelf.boards || []).map((book) => {
    const answers = (book.answers || []).filter((item) => {
      const went = upTo.get(`${item.lampId}|${item.periodKey}`)
      const drop = Boolean(went) && stampMs(answerStamp(item)) === went
      if (drop) changed += 1
      return !drop
    })
    return answers.length === (book.answers || []).length ? book : { ...book, answers }
  })
  return { shelf: changed ? { ...shelf, boards } : shelf, changed }
}

// stillCurrent(): false once the account signed out while this was out, so
// the next account's first pull is not cut short by this one's stamp.
export async function pullAnswers(shelf, { stillCurrent = () => true } = {}) {
  const db = cloud()
  if (!db) return { shelf, changed: 0, miss: '' }
  const since = read(SEEN)
  // Supabase caps a read at 1000 rows by default; a bigger page would come
  // back short and look like the end.
  const PAGE = 1000
  const data = []
  // Paged by stamp, not offset: rows written while paging would shift an
  // offset and skip some. Offset only steps past a page that is all one stamp.
  // Back 5 seconds: updated_at is when a write started, so one that committed
  // after a later one would fall behind the mark. Applying a row twice is free.
  let cursor = overlap(since)
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
  // Undos made on another phone while this one was away: drop that exact answer,
  // or this phone would show it and send it back. Dropped before the merge, so
  // an earlier answer the undo put back lands on an empty slot.
  const undos = await pullUndos(db, stillCurrent)
  const dropped = dropSentAnswers(shelf, undos)
  const next = applyAnswers(dropped.shelf, data)
  if (data?.length && stillCurrent()) write(SEEN, data[data.length - 1].updated_at)
  return { shelf: next.shelf, changed: next.changed + dropped.changed, miss: '' }
}

function overlap(since) {
  const ms = Date.parse(since || '')
  return Number.isFinite(ms) ? new Date(ms - 5000).toISOString() : since
}

async function pullUndos(db, stillCurrent) {
  const since = read(SEEN_UNDO)
  let query = db.from('answer_undos').select('lamp_id, period_key, answered_at, note_at, undone_at').order('undone_at', { ascending: true }).limit(1000)
  if (since) query = query.gte('undone_at', overlap(since))
  const { data, error } = await query
  // Not there before the SQL is applied: nothing to drop.
  if (error || !data?.length) return []
  if (stillCurrent()) write(SEEN_UNDO, data[data.length - 1].undone_at)
  return data.map((row) => ({ lamp: row.lamp_id, period: row.period_key, at: row.answered_at, noteAt: row.note_at }))
}

// Undo of a tap. A later answeredAt always wins a pull, so the row the tap
// sent up has to go, and the answer from before the tap (if any) goes back.
// It runs again a moment later in case the tap's own send was still on its
// way. Only rows from before the undo go, so a new tap since then stays.
// An undo that can't reach the server (offline, app killed) waits in UNDO and
// runs on the next sync, before the pull that would bring the Did back.
const UNDO = 'did-i-answers-undo'

function readUndos() {
  try {
    const list = JSON.parse(read(UNDO) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function dropUndo(item) {
  write(UNDO, JSON.stringify(readUndos().filter((u) => u.id !== item.id)))
}

function failUndo(item) {
  const tries = (item.tries || 0) + 1
  // A server that keeps refusing it is not offline: give up after a few.
  if (tries >= 5) return dropUndo(item)
  write(UNDO, JSON.stringify(readUndos().map((u) => (u.id === item.id ? { ...u, tries } : u))))
}

async function undoOnce(db, item, late = false) {
  // Stamps may be old zoneless strings or UTC ISO, so the server can't
  // compare them as text. Read, compare in JS, then delete by key. A tap
  // landing between the read and the delete would be lost; rare enough.
  const { data, error: readError } = await db
    .from('answer_log')
    .select('answered_at, note_at')
    .eq('lamp_id', item.lampId)
    .eq('period_key', item.periodKey)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  const restore = async () => {
    if (!item.row.length) return
    const { error } = await db.rpc('put_answers', { rows: item.row })
    if (error) throw new Error(error.message)
  }
  // Run late, no row means something since removed it on purpose: leave it.
  if (!data) return late ? undefined : restore()
  const at = Math.max(stampMs(data.answered_at) || 0, stampMs(data.note_at) || 0)
  if (at > stampMs(item.now)) return
  // Already the answer from before the tap (the second run): leave it, so
  // other devices do not see it go and come back.
  if (item.beforeAt && at === item.beforeAt) return
  // Noted first, so a phone that missed the undo cannot send this answer back.
  // Best effort: before the SQL is applied the call fails and the undo still runs.
  await db.rpc('note_answer_undo', { lamp: item.lampId, period: item.periodKey, a: data.answered_at || '', e: data.note_at || '' }).then(() => {}, () => {})
  const { error } = await db
    .from('answer_log')
    .delete()
    .eq('lamp_id', item.lampId)
    .eq('period_key', item.periodKey)
  if (error) throw new Error(error.message)
  await restore()
}

export async function takeBackAnswer(book, lampId, periodKey) {
  const db = cloud()
  if (!db || !lampId || !periodKey) return
  const user = readAccountUserId()
  const now = answeredAtIso()
  const before = (book?.answers || []).find((item) => item.lampId === lampId && item.periodKey === periodKey)
  const row = before ? rowsOf({ boards: [{ ...book, answers: [before] }] }) : []
  const item = { id: lampId + '|' + periodKey + '|' + now, user, lampId, periodKey, now, row, beforeAt: before ? stampMs(answerStamp(before)) || 0 : 0 }
  write(UNDO, JSON.stringify([...readUndos(), item].slice(-50)))
  try {
    await undoOnce(db, item)
  } catch {
    // Offline: it waits in UNDO for the next sync.
    return
  }
  await new Promise((done) => setTimeout(done, 4000))
  // Signed out or into another account meanwhile: the old row is not theirs.
  if (readAccountUserId() !== user) return dropUndo(item)
  await undoOnce(db, item)
  dropUndo(item)
}

// Undos that never reached the server. Each one is dropped once it runs, or
// when it belongs to another account.
export async function runPendingUndos() {
  const db = cloud()
  if (!db) return
  const user = readAccountUserId()
  for (const item of readUndos()) {
    if (item.user !== user) {
      dropUndo(item)
      continue
    }
    try {
      await undoOnce(db, item, true)
      dropUndo(item)
    } catch (error) {
      // Still offline: try again on the next sync. Only a server that
      // answered and refused counts toward giving up.
      if (!/fetch|network|timed? ?out|abort/i.test(String(error?.message || error))) failUndo(item)
    }
  }
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
