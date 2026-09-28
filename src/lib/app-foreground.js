let foreground = true
const listeners = new Set()

// The phone's bootstrap gives the app a stand-in document with no
// visibilityState; there AppState (through setAppForeground) is the answer.
export function isAppForeground() {
  if (typeof document !== 'undefined' && typeof document.visibilityState === 'string') {
    return document.visibilityState === 'visible'
  }
  return foreground
}

export function onAppForegroundChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setAppForeground(on) {
  const next = Boolean(on)
  if (next === foreground) return
  foreground = next
  listeners.forEach((fn) => {
    try {
      fn(foreground)
    } catch {
      // ok
    }
  })
}
