import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useTheme } from '../../src/lib/prefs.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { gemLookTone } from '../lib/gem-look-tone.js'

export { hallHaloTone, gemLookTone, gemPanelStyle, gemLookChipMeta, gemFrameStyle, gemMeterStyle, gemGlowHostStyle } from '../lib/gem-look-tone.js'

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

  const soft = look === 'glow'
  const span = Math.max(width, height) * (soft ? 1.05 : 1.18)
  const topGlow = reduce
    ? soft ? 0.08 : 0.16
    : breath.interpolate({
        inputRange: [0, 1],
        outputRange: soft ? [0.05, 0.09] : [0.14, 0.22],
      })
  const bottomGlow = reduce
    ? soft ? 0.05 : 0.1
    : breath.interpolate({
        inputRange: [0, 1],
        outputRange: soft ? [0.03, 0.06] : [0.09, 0.15],
      })

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
            top: -span * 0.72,
            left: (width - span) / 2,
            opacity: topGlow,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            width: span * 0.82,
            height: span * 0.82,
            borderRadius: (span * 0.82) / 2,
            backgroundColor: tone.accentSoft || tone.accent,
            bottom: -span * 0.58,
            left: (width - span * 0.82) / 2,
            opacity: bottomGlow,
          },
        ]}
      />
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
})
