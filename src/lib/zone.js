// Where the person is. Nobody picks this and nobody picks the reset hour.
// The night rolls over at midnight where they are standing.

export const DAY_FOLD = 0

// Only how the mast looks. Late night still reads as night even though
// the date has already turned over.
export const LOOKS_LATE = 4

// The grace period for the previous night: a night stays open until 9am the
// next morning, the same for everyone, so a 2am did (or a night shift's
// 7am) still counts for it. Until 5am its open questions come first; from
// 5am to 9am they wait behind today's.
export const GRACE_END = 9
export const GRACE_FIRST_UNTIL = 5

// Night walks ask for the zone thousands of times; building the formatter
// each time was most of the cost. Re-read at most once a second so a phone
// that changes zone still picks it up.
let zoneMemo = ''
let zoneAt = -Infinity
export function deviceZone() {
  const now = Date.now()
  if (now - zoneAt < 1000) return zoneMemo
  try {
    zoneMemo = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    zoneMemo = ''
  }
  zoneAt = now
  return zoneMemo
}

// Read off the phone, never picked in Settings. Sync copies it to the
// account so the server and a family agree on which night it is.
export function personZone() {
  return deviceZone()
}

export function zoneWords(zone) {
  const name = String(zone || personZone())
  const city = name.split('/').pop() || name
  return city.replace(/_/g, ' ')
}

// Building one of these costs more than the work it does, and the night
// code calls this in a loop. One per zone, kept.
const readers = new Map()

function reader(zone) {
  let made = readers.get(zone)
  if (!made) {
    made = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    readers.set(zone, made)
  }
  return made
}

// The same wall clock the person is reading, as a plain local Date.
export function wallClock(now = new Date(), zone = personZone()) {
  if (!zone) return now
  try {
    const parts = reader(zone).formatToParts(now)
    const get = (type) => Number(parts.find((part) => part.type === type)?.value)
    const hour = get('hour')
    return new Date(
      get('year'),
      get('month') - 1,
      get('day'),
      hour === 24 ? 0 : hour,
      get('minute'),
      get('second'),
    )
  } catch {
    return now
  }
}
