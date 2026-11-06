import { boardDate } from '../../src/lib/recurrence.js'
import { currentUserId } from '../../src/lib/session-id.js'
import { ANSWER_UNDO_MS } from '../../src/lib/undo-times.js'

// A Did on a Did we or family card waits behind the same undo window as your
// own cards, then goes to the server. It is also kept on the phone while it
// waits, so closing the app inside the window never loses it: the app sends
// what is left on its next start, and when it goes to the background.
const KEY = 'did-i-held-sends'
const STALE_MS = 2 * 86400000

// What a held send resolves with when it was taken back.
export const UNDONE = Symbol('undone')

// id -> { item, run, timer, ms, sending, view, resolve, done }
const live = new Map()
let list = []
const watchers = new Set()

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function writeSaved(saved) {
  try {
    if (saved.length) localStorage.setItem(KEY, JSON.stringify(saved.slice(-30)))
    else localStorage.removeItem(KEY)
  } catch {
    // Without storage it is only kept while the app stays open.
  }
}

function dropSaved(id) {
  const saved = readSaved()
  if (saved.some((item) => item.id === id)) writeSaved(saved.filter((item) => item.id !== id))
}

function emit() {
  list = [...live.values()].map((entry) => entry.view)
  watchers.forEach((fn) => fn(list))
}

// Each is { id, kind, ref, label, sending }, oldest first. The same objects until one changes.
export function heldNow() {
  return list
}

export function onHeld(fn) {
  watchers.add(fn)
  return () => watchers.delete(fn)
}

// item: { id, kind, ref, user, label, ...what to send again after a restart }.
// run() sends it and says how it went. Resolves with that, or false if it was
// taken back (UNDONE).
export function holdSend(item, run, ms = ANSWER_UNDO_MS) {
  const had = live.get(item.id)
  if (had) return had.done
  const entry = { item, run, ms, sending: false, timer: null, view: { id: item.id, kind: item.kind || '', ref: item.ref || '', night: item.night || '', label: item.label || '', sending: false } }
  entry.done = new Promise((resolve) => {
    entry.resolve = resolve
  })
  live.set(item.id, entry)
  writeSaved([...readSaved().filter((saved) => saved.id !== item.id), { ...item, at: Date.now() }])
  entry.timer = setTimeout(() => release(item.id), ms)
  emit()
  return entry.done
}

export async function release(id) {
  const entry = live.get(id)
  if (!entry) return undefined
  if (entry.sending) return entry.done
  // Another account is signed in now: it is not sent as them. It stays saved
  // for its own account and the card is not held here any more.
  if ((entry.item.user || '') !== currentUserId()) {
    clearTimeout(entry.timer)
    live.delete(id)
    emit()
    const out = { miss: 'out', unsent: true }
    entry.resolve(out)
    return out
  }
  entry.sending = true
  clearTimeout(entry.timer)
  entry.view = { ...entry.view, sending: true }
  emit()
  let out
  try {
    out = await entry.run()
  } catch {
    out = { miss: 'off' }
  }
  // Gone from the phone's list only once it has been sent (or refused).
  dropSaved(id)
  live.delete(id)
  emit()
  entry.resolve(out)
  return out
}

// Undo: true when it had not gone yet.
export function cancelHeld(id) {
  const entry = live.get(id)
  if (!entry || entry.sending) return false
  clearTimeout(entry.timer)
  live.delete(id)
  dropSaved(id)
  emit()
  entry.resolve(UNDONE)
  return true
}

// Cancel every held send whose id starts with prefix (a key whose last part
// another screen builds a different way). Returns how many were cancelled.
export function cancelHeldPrefix(prefix) {
  return [...live.keys()].filter((id) => id.startsWith(prefix) && cancelHeld(id)).length
}

// The undo toast is on screen now: the window starts over from here.
export function restartHeld(id) {
  const entry = live.get(id)
  if (!entry || entry.sending) return
  clearTimeout(entry.timer)
  entry.timer = setTimeout(() => release(id), entry.ms)
}

// The app is leaving the foreground: send everything now.
export function flushHeld() {
  return Promise.all([...live.keys()].map((id) => release(id)))
}

export function flushOnBackground(appState) {
  const sub = appState.addEventListener('change', (next) => {
    if (next !== 'active') flushHeld().catch(() => {})
  })
  return () => sub.remove()
}

// On start: what an earlier run kept and never sent. send(item) comes back
// true once it is handled (sent, or the server said no); false keeps it for
// the next start. Only this account's, and nothing older than two days.
let resuming = false
export async function resumeHeld(userId, send, now = Date.now()) {
  if (resuming || !userId) return
  resuming = true
  try {
    for (const item of readSaved()) {
      if (live.has(item.id)) continue
      if (now - (Number(item.at) || 0) > STALE_MS) {
        dropSaved(item.id)
        continue
      }
      if (item.user !== userId) continue
      let done = false
      try {
        done = await send(item)
      } catch {
        done = false
      }
      if (done) dropSaved(item.id)
    }
  } finally {
    resuming = false
  }
}

// Your Did on a Did we card, before the server has it: the card reads as
// answered, so it leaves the deck, and the pill shows it.
export function weWithMyDid(card) {
  return {
    ...card,
    people: (card.people || []).map((person) => (person.me ? { ...person, status: 'did' } : person)),
  }
}

// What each kind sends again after a restart.
export function savedSender({ answerWe, answerFamily, claimWe }) {
  return async (item) => {
    // A Did is for the day it was tapped on. Older than yesterday: let it go.
    const day = item.night || item.day || ''
    if (day && day < boardDate(new Date(Date.now() - 86400000))) return true
    if (item.kind === 'we') {
      const out = await answerWe(item.card, item.status, day || undefined)
      // A tap saved for later by weAnswer (no connection) is already kept there.
      if (out.miss && out.miss !== 'we.savedOffline') return true
      if (out.finished) await claimWe(item.card, day || undefined).catch(() => {})
      return true
    }
    if (item.kind === 'family') {
      const out = await answerFamily(item.familyId, item.lampId, item.night, item.status)
      // No connection: it waits for the next start.
      return !['off', 'people.reach'].includes(out?.miss)
    }
    return true
  }
}
