import { addDaysIso, answerFor, isDueOn, periodKeyFor, periodNight, recentPeriodKeys } from './recurrence.js'

function didStatus(status) {
  return status === 'yes' || status === 'late'
}

// One question's record for its page: the DID streak, and how many of its
// recent due nights were DID. Tonight only counts once it is answered.
export function lampRecord(book, lamp, dateIso, days = 30) {
  if (!lamp) return { streak: 0, did: 0, asked: 0, tonight: '', due: false }
  const tonightKey = periodKeyFor(lamp, dateIso)
  const tonight = answerFor(book, lamp.id, tonightKey)?.status || ''
  // A paused question keeps its history on show, so count its nights as if live.
  const keys = recentPeriodKeys({ ...lamp, archived: false }, dateIso, days).filter((key) => key !== tonightKey || tonight)
  let did = 0
  for (const key of keys) {
    if (didStatus(answerFor(book, lamp.id, key)?.status)) did += 1
  }
  let streak = 0
  for (let i = keys.length - 1; i >= 0; i -= 1) {
    if (!didStatus(answerFor(book, lamp.id, keys[i])?.status)) break
    streak += 1
  }
  return { streak, did, asked: keys.length, tonight, due: !lamp.archived && isDueOn(lamp, dateIso) }
}

// One question's last few weeks, oldest first: how many due nights each week
// were DID. Tonight only counts once it is answered. Once and monthly
// questions have no weekly shape, so they get none.
export function lampWeeks(book, lamp, dateIso, weeks = 8) {
  if (!lamp || lamp.cadence === 'once' || lamp.cadence === 'monthly' || !dateIso) return []
  const live = { ...lamp, archived: false }
  const created = String(lamp.createdOn || '').slice(0, 10)
  const out = []
  for (let w = 0; w < weeks; w += 1) {
    const from = addDaysIso(dateIso, -(weeks * 7 - 1) + w * 7)
    let due = 0
    let did = 0
    for (let d = 0; d < 7; d += 1) {
      const iso = d ? addDaysIso(from, d) : from
      if (created && iso < created) continue
      if (!isDueOn(live, iso)) continue
      const status = answerFor(book, lamp.id, periodKeyFor(lamp, iso))?.status || ''
      if (iso === dateIso && !status) continue
      due += 1
      if (didStatus(status)) did += 1
    }
    out.push({ from, due, did })
  }
  // Weeks before the question had anything due are not a trend, just blanks.
  const first = out.findIndex((week) => week.due > 0)
  return first < 0 ? [] : out.slice(first)
}

// This question's answers, newest night first, each with its readable night.
export function lampNights(book, lamp) {
  if (!lamp) return []
  return (book?.answers || [])
    .filter((answer) => answer.lampId === lamp.id && answer.periodKey)
    .map((answer) => ({ answer, night: periodNight(lamp, answer.periodKey) }))
    .sort((a, b) => b.night.localeCompare(a.night) || String(b.answer.periodKey).localeCompare(String(a.answer.periodKey)))
}
