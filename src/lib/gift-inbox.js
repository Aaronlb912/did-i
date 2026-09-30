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

export function queueGifts(gifts) {
  if (!gifts?.length) return
  const have = read()
  const ids = new Set(have.map((item) => item.id))
  write([...have, ...gifts.filter((item) => item?.id && !ids.has(item.id))])
}

export function nextGift() {
  return read()[0] || null
}

export function doneGift(id) {
  write(read().filter((item) => item.id !== id))
}

export function onGift(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
