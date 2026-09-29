import { SWIPE_THRESHOLD } from '../../src/lib/swipe-face.js'

// How the Tonight card moves once a finger lets go. Everything here runs as a
// worklet on the UI thread, and stays plain math so node can test it.

// A flick counts by where it was headed, not only where it was let go:
// release x plus this many seconds of the finger's speed.
export const FLICK_LOOKAHEAD = 0.2

// Tilt at a full screen width of travel, in degrees.
export const MAX_TILT = 12

// The next cards wait behind the face, smaller and peeking below it. Index is
// depth: 0 is the face, 3 is one past the last card shown.
export const DEPTH_SCALE = [1, 0.96, 0.92, 0.88]
export const DEPTH_OPACITY = [1, 1, 0.75, 0]
export const DEPTH_PEEK = 9
export const DEPTH_SHOWN = 2

// 1 for DID, -1 for nope, 0 to spring back.
export function releaseWay(x, vx, blockDid = false, blockNope = false) {
  'worklet'
  const headed = x + vx * FLICK_LOOKAHEAD
  if (headed >= SWIPE_THRESHOLD && !blockDid) return 1
  if (headed <= -SWIPE_THRESHOLD && !blockNope) return -1
  return 0
}

// Grabbing below the middle turns the card the other way, like a real card
// pivoting on your thumb.
export function grabSide(y, height) {
  'worklet'
  return height > 0 && y > height / 2 ? -1 : 1
}

export function cardTilt(x, width, grab = 1) {
  'worklet'
  const reach = Math.max(1, width)
  const lean = Math.max(-1.5, Math.min(1.5, x / reach))
  return lean * MAX_TILT * grab
}

// Where a thrown card ends up and how long it takes. It keeps the speed it
// left the finger with (never slower than a brisk throw), carries on along
// the line it was moving, and clears the screen edge with room for the tilt.
export function flyPath(x, y, vx, vy, way, width) {
  'worklet'
  const toX = way * width * 1.3
  const gap = Math.abs(toX - x)
  const speed = Math.max(Math.abs(vx), 1600)
  // Ease-out halves the average speed, so twice the time keeps the start
  // speed equal to the finger's.
  const duration = Math.max(180, Math.min(340, ((2 * gap) / speed) * 1000))
  const drift = Math.max(-260, Math.min(260, vy * (duration / 1000) * 0.5))
  return { x: toX, y: y + drift, duration }
}

function between(list, depth) {
  'worklet'
  const d = Math.max(0, Math.min(list.length - 1, depth))
  const low = Math.floor(d)
  const high = Math.min(list.length - 1, low + 1)
  return list[low] + (list[high] - list[low]) * (d - low)
}

// The card rising into the face settles on a soft spring. It may pass its
// place by a hair, so a depth just under 0 grows a touch past full size.
export const RISE_SPRING = { stiffness: 170, damping: 15 }

// Scale, drop and opacity for a card at a depth, fractional while it moves up.
export function depthLook(depth) {
  'worklet'
  const past = Math.min(0, depth)
  return {
    scale: between(DEPTH_SCALE, depth) + (DEPTH_SCALE[0] - DEPTH_SCALE[1]) * -past,
    translateY: Math.max(0, depth) * DEPTH_PEEK,
    opacity: between(DEPTH_OPACITY, depth),
  }
}
