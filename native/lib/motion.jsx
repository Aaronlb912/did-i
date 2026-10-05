import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, Platform, UIManager } from 'react-native'
import { readReduceMotion } from '../../src/lib/useReduceMotion.js'
import Reanimated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated'

// Short, calm motion for things a tap opens or changes. Every helper here
// shows the end state at once when Less motion (or the phone's setting) is on.

export const MOTION_MS = 200
export const easeOut = Easing.out(Easing.cubic)

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  } catch {
    // New architecture ignores this; LayoutAnimation still works there.
  }
}

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

// Call right before a setState that adds, removes or resizes rows.
export function animateNextLayout(reduce = motionOff()) {
  if (reduce) return
  LayoutAnimation.configureNext(LayoutAnimation.create(MOTION_MS, 'easeOut', 'opacity'))
}

// useState whose setter eases the layout change it causes (open/close,
// show all, a banner coming in). Same shape as useState.
export function useLayoutState(initial) {
  const [value, setValue] = useState(initial)
  const set = useCallback((next) => {
    animateNextLayout()
    setValue(next)
  }, [])
  return [value, set]
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

// A block that fades and slides in when it mounts and fades out when it
// leaves. LayoutAnimation does nothing on the new architecture, so anything
// a tap opens in place should sit in a <Reveal>.
export function Reveal({ children, style, ...rest }) {
  const off = motionOff()
  return (
    <Reanimated.View
      entering={off ? undefined : FadeInDown.duration(MOTION_MS).withInitialValues({ transform: [{ translateY: -8 }] })}
      exiting={off ? undefined : FadeOut.duration(150)}
      layout={off ? undefined : LinearTransition.duration(MOTION_MS)}
      style={style}
      {...rest}
    >
      {children}
    </Reanimated.View>
  )
}
