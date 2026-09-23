import { readShelf, writeShelf } from './board-shelf.js'
import { absorbStoredWidgetProps } from './widget-tonight.js'

export function reconcileShelfFromWidget(shelf) {
  const next = absorbStoredWidgetProps(shelf)
  if (next === shelf) return shelf
  return writeShelf(next)
}

export function reconcileShelfFromWidgetNow() {
  return reconcileShelfFromWidget(readShelf())
}
