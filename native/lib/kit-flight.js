import { showToast } from './toast-queue.js'

// A bought item flies from its shop row into the Collection badge on a toast
// above the tab bar. Rows register the view their art sits in; a buy looks it
// up, measures it, and hands the toast where the flight starts.

const arts = new Map()

/** A ref callback that files a row's art view under `key`. */
export function kitArtRef(key) {
  return (node) => {
    if (node) arts.set(key, node)
    else if (arts.get(key)) arts.delete(key)
  }
}

/** The item count a Collection shows: looks, cheers and buddies owned. */
export function kitCount(purse) {
  return (purse?.looks?.length || 0) + (purse?.cheers?.length || 0) + (purse?.buddies?.length || 0) + (purse?.accessories?.length || 0)
}

/**
 * Show that `name` is now in the Collection, `count` items in all. With a
 * registered `key` and its `art`, the item flies there from its row.
 */
export function flyToKit({ key, art, name, count }) {
  const now = Date.now()
  const toast = {
    id: 'kit',
    kind: 'kit',
    rev: now,
    name,
    count,
    ms: 3200,
  }
  const node = key ? arts.get(key) : null
  if (!node?.measureInWindow || !art) {
    showToast(toast)
    return
  }
  node.measureInWindow((x, y, w, h) => {
    showToast(w > 0 && h > 0 ? { ...toast, fly: { x, y, w, h, art } } : toast)
  })
}
