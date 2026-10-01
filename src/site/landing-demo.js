import { addDaysIso, boardDate, periodKeyFor } from '../lib/recurrence.js'

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

/** Fake board for the marketing landing phone animation only. */
export function landingDemoBook() {
  const today = boardDate(new Date(), 4)
  const born = addDaysIso(today, -1)
  const door = lamp({
    id: 'di-land-door',
    question: 'Did I water the plants?',
    short: 'Plants',
    kind: 'house',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  const pills = lamp({
    id: 'di-land-pills',
    question: 'Did I text Mom back?',
    short: 'Mom',
    kind: 'pills',
    cadence: 'daily',
    slot: 'evening',
    createdOn: born,
  })
  const cat = lamp({
    id: 'di-land-cat',
    question: 'Did I drink some water?',
    short: 'Water',
    kind: 'house',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  const lamps = [door, pills, cat]
  return {
    version: 1,
    id: 'board-landing-demo',
    title: 'Hayes Street',
    keeperName: 'Jordan Hale',
    dayFoldHour: 0,
    quietMode: false,
    inkNote: 'Three due tonight. Swipe DID or did not.',
    lamps,
    answers: [
      {
        id: `ans-${door.id}-${addDaysIso(today, -1)}`,
        lampId: door.id,
        periodKey: periodKeyFor(door, addDaysIso(today, -1)),
        status: 'yes',
        answeredAt: `${addDaysIso(today, -1)}T21:04:00`,
        note: '',
      },
      {
        id: `ans-${door.id}-${addDaysIso(today, -2)}`,
        lampId: door.id,
        periodKey: periodKeyFor(door, addDaysIso(today, -2)),
        status: 'yes',
        answeredAt: `${addDaysIso(today, -2)}T21:11:00`,
        note: '',
      },
    ],
    unlocked: ['first-open'],
    opens: [today, addDaysIso(today, -1), addDaysIso(today, -2)],
    coins: 16,
    gems: 8,
    cheers: ['lime', 'tape'],
    cheerOn: 'lime',
    cheerUses: 20,
    cheerStage: 5,
    cheerStages: { lime: 5, tape: 3 },
    cheerPlayStages: { lime: 2, tape: 1 },
    looks: ['lime'],
    lookOn: 'lime',
  }
}
