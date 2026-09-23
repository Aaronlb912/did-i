import { readShelf, writeShelf } from './board-shelf.js'
import { absorbStoredWidgetProps } from './widget-tonight.js'

let beforePull = () => Promise.resolve()

/** Native registers the WidgetKit read. Web leaves this as a no-op. */
export function setWidgetBeforePull(fn) {
  beforePull = typeof fn === 'function' ? fn : () => Promise.resolve()
}

export function awaitWidgetTimeline() {
  return Promise.resolve()
    .then(() => beforePull())
    .catch(() => {})
}

export function reconcileShelfFromWidget(shelf) {
  const next = absorbStoredWidgetProps(shelf)
  if (next === shelf) return shelf
  return writeShelf(next)
}

export function reconcileShelfFromWidgetNow() {
  return reconcileShelfFromWidget(readShelf())
}
