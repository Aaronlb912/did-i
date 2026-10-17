// A text box that gains focus or grows (a note getting longer) tells the
// page, so the page can scroll it above the keyboard (BoardShell). The
// keyboard events alone miss both: Android sends no event when focus moves
// between boxes with the keyboard already up, and neither does a box growing.
const listeners = new Set()

// Boxes whose screen already scrolls them into place (the Add card, which
// also keeps the ideas under it in sight); the page leaves those alone.
const liftsItself = new WeakSet()

export function onFieldMoved(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function fieldMoved() {
  listeners.forEach((fn) => fn())
}

export function markLiftsItself(node) {
  if (node) liftsItself.add(node)
}

export function lifts(node) {
  return Boolean(node) && liftsItself.has(node)
}
