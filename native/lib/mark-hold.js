import { useEffect, useState } from 'react'

// New marks wait while something else is talking: the night's celebration,
// or the undo pill after an answer. Then they come one at a time.

const holds = new Set()
const listeners = new Set()

function emit() {
  listeners.forEach((fn) => fn(holds.size > 0))
}

export function holdMarks() {
  const token = {}
  holds.add(token)
  emit()
  return () => {
    if (holds.delete(token)) emit()
  }
}

/** Hold marks while `on`, and for at most `ms` if given. */
export function useHoldMarks(on, ms = 0) {
  useEffect(() => {
    if (!on) return undefined
    const release = holdMarks()
    const timer = ms ? setTimeout(release, ms) : null
    return () => {
      if (timer) clearTimeout(timer)
      release()
    }
  }, [on, ms])
}

export function useMarksHeld() {
  const [held, setHeld] = useState(holds.size > 0)
  useEffect(() => {
    listeners.add(setHeld)
    setHeld(holds.size > 0)
    return () => {
      listeners.delete(setHeld)
    }
  }, [])
  return held
}
