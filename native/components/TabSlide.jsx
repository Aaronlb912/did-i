import { useEffect, useRef } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { useNavigationState, useRoute } from '@react-navigation/native'
import * as Reanimated from 'react-native-reanimated'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'

// The system tab bar switches tabs with no animation, so a tab's screen slides
// in itself from the side its tab sits on. One child, so iOS still finds the scroll view down
// the first-child chain for the large title.
const Animated = Reanimated.default || Reanimated.Animated
const { Easing, useAnimatedStyle, useSharedValue, withTiming } = Reanimated

const SLIDE_MS = 240

export function TabSlide({ index, children }) {
  // The selected tab, not screen focus: coming back from a pushed screen also
  // refocuses the tab, and sliding then fought the back animation (a stutter).
  const route = useRoute()
  const focused = useNavigationState((state) => state?.routes?.[state.index]?.key === route.key)
  const reduce = useReduceMotion()
  const { width } = useWindowDimensions()
  // A later tab is only built the first time you open it. Android builds it
  // already focused; the iPhone tab bar builds it hidden, then focuses it. Either
  // way it starts off to its side and slides in like every switch after.
  const late = index > 0 && !reduce
  const x = useSharedValue(late ? width * 0.22 : 0)
  const fade = useSharedValue(late ? 0.35 : 1)
  const was = useRef(late ? false : focused)

  // Set up while the tab is hidden, not on the first frame it shows: moving it
  // after it was already drawn in place was a one-frame blink. With two tabs a
  // tab always comes back from the same side (the first from the left, the
  // rest from the right).
  useEffect(() => {
    if (!focused && was.current && !reduce) {
      x.value = (index > 0 ? 1 : -1) * width * 0.22
      fade.value = 0.35
    }
    if (focused && !was.current) {
      x.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) })
      fade.value = withTiming(1, { duration: SLIDE_MS })
    }
    was.current = focused
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused])

  const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: x.value }] }))
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>
}

const styles = StyleSheet.create({ fill: { flex: 1 } })
