// Gifts that arrived and have not been shown yet. Sync claims them from the
// server and adds them to the collection, then they wait here until the
// pop-up shows each one. Kept in storage so closing the app mid-way does not
// lose one.

const KEY = 'did-i-gifts-new'
const MAX = 20
const listeners = new Set()

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)))
  } catch {
    // The pop-up is a nicety; the gift is already in the collection.
  }
  for (const fn of listeners) fn(list[0] || null)
}

const CHEERED_KEY = 'did-i-gifts-cheered'

/** True when this gift's cheer has not played on this device; `seen` is the ids that have. */
export function giftCheerFresh(id, seen) {
  return Boolean(id) && !(Array.isArray(seen) && seen.includes(id))
}

/** giftCheerFresh with this device's list, which then holds `id`. */
export function takeGiftCheer(id) {
  try {
    const raw = JSON.parse(localStorage.getItem(CHEERED_KEY) || '[]')
    const seen = Array.isArray(raw) ? raw : []
    if (!giftCheerFresh(id, seen)) return false
    localStorage.setItem(CHEERED_KEY, JSON.stringify([...seen, id].slice(-100)))
    return true
  } catch {
    return false
  }
}

export function queueGifts(gifts) {
  if (!gifts?.length) return
  const have = read()
  const ids = new Set(have.map((item) => item.id))
  write([...have, ...gifts.filter((item) => item?.id && !ids.has(item.id))])
}

export function nextGift() {
  return read()[0] || null
}

// A block hides their gifts still waiting for the pop-up, note and name included.
export function dropGiftsFrom(fromId) {
  if (!fromId) return
  const have = read()
  const left = have.filter((item) => item.from_id !== fromId)
  if (left.length !== have.length) write(left)
}

export function doneGift(id) {
  write(read().filter((item) => item.id !== id))
}

// Sign out: the gifts belong to the account that left. Listeners drop any
// gift they were holding.
export function clearGifts() {
  write([])
}

export function onGift(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
