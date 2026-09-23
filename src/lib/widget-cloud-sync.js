import { armSyncForUser, pushNow, pushSoon } from './cloud-sync.js'
import { cloudSetUp } from './cloud.js'
import { readShelf } from './board-shelf.js'

const PENDING_KEY = 'did-i-widget-cloud-pending'

export function markWidgetCloudPending() {
  try {
    localStorage.setItem(PENDING_KEY, '1')
  } catch {
    // ok
  }
}

export function clearWidgetCloudPending() {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    // ok
  }
}

export function widgetCloudPending() {
  try {
    return localStorage.getItem(PENDING_KEY) === '1'
  } catch {
    return false
  }
}

/** Push widget answers to the account so other phones can pull them. */
export async function pushShelfAfterWidgetAnswer(shelf, { now = false } = {}) {
  if (!cloudSetUp()) return
  const doc = shelf || readShelf()
  markWidgetCloudPending()
  armSyncForUser()
  try {
    if (now) await pushNow(doc)
    else pushSoon(doc)
    clearWidgetCloudPending()
  } catch {
    // pullAndMerge on next wake will retry
  }
}

export async function flushPendingWidgetCloud() {
  if (!cloudSetUp() || !widgetCloudPending()) return
  armSyncForUser()
  try {
    await pushNow(readShelf())
    clearWidgetCloudPending()
  } catch {
    // ok
  }
}
