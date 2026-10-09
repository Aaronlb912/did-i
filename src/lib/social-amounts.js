// Amounts on a Did we (one combined weekly total) and notes you choose to
// share with friends. Server side: supabase/social-amounts.sql.
//
// Privacy: amounts here come only from we_answers on a shared card. Your own
// questions' amounts (answer_log) are never read or sent by this file.

import { cloud } from './cloud.js'
import { t } from './i18n.js'
import { addDaysIso, boardDate } from './recurrence.js'

export const SHARED_NOTE_DAYS = 3
const SHARED_KEY = 'did-i-shared-notes'
const SHARED_KEEP = 200

function bad(error) {
  return { miss: error?.message || 'people.reach' }
}

// The Monday that starts the week holding nightIso.
export function weekStartIso(nightIso = boardDate()) {
  const [y, m, d] = String(nightIso).split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return addDaysIso(nightIso, -((day + 6) % 7))
}

// Rows from we_week_totals into a Map by card id. Bad numbers read as 0.
export function totalsById(rows) {
  const out = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.card_id) continue
    const total = Number(row.total)
    const mine = row.mine == null || row.mine === '' ? null : Number(row.mine)
    out.set(row.card_id, {
      unit: String(row.unit || ''),
      total: Number.isFinite(total) && total > 0 ? Math.round(total * 100) / 100 : 0,
      mine: Number.isFinite(mine) ? mine : null,
    })
  }
  return out
}

// "Together: 31 glasses this week". Null when there is nothing to show yet.
export function togetherLine(sum) {
  if (!sum || !sum.total) return ''
  const n = sum.total
  return sum.unit ? t('weAmount.together', { n, unit: sum.unit }) : t('weAmount.togetherBare', { n })
}

// "3,5" or "3.5" into a number in range; '' clears; anything else is NaN.
export function readAmount(raw) {
  const text = String(raw ?? '').trim().replace(',', '.')
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : NaN
}

// One query for every card on screen.
export async function weWeekTotals(cardIds, night = boardDate()) {
  const ids = [...new Set((cardIds || []).filter(Boolean))].slice(0, 60)
  const db = cloud()
  if (!db || !ids.length) return { totals: new Map(), miss: db ? '' : 'off' }
  const { data, error } = await db.rpc('we_week_totals', { cards: ids, week_start: weekStartIso(night), on_night: night })
  if (error) return { totals: new Map(), ...bad(error) }
  return { totals: totalsById(data), miss: '' }
}

export async function weTrackAmount(card, on, unit = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('we_track_amount', { card, want_on: Boolean(on), want_unit: String(unit || '').slice(0, 24) })
  return error ? bad(error) : { miss: '' }
}

export async function wePutAmount(card, amount, night = boardDate()) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('we_put_amount', { card, on_night: night, want_amount: amount })
  if (!error) return { miss: '' }
  if (/answer did first/i.test(error.message || '')) return { miss: t('weAmount.didFirst') }
  return bad(error)
}

// Shared notes ----------------------------------------------------------

function sharedKey(lampId, periodKey) {
  return `${lampId}|${periodKey}`
}

function readShared() {
  try {
    const list = JSON.parse(localStorage.getItem(SHARED_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function keepShared(list) {
  try {
    localStorage.setItem(SHARED_KEY, JSON.stringify(list.slice(0, SHARED_KEEP)))
  } catch {
    // Only sets the toggle's starting place.
  }
}

// Whether this night's note is shared, as last saved from this device.
export function noteShared(lampId, periodKey) {
  return readShared().includes(sharedKey(lampId, periodKey))
}

// Share (or update) a note. An empty note or share off removes it.
export async function setNoteShared({ lampId, periodKey, question = '', note = '', on }) {
  const key = sharedKey(lampId, periodKey)
  const text = String(note || '').trim().slice(0, 500)
  const want = Boolean(on) && Boolean(text)
  const db = cloud()
  if (!db) return { miss: want ? t('sharedNote.needAccount') : '' }
  const { data } = await db.auth.getSession()
  const user = data?.session?.user
  if (!user) return { miss: want ? t('sharedNote.needAccount') : '' }
  const where = { user_id: user.id, lamp_id: String(lampId).slice(0, 64), period_key: String(periodKey).slice(0, 24) }
  const { error } = want
    ? await db.from('shared_notes').upsert({ ...where, question: String(question || '').slice(0, 200), note: text })
    : await db.from('shared_notes').delete().match(where)
  if (error) {
    if (/too many shared notes/i.test(error.message || '')) return { miss: t('sharedNote.cap') }
    return { miss: t('sharedNote.failed') }
  }
  const rest = readShared().filter((item) => item !== key)
  keepShared(want ? [key, ...rest] : rest)
  return { miss: '' }
}

// A friend's shared notes from the last few nights, newest first. RLS
// returns nothing for someone who is not a friend.
export async function sharedNotesFrom(friendId, now = new Date()) {
  const db = cloud()
  if (!db || !friendId) return []
  const since = new Date(now.getTime() - SHARED_NOTE_DAYS * 86400000).toISOString()
  const { data, error } = await db
    .from('shared_notes')
    .select('lamp_id, period_key, question, note, made_at')
    .eq('user_id', friendId)
    .gte('made_at', since)
    .order('made_at', { ascending: false })
    .limit(10)
  return error || !Array.isArray(data) ? [] : data
}
