// The morning ask: before noon, Tonight offers to add one-day questions for
// today. Each is a plain 'once' question on today, marked morning and
// optional so a Not yet never breaks a streak and a Did counts like any.
import { blankLamp, shortFromQuestion } from './board-json.js'
import { hangInto } from './board-ops.js'
import { boardDate } from './recurrence.js'
import { wallClock } from './zone.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'

export const MORNING_CAP = 10
export const MORNING_END_HOUR = 12
// The server only drops past 30 a day, an abuse guard (supabase/morning-cap.sql).

export function morningOpen(now = new Date()) {
  return wallClock(now).getHours() < MORNING_END_HOUR
}

// A one-day question on this day (the "Today" label).
export function isTodayOnce(lamp, iso) {
  return lamp?.cadence === 'once' && lamp.onceWhen !== 'by' && String(lamp.onceOn || '') === iso
}

// "Today", or "Today, 3:00 PM" for a morning question with a reminder.
export function todayLabel(lamp) {
  return lamp?.morning && lamp.askAfter ? t('morning.labelAt', { time: clockWords(lamp.askAfter) }) : t('morning.label')
}

export function morningCount(boards, iso) {
  let n = 0
  for (const book of boards || []) {
    for (const lamp of book?.lamps || []) if (lamp.morning && lamp.onceOn === iso) n += 1
  }
  return n
}

const plain = (text) => String(text || '').trim().replace(/\s+/g, ' ').toLowerCase()

// Adds one to `book`. { book } on success, or { error: 'empty' | 'dupe' | 'full' | 'past' }.
// `boards` is the whole shelf, for the cap and duplicates. `at` ('HH:MM',
// optional) is a reminder today, the same askAfter any question has.
export function addMorning(book, boards, text, now = new Date(), at = '') {
  const question = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 200)
  if (!question) return { error: 'empty' }
  const iso = boardDate(now)
  const all = boards && boards.length ? boards : [book]
  if (morningCount(all, iso) >= MORNING_CAP) return { error: 'full' }
  const same = all.some((item) =>
    (item?.lamps || []).some(
      (lamp) => !lamp.archived && plain(lamp.question) === plain(question) && (lamp.cadence !== 'once' || isTodayOnce(lamp, iso)),
    ),
  )
  if (same) return { error: 'dupe' }
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(at || '') ? at : ''
  if (time) {
    const clock = wallClock(now)
    const nowHm = `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`
    if (time <= nowHm) return { error: 'past' }
  }
  const lamp = {
    ...blankLamp(now),
    question,
    short: shortFromQuestion(question),
    cadence: 'once',
    onceWhen: 'on',
    onceOn: iso,
    askAfter: time,
    optional: true,
    morning: true,
  }
  return { book: hangInto(book, lamp), lamp }
}
