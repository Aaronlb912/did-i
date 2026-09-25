import { useEffect, useRef } from 'react'
import { Animated, Platform, StyleSheet, View } from 'react-native'
import { useTheme } from '../../src/lib/prefs.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { gemLookTone } from '../lib/gem-look-tone.js'

export { hallHaloTone, gemLookTone, gemPanelStyle, gemLookChipMeta, gemFrameStyle, gemMeterStyle, gemGlowHostStyle } from '../lib/gem-look-tone.js'

// A gem look outlines the screen edge in its color. It used to be two soft
// round glows at the top and bottom; a plain background with a thin frame
// reads cleaner.
export function HallHalo({ look }) {
  const theme = useTheme()
  const reduce = useReduceMotion()
  const breath = useRef(new Animated.Value(0)).current
  const tone = gemLookTone(look, theme)
  // Glow already frames the screen on Android (gemFrameStyle).
  const framed = look === 'glow' && Platform.OS === 'android'

  useEffect(() => {
    if (!tone || framed || reduce) return undefined
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [breath, framed, reduce, tone])

  if (!tone || framed) return null

  const opacity = reduce
    ? 0.6
    : breath.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.75] })

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View pointerEvents="none" style={[styles.edge, { borderColor: tone.accent, opacity }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    elevation: 0,
    overflow: 'hidden',
  },
  edge: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderRadius: 28,
  },
})
