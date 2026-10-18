import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../src/lib/prefs.js'
import { gemLookTone } from '../lib/gem-look-tone.js'

// Every screen wears the look, not just Today: a soft glow of its colour
// over the top of the page and a short bar of it above the first card, so
// a list or a settings page still says which look is on. Gem looks glow in
// their own tone.
const GLOW_HEIGHT = 460

function svgGlow() {
  try {
    const mod = require('react-native-svg')
    if (!mod || mod.__didISvgFallback) return null
    const Svg = mod.default || mod.Svg
    const { Defs, RadialGradient, Stop, Rect } = mod
    return Svg && Defs && RadialGradient && Stop && Rect ? { Svg, Defs, RadialGradient, Stop, Rect } : null
  } catch {
    return null
  }
}

export function lookGlowColor(colors, theme) {
  const tone = colors.gemLook ? gemLookTone(colors.gemLook, theme) : null
  return tone?.accent || colors.on
}

export const LookGlow = memo(function LookGlow({ colors }) {
  const theme = useTheme()
  const color = lookGlowColor(colors, theme)
  const strength = theme === 'light' ? 0.16 : 0.22
  const parts = svgGlow()
  if (!parts) {
    return <View pointerEvents="none" style={[styles.glow, { backgroundColor: color, opacity: strength / 4 }]} />
  }
  const { Svg, Defs, RadialGradient, Stop, Rect } = parts
  return (
    <View pointerEvents="none" style={styles.glow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="lookGlow" cx="50%" cy="0%" rx="85%" ry="100%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="0.55" stopColor={color} stopOpacity={strength * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#lookGlow)" />
      </Svg>
    </View>
  )
})

export function LookMark({ colors }) {
  const theme = useTheme()
  return <View pointerEvents="none" style={[styles.mark, { backgroundColor: lookGlowColor(colors, theme) }]} />
}

const styles = StyleSheet.create({
  // From well above the page (under a clear bar) down past the title.
  glow: { position: 'absolute', top: -GLOW_HEIGHT / 2, left: -48, right: -48, height: GLOW_HEIGHT },
  // Sits in the gap above the first card, so it moves nothing.
  mark: { position: 'absolute', top: -10, left: 2, width: 28, height: 4, borderRadius: 2 },
})
