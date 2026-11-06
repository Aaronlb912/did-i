import { lastBrokenNight } from './hall-feel.js'
import { addDaysIso, boardDate } from './recurrence.js'

// A calm card on Today the day after a streak ended, pointing to freezes.
// Hidden once dismissed for that night. No reward line, no red.
const KEY = 'did-i-freeze-card-seen'

export function freezeCardSeen() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function markFreezeCardSeen(night) {
  try {
    localStorage.setItem(KEY, night)
  } catch {
    // Shows again next open; harmless.
  }
}

// The night the streak ended when it was yesterday, dismissed or not, else ''.
// Only yesterday: an older break is not news, and the card says "yesterday".
export function freezeCardDay(boards, now = new Date()) {
  const broken = lastBrokenNight(boards || [], now)
  if (!broken) return ''
  const fold = boards?.[0]?.dayFoldHour
  return broken.night === addDaysIso(boardDate(now, fold), -1) ? broken.night : ''
}

// The night the streak ended, or '' when there is no card to show.
export function freezeCardNight(boards, now = new Date(), seen = freezeCardSeen()) {
  const night = freezeCardDay(boards, now)
  return night && night !== seen ? night : ''
}
