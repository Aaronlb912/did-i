// A kept Did you shows its sender how you answer it, unless you turn that
// off for the question. The server side is supabase/send-answers.sql.
//
// The keeper's phone copies the last week of Did / Not yet for each shared
// Did you on every sync (an answer taken back drops off too). Nothing else
// on the shelf goes. The sender reads the newest nights in one call.
import { cloud } from './cloud.js'
import { t } from './i18n.js'
import { uses24h } from './prefs.js'
import { addDaysIso, boardDate, dateTag, formatBoardDate, periodNight } from './recurrence.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const WINDOW = 7

export function cleanSendId(value) {
  const text = String(value || '').trim().toLowerCase()
  return UUID.test(text) ? text : ''
}

// Kept from a send and still sharing: the sender sees its answers.
export function sharesAnswers(lamp) {
  return Boolean(lamp && cleanSendId(lamp.sendId) && !lamp.shareOff)
}

// What this shelf shares: the send ids it covers and their answers since
// a week ago. Pure, so the sync and the tests read the same thing.
export function sendAnswerRows(shelf, now = new Date()) {
  const since = addDaysIso(boardDate(now), -WINDOW)
  const ids = []
  const rows = []
  for (const book of shelf?.boards || []) {
    const lamps = new Map((book.lamps || []).filter(sharesAnswers).map((lamp) => [lamp.id, lamp]))
    if (!lamps.size) continue
    for (const lamp of lamps.values()) ids.push(cleanSendId(lamp.sendId))
    for (const answer of book.answers || []) {
      const lamp = lamps.get(answer.lampId)
      if (!lamp || !answer.periodKey) continue
      const night = periodNight(lamp, answer.periodKey)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(night) || night < since) continue
      rows.push({
        send_id: cleanSendId(lamp.sendId),
        night,
        answer: answer.status === 'skip' ? 'nope' : 'did',
        // A bad time fails the whole call on the server, every sync.
        ...(answer.answeredAt && !Number.isNaN(Date.parse(answer.answeredAt)) ? { at: answer.answeredAt } : {}),
      })
    }
  }
  rows.sort((a, b) => `${a.send_id}${a.night}`.localeCompare(`${b.send_id}${b.night}`))
  return { since, ids: [...new Set(ids)].sort().slice(0, 200), rows: rows.slice(0, 1000) }
}

// Sent with each sync, only when something changed since the last one that
// landed. Offline answers go with the next sync that reaches the server.
let lastSent = ''
export async function pushSendAnswers(db, user, shelf) {
  const { since, ids, rows } = sendAnswerRows(shelf)
  // Nothing shared: skip, unless this session shared before (the last one was
  // just deleted, so the server should drop its answers).
  if (!ids.length && !lastSent) return
  const key = `${user.id}:${since}:${JSON.stringify(ids)}:${JSON.stringify(rows)}`
  if (key === lastSent) return
  lastSent = key
  try {
    const { error } = await db.rpc('share_send_answers', { since, ids, rows })
    if (error) lastSent = ''
  } catch {
    lastSent = ''
  }
}

// On or off on the server. Off also deletes what the sender could see.
export async function setSendShare(sendId, on) {
  const db = cloud()
  const id = cleanSendId(sendId)
  if (!db || !id) return { miss: 'people.reach' }
  const { data, error } = await db.rpc('set_send_share', { send: id, share: Boolean(on) })
  if (error || !data) return { miss: 'people.reach' }
  // Back on: the next sync sends the week again.
  if (on) lastSent = ''
  return { miss: '' }
}

// Newest nights per send you sent, as a Map of send id to rows, newest first.
export async function readSendAnswers(ids) {
  const db = cloud()
  const list = [...new Set((ids || []).map(cleanSendId).filter(Boolean))].slice(0, 200)
  const out = new Map()
  if (!db || !list.length) return out
  const { data, error } = await db.rpc('send_answers_for', { ids: list })
  if (error) return out
  for (const row of data || []) {
    if (!out.has(row.send_id)) out.set(row.send_id, [])
    out.get(row.send_id).push(row)
  }
  return out
}

function clockAt(at) {
  const date = new Date(at)
  if (!at || Number.isNaN(date.getTime())) return ''
  try {
    return date.toLocaleTimeString(dateTag(), { hour: 'numeric', minute: '2-digit', hour12: !uses24h() })
  } catch {
    return ''
  }
}

// "Did today 10:41 PM", "Not yet today", "Did yesterday", "Did Mon, Oct 12",
// or '' when there is nothing to say. A Not yet only counts for today.
export function sendAnswerLine(rows, tonight = boardDate()) {
  const list = rows || []
  const now = list.find((row) => row.night === tonight)
  if (now?.answer === 'did') {
    const time = clockAt(now.at)
    return time ? t('sent.didTonightAt', { time }) : t('sent.didTonight')
  }
  if (now?.answer === 'nope') return t('sent.notYetTonight')
  const did = list.find((row) => row.answer === 'did' && row.night < tonight)
  if (!did) return ''
  if (did.night === addDaysIso(tonight, -1)) return t('sent.didYesterday')
  return t('sent.didOn', { day: formatBoardDate(did.night) })
}
