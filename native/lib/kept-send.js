import { readShelf } from '../../src/lib/board-shelf.js'
import { sendOnShelf } from '../../src/lib/send-repeat.js'

// Kept on another device or before a crash, but no question here carries it
// yet: the keep still has to add it on this phone (same rule as src/lib/Inbox.jsx).
export function keptButMissing(res, rowId) {
  if (!res?.already || res.state !== 'kept') return false
  return !sendOnShelf(readShelf().boards || [], rowId)
}
