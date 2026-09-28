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

export const MARK_IDS = [
  'first-open',
  'first-did',
  'honest-skip',
  'late-ok',
  'hall-on',
  'heat-3',
  'heat-5',
  'showed-3',
  'showed-7',
  'come-back',
  'seven-door',
  'hung-five',
  'month-bill',
  'quiet-week',
]

export const ACHIEVEMENTS = MARK_IDS.map((id) => ({ id }))

export function markText(id, field) {
  return `mark.${id}.${field}`
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

function cameBackAfterHole(book, now = new Date()) {
  const today = boardDate(now, book.dayFoldHour)
  const yesterday = addDaysIso(today, -1)
  const at = parseIsoDate(yesterday)
  if (!at) return false
  at.setHours(12, 0, 0, 0)
  const due = dueTonight(book, at).filter(
    (row) => !row.lamp.createdOn || row.lamp.createdOn <= yesterday,
  )
  if (!due.length) return false
  if (due.every((row) => row.answer)) return false
  return (book.opens || []).includes(today)
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

  function add(id) {
    if (unlocked.includes(id)) return
    unlocked = [...unlocked, id]
  }

  // Held until the first answer so it does not toast on a cold first launch.
  if ((book.opens || []).length && answers.length) add('first-open')
  if ((book.opens || []).length >= 3) add('showed-3')
  if ((book.opens || []).length >= 7) add('showed-7')
  if (answers.some((answer) => answer.status === 'yes' || answer.status === 'late')) {
    add('first-did')
  }
  if (answers.some((answer) => answer.status === 'skip')) add('honest-skip')
  if (answers.some((answer) => answer.status === 'late')) add('late-ok')
  if (lamps.length >= 5) add('hung-five')
  if (
    answers.some((answer) => {
      const lamp = (book.lamps || []).find((item) => item.id === answer.lampId)
      return lamp && lamp.cadence === 'monthly' && (answer.status === 'yes' || answer.status === 'late')
    })
  ) {
    add('month-bill')
  }
  if (allClearTonight(book, now)) add('hall-on')
  const heat = hallHeat(book, now)
  if (heat >= 3) add('heat-3')
  if (heat >= 5) add('heat-5')
  if (cameBackAfterHole(book, now)) add('come-back')

  const door =
    lamps.find((lamp) => lamp.kind === 'house' && lamp.slot === 'night') ||
    lamps.find((lamp) => lamp.kind === 'house')
  if (door && streakLength(book, door, now) >= 7) add('seven-door')
  if (quietWeek(book, now)) add('quiet-week')

  return { ...book, unlocked }
}

export function commitBook(book, clock = new Date()) {
  return unlockAchievements(book, clock)
}
