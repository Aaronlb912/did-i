// Someone back after a few missed days gets a calm return, not a scolding.
export const COME_BACK_DAYS = 3
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

// Days from the newest dated answer before dateIso to dateIso. 0 when there is
// an answer on dateIso, Infinity when there is none at all. One pass over the shelf.
export function daysSinceLastAnswer(shelf, dateIso) {
  if (!DATE_KEY.test(String(dateIso || ''))) return 0
  let newest = ''
  for (const item of shelf || []) {
    for (const answer of item?.answers || []) {
      const key = String(answer?.periodKey || '')
      if (!DATE_KEY.test(key) || key > dateIso) continue
      if (key === dateIso) return 0
      if (key > newest) newest = key
    }
  }
  return newest ? dayNumber(dateIso) - dayNumber(newest) : Infinity
}

// A real gap, but not a brand new shelf with nothing answered yet.
export function cameBack(shelf, dateIso) {
  const days = daysSinceLastAnswer(shelf, dateIso)
  return days >= COME_BACK_DAYS && days !== Infinity
}
