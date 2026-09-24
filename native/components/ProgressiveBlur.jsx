import { useId } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { blurNativeReady } from '../lib/blur-ready.js'
import { svgGradient } from '../lib/svg-parts.js'

// Blur that is strongest at the top edge and melts to nothing at the bottom.
// Native blur views have no mask, so the ramp is built from bands: each band
// starts at the top and stops a little shorter than the last, so the top sees
// every band stacked and the bottom sees one faint one.
const BANDS = 6
const TOTAL_INTENSITY = 36

function loadBlurView() {
  // Android blur needs a BlurTargetView around whatever sits behind it, and
  // a header floats over many different screens. The scrim carries it there.
  if (Platform.OS !== 'ios' || !blurNativeReady()) return null
  try {
    return require('expo-blur').BlurView || null
  } catch {
    return null
  }
}

function Scrim({ id, color, from, height }) {
  const parts = svgGradient()
  if (!parts) {
    return (
      <View style={StyleSheet.absoluteFill}>
        {[0.28, 0.2, 0.12, 0.05].map((alpha, index) => (
          <View
            key={alpha}
            style={[
              styles.step,
              { height: height * (1 - index / 4), backgroundColor: color, opacity: alpha * (from / 0.7) },
            ]}
          />
        ))}
      </View>
    )
  }
  const { Svg, Defs, LinearGradient, Stop, Rect } = parts
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={from} />
          <Stop offset="0.55" stopColor={color} stopOpacity={from * 0.55} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={height} fill={`url(#${id})`} />
    </Svg>
  )
}

export function ProgressiveBlur({ height, color, tint = 'dark', style }) {
  const id = `fade${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const BlurView = loadBlurView()
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }, style]}>
      {BlurView
        ? Array.from({ length: BANDS }, (_, index) => (
            <BlurView
              key={index}
              tint={tint}
              intensity={TOTAL_INTENSITY / BANDS}
              style={[styles.band, { height: height * (1 - index / BANDS) }]}
            />
          ))
        : null}
      <Scrim id={id} color={color} height={height} from={BlurView ? 0.7 : 0.94} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, left: 0, right: 0 },
  step: { position: 'absolute', top: 0, left: 0, right: 0 },
})
