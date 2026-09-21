import { useCallback, useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
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
import { fonts } from '../theme.js'

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
  const x = useSharedValue(0)
  const mode = useSharedValue('idle')

  useEffect(() => {
    x.value = 0
    mode.value = 'idle'
  }, [cardKey, mode, x])

  const finish = useCallback(
    (way) => {
      const done = way === 'did' ? onDid : onNope
      if (reduce || way === 'nope') {
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

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (mode.value === 'fly') return
      if (Math.abs(event.translationY) > Math.abs(event.translationX) && Math.abs(event.translationX) < SWIPE_WAKE) {
        return
      }
      if (Math.abs(event.translationX) >= SWIPE_WAKE || Math.abs(event.translationY) >= SWIPE_WAKE) {
        mode.value = 'drag'
      }
      x.value = event.translationX
    })
    .onEnd((event) => {
      if (mode.value === 'fly') return
      const moved = event.translationX
      if (mode.value === 'drag' && moved >= SWIPE_THRESHOLD && !blockDid) {
        runOnJS(finish)('did')
        return
      }
      if (mode.value === 'drag' && moved <= -SWIPE_THRESHOLD && !blockNope) {
        runOnJS(finish)('nope')
        return
      }
      x.value = withSpring(0, { damping: 18, stiffness: 220 })
      mode.value = 'idle'
    })

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
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.panel, borderColor: colors.line },
          panelStyle,
          cardStyle,
        ]}
      >
        {gemLook ? <GemFaceAura look={gemLook} theme={theme} /> : null}
        <BuddyHang id={buddy} />
        <Animated.Text style={[styles.stampDid, { color: colors.on }, didStyle]}>{stampDid}</Animated.Text>
        <Animated.Text style={[styles.stampNope, { color: colors.skip }, nopeStyle]}>{stampNope}</Animated.Text>
        {kicker ? (
          <Animated.Text style={[styles.kicker, { color: colors.on }, kickerStyle]}>{kicker}</Animated.Text>
        ) : null}
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        {children}
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
    minHeight: 168,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  stampDid: {
    position: 'absolute',
    top: 16,
    left: 16,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stampNope: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
