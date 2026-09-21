let foreground = true

export function isAppForeground() {
  if (typeof document !== 'undefined') return document.visibilityState === 'visible'
  return foreground
}

export function setAppForeground(on) {
  foreground = Boolean(on)
}
