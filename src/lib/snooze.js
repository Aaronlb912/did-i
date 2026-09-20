// Later tonight. Not an answer, not a nope, and it never touches a
// streak. The question steps out of the way for a couple of hours and
// comes back the same night.
//
// This stays on the phone. It is a "right now" thing, so there is
// nothing worth carrying to another device.

const KEY = 'did-i-snooze'
export const SNOOZE_HOURS = 2

let cache = null

function read() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? JSON.parse(raw) : {}
  } catch {
    cache = {}
  }
  return cache
}

function write(next) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // It still works for this session if storage is blocked.
  }
}

function keyOf(lampId, periodKey) {
  return `${lampId}\u0000${periodKey}`
}

export function snoozedUntil(lampId, periodKey) {
  return read()[keyOf(lampId, periodKey)] || ''
}

export function snoozedNow(lampId, periodKey, now = new Date()) {
  const until = snoozedUntil(lampId, periodKey)
  return Boolean(until) && until > now.toISOString()
}

export function snoozeFor(lampId, periodKey, now = new Date(), hours = SNOOZE_HOURS) {
  const until = new Date(now.getTime() + hours * 3600000)
  const next = { ...read(), [keyOf(lampId, periodKey)]: until.toISOString() }
  write(next)
  return until
}

export function wakeNow(lampId, periodKey) {
  const next = { ...read() }
  delete next[keyOf(lampId, periodKey)]
  write(next)
}

// Anything that has already come back is dead weight.
export function sweepSnoozes(now = new Date()) {
  const rows = read()
  const stamp = now.toISOString()
  const next = {}
  let dropped = 0
  for (const [key, until] of Object.entries(rows)) {
    if (until > stamp) next[key] = until
    else dropped += 1
  }
  if (dropped) write(next)
  return dropped
}
