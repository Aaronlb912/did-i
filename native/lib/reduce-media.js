// The phone's Reduce Motion answers `prefers-reduced-motion`, so the shared
// useReduceMotion honours it next to the app's own Less motion setting.
// Every other query stays unmatched: colour scheme comes from Appearance.

export const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

const unmatched = () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
})

/** A window.matchMedia that follows `AccessibilityInfo` (react-native). */
export function phoneMatchMedia(AccessibilityInfo) {
  let systemReduce = false
  const listeners = new Set()
  function setSystemReduce(next) {
    const value = Boolean(next)
    if (value === systemReduce) return
    systemReduce = value
    listeners.forEach((fn) => {
      try {
        fn({ matches: value, media: REDUCE_QUERY })
      } catch {
        // One bad listener must not stop the rest.
      }
    })
  }
  try {
    AccessibilityInfo?.isReduceMotionEnabled?.().then(setSystemReduce, () => {})
    AccessibilityInfo?.addEventListener?.('reduceMotionChanged', setSystemReduce)
  } catch {
    // No accessibility module (tests, a stripped binary): motion stays on.
  }

  const reduceMedia = {
    get matches() {
      return systemReduce
    },
    media: REDUCE_QUERY,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
  }

  return (query) => (String(query).replace(/\s+/g, ' ').trim() === REDUCE_QUERY ? reduceMedia : unmatched())
}
