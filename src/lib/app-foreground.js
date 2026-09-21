let foreground = true
const listeners = new Set()

export function isAppForeground() {
  if (typeof document !== 'undefined') return document.visibilityState === 'visible'
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
