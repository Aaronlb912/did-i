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
