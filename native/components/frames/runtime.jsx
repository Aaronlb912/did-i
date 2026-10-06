// Shared plumbing for card frames: the svg loader, the battery rules hook,
// one UI-thread clock per frame, and the particle view.
import { useEffect, useRef, useState } from 'react'
import { AppState, StyleSheet } from 'react-native'
import * as Reanimated from 'react-native-reanimated'
import { requireOptionalNativeModule } from 'expo'
import { useReduceMotion } from '../../../src/lib/useReduceMotion.js'

const Animated = Reanimated.default || Reanimated.Animated
const { useAnimatedStyle, useSharedValue } = Reanimated

/** How far decorations may reach outside the card. The parent must not clip this. */
export const PAD = 48

let svgCache

/** All the react-native-svg parts frames use. Null when svg is missing. */
export function svgAll() {
  if (svgCache !== undefined) return svgCache
  try {
    const mod = require('react-native-svg')
    const Svg = mod && !mod.__didISvgFallback && (mod.default || mod.Svg)
    const names = ['G', 'Path', 'Circle', 'Ellipse', 'Rect', 'Line', 'Defs', 'LinearGradient', 'RadialGradient', 'Stop', 'ClipPath', 'Pattern', 'Text']
    const parts = { Svg }
    for (const name of names) parts[name] = mod && mod[name]
    svgCache = Svg && names.every((name) => parts[name]) ? parts : null
  } catch (error) {
    global.__didISvgError = String((error && error.message) || error)
    svgCache = null
  }
  return svgCache
}

/** An svg drawn in card coordinates, reaching PAD past every edge. */
export function SvgLayer({ w, h, children }) {
  const S = svgAll()
  if (!S || !w || !h) return null
  const W = w + PAD * 2
  const H = h + PAD * 2
  return (
    <S.Svg pointerEvents="none" style={[styles.layer, { width: W, height: H }]} width={W} height={H} viewBox={`${-PAD} ${-PAD} ${W} ${H}`}>
      {children}
    </S.Svg>
  )
}

/* ---------- Battery rules ---------- */

const IDLE_MS = 25000
let lastTouch = Date.now()
const listeners = new Set()

/** Call from a root onTouchStart. Any touch wakes paused frames for 25 s. */
export function noteFrameTouch() {
  lastTouch = Date.now()
  for (const fn of listeners) fn()
}

let batteryCache

// expo-battery, or null. A binary without the native module (before 1.3.1)
// never loads it, and reads as not low power.
function battery() {
  if (batteryCache !== undefined) return batteryCache
  try {
    batteryCache = requireOptionalNativeModule('ExpoBattery') ? require('expo-battery') : null
  } catch {
    batteryCache = null
  }
  return batteryCache
}

/** True while the phone is in low power mode. False when it cannot tell. */
export function useLowPowerMode() {
  const [low, setLow] = useState(false)
  useEffect(() => {
    const mod = battery()
    if (!mod) return undefined
    let alive = true
    let sub
    try {
      Promise.resolve(mod.isLowPowerModeEnabledAsync())
        .then((on) => alive && setLow(Boolean(on)))
        .catch(() => {})
      sub = mod.addLowPowerModeListener((e) => setLow(Boolean(e?.lowPowerMode)))
    } catch {
      setLow(false)
    }
    return () => {
      alive = false
      try {
        sub?.remove()
      } catch {
        // already gone
      }
    }
  }, [])
  return low
}

/**
 * True only when the screen is focused, the app is in front, motion is
 * allowed (OS setting and the app's Less motion), the phone is not in low
 * power mode, and there was a touch in the last 25 s.
 */
export function useFrameActive(focused = true) {
  const reduce = useReduceMotion()
  const lowPower = useLowPowerMode()
  const [appActive, setAppActive] = useState(() => AppState.currentState !== 'background' && AppState.currentState !== 'inactive')
  const [awake, setAwake] = useState(() => Date.now() - lastTouch < IDLE_MS)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'))
    return () => sub.remove()
  }, [])

  const want = Boolean(focused) && appActive && !reduce && !lowPower

  useEffect(() => {
    if (!want) return undefined
    let timer
    const arm = () => {
      clearTimeout(timer)
      const left = IDLE_MS - (Date.now() - lastTouch)
      if (left <= 0) {
        setAwake(false)
        return
      }
      setAwake(true)
      timer = setTimeout(arm, left)
    }
    arm()
    listeners.add(arm)
    return () => {
      listeners.delete(arm)
      clearTimeout(timer)
    }
  }, [want])

  return want && awake
}

/* ---------- Clock ---------- */

/**
 * Seconds since the frame started moving, kept on the UI thread. It only
 * ticks while active; when paused it holds, so the frame stands still where
 * it was. Never re-renders React.
 */
export function useFrameClock(active) {
  const t = useSharedValue(0)
  const hasCallback = typeof Reanimated.useFrameCallback === 'function'
  const cb = hasCallback
    ? Reanimated.useFrameCallback((info) => {
        'worklet'
        const dt = info.timeSincePreviousFrame
        if (dt) t.value += Math.min(dt, 100) / 1000
      }, false)
    : null
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    const handle = ref.current
    if (!handle) return undefined
    handle.setActive(Boolean(active))
    return () => handle.setActive(false)
  }, [active])
  return t
}

/**
 * One particle: a view whose place comes from fn(t, item, w, h) on the UI
 * thread. fn must be a worklet and return { x, y, o, r?, s? } (r in radians).
 */
export function Particle({ clock, item, fn, w, h, size, children }) {
  const style = useAnimatedStyle(() => {
    const s = fn(clock.value, item, w, h)
    return {
      opacity: s.o,
      transform: [
        { translateX: s.x - size / 2 },
        { translateY: s.y - size / 2 },
        { rotate: `${s.r || 0}rad` },
        { scale: s.s === undefined ? 1 : s.s },
      ],
    }
  })
  return (
    <Animated.View pointerEvents="none" style={[styles.particle, { width: size, height: size }, style]}>
      {children}
    </Animated.View>
  )
}

/** A whole-layer animation (opacity, rotation, slide) driven by fn(t) -> style. */
export function Moving({ clock, fn, style, children }) {
  const moving = useAnimatedStyle(() => fn(clock.value))
  return (
    <Animated.View pointerEvents="none" style={[style, moving]}>
      {children}
    </Animated.View>
  )
}

export { Animated, useAnimatedStyle, useSharedValue }

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: -PAD, top: -PAD },
  particle: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
})
