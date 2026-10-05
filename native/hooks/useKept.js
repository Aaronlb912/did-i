import { useCallback, useState } from 'react'

// State that outlives the screen. Coming back to a friends or family screen
// shows what it had last time while it reloads, instead of a loading page.
// Keyed by account so another sign-in never sees the last one's rows.
// With { disk: true } the last value is also stored, so the first visit after
// a cold start shows it too. Only plain JSON values go to disk.
const kept = new Map()
const DISK = 'did-i-kept:'
const DISK_MAX = 200_000

function fromDisk(key) {
  try {
    const raw = globalThis.localStorage?.getItem(DISK + key)
    return raw == null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function toDisk(key, value) {
  try {
    const raw = JSON.stringify(value)
    if (raw == null || raw.length > DISK_MAX) return
    globalThis.localStorage?.setItem(DISK + key, raw)
  } catch {
    // Memory still has it.
  }
}

export function useKept(key, initial, { disk = false } = {}) {
  // Signed out keys carry no account id; those stay in memory only.
  const onDisk = disk && !/:undefined(:|$)/.test(key)
  const [value, setValue] = useState(() => {
    if (kept.has(key)) return kept.get(key)
    if (onDisk) {
      const stored = fromDisk(key)
      if (stored !== undefined) return stored
    }
    return typeof initial === 'function' ? initial() : initial
  })
  const set = useCallback(
    (next) => {
      setValue((was) => {
        const now = typeof next === 'function' ? next(was) : next
        kept.set(key, now)
        if (onDisk) toDisk(key, now)
        return now
      })
    },
    [key, onDisk],
  )
  return [value, set]
}

/** Options for useKept that also store the value for the next launch. */
export const KEEP = { disk: true }
