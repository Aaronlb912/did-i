const SAVED_KEY = 'did-i-saved'

// When this phone last changed something. Sync uses it to decide which
// phone's names and switches win. Questions and answers always combine.

export function readSavedAt() {
  try {
    return localStorage.getItem(SAVED_KEY) || ''
  } catch {
    return ''
  }
}

export function stampSavedAt(when) {
  try {
    localStorage.setItem(SAVED_KEY, when || new Date().toISOString())
  } catch {
    // Sync falls back to combining both sides.
  }
}
