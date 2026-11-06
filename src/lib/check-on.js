// "Ask a friend to check on me" (supabase/social-gentle.sql, check_ons).
// You pick one friend or family member for one of your questions. If it is
// not answered by your time, they get a push to send you a Did you. Only the
// question's words go to that one person.

import { cloud } from './cloud.js'
import { daysBetween } from './recurrence.js'

// Same as the server cap (cap_check_ons).
export const CHECK_ON_MAX = 20
// 10pm on your own clock.
export const CHECK_ON_DEFAULT = 22 * 60

const ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * Which rule the server runs for this question (check_ons.kind), or '' when
 * it has none: 'night' (daily, weekly), 'monthly', 'once' (Just once on a
 * day), 'by' (a deadline), 'every' (every so often).
 */
export function checkOnKind(lamp) {
  if (!lamp || lamp.archived) return ''
  switch (lamp.cadence) {
    case 'daily':
    case 'weekly':
      return 'night'
    case 'monthly': {
      const day = lamp.monthDay === 'last' ? 0 : Number(lamp.monthDay)
      return Number.isInteger(day) && day >= 0 && day <= 31 ? 'monthly' : ''
    }
    case 'once':
      if (lamp.onceWhen === 'by') return ISO.test(String(lamp.dueBy || '').trim()) ? 'by' : ''
      return ISO.test(String(lamp.onceOn || '').trim()) ? 'once' : ''
    case 'every':
      return 'every'
    default:
      return ''
  }
}

// Questions with a night the server can check.
export function checkOnFits(lamp) {
  return Boolean(checkOnKind(lamp))
}

function everyDaysOf(lamp) {
  const n = Number(lamp?.everyDays)
  return Number.isInteger(n) && n >= 1 && n <= 366 ? n : 7
}

/** The extra columns the server needs for this question's kind. */
export function checkOnShape(lamp) {
  const kind = checkOnKind(lamp)
  const shape = { kind: kind || 'night', month_day: null, on_date: null, starts_on: null, every_days: null, ends_on: null }
  // The last day it is asked; the server stops pushing after it. Not for a Just once.
  const end = String(lamp?.endsOn || '').trim()
  if (kind && kind !== 'once' && kind !== 'by' && ISO.test(end)) shape.ends_on = end
  if (kind === 'monthly') shape.month_day = lamp.monthDay === 'last' ? 0 : Number(lamp.monthDay)
  if (kind === 'once') shape.on_date = String(lamp.onceOn).trim()
  if (kind === 'by') {
    shape.on_date = String(lamp.dueBy).trim()
    const start = String(lamp.createdOn || '').trim().slice(0, 10)
    shape.starts_on = ISO.test(start) && start <= shape.on_date ? start : null
  }
  if (kind === 'every') shape.every_days = everyDaysOf(lamp)
  return shape
}

/**
 * When the friend would hear, as an i18n key and its values, for the card.
 * `day` is the month day (0 is the last), `date` an ISO date.
 */
export function checkOnWhen(lamp) {
  const shape = checkOnShape(lamp)
  if (!checkOnKind(lamp)) return null
  if (shape.kind === 'monthly') {
    return shape.month_day === 0 ? { key: 'checkOn.whenMonthLast' } : { key: 'checkOn.whenMonthly', day: shape.month_day }
  }
  if (shape.kind === 'once') return { key: 'checkOn.whenOnce', date: shape.on_date }
  if (shape.kind === 'by') return { key: 'checkOn.whenBy', date: shape.on_date }
  if (shape.kind === 'every') return { key: 'checkOn.whenEvery', n: shape.every_days }
  return null
}

