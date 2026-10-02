// A Did you's repeat: '' once, 'daily', or 'weekly:1,3,5' (Sunday 0).
// Stored on the send; the person who keeps it gets a question with that
// schedule, and it is theirs to change from then on.
import { blankLamp } from './board-json.js'
import { t } from './i18n.js'
import { boardDate } from './recurrence.js'

export function repeatFrom(cadence, weekdays = []) {
  if (cadence === 'daily') return 'daily'
  if (cadence === 'weekly') {
    const days = [...new Set(weekdays.map(Number))].filter((d) => d >= 0 && d <= 6).sort()
    return days.length ? `weekly:${days.join(',')}` : ''
  }
  return ''
}

export function readRepeat(repeat) {
  const text = String(repeat || '')
  if (text === 'daily') return { cadence: 'daily', weekdays: [] }
  const days = /^weekly:([0-6](,[0-6])*)$/.exec(text)
  if (days) return { cadence: 'weekly', weekdays: days[1].split(',').map(Number) }
  return { cadence: 'once', weekdays: [] }
}

export function repeatLabel(repeat) {
  const { cadence, weekdays } = readRepeat(repeat)
  if (cadence === 'daily') return t('we.daily')
  if (cadence === 'weekly') return weekdays.map((day) => t(`we.day.${day}`)).join(' ')
  return ''
}

// What keeping a Did you puts on your Tonight. Takes the question text, or
// { question, repeat } from a send. Dated by your night (boardDate, in the
// account's time zone, as Tonight counts), not the phone's calendar, so a
// phone in another zone still puts it on tonight and its made-on night never
// lands after tonight, which would stop the streak.
export function keptLamp(item, clock = new Date(), dayFoldHour = 0) {
  const question = String(typeof item === 'string' ? item : item?.question || '').trim()
  if (!question) return null
  // A Did I for one night (app_sends mode tonight) carries that night.
  const set = typeof item === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(String(item?.night || '')) ? item.night : ''
  const night = set || boardDate(clock, dayFoldHour)
  const base = { ...blankLamp(clock), question, createdOn: night }
  if (typeof item === 'object' && item?.fromDidI) base.fromDidI = true
  // Auto-added (not kept by you): it counts only once you say did.
  if (typeof item === 'object' && item?.optional) base.optional = true
  // Marked so the Questions tab can show did yous apart from your own.
  if (typeof item === 'object') {
    base.fromDidYou = true
    const name = String(item?.person?.display_name || item?.person?.handle || '').replace(/\s+/g, ' ').trim().slice(0, 40)
    if (name) base.fromName = name
  }
  const { cadence, weekdays } = readRepeat(typeof item === 'string' ? '' : item.repeat)
  if (cadence === 'once') return { ...base, cadence: 'once', onceOn: night }
  return { ...base, cadence, weekdays }
}
