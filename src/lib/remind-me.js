// Remind me in: a spoken or typed reminder that asks "Did I ...?" after a
// delay. Kept on the phone only (no shelf, no account). A Did clears it, a Not
// yet asks again in 15 minutes, and the third Not yet becomes a one-day
// question on Today.

export const REMIND_KEY = 'did-i-remind'
export const REMIND_MAX = 10
export const REMIND_TRIES = 3
export const REMIND_AGAIN_MIN = 15
const TEXT_MAX = 120
// One nobody answered for this long stops holding a slot.
export const REMIND_STALE_MS = 12 * 60 * 60 * 1000

// "Did I take the laundry out?" said aloud: the note adds the Did I itself.
export function remindText(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^did i\b[\s,]*/i, '')
    .replace(/\s*\?+$/, '')
    .trim()
    .slice(0, TEXT_MAX)
}

function clean(item) {
  const text = String(item?.text || '').trim().replace(/\s+/g, ' ').slice(0, TEXT_MAX)
  const at = Number(item?.at)
  if (!item?.id || !text || !Number.isFinite(at)) return null
  return { id: String(item.id), text, at, tries: Math.max(0, Math.floor(Number(item.tries) || 0)) }
}

export function readReminds(now = Date.now()) {
  try {
    const list = JSON.parse(localStorage.getItem(REMIND_KEY) || '[]')
    if (!Array.isArray(list)) return []
    return list.map(clean).filter((one) => one && one.at > now - REMIND_STALE_MS).sort((a, b) => a.at - b.at)
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(REMIND_KEY, JSON.stringify(list))
  } catch {
    // ok
  }
}

export function addRemind(text, minutes, now = Date.now()) {
  const words = remindText(text)
  if (!words) return { miss: 'remind.blank' }
  const list = readReminds(now)
  if (list.length >= REMIND_MAX) return { miss: 'remind.full' }
  const mins = Math.min(720, Math.max(5, Math.round(Number(minutes) || 0)))
  const item = {
    id: Math.random().toString(36).slice(2, 10),
    text: words,
    at: now + mins * 60 * 1000,
    tries: 0,
  }
  write([...list, item].sort((a, b) => a.at - b.at))
  return { item }
}

export function removeRemind(id) {
  const list = readReminds()
  const found = list.find((item) => item.id === String(id)) || null
  if (found) write(list.filter((item) => item.id !== found.id))
  return found
}

// Sign-out: one account's words must never land on the next account's Today.
export function clearReminds() {
  write([])
}

// Undo of a remove.
export function restoreRemind(item) {
  const one = clean(item)
  if (!one) return
  write([...readReminds().filter((x) => x.id !== one.id), one].sort((a, b) => a.at - b.at))
}

// The store is written here, before the caller schedules anything.
export function remindNext(item, action, now = Date.now()) {
  const one = clean(item)
  if (!one) return { done: true }
  removeRemind(one.id)
  if (action === 'did') return { done: true }
  const tries = one.tries + 1
  if (tries >= REMIND_TRIES) return { toToday: true }
  const next = { ...one, tries, at: now + REMIND_AGAIN_MIN * 60 * 1000 }
  restoreRemind(next)
  return { item: next }
}
