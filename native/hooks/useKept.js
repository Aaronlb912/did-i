import { useCallback, useState } from 'react'

// State that outlives the screen. Coming back to a friends or family screen
// shows what it had last time while it reloads, instead of a loading page.
// Keyed by account so another sign-in never sees the last one's rows.
const kept = new Map()

export function useKept(key, initial) {
  const [value, setValue] = useState(() =>
    kept.has(key) ? kept.get(key) : typeof initial === 'function' ? initial() : initial,
  )
  const set = useCallback(
    (next) => {
      setValue((was) => {
        const now = typeof next === 'function' ? next(was) : next
        kept.set(key, now)
        return now
      })
    },
    [key],
  )
  return [value, set]
}
