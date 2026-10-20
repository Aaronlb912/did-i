// When a Did we is due. Same rule as we_due in supabase/did-we.sql: on or
// after the start night, and daily or on one of its weekdays (0 = Sunday).

export function weDueOn(card, night) {
  if (night < String(card.startsOn || '')) return false
  if (card.cadence !== 'weekly') return true
  return (card.weekdays || []).includes(new Date(`${night}T12:00:00`).getDay())
}

function nextDay(iso) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function prevDay(iso) {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// The first due night after this one, or '' when it never comes up.
export function weNextDue(card, night) {
  if (card.cadence === 'weekly' && !(card.weekdays || []).length) return ''
  const start = String(card.startsOn || '')
  let day = nextDay(night)
  if (start > day) day = start
  for (let i = 0; i < 8; i += 1) {
    if (weDueOn(card, day)) return day
    day = nextDay(day)
  }
  return ''
}

// The slot a day is in: the latest due night on or before it ('' before the
// first one). A weekly card's slot runs from its due night to the day before
// the next one; a daily card has a slot a day. Same rule as we_slot on the server.
export function weSlotOf(card, day) {
  if (day < String(card.startsOn || '')) return ''
  if (card.cadence !== 'weekly') return day
  let at = day
  for (let i = 0; i < 7; i += 1) {
    if (weDueOn(card, at)) return at
    at = prevDay(at)
  }
  return ''
}

// The due night before this one, or '' when there is none.
export function wePrevDue(card, night) {
  let day = prevDay(night)
  for (let i = 0; i < 8 && day >= String(card.startsOn || ''); i += 1) {
    if (weDueOn(card, day)) return day
    day = prevDay(day)
  }
  return ''
}

// "Sat, Oct 10" in the person's language.
export function weNextLabel(iso, locale) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale || undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
