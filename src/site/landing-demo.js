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
  const pills = lamp({
    id: 'di-land-pills',
    question: 'Did I take the morning pills?',
    short: 'Pills',
    kind: 'pills',
    cadence: 'daily',
    slot: 'morning',
    createdOn: born,
  })
  const trash = lamp({
    id: 'di-land-trash',
    question: 'Did I take the trash to the chute?',
    short: 'Trash',
    kind: 'house',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  const landlord = lamp({
    id: 'di-land-landlord',
    question: 'Did I text the landlord back?',
    short: 'Landlord',
    kind: 'people',
    cadence: 'daily',
    slot: 'whenever',
    createdOn: born,
  })
  const lamps = [pills, trash, landlord]
  const door = lamps[0]
  return {
    version: 1,
    id: 'board-landing-demo',
    title: 'Hayes Street',
    keeperName: 'Jordan Hale',
    dayFoldHour: 0,
    quietMode: false,
    inkNote: 'Three due tonight. Swipe DID or nope.',
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
