import { readShelf, writeShelf } from '../src/lib/board-shelf.js'
import { reconcileShelfFromWidget } from '../src/lib/widget-reconcile.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { pullWidgetTimelineIntoShelf } from './widget-sync.js'

/** Native: fold widget snapshot; optional WidgetKit timeline (only after initWidgetsOnLaunch). */
export async function reconcileShelfFromWidgetNow({ pullTimeline = false } = {}) {
  let next = reconcileShelfFromWidget(readShelf())
  if (nativeWidgetsEnabled() && pullTimeline) {
    next = await pullWidgetTimelineIntoShelf(next)
  }
  if (next === readShelf()) return readShelf()
  return writeShelf(next)
}
