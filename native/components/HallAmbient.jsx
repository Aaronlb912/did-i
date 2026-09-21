import { StyleSheet, View } from 'react-native'

/** Subtle hall mood from streak heat and time of day — mirrors data-heat / data-hour on web. */
export function HallAmbient({ heat = 0, hour = 12, hallOn = false, accent }) {
  const heatAlpha = Math.min(5, Math.max(0, heat)) * 0.018
  const night = hour < 6 || hour >= 20
  const evening = hour >= 17 && hour < 20
  const sitAlpha = hallOn ? 0.06 : 0

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {heatAlpha > 0 ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: heatAlpha }]} />
      ) : null}
      {night ? <View style={[StyleSheet.absoluteFill, styles.night]} /> : null}
      {evening ? <View style={[StyleSheet.absoluteFill, styles.evening]} /> : null}
      {sitAlpha > 0 ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: sitAlpha }]} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  night: { backgroundColor: '#060810', opacity: 0.22 },
  evening: { backgroundColor: '#1a1008', opacity: 0.1 },
})
