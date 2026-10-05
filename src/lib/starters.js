import { blankLamp } from './board-json.js'
import { hangInto } from './board-ops.js'
import { t } from './i18n.js'
import { boardDate, isDueOn } from './recurrence.js'

export const STARTERS = [
  {
    idea: 'pills',
    question: 'Did I take the evening pills?',
    short: 'Pills',
    kind: 'pills',
    cadence: 'daily',
    askAfter: '20:00',
    slot: 'night',
  },
  {
    idea: 'door',
    question: 'Did I lock the back door?',
    short: 'Back door',
    kind: 'house',
    cadence: 'daily',
    askAfter: '21:00',
    slot: 'night',
  },
  {
    idea: 'keys',
    question: 'Did I put the keys on the hook?',
    short: 'Keys',
    kind: 'house',
    cadence: 'daily',
    askAfter: '',
    slot: 'whenever',
  },
  {
    idea: 'bins',
    question: 'Did I put the bins out?',
    short: 'Bins',
    kind: 'house',
    cadence: 'weekly',
    weekdays: [0],
    askAfter: '18:00',
    slot: 'night',
  },
  {
    idea: 'charge',
    question: 'Did I charge the phone?',
    short: 'Charge',
    kind: 'other',
    cadence: 'daily',
    askAfter: '22:00',
    slot: 'night',
  },
  {
    idea: 'water',
    question: 'Did I pay the water bill?',
    short: 'Water',
    kind: 'money',
    cadence: 'monthly',
    monthDay: 12,
    askAfter: '',
    slot: 'whenever',
  },
]

// The ideas in the app's language: "Did I" stays, the words after it and the
// short name follow the language (like first.ownHint).
export function starterList() {
  return STARTERS.map((item) => ({
    ...item,
    question: `Did I ${t(`starter.${item.idea}.blank`)}?`,
    short: t(`ideas.${item.idea}.start`),
  }))
}

// The words that fill "Did I ___": "take the evening pills".
export function starterBlank(starter) {
  return String(starter?.question || '')
    .replace(/^did i\s+/i, '')
    .replace(/\?+$/, '')
    .trim()
}

export function unusedStarters(book, now = new Date(), dueNow = false) {
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)
  const dateIso = boardDate(now, book?.dayFoldHour)
  return starterList().filter(
    (starter) =>
      !hung.some((lamp) => lamp.short === starter.short || lamp.question === starter.question),
  ).filter((starter) => {
    if (!dueNow) return true
    return isDueOn({ ...blankLamp(now), ...starter }, dateIso)
  })
}

export function hangStarter(book, starter, now = new Date(), readyNow = false) {
  const { idea, ...fields } = starter
  const lamp = readyNow ? { ...fields, askAfter: '' } : fields
  return hangInto(book, { ...blankLamp(now), ...lamp })
}
