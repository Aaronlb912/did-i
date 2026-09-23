import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { readPrefs, usePrefs } from './prefs.js'

function applyReduceMotionAttr(reduce) {
  if (typeof document === 'undefined') return
  if (reduce) document.documentElement.dataset.reduceMotion = ''
  else delete document.documentElement.dataset.reduceMotion
}

function subscribeSystem(onChange) {
  let alive = true
  let sub
  try {
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) onChange(Boolean(on))
    })
    sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      if (alive) onChange(Boolean(on))
    })
  } catch {
    onChange(false)
  }
  return () => {
    alive = false
    sub?.remove?.()
  }
}

export function readReduceMotion(prefs) {
  const next = prefs || readPrefs()
  if (next.lessMotion) return true
  return false
}

export function useReduceMotion() {
  const prefs = usePrefs()
  const [system, setSystem] = useState(false)
  const reduce = Boolean(prefs.lessMotion || system)

  useEffect(() => subscribeSystem(setSystem), [])

  useEffect(() => {
    applyReduceMotionAttr(reduce)
  }, [reduce])

  return reduce
}
