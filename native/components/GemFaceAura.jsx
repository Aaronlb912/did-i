import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { gemLookTone } from '../lib/gem-look-tone.js'

export function GemFaceAura({ look, theme = 'dark' }) {
  const reduce = useReduceMotion()
  const breath = useRef(new Animated.Value(0)).current
  const tone = gemLookTone(look, theme)

  useEffect(() => {
    if (!tone || reduce) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [breath, reduce, tone])

  if (!tone) return null

  const ringOpacity = reduce ? 0.55 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.72] })
  const shineOpacity = reduce ? 0.35 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] })

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Animated.View
        style={[
          styles.innerRing,
          {
            borderColor: tone.ring,
            opacity: ringOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.topShine,
          {
            backgroundColor: tone.accent,
            opacity: shineOpacity,
          },
        ]}
      />
      <View style={[styles.corner, styles.cornerTL, { backgroundColor: tone.accent }]} />
      <View style={[styles.corner, styles.cornerBR, { backgroundColor: tone.accent }]} />
      <View style={[styles.edgeGlow, { shadowColor: tone.accent }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  innerRing: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderWidth: 1,
    borderRadius: 14,
  },
  topShine: {
    position: 'absolute',
    top: 0,
    left: '18%',
    right: '18%',
    height: 2,
    borderRadius: 2,
  },
  corner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.28,
  },
  cornerTL: { top: 10, left: 10 },
  cornerBR: { bottom: 10, right: 10 },
  edgeGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
})
