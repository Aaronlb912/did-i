import { useEffect, useState } from 'react'
import { readPrefs, usePrefs } from './prefs.js'

function isReactNative() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
}

function webReduceMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyReduceMotionAttr(reduce) {
  if (typeof document === 'undefined') return
  if (reduce) document.documentElement.dataset.reduceMotion = ''
  else delete document.documentElement.dataset.reduceMotion
}

function subscribeSystem(onChange) {
  if (isReactNative()) {
    let alive = true
    let sub
    const name = 'react-native'
    import(/* @vite-ignore */ name)
      .then(({ AccessibilityInfo }) => {
        if (!alive) return
        AccessibilityInfo.isReduceMotionEnabled().then((on) => {
          if (alive) onChange(Boolean(on))
        })
        sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
          if (alive) onChange(Boolean(on))
        })
      })
      .catch(() => {
        if (alive) onChange(false)
      })
    return () => {
      alive = false
      sub?.remove?.()
    }
  }

  if (typeof window === 'undefined' || !window.matchMedia) {
    onChange(false)
    return () => {}
  }

  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const sync = () => onChange(media.matches)
  sync()
  media.addEventListener('change', sync)
  return () => media.removeEventListener('change', sync)
}

export function readReduceMotion(prefs) {
  const next = prefs || readPrefs()
  if (next.lessMotion) return true
  return webReduceMotion()
}

export function useReduceMotion() {
  const prefs = usePrefs()
  const [system, setSystem] = useState(webReduceMotion)
  const reduce = Boolean(prefs.lessMotion || system)

  useEffect(() => subscribeSystem(setSystem), [])

  useEffect(() => {
    applyReduceMotionAttr(reduce)
  }, [reduce])

  return reduce
}
