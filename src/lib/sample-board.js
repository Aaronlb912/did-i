import { addDaysIso, boardDate, periodKeyFor } from './recurrence.js'

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
  const createdOn = addDaysIso(today, -10)

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
    id: 'board-hayes',
    title: 'Hayes Street',
    keeperName: 'Jordan Hale',
    dayFoldHour: 4,
    quietMode: false,
    inkNote: '',
    lamps: [pills, door, bins, water, fern, lease],
    answers: [
      yesOn(pills, yesterday, '21:14:00'),
      yesOn(door, yesterday, '21:16:00'),
      yesOn(pills, addDaysIso(today, -2), '21:10:00'),
      yesOn(door, addDaysIso(today, -2), '21:12:00'),
      yesOn(pills, addDaysIso(today, -3), '21:08:00'),
      yesOn(door, addDaysIso(today, -3), '21:09:00'),
    ],
    unlocked: ['first-open', 'first-did', 'hall-on', 'heat-3', 'showed-3', 'hung-five'],
    opens: [today, yesterday, addDaysIso(today, -2), addDaysIso(today, -3)],
    coins: 40,
    gems: 3,
    cheers: ['lime'],
    cheerOn: 'lime',
    cheerUses: 20,
    cheerStage: 5,
    looks: ['lime', 'ink'],
    lookOn: 'lime',
  }
}

function yesOn(item, day, clock) {
  return {
    id: `ans-${item.id}-${day}`,
    lampId: item.id,
    periodKey: periodKeyFor(item, day),
    status: 'yes',
    answeredAt: `${day}T${clock}`,
    note: '',
  }
}

export function samplePracticeBoard(now = new Date()) {
  const today = boardDate(now, 4)
  const yesterday = addDaysIso(today, -1)
  const born = yesterday
  const plants = lamp({
    id: 'di-try-plants',
    question: 'Did I water the plants?',
    short: 'Plants',
    kind: 'other',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  const keys = lamp({
    id: 'di-try-keys',
    question: 'Did I put the keys in the bowl?',
    short: 'Keys',
    kind: 'house',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  return {
    version: 1,
    id: 'board-practice',
    title: 'Practice night',
    keeperName: 'Jordan Hale',
    dayFoldHour: 4,
    quietMode: false,
    inkNote: 'Tap DID. Watch the cheer. Then open Shop.',
    lamps: [plants, keys],
    answers: [yesOn(plants, yesterday, '19:02:00')],
    unlocked: ['first-open', 'first-did'],
    opens: [today, yesterday],
    coins: 12,
    gems: 1,
    cheers: ['lime'],
    cheerOn: 'lime',
    looks: ['lime'],
    lookOn: 'lime',
  }
}

export function sampleShopBoard(now = new Date()) {
  const today = boardDate(now, 4)
  const born = addDaysIso(today, -12)
  const lampOne = lamp({
    id: 'di-try-door',
    question: 'Did I lock the back door?',
    short: 'Back door',
    kind: 'house',
    cadence: 'daily',
    slot: 'night',
    createdOn: born,
  })
  const days = [0, -1, -2, -3, -4].map((offset) => addDaysIso(today, offset))
  return {
    version: 1,
    id: 'board-shop-try',
    title: 'Shop try',
    keeperName: 'Jordan Hale',
    dayFoldHour: 4,
    quietMode: false,
    inkNote: 'Tonight is done. Spend coins on a look. Spend gems on a cheer.',
    lamps: [lampOne],
    answers: days.map((day) => yesOn(lampOne, day, '21:05:00')),
    unlocked: ['first-open', 'first-did', 'hall-on', 'heat-3', 'heat-5', 'showed-3'],
    opens: days,
    coins: 80,
    gems: 8,
    cheers: ['lime', 'tape'],
    cheerOn: 'tape',
    cheerUses: 20,
    cheerStage: 5,
    looks: ['lime', 'ink', 'brass'],
    lookOn: 'brass',
  }
}

export function sampleNowBoard(now = new Date()) {
  const today = boardDate(now, 4)
  const born = addDaysIso(today, -1)
  const pills = lamp({
    id: 'di-now-pills',
    question: 'Did I take the morning pills?',
    short: 'Pills',
    kind: 'pills',
    cadence: 'daily',
    slot: 'morning',
    createdOn: born,
  })
  const trash = lamp({
    id: 'di-now-trash',
    question: 'Did I take the trash to the chute?',
    short: 'Trash',
    kind: 'house',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  const landlord = lamp({
    id: 'di-now-landlord',
    question: 'Did I text the landlord back?',
    short: 'Landlord',
    kind: 'people',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  return {
    version: 1,
    id: 'board-try-now',
    title: 'Try now',
    keeperName: 'Jordan Hale',
    dayFoldHour: 4,
    quietMode: false,
    inkNote: 'Three due tonight. Tap DID or nope.',
    lamps: [pills, trash, landlord],
    answers: [],
    unlocked: ['first-open'],
    opens: [today],
    coins: 16,
    gems: 8,
    cheers: ['lime'],
    cheerOn: 'lime',
    cheerUses: 20,
    cheerStage: 5,
    looks: ['lime'],
    lookOn: 'lime',
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
