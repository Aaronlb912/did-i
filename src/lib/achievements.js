import { cameBackAfterHole } from './daily.js'
import { hallHeat } from './hall-feel.js'
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
  { id: 'first-open', name: 'Showed up', line: 'You opened Did I.' },
  { id: 'first-did', name: 'First DID', line: 'You hit DID.' },
  { id: 'honest-skip', name: 'Honest nope', line: 'Tonight was not that night.' },
  { id: 'late-ok', name: 'Late still counts', line: 'You marked a miss late.' },
  { id: 'hall-on', name: 'Tonight done', line: 'Everything due got an answer.' },
  { id: 'heat-3', name: 'Three nights', line: 'Three nights in a row finished.' },
  { id: 'heat-5', name: 'Five nights', line: 'Five nights finished.' },
  { id: 'showed-3', name: 'Three nights here', line: 'You came back three nights.' },
  { id: 'showed-7', name: 'A week of opens', line: 'Seven nights you opened it.' },
  { id: 'come-back', name: 'Back after a hole', line: 'You opened after a night that was not on.' },
  { id: 'seven-door', name: 'Seven nights on the door', line: 'The house question held a week.' },
  { id: 'hung-five', name: 'Five questions', line: 'Five questions added.' },
  { id: 'month-bill', name: 'Monthly yes', line: 'A monthly question got a yes.' },
  { id: 'quiet-week', name: 'Quiet week', line: 'Seven nights with no hole.' },
]

function add(unlocked, id) {
  if (unlocked.includes(id)) return unlocked
  return [...unlocked, id]
}

export function nextMark(book) {
  const have = new Set(book.unlocked || [])
  return ACHIEVEMENTS.find((item) => !have.has(item.id)) || null
}

export function streakLength(book, lamp, now) {
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
  let anyDue = false
  for (let i = 0; i < 7; i += 1) {
    const iso = addDaysIso(today, -i)
    const date = parseIsoDate(iso)
    if (!date) return false
    date.setHours(12, 0, 0, 0)
    const due = dueTonight(book, date)
    if (due.length) anyDue = true
    if (due.some((row) => !row.answer)) return false
  }
  return anyDue
}

export function unlockAchievements(book, now = new Date()) {
  let unlocked = Array.isArray(book.unlocked) ? [...book.unlocked] : []
  const answers = book.answers || []
  const lamps = (book.lamps || []).filter((lamp) => !lamp.archived)

  if ((book.opens || []).length) unlocked = add(unlocked, 'first-open')
  if ((book.opens || []).length >= 3) unlocked = add(unlocked, 'showed-3')
  if ((book.opens || []).length >= 7) unlocked = add(unlocked, 'showed-7')
  if (answers.some((answer) => answer.status === 'yes' || answer.status === 'late')) {
    unlocked = add(unlocked, 'first-did')
  }
  if (answers.some((answer) => answer.status === 'skip')) {
    unlocked = add(unlocked, 'honest-skip')
  }
  if (answers.some((answer) => answer.status === 'late')) {
    unlocked = add(unlocked, 'late-ok')
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
  const heat = hallHeat(book, now)
  if (heat >= 3) unlocked = add(unlocked, 'heat-3')
  if (heat >= 5) unlocked = add(unlocked, 'heat-5')
  if (cameBackAfterHole(book, now)) unlocked = add(unlocked, 'come-back')

  const door =
    lamps.find((lamp) => lamp.kind === 'house' && lamp.slot === 'night') ||
    lamps.find((lamp) => lamp.kind === 'house')
  if (door && streakLength(book, door, now) >= 7) unlocked = add(unlocked, 'seven-door')
  if (quietWeek(book, now)) unlocked = add(unlocked, 'quiet-week')

  return { ...book, unlocked }
}
