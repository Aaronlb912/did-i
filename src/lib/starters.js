import { blankLamp } from './board-json.js'
import { hangInto } from './board-ops.js'
import { boardDate, isDueOn } from './recurrence.js'

export const STARTERS = [
  {
    question: 'Did I take the evening pills?',
    short: 'Pills',
    kind: 'pills',
    cadence: 'daily',
    askAfter: '20:00',
    slot: 'night',
  },
  {
    question: 'Did I lock the back door?',
    short: 'Back door',
    kind: 'house',
    cadence: 'daily',
    askAfter: '21:00',
    slot: 'night',
  },
  {
    question: 'Did I put the keys on the hook?',
    short: 'Keys',
    kind: 'house',
    cadence: 'daily',
    askAfter: '',
    slot: 'whenever',
  },
  {
    question: 'Did I put the bins out?',
    short: 'Bins',
    kind: 'house',
    cadence: 'weekly',
    weekdays: [0],
    askAfter: '18:00',
    slot: 'night',
  },
  {
    question: 'Did I charge the phone?',
    short: 'Charge',
    kind: 'other',
    cadence: 'daily',
    askAfter: '22:00',
    slot: 'night',
  },
  {
    question: 'Did I pay the water bill?',
    short: 'Water',
    kind: 'money',
    cadence: 'monthly',
    monthDay: 12,
    askAfter: '',
    slot: 'whenever',
  },
]

export function unusedStarters(book, now = new Date(), dueNow = false) {
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)
  const dateIso = boardDate(now, book?.dayFoldHour)
  return STARTERS.filter(
    (starter) =>
      !hung.some((lamp) => lamp.short === starter.short || lamp.question === starter.question),
  ).filter((starter) => {
    if (!dueNow) return true
    return isDueOn({ ...blankLamp(now), ...starter }, dateIso)
  })
}

export function hangStarter(book, starter, now = new Date(), readyNow = false) {
  const lamp = readyNow ? { ...starter, askAfter: '' } : starter
  return hangInto(book, { ...blankLamp(now), ...lamp })
}
