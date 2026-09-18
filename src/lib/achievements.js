import {
  addDaysIso,
  allClearTonight,
  answerFor,
  boardDate,
  dueTonight,
  isDueOn,
  parseIsoDate,
  periodKeyFor,
  previousDueDate,
} from './recurrence.js'

export const ACHIEVEMENTS = [
  { id: 'first-did', name: 'First DID' },
  { id: 'hall-on', name: 'Hall is on' },
  { id: 'honest-skip', name: 'Honest skip' },
  { id: 'seven-door', name: 'Seven nights on the door' },
  { id: 'hung-five', name: 'Five lamps' },
  { id: 'month-bill', name: 'Monthly yes' },
  { id: 'quiet-week', name: 'Quiet week' },
]

function add(unlocked, id) {
  if (unlocked.includes(id)) return unlocked
  return [...unlocked, id]
}

function streakLength(book, lamp, now) {
  if (!lamp) return 0
  const today = boardDate(now, book.dayFoldHour)
  let cursor = isDueOn(lamp, today) ? today : previousDueDate(lamp, today)
  if (isDueOn(lamp, today) && !answerFor(book, lamp.id, periodKeyFor(lamp, today))) {
    cursor = previousDueDate(lamp, today)
  }
  let count = 0
  while (cursor && count < 40) {
    const answer = answerFor(book, lamp.id, periodKeyFor(lamp, cursor))
    if (!answer) break
    if (answer.status !== 'yes' && answer.status !== 'late' && answer.status !== 'skip') break
    count += 1
    cursor = previousDueDate(lamp, cursor)
  }
  return count
}

function quietWeek(book, now) {
  const today = boardDate(now, book.dayFoldHour)
  for (let i = 0; i < 7; i += 1) {
    const iso = addDaysIso(today, -i)
    const date = parseIsoDate(iso)
    if (!date) return false
    date.setHours(12, 0, 0, 0)
    const due = dueTonight(book, date)
    if (due.some((row) => !row.answer)) return false
  }
  return true
}

export function unlockAchievements(book, now = new Date()) {
  let unlocked = Array.isArray(book.unlocked) ? [...book.unlocked] : []
  const answers = book.answers || []
  const lamps = (book.lamps || []).filter((lamp) => !lamp.archived)

  if (answers.some((answer) => answer.status === 'yes' || answer.status === 'late')) {
    unlocked = add(unlocked, 'first-did')
  }
  if (answers.some((answer) => answer.status === 'skip')) {
    unlocked = add(unlocked, 'honest-skip')
  }
  if (lamps.length >= 5) unlocked = add(unlocked, 'hung-five')
  if (
    answers.some((answer) => {
      const lamp = (book.lamps || []).find((item) => item.id === answer.lampId)
      return lamp && lamp.cadence === 'monthly' && (answer.status === 'yes' || answer.status === 'late')
    })
  ) {
    unlocked = add(unlocked, 'month-bill')
  }
  if (allClearTonight(book, now)) unlocked = add(unlocked, 'hall-on')

  const door =
    lamps.find((lamp) => lamp.kind === 'house' && lamp.slot === 'night') ||
    lamps.find((lamp) => lamp.kind === 'house')
  if (door && streakLength(book, door, now) >= 7) unlocked = add(unlocked, 'seven-door')
  if (quietWeek(book, now)) unlocked = add(unlocked, 'quiet-week')

  return { ...book, unlocked }
}
