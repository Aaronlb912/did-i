// Asks once for a store rating, after the 7th cleared night on this phone.
// Cleared nights are counted here, as they happen, so nothing walks history.
const KEY = 'did-i-rate-ask'
export const RATE_AFTER_NIGHTS = 7

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      nights: Array.isArray(raw.nights) ? raw.nights.filter((n) => typeof n === 'string').slice(-RATE_AFTER_NIGHTS) : [],
      asked: raw.asked === true,
    }
  } catch {
    return { nights: [], asked: false }
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Asked again next launch at worst.
  }
}

// Counts a cleared night once. Returns true when the ask is due.
export function noteClearedNight(dateIso) {
  const state = read()
  if (state.asked) return false
  if (dateIso && !state.nights.includes(dateIso) && state.nights.length < RATE_AFTER_NIGHTS) {
    state.nights = [...state.nights, dateIso]
    write(state)
  }
  return state.nights.length >= RATE_AFTER_NIGHTS
}

export function rateAskDue() {
  const state = read()
  return !state.asked && state.nights.length >= RATE_AFTER_NIGHTS
}

export function markRateAsked() {
  write({ ...read(), asked: true })
}
