// One feel for every card you can throw, so DID and nope never drift apart.
// A thumb brushing the screen should not answer a question, so the card has
// to travel a real distance, and the word only fades in once the pull is
// past the point where it reads as a decision rather than a nudge.

export const SWIPE_THRESHOLD = 116

// Ignore the first few pixels so a tap or a vertical scroll never starts a drag.
export const SWIPE_WAKE = 14

// Nothing shows until the pull is this far along.
const STAMP_AT = 0.4

// Screen edges light up before the stamp so you feel the wall coming.
const EDGE_AT = 0.12

export function swipePull(dx) {
  'worklet'
  return Math.max(-1, Math.min(1, dx / SWIPE_THRESHOLD))
}

export function stampOpacity(pull, way) {
  'worklet'
  const lean = way === 'did' ? pull : -pull
  if (lean <= STAMP_AT) return 0
  return Math.min(1, (lean - STAMP_AT) / (1 - STAMP_AT))
}

export function swipeTilt(dx) {
  'worklet'
  return dx / 78
}

export function edgeOpacity(pull, way) {
  'worklet'
  const lean = way === 'did' ? pull : -pull
  if (lean <= EDGE_AT) return 0
  return Math.min(1, (lean - EDGE_AT) / (0.92 - EDGE_AT))
}

// Rails sit on the glass; they should read sooner than the stamp on the card.
const RAIL_AT = 0.04

export function railOpacity(pull, way, dragging = true) {
  'worklet'
  if (!dragging) return 0
  const lean = way === 'did' ? pull : -pull
  if (lean <= RAIL_AT) return 0
  const ramp = (lean - RAIL_AT) / (0.78 - RAIL_AT)
  return Math.min(1, 0.35 + ramp * 0.65)
}
