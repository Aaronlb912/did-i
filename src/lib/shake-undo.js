/** Gravity sits near 1. A shake is a change from the last sample, not the total. */

export const SHAKE_DELTA = 0.65
export const SHAKE_HARD = 1.35
export const SHAKE_WINDOW_MS = 480
export const SHAKE_GAP_MS = 900

export function emptyShake() {
  return { prev: null, flips: 0, flipAt: 0, lastAt: 0, hit: false }
}

function readAccel(sample) {
  const x = Number(sample?.x)
  const y = Number(sample?.y)
  const z = Number(sample?.z)
  if (![x, y, z].every(Number.isFinite)) return null
  return { x, y, z }
}

export function shakeStep(state, sample, now) {
  const next = readAccel(sample)
  if (!next) return { ...state, hit: false }
  const prev = state.prev
  if (!prev) return { ...state, prev: next, hit: false }
  const delta = Math.hypot(next.x - prev.x, next.y - prev.y, next.z - prev.z)
  let flips = state.flips
  let flipAt = state.flipAt
  if (delta >= SHAKE_DELTA) {
    if (now - flipAt > SHAKE_WINDOW_MS) flips = 0
    flips += 1
    flipAt = now
  }
  const cooled = now - state.lastAt >= SHAKE_GAP_MS
  const hit = cooled && (delta >= SHAKE_HARD || flips >= 2)
  return {
    prev: next,
    flips: hit ? 0 : flips,
    flipAt,
    lastAt: hit ? now : state.lastAt,
    hit,
  }
}
