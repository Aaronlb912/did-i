import { useEffect, useRef, useState } from 'react'

// Flags a number for a moment after it moves, so coins and counters can
// react instead of silently changing. Nothing fires on first paint.
export function usePop(value, ms = 560) {
  const seen = useRef(value)
  const [flag, setFlag] = useState('')

  useEffect(() => {
    if (value === seen.current) return undefined
    const way = Number(value) > Number(seen.current) ? 'is-pop' : 'is-drop'
    seen.current = value
    setFlag(way)
    const timer = window.setTimeout(() => setFlag(''), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])

  return flag
}
