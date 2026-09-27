import { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SWIPE_THRESHOLD, SWIPE_WAKE } from '../../src/lib/swipe-face.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { playClick } from '../../src/lib/native.js'
import { useTheme } from '../../src/lib/prefs.js'
import { BuddyHang } from './Cosmetic.jsx'
import { gemGlowHostStyle, gemLookTone } from '../lib/gem-look-tone.js'
import { SwipeEdgeRails } from './SwipeEdgeRails.jsx'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'

const SPRING = { damping: 20, stiffness: 260, useNativeDriver: true }

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
  const x = useRef(new Animated.Value(0)).current
  const live = useRef({ onDid, onNope, blockDid, blockNope, demo })
  live.current = { onDid, onNope, blockDid, blockNope, demo }
  // Which answer edge the drag is past (1 DID, -1 nope, 0 neither), so the
  // phone ticks once when you cross into it.
  const edge = useRef(0)

  useEffect(() => {
    x.stopAnimation()
    x.setValue(0)
  }, [cardKey, x])

  useEffect(() => {
    if (!demo || reduce) return undefined
    const swing = Animated.sequence([
      Animated.delay(700),
      Animated.timing(x, {
        toValue: 148,
        duration: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(180),
      Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.delay(480),
      Animated.timing(x, {
        toValue: -148,
        duration: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(180),
      Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.delay(620),
    ])
    const loop = Animated.loop(swing)
    const frame = requestAnimationFrame(() => loop.start())
    return () => {
      cancelAnimationFrame(frame)
      loop.stop()
      x.stopAnimation()
      x.setValue(0)
    }
  }, [cardKey, demo, reduce, x])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (live.current.demo) return false
          return Math.abs(gesture.dx) > SWIPE_WAKE && Math.abs(gesture.dx) > Math.abs(gesture.dy)
        },
        onPanResponderMove: (_, gesture) => {
          x.setValue(gesture.dx)
          const now = live.current
          const zone =
            gesture.dx >= SWIPE_THRESHOLD && !now.blockDid
              ? 1
              : gesture.dx <= -SWIPE_THRESHOLD && !now.blockNope
                ? -1
                : 0
          if (zone !== edge.current) {
            if (zone !== 0) playClick()
            edge.current = zone
          }
        },
        onPanResponderRelease: (_, gesture) => {
          edge.current = 0
          const moved = gesture.dx
          const now = live.current
          // A committed swipe leaves the card where it was let go. The next
          // card resets x (cardKey effect); snapping to 0 here first showed
          // the answered card in the middle for a frame. The timeout only
          // covers a card that stays put after the answer.
          if (moved >= SWIPE_THRESHOLD && !now.blockDid) {
            now.onDid?.()
            setTimeout(() => x.setValue(0), 400)
            return
          }
          if (moved <= -SWIPE_THRESHOLD && !now.blockNope) {
            now.onNope?.()
            setTimeout(() => x.setValue(0), 400)
            return
          }
          Animated.spring(x, { ...SPRING, toValue: 0 }).start()
        },
        onPanResponderTerminate: () => {
          edge.current = 0
          Animated.spring(x, { ...SPRING, toValue: 0 }).start()
        },
      }),
    [x],
  )

  const rotate = x.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 2, 0, SWIPE_THRESHOLD * 2],
    outputRange: reduce ? ['0deg', '0deg', '0deg'] : ['-3deg', '0deg', '3deg'],
    extrapolate: 'clamp',
  })
  const didOpacity = x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.4, SWIPE_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  })
  const nopeOpacity = x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.4, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  })
  const kickerOpacity = x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  })

  const tone = gemLook ? gemLookTone(gemLook, theme) : null
  const line = tone?.ring || colors?.line || '#2b3140'

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.railsHost} pointerEvents="none">
        <SwipeEdgeRails
          x={x}
          colors={colors}
          winH={winH}
          didLabel={stampDid}
          nopeLabel={stampNope}
          reduce={reduce}
        />
      </View>
      <View
        style={[styles.glowHost, gemLook ? gemGlowHostStyle(gemLook, theme) : null]}
        {...(demo ? {} : pan.panHandlers)}
      >
        <Animated.View
          style={[
            ...faceCardStyle(colors, panelStyle),
            styles.card,
            { borderWidth: 1, borderColor: line },
            { transform: [{ translateX: x }, { rotate }] },
          ]}
        >
          <BuddyHang id={buddy} />
          <Animated.Text style={[faceCardStyles.stampDid, { color: colors.on, opacity: didOpacity }]}>
            {stampDid}
          </Animated.Text>
          <Animated.Text style={[faceCardStyles.stampNope, { color: colors.skip, opacity: nopeOpacity }]}>
            {stampNope}
          </Animated.Text>
          {kicker ? (
            <Animated.Text style={[faceCardStyles.kicker, { color: colors.on, opacity: kickerOpacity }]}>
              {kicker}
            </Animated.Text>
          ) : null}
          <Text style={[faceCardStyles.title, { color: colors.ink }]}>{title}</Text>
          {children}
        </Animated.View>
      </View>
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
    ...StyleSheet.absoluteFill,
    zIndex: 8,
    overflow: 'visible',
  },
  glowHost: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  card: {
    zIndex: 1,
    elevation: 0,
  },
})