function lastOfMonth(night) {
  const [y, m] = night.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Is the question asked on this night, per kind? `lastDid` is the newest Did night before it (every). */
export function checkOnAsked(link, { night, weekday, lastDid = '', learned = 0 }) {
  const kind = link?.kind || 'night'
  // After its end date the question is not asked.
  if (link?.ends_on && night > link.ends_on) return false
  if (kind === 'night') {
    const days = Array.isArray(link.days) ? link.days : []
    return days.length === 0 || days.includes(weekday)
  }
  if (kind === 'monthly') {
    const want = Number(link.month_day) === 0 ? 31 : Number(link.month_day)
    return Number(night.slice(8, 10)) === Math.min(want, lastOfMonth(night))
  }
  if (kind === 'once') return link.on_date === night
  // A deadline is asked every night from its start to the due date.
  if (kind === 'by') return night >= (link.starts_on || link.on_date) && night <= link.on_date
  if (kind === 'every') {
    if (!lastDid) return true
    return daysBetween(lastDid, night) >= (learned || Number(link.every_days) || 7)
  }
  return false
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
 * of the day, `weekday` 0 to 6, `answered` whether answer_log has this
 * period's key, `lastDid` the newest Did night before tonight (every kind).
 */
export function checkOnDue(link, { night, minute, weekday, answered, lastDid = '', learned = 0 }) {
  if (!link || answered) return false
  if (link.sent_on && link.sent_on >= night) return false
  if (minute < cleanMinute(link.at_minute ?? CHECK_ON_DEFAULT)) return false
  return checkOnAsked(link, { night, weekday, lastDid, learned })
}

async function me(db) {
  const { data } = await db.auth.getSession()
  return data?.session?.user || null
}

function missOf(error) {
  if (/too many check-ons/i.test(error?.message || '')) return 'checkOn.capToday'
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
  // Always sent, so a question that changes cadence never keeps an old rule.
  Object.assign(row, checkOnShape(lamp))
  const { error } = await db.from('check_ons').upsert(row, { onConflict: 'owner_id,lamp_id' })
  return error ? { miss: missOf(error) } : { miss: '' }
}

// What the server's rule is built from, to tell whether an edit changed it.
export function checkOnRule(lamp) {
  if (!checkOnFits(lamp)) return ''
  return JSON.stringify({
    question: String(lamp.question || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    days: checkOnDays(lamp),
    ...checkOnShape(lamp),
  })
}

/**
 * After a question is edited: if its words or schedule changed, update a
 * check-on that already exists so the server follows the new rule. One
 * update, no read; with no check-on it touches nothing. Fire and forget:
 * the card shows the saved rule next time it opens.
 */
// A finished question asked again: the server row's end date has to follow.
export function followReopen(before, book) {
  const after = (book?.lamps || []).find((item) => item.id === before?.id)
  return followCheckOn(before, after)
}

export async function followCheckOn(before, after) {
  if (!before || !after || before.id !== after.id) return { miss: '' }
  const rule = checkOnRule(after)
  // The new schedule has no night the server can check: stop the old one.
  if (!rule) return checkOnRule(before) ? dropCheckOn(after.id) : { miss: '' }
  if (rule === checkOnRule(before)) return { miss: '' }
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me(db)
  if (!user) return { miss: 'out' }
  const { question, days, ...shape } = JSON.parse(rule)
  const { error } = await db
    .from('check_ons')
    .update({ question, days, ...shape })
    .eq('owner_id', user.id)
    .eq('lamp_id', String(after.id))
  return error ? { miss: missOf(error) } : { miss: '' }
}

/**
 * Stops your check-on for one question, if there is one: after a delete,
 * pause or stop, so the friend is not pushed about a question you dropped.
 * With no cloud there is nothing on the server to stop. With no session it
 * returns out, so the caller keeps it and tries again after sign in.
 */
export async function dropCheckOn(lampId) {
  const db = cloud()
  if (!db || lampId == null) return { miss: '' }
  const user = await me(db)
  if (!user) return { miss: 'out' }
  const { error } = await db.from('check_ons').delete().eq('owner_id', user.id).eq('lamp_id', String(lampId))
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
