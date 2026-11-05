import { lastBrokenNight } from './hall-feel.js'

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

// The night the streak ended, or '' when there is no card to show.
export function freezeCardNight(boards, now = new Date(), seen = freezeCardSeen()) {
  const broken = lastBrokenNight(boards || [], now)
  return broken && broken.night !== seen ? broken.night : ''
}
