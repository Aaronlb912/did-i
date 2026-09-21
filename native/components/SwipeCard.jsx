import { useCallback, useEffect, useMemo } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import {
  SWIPE_THRESHOLD,
  SWIPE_WAKE,
  stampOpacity,
  swipePull,
  swipeTilt,
} from '../../src/lib/swipe-face.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useTheme } from '../../src/lib/prefs.js'
import { BuddyHang } from './Cosmetic.jsx'
import { GemFaceAura } from './GemFaceAura.jsx'
import { SwipeEdgeRails } from './SwipeEdgeRails.jsx'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'

const SPRING = { damping: 20, stiffness: 260 }

export function SwipeCard({
  cardKey = '',
  kicker,
  title,
  stampDid,
  stampNope,
  onDid,
  onNope,
  colors,
  buddy,
  blockDid = false,
  blockNope = false,
  panelStyle,
  gemLook = '',
  demo = false,
  children,
}) {
  const theme = useTheme()
  const reduce = useReduceMotion()
  const { height: winH } = useWindowDimensions()
  const x = useSharedValue(0)
  const mode = useSharedValue('idle')

  useEffect(() => {
    cancelAnimation(x)
    x.value = 0
    mode.value = 'idle'
  }, [cardKey, mode, x])

  useEffect(() => {
    if (!demo) return undefined
    if (reduce) return undefined

    const frame = requestAnimationFrame(() => {
      x.value = withRepeat(
        withSequence(
          withDelay(700, withTiming(0, { duration: 0 })),
          withTiming(148, { duration: 780, easing: Easing.out(Easing.cubic) }),
          withDelay(180, withTiming(0, { duration: 200 })),
          withDelay(480, withTiming(0, { duration: 0 })),
          withTiming(-148, { duration: 780, easing: Easing.out(Easing.cubic) }),
          withDelay(180, withTiming(0, { duration: 200 })),
          withDelay(620, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      )
    })

    return () => {
      cancelAnimationFrame(frame)
      cancelAnimation(x)
      x.value = 0
      mode.value = 'idle'
    }
  }, [cardKey, demo, mode, reduce, x])

  useAnimatedReaction(
    () => (demo ? Math.abs(x.value) : 0),
    (abs) => {
      if (!demo) return
      mode.value = abs > 14 ? 'drag' : 'idle'
    },
  )

  const snapBack = useCallback(() => {
    mode.value = 'idle'
    cancelAnimation(x)
    x.value = withSpring(0, SPRING)
  }, [mode, x])

  const finish = useCallback(
    (way) => {
      const done = way === 'did' ? onDid : onNope
      // Save before the fly animation. Closing the app mid-flight used to
      // drop the mark because done() only ran after 180ms.
      done()
      if (reduce || way === 'nope') {
        mode.value = 'idle'
        cancelAnimation(x)
        x.value = 0
        return
      }
      mode.value = 'fly'
      x.value = withTiming(460, { duration: 180 }, (finished) => {
        if (!finished) return
        mode.value = 'idle'
        x.value = 0
      })
    },
    [onDid, onNope, reduce, mode, x],
  )

  const pan = useMemo(
    () =>
      demo
        ? Gesture.Pan().enabled(false)
        : Gesture.Pan()
        .activeOffsetX([-SWIPE_WAKE, SWIPE_WAKE])
        .onUpdate((event) => {
          if (mode.value === 'fly') return
          mode.value = 'drag'
          x.value = event.translationX
        })
        .onEnd((event) => {
          if (mode.value === 'fly') return
          const moved = event.translationX
          if (moved >= SWIPE_THRESHOLD && !blockDid) {
            runOnJS(finish)('did')
            return
          }
          if (moved <= -SWIPE_THRESHOLD && !blockNope) {
            runOnJS(finish)('nope')
            return
          }
          mode.value = 'idle'
          x.value = withSpring(0, SPRING)
        })
        .onFinalize(() => {
          if (mode.value === 'drag') {
            mode.value = 'idle'
            x.value = withSpring(0, SPRING)
          }
        }),
    [blockDid, blockNope, demo, finish, mode, x],
  )

  const cardStyle = useAnimatedStyle(() => {
    const tilt = reduce ? 0 : swipeTilt(x.value)
    return {
      transform: [{ translateX: x.value }, { rotate: `${tilt}deg` }],
    }
  })

  const didStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity(swipePull(x.value), 'did'),
  }))

  const nopeStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity(swipePull(x.value), 'nope'),
  }))

  const kickerStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(swipePull(x.value))),
  }))

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.railsHost} pointerEvents="none">
        <SwipeEdgeRails
          x={x}
          mode={mode}
          colors={colors}
          winH={winH}
          didLabel={stampDid}
          nopeLabel={stampNope}
          reduce={reduce}
          alwaysOn={demo}
        />
      </View>
      <GestureDetector gesture={pan} enabled={!demo}>
        <Animated.View style={[...faceCardStyle(colors, panelStyle), cardStyle, styles.card]}>
          {gemLook ? <GemFaceAura look={gemLook} theme={theme} /> : null}
          <BuddyHang id={buddy} />
          <Animated.Text style={[faceCardStyles.stampDid, { color: colors.on }, didStyle]}>{stampDid}</Animated.Text>
          <Animated.Text style={[faceCardStyles.stampNope, { color: colors.skip }, nopeStyle]}>{stampNope}</Animated.Text>
          {kicker ? (
            <Animated.Text style={[faceCardStyles.kicker, { color: colors.on }, kickerStyle]}>{kicker}</Animated.Text>
          ) : null}
          <Text style={[faceCardStyles.title, { color: colors.ink }]}>{title}</Text>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  railsHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    overflow: 'visible',
  },
  card: {
    zIndex: 1,
    elevation: 0,
  },
})
