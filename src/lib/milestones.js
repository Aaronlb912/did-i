// Anonymous milestones (supabase/milestones.sql): how far new people get,
// so we can see where they stop. Each one is sent once per install, with a
// random install id that is not the account or the phone's id. A send that
// fails is tried again next time; nothing here ever blocks the app.
import { cloud, cloudSetUp } from './cloud.js'
import { devicePlatform } from './account.js'

const ID_KEY = 'did-i-mile-id'
const SENT_KEY = 'did-i-mile-sent'
const NIGHTS = [1, 3, 7, 14]
const inFlight = new Set()

function installId() {
  try {
    const saved = localStorage.getItem(ID_KEY)
    if (saved) return saved
    const bytes = new Uint8Array(12)
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
    const next = [...bytes].map((n) => n.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(ID_KEY, next)
    return next
  } catch {
    return ''
  }
}

function sentSet() {
  try {
    const raw = JSON.parse(localStorage.getItem(SENT_KEY) || '[]')
    return new Set(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set()
  }
}

/** Sends one milestone, once per install. Safe to call as often as you like. */
export function noteMilestone(event) {
  // Phone installs only; the website shares this code but is not the funnel.
  if (devicePlatform() === 'web' || !cloudSetUp() || inFlight.has(event) || sentSet().has(event)) return
  const id = installId()
  const db = cloud()
  if (!id || !db) return
  inFlight.add(event)
  Promise.resolve(
    db.rpc('note_milestone', {
      p_install: id,
      p_event: event,
      p_platform: devicePlatform(),
      p_version: String(globalThis.__didIAppVersion || ''),
    }),
  )
    .then((res) => {
      if (res?.error) return
      const sent = sentSet()
      sent.add(event)
      localStorage.setItem(SENT_KEY, JSON.stringify([...sent]))
    })
    .catch(() => {})
    .finally(() => inFlight.delete(event))
}

const SHELF_EVENTS = ['added_first', 'first_swipe', ...NIGHTS.map((n) => `night_${n}`)]

/** Works out milestones from the saved shelf: first question, first answer, nights answered. */
export function noteShelfMilestones(shelf) {
  const books = shelf?.boards || []
  if (!books.length || !cloudSetUp()) return
  const sent = sentSet()
  if (SHELF_EVENTS.every((e) => sent.has(e))) return
  if (books.some((b) => (b.lamps || []).some((l) => !l.archived))) noteMilestone('added_first')
  // Counting stops at the last step, so a long history costs nothing extra.
  const last = NIGHTS[NIGHTS.length - 1]
  const nights = new Set()
  for (const b of books) {
    for (const a of b.answers || []) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(a.periodKey)) nights.add(a.periodKey)
      if (nights.size >= last) break
    }
    if (nights.size >= last) break
  }
  if (nights.size) noteMilestone('first_swipe')
  for (const n of NIGHTS) if (nights.size >= n) noteMilestone(`night_${n}`)
}
