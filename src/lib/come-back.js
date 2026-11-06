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

// Reminders back off after three days in a row with something due and no
// answer. Returns the first day ahead (0 = today) that backs off, or Infinity.
// Days still to come count as missed: any answer sets reminders again.
// A shelf with nothing answered yet never backs off. isDue(iso) says whether
// anything is due that day, so days off and Away do not count.
export const BACK_OFF_DAYS = 3
export function backOffFrom(shelf, dateIso, isDue, horizon = 15) {
  const since = daysSinceLastAnswer(shelf, dateIso)
  if (since === Infinity || !DATE_KEY.test(String(dateIso || ''))) return Infinity
  const base = dayNumber(dateIso)
  let missed = 0
  for (let k = since === 0 ? 1 : Math.max(1 - since, -10); k < horizon; k += 1) {
    if (!isDue(new Date((base + k) * 86400000).toISOString().slice(0, 10))) continue
    missed += 1
    if (missed >= BACK_OFF_DAYS) return Math.max(0, k + 1)
  }
  return Infinity
}

// A real gap, but not a brand new shelf with nothing answered yet.
export function cameBack(shelf, dateIso, minDays = COME_BACK_DAYS) {
  const days = daysSinceLastAnswer(shelf, dateIso)
  return days >= minDays && days !== Infinity
}

// The late-Did card that saves a streak stays until a real gap of COME_BACK_DAYS,
// even on a new shelf where the come-back card shows after 2.
export function graceLost(shelf, dateIso) {
  return cameBack(shelf, dateIso, COME_BACK_DAYS)
}

// Days since the oldest dated answer, 0 for a shelf with none yet. Gates first-week rows.
export function daysSinceFirstAnswer(shelf, dateIso) {
  if (!DATE_KEY.test(String(dateIso || ''))) return 0
  let oldest = ''
  for (const item of shelf || []) {
    for (const answer of item?.answers || []) {
      const key = String(answer?.periodKey || '')
      if (DATE_KEY.test(key) && (!oldest || key < oldest)) oldest = key
    }
  }
  return oldest ? dayNumber(dateIso) - dayNumber(oldest) : 0
}
