import { useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, StyleSheet, View } from 'react-native'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'

const EDGE = 28
const SPRING = { damping: 22, stiffness: 280, useNativeDriver: true }

// Each route gets its own slide value and its own front view (keyed by routeKey).
// Resetting one shared value on iPhone moved the old screen back into place a
// frame before the new screen was drawn, so the question flashed.
export function SwipeBackShell({ enabled, back, onBack, children, backChild, routeKey = '' }) {
  const reduce = useReduceMotion()
  const slide = useRef(null)
  if (!slide.current || slide.current.key !== routeKey) {
    slide.current = { key: routeKey, x: new Animated.Value(0) }
  }
  const x = slide.current.x
  const width = useRef(1)
  const live = useRef(false)
  const [span, setSpan] = useState(1)
  const [liftedFor, setLiftedFor] = useState(null)
  const lifted = liftedFor === routeKey
  const props = useRef({ enabled, onBack, reduce, routeKey })
  props.current = { enabled, onBack, reduce, routeKey }
  const setLifted = (on) => setLiftedFor(on ? props.current.routeKey : null)

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (!props.current.enabled) return false
          return gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy)
        },
        onPanResponderGrant: () => {
          live.current = Boolean(props.current.enabled)
          if (live.current) setLifted(true)
        },
        onPanResponderMove: (_, gesture) => {
          if (!live.current) return
          const next = Math.max(0, Math.min(width.current, gesture.dx))
          slide.current.x.setValue(next)
        },
        onPanResponderRelease: (_, gesture) => {
          if (!live.current) return
          const x = slide.current.x
          const w = width.current || 1
          const go = gesture.dx > w * 0.28 || gesture.vx > 0.7
          if (!go) {
            live.current = false
            Animated.spring(x, { ...SPRING, toValue: 0 }).start(() => setLifted(false))
            return
          }
          // The old screen stays slid out; the new route brings a fresh front view.
          const from = props.current.routeKey
          const done = () => {
            live.current = false
            props.current.onBack?.()
            // Back went nowhere: slide the same screen home instead of leaving it off-screen.
            setTimeout(() => {
              if (props.current.routeKey === from && !live.current) {
                x.setValue(0)
                setLifted(false)
              }
            }, 500)
          }
          if (props.current.reduce) {
            done()
            return
          }
          Animated.timing(x, { toValue: w, duration: 180, useNativeDriver: true }).start(({ finished }) => {
            if (finished) done()
          })
        },
        onPanResponderTerminate: () => {
          live.current = false
          const x = slide.current.x
          Animated.spring(x, { ...SPRING, toValue: 0 }).start(() => setLifted(false))
        },
      }),
    [],
  )

  const backMotion = {
    opacity: x.interpolate({ inputRange: [0, span], outputRange: [0.92, 1], extrapolate: 'clamp' }),
    transform: [
      {
        translateX: x.interpolate({
          inputRange: [0, span],
          outputRange: [-span * 0.22, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  }
  const backStyle = lifted ? backMotion : null
  const frontStyle = lifted ? { transform: [{ translateX: x }] } : null
  const shadeStyle = {
    opacity: x.interpolate({ inputRange: [0, span], outputRange: [0, 0.12], extrapolate: 'clamp' }),
  }

  return (
    <View
      style={styles.shell}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width || 1
        width.current = next
        if (next !== span) setSpan(next)
      }}
    >
      {enabled && back && lifted ? (
        <Animated.View pointerEvents="none" style={[styles.back, backStyle]}>
          <View style={styles.backInner}>{backChild}</View>
        </Animated.View>
      ) : null}
      <Animated.View key={routeKey} style={[styles.front, frontStyle]}>
        <View style={styles.frontInner}>{children}</View>
        {enabled ? <Animated.View pointerEvents="none" style={[styles.shade, shadeStyle]} /> : null}
      </Animated.View>
      {enabled ? (
        <View
          style={styles.edge}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          {...pan.panHandlers}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, overflow: 'hidden', zIndex: 0 },
  back: {
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
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
