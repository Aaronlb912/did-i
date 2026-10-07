import { useEffect, useRef } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import * as Reanimated from 'react-native-reanimated'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'

// The system tab bar switches tabs with no animation, so a tab's screen slides
// in itself: from the right when you move to a tab further right, from the
// left when you move back. One child, so iOS still finds the scroll view down
// the first-child chain for the large title.
const Animated = Reanimated.default || Reanimated.Animated
const { Easing, useAnimatedStyle, useSharedValue, withTiming } = Reanimated

let lastTab = -1
const SLIDE_MS = 240

export function TabSlide({ index, children }) {
  const focused = useIsFocused()
  const reduce = useReduceMotion()
  const { width } = useWindowDimensions()
  const x = useSharedValue(0)
  const fade = useSharedValue(1)
  const was = useRef(focused)

  useEffect(() => {
    if (focused && !was.current && lastTab !== -1 && lastTab !== index && !reduce) {
      x.value = (index > lastTab ? 1 : -1) * width * 0.22
      fade.value = 0.35
      x.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) })
      fade.value = withTiming(1, { duration: SLIDE_MS })
    }
    if (focused) lastTab = index
    was.current = focused
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused])

  const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: x.value }] }))
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>
}

const styles = StyleSheet.create({ fill: { flex: 1 } })
