import { StyleSheet, View } from 'react-native'
import { svgParts } from '../lib/svg-parts.js'

export function CoinIcon({ size = 16 }) {
  const parts = svgParts()
  if (!parts) {
    return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e2c36a' }} />
  }
  const { Svg, Circle, Ellipse, Path } = parts
  return (
    <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 16 16">
      <Circle cx="8" cy="8.5" r="6.2" fill="#6b5420" />
      <Circle cx="8" cy="7.8" r="6.2" fill="#e2c36a" />
      <Ellipse cx="8" cy="6.1" rx="3.8" ry="1.05" fill="#f8ecc4" opacity={0.85} />
      <Path
        d="M8 4.4c-1.6 0-2.9.55-2.9 1.25S6.4 6.9 8 6.9s2.9-.55 2.9-1.25S9.6 4.4 8 4.4zm0 5.1c-1.6 0-2.9.55-2.9 1.25S6.4 10.9 8 10.9s2.9-.55 2.9-1.25S9.6 9.5 8 9.5z"
        fill="#9a7a28"
      />
    </Svg>
  )
}

export function GemIcon({ size = 16 }) {
  const parts = svgParts()
  if (!parts) {
    return (
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: '#5ee8ff',
          transform: [{ rotate: '45deg' }],
        }}
      />
    )
  }
  const { Svg, Path } = parts
  return (
    <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 1.6 14.2 6.2 8 14.4 1.8 6.2 8 1.6z" fill="#2a9db5" />
      <Path d="M8 1.6 1.8 6.2 8 8.2 14.2 6.2 8 1.6z" fill="#9ef5ff" />
      <Path d="M8 8.2 1.8 6.2 8 14.4 14.2 6.2 8 8.2z" fill="#5ee8ff" />
      <Path d="M8 1.6v6.6M1.8 6.2h12.4" stroke="#c9faff" strokeWidth={0.6} />
    </Svg>
  )
}

// One faceted gem, sized to the pack: bigger packs read as a bigger gem
// instead of shrinking into a grid of dots.
export function gemFaceSize(count, big = false) {
  const n = Math.max(1, Math.floor(Number(count) || 0))
  if (big) {
    if (n <= 14) return 48
    if (n <= 40) return 60
    return 72
  }
  if (n <= 1) return 22
  if (n <= 3) return 26
  return 30
}

export function GemFaceMark({ count, big, colors, accessibilityLabel }) {
  const size = gemFaceSize(count, big)
  // Same tile on every row; only the gem inside grows with the pack.
  const box = big ? 72 + 24 : 30 + 16
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.packMark,
        {
          width: box,
          height: box,
          borderColor: colors.line,
          backgroundColor: colors.panel2,
        },
      ]}
    >
      <GemIcon size={size} />
    </View>
  )
}

// Loose gem row for balance and other inline spots. Caps how many draw on screen.
export function GemStack({ count, accessibilityLabel, max = 12 }) {
  const n = Math.max(0, Math.floor(Number(count) || 0))
  if (!n) return <GemIcon size={16} />

  const show = Math.min(n, max)
  const icon = show <= 3 ? 14 : show <= 6 ? 11 : 9
  const gap = 3

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.inlineStack, { gap }]}
    >
      {Array.from({ length: show }, (_, i) => (
        <GemIcon key={i} size={icon} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  packMark: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  inlineStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
})
