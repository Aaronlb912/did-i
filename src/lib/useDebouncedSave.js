import { useEffect, useRef } from 'react'

// Debounce typing saves, but flush on blur/unmount so a quick exit does not
// drop the last keystrokes.
export function useDebouncedSave({ ready, value, saved, save, delay = 400 }) {
  const valueRef = useRef(value)
  valueRef.current = value
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => {
    if (!ready) return undefined
    if (value === saved) return undefined

    const timer = setTimeout(() => {
      const latest = valueRef.current
      if (latest !== saved) saveRef.current(latest)
    }, delay)

    return () => {
      clearTimeout(timer)
      const latest = valueRef.current
      if (latest !== saved) saveRef.current(latest)
    }
  }, [ready, value, saved, delay])
}
