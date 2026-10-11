// The plain math behind the done card's night sky, kept apart so node can test it.

// A handful of frames per second: the sky steps rather than glides.
export const SKY_FPS = 6
// The sky moves this long after the done card shows, then holds still, so it
// is not drawing frames all night (battery, and test tools that wait for idle).
export const SKY_RUN_MS = 30000

// Where each star starts, as a share of the sky, its size, and its twinkle.
export const STARS = [
  { x: 0.04, y: 0.05, size: 3, twinkle: 0 },
  { x: 0.2, y: 0.9, size: 4, twinkle: 0.9 },
  { x: 0.38, y: 0.14, size: 5, twinkle: 1.8 },
  { x: 0.55, y: 0.95, size: 3, twinkle: 2.7 },
  { x: 0.72, y: 0.08, size: 4, twinkle: 3.6 },
  { x: 0.86, y: 0.82, size: 5, twinkle: 4.5 },
  { x: 0.95, y: 0.2, size: 3, twinkle: 5.4 },
]

/** A star at a frame: drifting right, bobbing a little, wrapping at the edge. */
export function starAt(star, index, tick, width) {
  'worklet'
  const speed = 0.35 * (0.6 + (index % 3) * 0.2)
  const x = (star.x * width + tick * speed) % Math.max(1, width)
  const bob = Math.sin((tick + index * 7) / 18) * 3
  const opacity = 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(tick / 5 + star.twinkle))
  return { x, bob, opacity }
}

// Where the moon starts, as a share of the sky's width: in full view, since
// at its pace it would take minutes to come in from the edge.
const MOON_START = 0.72

/** The moon crossing right to left, slowly, and wrapping. `x` is its left edge. */
export function moonAt(tick, width, size) {
  'worklet'
  const span = width + size
  const run = (width * MOON_START + size - tick * 0.25) % span
  const x = (run < 0 ? run + span : run) - size
  const bob = Math.sin(tick / 40) * 4
  return { x, bob }
}

// A new moon for reference (6 Jan 2000, 18:14 UTC) and the synodic month.
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
const SYNODIC_DAYS = 29.530588853

/** Tonight's moon phase, 0 new, 0.5 full, back to 1. */
export function moonPhase(date = new Date()) {
  const days = (date.getTime() - NEW_MOON) / 86400000
  return (((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS) / SYNODIC_DAYS
}

/**
 * The lit part of a moon of radius r, as an SVG path in a 2r box: the outer
 * edge on the lit side, then back along the terminator ellipse.
 */
export function moonPath(phase, r) {
  const k = Math.cos(phase * 2 * Math.PI)
  const waxing = phase < 0.5
  const sweep = waxing ? 1 : 0
  const inner = k > 0 ? 1 - sweep : sweep
  const rx = Math.abs(k) * r
  return `M ${r} 0 A ${r} ${r} 0 0 ${sweep} ${r} ${2 * r} A ${rx} ${r} 0 0 ${inner} ${r} 0 Z`
}
