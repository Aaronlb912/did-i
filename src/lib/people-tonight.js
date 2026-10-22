import { t } from './i18n.js'

// Cards from other people that ride the Tonight swipe after your own:
// open family questions, then Did you asks due tonight. They never count
// toward your own streak or night.
export function peopleTonightItems({ familyRows = [], asks = [], night, gone = [], now = Date.now() }) {
  const out = []
  for (const row of familyRows) {
    if (row.answer) continue
    out.push({ key: `fam:${row.family.id}:${row.lamp.id}:${row.night}`, kind: 'family', title: row.lamp.question, row })
  }
  for (const row of asks) {
    if (row.appSend || row.kind !== 'todo' || row.state !== 'sent') continue
    if (row.due_on && night && row.due_on > night && !justSentAhead(row, night, now)) continue
    out.push({ key: `ask:${row.id}`, kind: 'ask', title: row.question, row })
  }
  const skip = new Set(gone)
  return out.filter((item) => !skip.has(item.key))
}

// Cards swiped away today, kept so a remount or restart does not bring them
// back above the done screen. Dropped when the day changes.
const HIDDEN = 'did-i-people-hidden'
export function readPeopleHidden(day) {
  try {
    const saved = JSON.parse(localStorage.getItem(HIDDEN) || 'null')
    return saved?.day === day && Array.isArray(saved.keys) ? saved.keys : []
  } catch {
    return []
  }
}
export function writePeopleHidden(day, keys) {
  try {
    localStorage.setItem(HIDDEN, JSON.stringify({ day, keys }))
  } catch {
    // ok
  }
}

// A send defaults to the sender's night. A sender a timezone ahead can
// stamp tomorrow on an ask made for tonight here, so one day ahead still
// shows while the send is under a day old.
function justSentAhead(row, night, now) {
  const made = Date.parse(row.made_at || '')
  if (!made || now - made > 24 * 60 * 60 * 1000) return false
  const next = new Date(`${night}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return row.due_on <= next.toISOString().slice(0, 10)
}

// The small chip next to your own count: what other people put on tonight,
// still waiting. It never adds to your own done and left.
export function peopleWaitingLine(items = []) {
  const family = items.filter((item) => item.kind === 'family').length
  const asks = items.filter((item) => item.kind === 'ask').length
  return [
    family ? t('tonight.meterFamily', { n: family }) : '',
    asks ? t('tonight.meterAsks', { n: asks }) : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
