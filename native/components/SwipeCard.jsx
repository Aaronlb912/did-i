import { useCallback, useEffect, useMemo } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
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

  const snapBack = useCallback(() => {
    mode.value = 'idle'
    cancelAnimation(x)
    x.value = withSpring(0, SPRING)
  }, [mode, x])

  const finish = useCallback(
    (way) => {
      mode.value = 'idle'
      const done = way === 'did' ? onDid : onNope
      if (reduce || way === 'nope') {
        cancelAnimation(x)
        x.value = 0
        done()
        return
      }
      mode.value = 'fly'
      x.value = withTiming(460, { duration: 180 }, () => {
        runOnJS(done)()
      })
    },
    [onDid, onNope, reduce, mode, x],
  )

  const pan = useMemo(
    () =>
      Gesture.Pan()
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
    [blockDid, blockNope, finish, mode, x],
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
        />
      </View>
      <GestureDetector gesture={pan}>
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
