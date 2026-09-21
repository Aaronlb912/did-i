import { useCallback, useEffect, useRef, useState } from 'react'

export function useSavableField({ value, saved, onSave, ready = true }) {
  const [flash, setFlash] = useState(false)
  const timerRef = useRef(0)
  const trimmed = String(value ?? '').trim()
  const savedTrim = String(saved ?? '').trim()
  const dirty = ready && trimmed !== savedTrim

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const save = useCallback(async () => {
    if (!ready || trimmed === savedTrim) return true
    const result = await onSave(trimmed)
    if (result === false) return false
    setFlash(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFlash(false), 2000)
    return true
  }, [ready, trimmed, savedTrim, onSave])

  return { dirty, flash, save, trimmed }
}
