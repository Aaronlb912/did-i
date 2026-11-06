import { t } from './i18n.js'
import { dateTag, daysBetween, daysSinceDid, everyGap, isEvery, isoDate, isPerWeek, learnedGap, perWeekDone } from './recurrence.js'

// "Last time: 12 days ago" under an every so often question. upTo counts a
// Did tonight (the question page); the card leaves tonight out.
export function lastTimeLine(book, lamp, dateIso, upTo = false) {
  if (!isEvery(lamp)) return ''
  const days = daysSinceDid(book, lamp.id, dateIso, upTo)
  if (days == null) return t('every.never')
  if (days === 0) return t('every.today')
  if (days === 1) return t('every.lastOne')
  return t('every.lastMany', { n: days })
}

// "No Did in 34 days" on the Questions list: a live question with no Did for
// STALE_DAYS or more that was also made that long ago. Not for every so often
// questions (their pill says it), one-time or monthly ones. '' otherwise.
export const STALE_DAYS = 21
export function staleDidLine(book, lamp, dateIso) {
  if (!lamp || lamp.archived || lamp.cadence === 'once' || lamp.cadence === 'monthly' || isEvery(lamp)) return ''
  if (lamp.endsOn && lamp.endsOn < dateIso) return ''
  const made = String(lamp.createdOn || '').slice(0, 10)
  const age = made ? daysBetween(made, dateIso) : null
  if (age == null || age < STALE_DAYS) return ''
  const days = daysSinceDid(book, lamp.id, dateIso, true)
  const since = days == null ? age : days
  return since >= STALE_DAYS ? t('questions.noDid', { n: since }) : ''
}

// "2 of 3 this week" under a times-a-week question. The card leaves out a Did
// tonight unless upTo.
export function perWeekLine(book, lamp, dateIso, upTo = true) {
  if (!isPerWeek(lamp)) return ''
  return t('perWeek.line', { done: Math.min(perWeekDone(book, lamp.id, dateIso, upTo), Number(lamp.perWeek)), n: lamp.perWeek })
}

// The small pill on the Questions list: "12d", "today", or "Never yet".
// lastTimeLine(..., true) is its spoken label.
export function sinceBadge(book, lamp, dateIso, never = true) {
  if (!isEvery(lamp)) return ''
  const days = daysSinceDid(book, lamp.id, dateIso, true)
  if (days == null) return never ? t('every.never') : ''
  if (days === 0) return t('every.badgeToday')
  return t('every.badge', { n: days })
}

// "Usually every 9 days" once enough Dids taught it; the set gap otherwise.
export function gapLine(book, lamp, dateIso) {
  if (!isEvery(lamp)) return ''
  const learned = learnedGap(book, lamp.id, dateIso, true)
  if (learned) return t('every.usually', { n: learned })
  return t('cadence.every', { n: everyGap(book, lamp, dateIso) })
}

// Shared every so often (family questions): due for everyone once every_days
// have passed since anyone's last Did. last is { on, by } from
// family_every_last, or null when nobody has done it yet.
export function sharedEveryDue(lamp, last, night) {
  if (!lamp || lamp.cadence !== 'every' || lamp.archived) return false
  if (lamp.made_on && night < lamp.made_on) return false
  const on = String(last?.on || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return true
  const gap = Number(lamp.every_days)
  return daysBetween(on, night) >= (Number.isInteger(gap) && gap >= 1 ? gap : 7)
}

// The newest Did from a list of family answers, any member: { on, by }.
// Nope (skip) never counts, so it only answers for the one who said it.
export function newestDid(rows = []) {
  let best = null
  for (const row of rows) {
    if (row.status !== 'yes' && row.status !== 'late') continue
    if (!best || row.period_key > best.on) best = { on: row.period_key, by: row.user_id }
  }
  return best
}

// "Last time: Sam, 2 days ago" or "Never yet". name is their display name.
export function sharedLastLine(last, night, name = '') {
  const on = String(last?.on || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return t('every.never')
  const days = Math.max(0, daysBetween(on, night))
  if (!name) return sinceLine(days)
  if (days === 0) return t('every.byToday', { name })
  if (days === 1) return t('every.byOne', { name })
  return t('every.byMany', { name, n: days })
}

// "Last time: 12 days ago" on a Did you that comes up every so often. ''
// when it is not one; "Never yet" when the sender has not done it.
export function sendLastLine(repeat, lastDidOn, night) {
  if (!/^every:\d+$/.test(String(repeat || ''))) return ''
  const on = String(lastDidOn || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return t('every.never')
  return sinceLine(Math.max(0, daysBetween(on, night)))
}

// A one-off Did you ask that has waited: "Was due Oct 3" past its day, else
// "Asked Oct 3" once made 2 or more days ago. '' for a repeating one or a fresh ask.
export function sendAskLine(row, night) {
  if (/^every:\d+$/.test(String(row?.repeat || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(night || ''))) return ''
  const say = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(dateTag(), { month: 'short', day: 'numeric' })
  const due = String(row?.due_on || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(due) && due < night) return t('tonight.wasDue', { day: say(due) })
  const ms = Date.parse(row?.made_at || '')
  if (!ms) return ''
  const made = isoDate(new Date(ms))
  return daysBetween(made, night) >= 2 ? t('tonight.askedOn', { day: say(made) }) : ''
}

function sinceLine(days) {
  if (days === 0) return t('every.today')
  if (days === 1) return t('every.lastOne')
  return t('every.lastMany', { n: days })
}
