import { answerFor, isDueOn, periodKeyFor, recentPeriodKeys } from './recurrence.js'

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
