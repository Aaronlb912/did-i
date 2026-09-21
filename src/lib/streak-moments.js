import { shelfHeat } from './hall-feel.js'
import { isAppForeground } from './app-foreground.js'

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

export async function deliverStreakHit(hit, dateIso) {
  if (!hit?.kind || hit.kind !== 'hit' || streakSeen('hit', dateIso)) return
  if (isAppForeground()) {
    fireStreakMoment({ ...hit, dateIso })
    return
  }
  const { pingStreakHit } = await import('./native.js')
  const sent = await pingStreakHit(hit, dateIso)
  if (sent) markStreakSeen('hit', dateIso)
  else queueStreakMoment(hit, dateIso)
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

export function queueStreakMoment(detail, dateIso) {
  if (!detail?.kind || streakSeen(detail.kind, dateIso)) return
  try {
    sessionStorage.setItem(PENDING, JSON.stringify({ ...detail, dateIso }))
  } catch {
    fireStreakMoment(detail)
  }
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

export function maybeStreakMiss({ beforeHeat, afterHeat, dateIso }) {
  if (beforeHeat <= 0 || afterHeat >= beforeHeat) return null
  if (streakSeen('miss', dateIso)) return null
  return { kind: 'miss', was: beforeHeat }
}

