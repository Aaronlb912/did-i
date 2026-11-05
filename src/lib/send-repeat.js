// A Did you's repeat: '' once, 'daily', 'weekly:1,3,5' (Sunday 0), or
// 'every:14' (every so often, about every 14 days).
// Stored on the send; the person who keeps it gets a question with that
// schedule, and it is theirs to change from then on.
import { blankLamp } from './board-json.js'
import { t } from './i18n.js'
import { boardDate, formatBoardDate, isEvery, lastDidNight } from './recurrence.js'

const ISO = /^\d{4}-\d{2}-\d{2}$/

// extra: { date, n, monthDay } for on, by, every_n, per_week and monthly.
export function repeatFrom(cadence, weekdays = [], everyDays = 0, extra = {}) {
  if (cadence === 'daily') return 'daily'
  if (cadence === 'on' || cadence === 'by') return ISO.test(String(extra.date || '')) ? `${cadence}:${extra.date}` : ''
  if (cadence === 'every_n') {
    const n = Number(extra.n)
    return Number.isInteger(n) && n >= 2 && n <= 365 ? `every_n:${n}` : ''
  }
  if (cadence === 'per_week') {
    const n = Number(extra.n)
    return Number.isInteger(n) && n >= 1 && n <= 6 ? `per_week:${n}` : ''
  }
  if (cadence === 'monthly') {
    const d = extra.monthDay === 'last' ? 0 : Number(extra.monthDay)
    return Number.isInteger(d) && d >= 0 && d <= 31 ? `monthly:${d}` : ''
  }
  if (cadence === 'every') {
    const n = Number(everyDays)
    return Number.isInteger(n) && n >= 2 && n <= 365 ? `every:${n}` : ''
  }
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
  const every = /^every:(\d{1,3})$/.exec(text)
  if (every && Number(every[1]) === 1) return { cadence: 'daily', weekdays: [] }
  if (every && Number(every[1]) >= 2 && Number(every[1]) <= 365) {
    return { cadence: 'every', weekdays: [], everyDays: Number(every[1]) }
  }
  const dated = /^(on|by):(\d{4}-\d{2}-\d{2})$/.exec(text)
  if (dated) return { cadence: dated[1], weekdays: [], date: dated[2] }
  const everyN = /^every_n:(\d{1,3})$/.exec(text)
  if (everyN && Number(everyN[1]) >= 2 && Number(everyN[1]) <= 365) return { cadence: 'every_n', weekdays: [], n: Number(everyN[1]) }
  const perWeek = /^per_week:([1-6])$/.exec(text)
  if (perWeek) return { cadence: 'per_week', weekdays: [], n: Number(perWeek[1]) }
  const monthly = /^monthly:(\d{1,2})$/.exec(text)
  if (monthly && Number(monthly[1]) <= 31) return { cadence: 'monthly', weekdays: [], monthDay: Number(monthly[1]) || 'last' }
  return { cadence: 'once', weekdays: [] }
}

export function repeatLabel(repeat) {
  const { cadence, weekdays, everyDays, date, n, monthDay } = readRepeat(repeat)
  if (cadence === 'daily') return t('we.daily')
  if (cadence === 'on') return formatBoardDate(date)
  if (cadence === 'by') return `${t('hang.dueByPick')} ${formatBoardDate(date)}`
  if (cadence === 'every_n') return t('cadence.everyN', { n })
  if (cadence === 'per_week') return n === 1 ? t('cadence.perWeekOne') : t('cadence.perWeek', { n })
  if (cadence === 'monthly') return monthDay === 'last' ? t('cadence.monthlyLast') : t('cadence.monthlyOn', { day: monthDay })
  if (cadence === 'every') return t('cadence.every', { n: everyDays })
  if (cadence === 'weekly') return weekdays.map((day) => t(`we.day.${day}`)).join(' ')
  return ''
}

// True when a question kept from this send is already on one of the boards.
export function sendOnShelf(boards, id) {
  const want = String(id || '').toLowerCase()
  return Boolean(want) && (boards || []).some((board) => (board?.lamps || []).some((lamp) => lamp?.sendId === want))
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
    // Who sent it, so removing one of two friends with the same name touches only theirs.
    const fromId = String(item?.person?.user_id || item?.from_id || '').toLowerCase()
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(fromId)) base.fromId = fromId
    // The send it came from (inbox rows carry id, auto adds sendId), so the
    // sender can see its answers. A Did you link or Did I has none.
    const sendId = String(item?.sendId || item?.id || '').toLowerCase()
    if (!item?.fromDidI && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sendId)) base.sendId = sendId
  }
  const { cadence, weekdays, everyDays, date, n, monthDay } = readRepeat(typeof item === 'string' ? '' : item.repeat)
  if (cadence === 'on') return { ...base, cadence: 'once', onceWhen: 'on', onceOn: date >= night ? date : night }
  if (cadence === 'by') return date >= night ? { ...base, cadence: 'once', onceWhen: 'by', dueBy: date } : { ...base, cadence: 'once', onceWhen: 'on', onceOn: night }
  if (cadence === 'every_n') return { ...base, cadence, everyN: n, everyNAnchor: night }
  if (cadence === 'per_week') return { ...base, cadence: 'daily', perWeek: n }
  if (cadence === 'monthly') return { ...base, cadence, monthDay }
  if (cadence === 'once') return { ...base, cadence: 'once', onceOn: night }
  if (cadence === 'every') return { ...base, cadence, everyDays }
  return { ...base, cadence, weekdays }
}

// "Did I water the plants?" and "Did you water the plants" are the same one.
function bareQuestion(text) {
  return String(text || '').trim().toLowerCase().replace(/^did (i|you)\s+/, '').replace(/[?.!\s]+$/, '')
}

// Your own last Did of the same every so often question, or '', so the
// person you ask sees "Last time: 12 days ago" on it.
export function senderLastDid(book, question, night) {
  const text = bareQuestion(question)
  if (!text) return ''
  const lamp = (book?.lamps || []).find((item) => isEvery(item) && !item.archived && bareQuestion(item.question) === text)
  return lamp ? lastDidNight(book, lamp.id, night, true) : ''
}
