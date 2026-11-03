// The Did we line on the home screen widget. The widget cannot reach the
// server, so the app keeps the last line it worked out, for one night only.
// Kept apart from did-we.js so the widget task does not load the network code.

const KEY = 'did-i-we-widget'

// Returns true when the saved line changed, so the caller can redraw the widget.
export function saveWeLine(line, night) {
  try {
    const was = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (was && was.night === night && was.line === line) return false
    localStorage.setItem(KEY, JSON.stringify({ night, line }))
    return true
  } catch {
    return false
  }
}

// Did we reminders, kept on the phone so the reminder scheduler can set them
// alongside your own questions without reaching the server.
const PINGS_KEY = 'did-i-we-pings'

export function saveWePings(list) {
  try {
    const next = JSON.stringify(list || [])
    if (localStorage.getItem(PINGS_KEY) === next) return false
    localStorage.setItem(PINGS_KEY, next)
    return true
  } catch {
    return false
  }
}

// A Did saved outside the app screens (widget, reminder button) skips that
// day's reminder, as saveWeReminders does on the next load.
export function skipWePing(card, night) {
  const list = readWePings()
  if (!list.some((ping) => ping.id === card && ping.skipNight !== night)) return false
  return saveWePings(list.map((ping) => (ping.id === card ? { ...ping, skipNight: night } : ping)))
}

// Monthly Did we reminders: the last 3 days of the month only, and none once
// the month has a Did (skipNight in that month).
export function weMonthlyPingDay(night, skipNight = '') {
  const [year, month, date] = String(night).split('-').map(Number)
  if (!year || date < new Date(year, month, 0).getDate() - 2) return false
  return !(skipNight && String(skipNight).slice(0, 7) === String(night).slice(0, 7))
}

export function readWePings() {
  try {
    const list = JSON.parse(localStorage.getItem(PINGS_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function readWeLine(night) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    return saved && saved.night === night ? String(saved.line || '') : ''
  } catch {
    return ''
  }
}

// Tonight's Did we questions due for you, so the widget can show one once
// your own questions are done. Which are still open comes from we-nights.
const OPEN_KEY = 'did-i-we-widget-open'

export function saveWeOpen(list, night) {
  try {
    const next = JSON.stringify({ night, list: list || [] })
    if (localStorage.getItem(OPEN_KEY) === next) return false
    localStorage.setItem(OPEN_KEY, next)
    return true
  } catch {
    return false
  }
}

export function readWeOpen(night) {
  try {
    const saved = JSON.parse(localStorage.getItem(OPEN_KEY) || 'null')
    return saved && saved.night === night && Array.isArray(saved.list) ? saved.list : []
  } catch {
    return []
  }
}
