import { t } from './i18n.js'
import { daysSinceDid, everyGap, isEvery, learnedGap } from './recurrence.js'

// "Last time: 12 days ago" under an every so often question. upTo counts a
// Did tonight (the question page); the card leaves tonight out.
export function lastTimeLine(book, lamp, dateIso, upTo = false) {
  if (!isEvery(lamp)) return ''
  const days = daysSinceDid(book, lamp.id, dateIso, upTo)
  if (days == null) return t('every.never')
  if (days === 0) return t('every.today')
  if (days === 1) return t('every.lastOne')
  return t('every.lastMany', { n: days })
}

// The small pill on the Questions list: "12d", or "" if never done.
export function sinceBadge(book, lamp, dateIso) {
  if (!isEvery(lamp)) return ''
  const days = daysSinceDid(book, lamp.id, dateIso, true)
  return days == null ? '' : t('every.badge', { n: days })
}

// "Usually every 9 days" once enough Dids taught it; the set gap otherwise.
export function gapLine(book, lamp, dateIso) {
  if (!isEvery(lamp)) return ''
  const learned = learnedGap(book, lamp.id, dateIso, true)
  if (learned) return t('every.usually', { n: learned })
  return t('cadence.every', { n: everyGap(book, lamp, dateIso) })
}
