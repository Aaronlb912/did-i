import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing } from 'react-native'
import Reanimated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated'
import { readReduceMotion } from '../../src/lib/useReduceMotion.js'

// Short, calm motion for things a tap opens or changes. Every helper here
// shows the end state at once when Less motion (or the phone's setting) is on.

export const MOTION_MS = 200
export const easeOut = Easing.out(Easing.cubic)

// One listener for the whole app, so press feedback can read it without a
// hook per button.
let systemReduce = false
try {
  AccessibilityInfo.isReduceMotionEnabled?.().then((on) => {
    systemReduce = Boolean(on)
  })
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (on) => {
    systemReduce = Boolean(on)
  })
} catch {
  systemReduce = false
}

export function motionOff() {
  return systemReduce || readReduceMotion()
}

// Kept for callers that used to ease the next layout change. LayoutAnimation
// does nothing on the New Architecture, so <Reveal> does the motion now.
export function animateNextLayout(reduce = motionOff()) {
  if (reduce) return
}

// Same shape as useState. Wrap what it opens in <Reveal> to animate it.
export function useLayoutState(initial) {
  return useState(initial)
}

// A block a tap opens, closes or swaps: fades and slides in, fades out, and
// eases the rows around it. Give it a key when swapping content. Inside a
// FlatList item pass layout={false}: virtualized rows must not run layout
// transitions.
export function Reveal({ children, style, layout = true, ...rest }) {
  const off = motionOff()
  return (
    <Reanimated.View
      entering={off ? undefined : FadeInDown.duration(MOTION_MS)}
      exiting={off ? undefined : FadeOut.duration(150)}
      layout={off || !layout ? undefined : LinearTransition.duration(MOTION_MS)}
      style={style}
      {...rest}
    >
      {children}
    </Reanimated.View>
  )
}

// Pressable style helper: a small scale on press, or a plain dim when motion is off.
export function pressFx(pressed) {
  if (!pressed) return null
  return motionOff() ? { opacity: 0.8 } : { transform: [{ scale: 0.97 }], opacity: 0.92 }
}

// Fades a block in once when `show` turns true (content that loads in).
export function useFadeIn(show = true, reduce = motionOff()) {
  const value = useRef(new Animated.Value(show && reduce ? 1 : 0)).current
  useEffect(() => {
    if (!show) {
      value.setValue(0)
      return
    }
    if (reduce) {
      value.setValue(1)
      return
    }
    Animated.timing(value, { toValue: 1, duration: MOTION_MS, easing: easeOut, useNativeDriver: true }).start()
  }, [show, reduce, value])
  return value
}
