import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'

const EDGE = 28
const SPRING = { damping: 22, stiffness: 280 }

export function SwipeBackShell({ enabled, back, onBack, children, backChild }) {
  const reduce = useReduceMotion()
  const width = useSharedValue(0)
  const x = useSharedValue(0)
  const live = useSharedValue(0)

  useEffect(() => {
    x.value = 0
    live.value = 0
  }, [children, backChild, live, x])

  function finishBack() {
    onBack?.()
    x.value = 0
    live.value = 0
  }

  const pan = Gesture.Pan()
    .activeOffsetX(8)
    .failOffsetX(-6)
    .failOffsetY([-40, 40])
    .onBegin((event) => {
      if (!enabled || event.x > EDGE) return
      live.value = 1
    })
    .onUpdate((event) => {
      if (!enabled || !live.value) return
      const next = Math.max(0, Math.min(width.value, event.translationX))
      x.value = next
    })
    .onEnd((event) => {
      if (!enabled || !live.value) return
      const w = width.value || 1
      const go = x.value > w * 0.28 || event.velocityX > 720
      if (!go) {
        x.value = withSpring(0, SPRING)
        live.value = 0
        return
      }
      runOnJS(finishBack)()
      if (!reduce) x.value = withTiming(w, { duration: 180 })
    })
    .onFinalize(() => {
      if (x.value <= 0) live.value = 0
    })

  const backStyle = useAnimatedStyle(() => {
    const w = width.value || 1
    const pull = x.value / w
    return {
      opacity: interpolate(pull, [0, 1], [0.92, 1]),
      transform: [{ translateX: interpolate(pull, [0, 1], [-w * 0.22, 0]) }],
    }
  })

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    shadowOpacity: interpolate(x.value, [0, width.value || 1], [0, 0.18]),
    elevation: interpolate(x.value, [0, width.value || 1], [0, 10]),
  }))

  const shadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, width.value || 1], [0, 0.12]),
  }))

  return (
    <View
      style={styles.shell}
      onLayout={(event) => {
        width.value = event.nativeEvent.layout.width
      }}
    >
      {enabled && back ? (
        <Animated.View pointerEvents="none" style={[styles.back, backStyle]}>
          <View style={styles.backInner}>{backChild}</View>
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.front, frontStyle]}>
        <View style={styles.frontInner}>{children}</View>
        {enabled ? (
          <Animated.View pointerEvents="none" style={[styles.shade, shadeStyle]} />
        ) : null}
      </Animated.View>
      {enabled ? (
        <GestureDetector gesture={pan}>
          <View style={styles.edge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </GestureDetector>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, overflow: 'hidden' },
  back: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  backInner: { flex: 1 },
  front: {
    flex: 1,
    zIndex: 2,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
  },
  frontInner: { flex: 1 },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE,
    zIndex: 60,
  },
})
