// "Ask a friend to check on me" (supabase/social-gentle.sql, check_ons).
// You pick one friend or family member for one of your questions. If it is
// not answered by your time, they get a push to send you a Did you. Only the
// question's words go to that one person.

import { cloud } from './cloud.js'

// Same as the server cap (cap_check_ons).
export const CHECK_ON_MAX = 20
// 10pm on your own clock.
export const CHECK_ON_DEFAULT = 22 * 60

// Daily and weekly questions have a night the server can check.
export function checkOnFits(lamp) {
  return Boolean(lamp && !lamp.archived && (lamp.cadence === 'daily' || lamp.cadence === 'weekly'))
}

// The weekdays the question is asked; [] is every night.
export function checkOnDays(lamp) {
  if (lamp?.cadence !== 'weekly') return []
  const days = Array.isArray(lamp.weekdays) ? lamp.weekdays : []
  return [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
}

export function cleanMinute(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return CHECK_ON_DEFAULT
  return Math.min(1439, Math.max(0, n))
}

// "22:00" from 1320.
export function minuteClock(minute) {
  const m = cleanMinute(minute)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Should the push go now? The same rule the server runs in queue_check_ons:
 * past the time on the owner's clock, asked tonight, not answered, not sent.
 * `night` is the owner's local date (YYYY-MM-DD), `minute` the local minute
 * of the day, `weekday` 0 to 6, `answered` whether answer_log has tonight.
 */
export function checkOnDue(link, { night, minute, weekday, answered }) {
  if (!link || answered) return false
  if (link.sent_on && link.sent_on >= night) return false
  if (minute < cleanMinute(link.at_minute ?? CHECK_ON_DEFAULT)) return false
  const days = Array.isArray(link.days) ? link.days : []
  return days.length === 0 || days.includes(weekday)
}

async function me(db) {
  const { data } = await db.auth.getSession()
  return data?.session?.user || null
}

function missOf(error) {
  if (/check-on cap/i.test(error?.message || '')) return 'checkOn.cap'
  if (/row-level security/i.test(error?.message || '')) return 'checkOn.notFriend'
  return 'people.reach'
}

/** Yours for one question, or null. */
export async function readCheckOn(lampId) {
  const db = cloud()
  if (!db) return { row: null, miss: 'off' }
  const user = await me(db)
  if (!user) return { row: null, miss: 'out' }
  const { data, error } = await db
    .from('check_ons')
    .select('id, buddy_id, lamp_id, question, at_minute, days')
    .eq('owner_id', user.id)
    .eq('lamp_id', String(lampId))
    .maybeSingle()
  if (error) return { row: null, miss: missOf(error) }
  return { row: data || null, miss: '' }
}

/** Sets or changes the friend and time for one question. */
export async function saveCheckOn(lamp, buddyId, atMinute = CHECK_ON_DEFAULT) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me(db)
  if (!user) return { miss: 'out' }
  if (!checkOnFits(lamp) || !buddyId) return { miss: 'people.reach' }
  const row = {
    owner_id: user.id,
    buddy_id: buddyId,
    lamp_id: String(lamp.id),
    question: String(lamp.question || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    at_minute: cleanMinute(atMinute),
    days: checkOnDays(lamp),
  }
  const { error } = await db.from('check_ons').upsert(row, { onConflict: 'owner_id,lamp_id' })
  return error ? { miss: missOf(error) } : { miss: '' }
}

/** Stops one. Works for the owner and for the friend. */
export async function stopCheckOn(id) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.from('check_ons').delete().eq('id', id)
  return error ? { miss: missOf(error) } : { miss: '' }
}

/** The questions one person asked you to check on. */
export async function checkOnsFrom(ownerId) {
  const db = cloud()
  if (!db || !ownerId) return []
  const user = await me(db)
  if (!user) return []
  const { data, error } = await db
    .from('check_ons')
    .select('id, question, at_minute')
    .eq('buddy_id', user.id)
    .eq('owner_id', ownerId)
  if (error) throw new Error(error.message)
  return data || []
}

/** Everyone's asks to you, one query: Map ownerId -> rows. For a list page. */
export async function checkOnsForMe() {
  const db = cloud()
  const out = new Map()
  if (!db) return out
  const user = await me(db)
  if (!user) return out
  const { data, error } = await db
    .from('check_ons')
    .select('id, owner_id, question, at_minute')
    .eq('buddy_id', user.id)
    .limit(200)
  if (error) throw new Error(error.message)
  return groupBy(data, 'owner_id')
}

// Rows into a Map by one field, order kept.
export function groupBy(rows, field) {
  const out = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = row?.[field]
    if (!id) continue
    if (!out.has(id)) out.set(id, [])
    out.get(id).push(row)
  }
  return out
}
