import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useTheme } from '../../src/lib/prefs.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { gemLookTone } from '../lib/gem-look-tone.js'

export { hallHaloTone, gemLookTone, gemPanelStyle, gemLookChipMeta, gemFrameStyle, gemMeterStyle } from '../lib/gem-look-tone.js'

export function HallHalo({ look }) {
  const theme = useTheme()
  const { width, height } = useWindowDimensions()
  const reduce = useReduceMotion()
  const breath = useRef(new Animated.Value(0)).current
  const tone = gemLookTone(look, theme)

  useEffect(() => {
    if (!tone || reduce) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [breath, reduce, tone])

  if (!tone || width < 1 || height < 1) return null

  const span = Math.max(width, height) * 1.18
  const side = span * 0.42
  const vignetteOpacity = reduce ? 0.9 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] })
  const topGlow = reduce ? 0.24 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.3] })
  const bottomGlow = reduce ? 0.16 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.13, 0.22] })
  const washGlow = reduce ? 0.14 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.11, 0.18] })
  const sideGlow = reduce ? 0.1 : breath.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.14] })
  const shimmerY = reduce
    ? height * 0.35
    : breath.interpolate({ inputRange: [0, 1], outputRange: [height * 0.12, height * 0.58] })

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            width: span,
            height: span,
            borderRadius: span / 2,
            backgroundColor: tone.accent,
            top: -span * 0.64,
            left: (width - span) / 2,
            opacity: topGlow,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: span * 0.86,
            height: span * 0.86,
            borderRadius: (span * 0.86) / 2,
            backgroundColor: tone.accentSoft || tone.accent,
            bottom: -span * 0.5,
            left: (width - span * 0.86) / 2,
            opacity: bottomGlow,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: span * 0.95,
            height: span * 0.68,
            borderRadius: span * 0.48,
            backgroundColor: tone.accent,
            top: height * 0.16,
            left: (width - span * 0.95) / 2,
            opacity: washGlow,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: side,
            height: side,
            borderRadius: side / 2,
            backgroundColor: tone.accent,
            top: height * 0.34,
            left: -side * 0.55,
            opacity: sideGlow,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: side,
            height: side,
            borderRadius: side / 2,
            backgroundColor: tone.accent,
            top: height * 0.38,
            right: -side * 0.55,
            opacity: sideGlow,
          },
        ]}
      />

      {!reduce ? (
        <Animated.View
          style={[
            styles.shimmer,
            {
              backgroundColor: tone.accent,
              opacity: 0.06,
              transform: [{ translateY: shimmerY }],
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          styles.vignette,
          {
            borderColor: tone.ring,
            opacity: vignetteOpacity,
            shadowColor: tone.accent,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.vignetteInner,
          {
            borderColor: tone.halo,
            opacity: vignetteOpacity,
          },
        ]}
      />
      <View pointerEvents="none" style={[styles.edgeSpill, { backgroundColor: tone.spill }]} />
      <View pointerEvents="none" style={[styles.edgeSpillBottom, { backgroundColor: tone.spill }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
  shimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 120,
    borderRadius: 999,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  vignetteInner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderRadius: 2,
  },
  edgeSpill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.8,
  },
  edgeSpillBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.45,
  },
})
