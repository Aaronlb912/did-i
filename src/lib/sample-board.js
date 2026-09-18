import { addDaysIso, boardDate, isoDate, periodKeyFor } from './recurrence.js'

function lamp(partial) {
  return {
    weekdays: [],
    monthDay: '',
    everyN: '',
    everyNAnchor: '',
    onceOn: '',
    askAfter: '',
    slot: 'whenever',
    notes: '',
    archived: false,
    ...partial,
  }
}

export function sampleBoard(now = new Date()) {
  const today = boardDate(now, 4)
  const yesterday = addDaysIso(today, -1)
  const weekAgo = addDaysIso(today, -7)
  const createdOn = isoDate(now)

  const pills = lamp({
    id: 'di-pills',
    question: 'Did I take the evening pills?',
    short: 'Pills',
    kind: 'pills',
    cadence: 'daily',
    askAfter: '20:00',
    slot: 'night',
    createdOn,
  })
  const door = lamp({
    id: 'di-door',
    question: 'Did I lock the back door?',
    short: 'Back door',
    kind: 'house',
    cadence: 'daily',
    askAfter: '21:00',
    slot: 'night',
    createdOn,
  })
  const bins = lamp({
    id: 'di-bins',
    question: 'Did I put the bins out?',
    short: 'Bins',
    kind: 'house',
    cadence: 'weekly',
    weekdays: [0],
    askAfter: '18:00',
    slot: 'night',
    createdOn,
  })
  const water = lamp({
    id: 'di-water',
    question: 'Did I pay the water bill?',
    short: 'Water',
    kind: 'money',
    cadence: 'monthly',
    monthDay: 12,
    slot: 'whenever',
    createdOn,
  })
  const fern = lamp({
    id: 'di-fern',
    question: 'Did I water the fern?',
    short: 'Fern',
    kind: 'other',
    cadence: 'every_n',
    everyN: 3,
    everyNAnchor: weekAgo,
    slot: 'whenever',
    createdOn,
  })
  const lease = lamp({
    id: 'di-lease',
    question: 'Did I mail the lease paper?',
    short: 'Lease',
    kind: 'money',
    cadence: 'once',
    slot: 'whenever',
    createdOn,
  })

  return {
    version: 1,
    title: 'Hayes Street',
    dayFoldHour: 4,
    quietMode: false,
    inkNote: '',
    lamps: [pills, door, bins, water, fern, lease],
    answers: [
      {
        id: 'ans-pills-yday',
        lampId: pills.id,
        periodKey: periodKeyFor(pills, yesterday),
        status: 'yes',
        answeredAt: `${yesterday}T21:14:00`,
        note: '',
      },
      {
        id: 'ans-door-yday',
        lampId: door.id,
        periodKey: periodKeyFor(door, yesterday),
        status: 'yes',
        answeredAt: `${yesterday}T21:16:00`,
        note: '',
      },
    ],
    unlocked: ['first-did'],
  }
}

export function sampleEmptyBoard() {
  return {
    version: 1,
    title: 'Hayes Street',
    dayFoldHour: 4,
    quietMode: false,
    inkNote: '',
    lamps: [],
    answers: [],
    unlocked: [],
  }
}
