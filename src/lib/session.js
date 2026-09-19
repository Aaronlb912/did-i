const PIN_KEY = 'did-i-pin'
const IN_KEY = 'did-i-in'

export function keeperNamed(book) {
  return Boolean(book && String(book.keeperName || '').trim())
}

export function firstName(book) {
  const raw = String(book?.keeperName || '').trim()
  if (!raw) return ''
  return raw.split(/\s+/)[0]
}

export function hashPin(pin) {
  let hash = 2166136261
  const text = `did-i-pin:${String(pin || '').replace(/\D/g, '')}`
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

export function hasPin() {
  try {
    return Boolean(localStorage.getItem(PIN_KEY))
  } catch {
    return false
  }
}

export function setPin(pin) {
  const clean = String(pin || '').replace(/\D/g, '')
  if (clean.length < 4 || clean.length > 8) return false
  try {
    localStorage.setItem(PIN_KEY, hashPin(clean))
    sessionStorage.setItem(IN_KEY, '1')
  } catch {
    return false
  }
  return true
}

export function clearPin() {
  try {
    localStorage.removeItem(PIN_KEY)
  } catch {
    // Stay unlocked if storage is blocked.
  }
}

export function checkPin(pin) {
  try {
    return localStorage.getItem(PIN_KEY) === hashPin(pin)
  } catch {
    return false
  }
}

export function sessionOpen() {
  try {
    return sessionStorage.getItem(IN_KEY) === '1'
  } catch {
    return true
  }
}

export function openSession() {
  try {
    sessionStorage.setItem(IN_KEY, '1')
  } catch {
    // Board still opens.
  }
}

export function closeSession() {
  try {
    sessionStorage.removeItem(IN_KEY)
  } catch {
    // Next visit still works.
  }
}

export function needsEnter(book) {
  if (hasPin() && !sessionOpen()) return true
  return false
}
