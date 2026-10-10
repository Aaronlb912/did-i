import { blankLamp } from './board-json.js'
import { hangInto, takeDown } from './board-ops.js'
import { t } from './i18n.js'
import { boardDate, isDueOn } from './recurrence.js'

export const STARTERS = [
  { idea: 'pills', question: 'Did I take my meds?', short: 'Meds', kind: 'pills', cadence: 'daily', askAfter: '20:00', slot: 'night' },
  { idea: 'water', question: 'Did I drink enough water?', short: 'Water', kind: 'other', cadence: 'daily', askAfter: '20:00', slot: 'night' },
  { idea: 'text', question: 'Did I text them back?', short: 'Text back', kind: 'people', cadence: 'daily', askAfter: '', slot: 'whenever' },
  { idea: 'skin', question: 'Did I do my skincare?', short: 'Skincare', kind: 'other', cadence: 'daily', askAfter: '21:30', slot: 'night' },
  {
    idea: 'bill',
    question: 'Did I pay the bill?',
    short: 'Bill',
    kind: 'money',
    cadence: 'monthly',
    monthDay: 12,
    askAfter: '',
    slot: 'whenever',
  },
  { idea: 'charge', question: 'Did I charge my phone?', short: 'Charge', kind: 'other', cadence: 'daily', askAfter: '22:00', slot: 'night' },
]

// The ideas in the app's language: "Did I" stays, the words after it and the
// short name follow the language (like first.ownHint).
export function starterList() {
  return STARTERS.map((item) => ({
    ...item,
    question: t(`ideas.${item.idea}.question`),
    short: t(`ideas.${item.idea}.start`),
  }))
}

// The words that fill "Did I ___": "take my meds".
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

// Packs add a few questions at once from Add. Each item works like a starter.
export const PACKS = [
  {
    id: 'bedtime',
    items: [
      { idea: 'charge', kind: 'other', cadence: 'daily', askAfter: '22:00', slot: 'night' },
      { idea: 'teeth', kind: 'other', cadence: 'daily', askAfter: '21:30', slot: 'night' },
      { idea: 'skin', kind: 'other', cadence: 'daily', askAfter: '21:30', slot: 'night' },
    ],
  },
  {
    id: 'meds',
    items: [
      { idea: 'pills', kind: 'pills', cadence: 'daily', askAfter: '20:00', slot: 'night' },
      { idea: 'water', kind: 'other', cadence: 'daily', askAfter: '20:00', slot: 'night' },
      { idea: 'eat', kind: 'other', cadence: 'daily', askAfter: '', slot: 'whenever' },
    ],
  },
  {
    id: 'admin',
    items: [
      { idea: 'text', kind: 'people', cadence: 'daily', askAfter: '', slot: 'whenever' },
      { idea: 'email', kind: 'people', cadence: 'daily', askAfter: '', slot: 'whenever' },
      { idea: 'bill', kind: 'money', cadence: 'monthly', monthDay: 12, askAfter: '', slot: 'whenever' },
    ],
  },
  {
    // Every so often: each comes up once its gap has passed since the last Did.
    id: 'home',
    items: [
      { idea: 'plants', kind: 'other', cadence: 'every', everyDays: 7, askAfter: '', slot: 'whenever' },
      { idea: 'sheets', kind: 'other', cadence: 'every', everyDays: 14, askAfter: '', slot: 'whenever' },
      { idea: 'fridge', kind: 'other', cadence: 'every', everyDays: 30, askAfter: '', slot: 'whenever' },
    ],
  },
]

// Each pack in the app's language, with only the questions this tag lacks.
export function packList(book) {
  const hung = (book?.lamps || []).filter((lamp) => !lamp.archived)
  return PACKS.map((pack) => ({
    id: pack.id,
    title: t(`pack.${pack.id}`),
    items: pack.items
      .map((item) => ({
        ...item,
        question: t(`ideas.${item.idea}.question`),
        short: t(`ideas.${item.idea}.start`),
      }))
      .filter((item) => !hung.some((lamp) => lamp.short === item.short || lamp.question === item.question)),
  })).filter((pack) => pack.items.length)
}

// Adds a pack's questions and hands back their ids, so undo can take them off.
export function addPack(book, pack, now = new Date()) {
  let next = book
  const ids = []
  for (const item of pack?.items || []) {
    const { idea, ...fields } = item
    const lamp = { ...blankLamp(now), ...fields }
    ids.push(lamp.id)
    next = hangInto(next, lamp)
  }
  return { book: next, ids }
}

export function undoPack(book, ids, now = new Date()) {
  let next = book
  for (const id of ids || []) {
    const lamp = (next.lamps || []).find((item) => item.id === id)
    if (lamp) next = takeDown(next, lamp, now)
  }
  return next
}
