import { lastBrokenNight, shelfHeat } from './hall-feel.js'
import { isAppForeground } from './app-foreground.js'
import { reportRejection } from './report.js'

const PENDING = 'did-i-streak-pending'
const SEEN = 'did-i-streak-seen'

export function fireStreakMoment(detail) {
  if (!detail?.kind) return
  try {
    globalThis.window?.dispatchEvent?.(new globalThis.CustomEvent('did-i-streak', { detail }))
  } catch {
    // ok
  }
}

async function pingFromPhone(hit, dateIso) {
  const { pingStreakHit } = await import('./native.js')
  return pingStreakHit(hit, dateIso)
}

// Never rejects: it runs right after a Did, and a push that fails to send
// (or a native module that is missing on this build) waits for the app instead.
export async function deliverStreakHit(hit, dateIso, ping = pingFromPhone) {
  if (!hit?.kind || hit.kind !== 'hit' || streakSeen('hit', dateIso)) return
  if (isAppForeground()) {
    fireStreakMoment({ ...hit, dateIso })
    return
  }
  try {
    if (await ping(hit, dateIso)) {
      markStreakSeen('hit', dateIso)
      return
    }
  } catch (error) {
    reportRejection('streak-push')(error)
  }
  queueStreakMoment(hit, dateIso)
}

function seenKey(kind, dateIso) {
  return `${kind}:${dateIso}`
}

export function streakSeen(kind, dateIso) {
  try {
    const raw = localStorage.getItem(SEEN)
    const bag = raw ? JSON.parse(raw) : {}
    return Boolean(bag[seenKey(kind, dateIso)])
  } catch {
    return false
  }
}

export function markStreakSeen(kind, dateIso) {
  try {
    const raw = localStorage.getItem(SEEN)
    const bag = raw ? JSON.parse(raw) : {}
    bag[seenKey(kind, dateIso)] = true
    localStorage.setItem(SEEN, JSON.stringify(bag))
  } catch {
    // ok
  }
}

export function clearStreakSeen(kind, dateIso) {
  try {
    const raw = localStorage.getItem(SEEN)
    const bag = raw ? JSON.parse(raw) : {}
    delete bag[seenKey(kind, dateIso)]
    localStorage.setItem(SEEN, JSON.stringify(bag))
  } catch {
    // ok
  }
}

export function queueStreakMoment(detail, dateIso) {
  if (!detail?.kind || streakSeen(detail.kind, dateIso)) return
  let stored = false
  try {
    sessionStorage.setItem(PENDING, JSON.stringify({ ...detail, dateIso }))
    stored = true
  } catch {
    // No storage: the event below is the only way it shows.
  }
  // A host already on screen (a miss found on resume) shows it now; it stays
  // pending until closed (marked seen). A queued hit waits for the next open.
  if (detail.kind !== 'hit' || !stored) fireStreakMoment({ ...detail, dateIso })
}

export function takePendingStreakMoment() {
  try {
    const raw = sessionStorage.getItem(PENDING)
    if (!raw) return null
    sessionStorage.removeItem(PENDING)
    const parsed = JSON.parse(raw)
    if (!parsed?.kind) return null
    if (streakSeen(parsed.kind, parsed.dateIso)) return null
    return parsed
  } catch {
    return null
  }
}

export function shelfHeatNow(boards, now, tagId = '') {
  return shelfHeat(boards || [], now, tagId)
}

export function maybeStreakHit({ beforeHeat, afterHeat, clearedTonight, dateIso }) {
  if (!clearedTonight || afterHeat <= 0) return null
  if (afterHeat < beforeHeat) return null
  if (streakSeen('hit', dateIso)) return null
  return { kind: 'hit', n: afterHeat }
}

// A break is a past night left open, told once per night. Tonight going from
// done back to open (a new question, an undo) is not a break.
export function maybeStreakMiss(boards, now = new Date()) {
  const broken = lastBrokenNight(boards || [], now)
  if (!broken || streakSeen('miss', broken.night)) return null
  return { kind: 'miss', was: broken.was, dateIso: broken.night }
}

