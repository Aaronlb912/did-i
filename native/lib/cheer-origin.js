// Where the next cheer bursts from: the card that was just answered, in
// window coordinates. SwipeCard sets it right before it saves a Did, and the
// cheer that Did fires takes it. A stale spot (no cheer came) is dropped.
const FRESH_MS = 1000
let spot = null

export function aimCheer(x, y) {
  spot = { x, y, at: Date.now() }
}

export function takeCheerAim(now = Date.now()) {
  const next = spot && now - spot.at <= FRESH_MS ? { x: spot.x, y: spot.y } : null
  spot = null
  return next
}
