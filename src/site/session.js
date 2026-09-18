const SESSION_KEY = 'did-i-open'

export function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (raw && raw.open) return { open: true }
  } catch {
    // Demo still runs if storage is blocked.
  }
  return { open: false }
}

export function openSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ open: true }))
  } catch {
    // ignore
  }
}

export function closeSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
