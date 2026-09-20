// One feel for every card you can throw, so DID and nope never drift apart.
// A thumb brushing the screen should not answer a question, so the card has
// to travel a real distance, and the word only fades in once the pull is
// past the point where it reads as a decision rather than a nudge.

export const SWIPE_THRESHOLD = 116

// Ignore the first few pixels so a tap or a vertical scroll never starts a drag.
export const SWIPE_WAKE = 14

// Nothing shows until the pull is this far along.
const STAMP_AT = 0.4

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
