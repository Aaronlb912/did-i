import { useMemo } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { goBack } from '../navigation/hash.js'

const SWIPE = 72

export function useSwipeBack(enabled) {
  return useMemo(() => {
    if (!enabled) return null
    return Gesture.Pan()
      .activeOffsetX(16)
      .failOffsetY([-48, 48])
      .onEnd((event) => {
        if (event.translationX >= SWIPE) runOnJS(goBack)()
      })
  }, [enabled])
}
