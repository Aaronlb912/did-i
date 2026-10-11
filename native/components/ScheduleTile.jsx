import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Reanimated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { MOTION_MS } from '../lib/motion.jsx'
import { fonts } from '../theme.js'

// One choice in a 2-column picker (When, How it counts), the same on every form.
// The border and fill ease to the picked look on the UI thread.
export function ScheduleTile({ label, sub, on, onPress, accent, colors }) {
  const reduce = useReduceMotion()
  const lit = accent || colors.on
  const pick = useSharedValue(on ? 1 : 0)
  useEffect(() => {
    pick.value = reduce ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: MOTION_MS })
  }, [on, reduce, pick])
  const look = useAnimatedStyle(() => ({
    borderColor: interpolateColor(pick.value, [0, 1], [colors.line, lit]),
    backgroundColor: interpolateColor(pick.value, [0, 1], [colors.panel, colors.panel3]),
  }))
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: Boolean(on) }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={styles.cell}
    >
      <Reanimated.View style={[styles.tile, look]}>
        <Text style={[styles.label, { color: on ? lit : colors.ink }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: colors.inkSoft }]}>{sub}</Text> : null}
      </Reanimated.View>
    </Pressable>
  )
}

export function ScheduleTiles({ children, label }) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  // Rows stretch, so two tiles side by side are always the same height.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch', rowGap: 8 },
  cell: { width: '48.5%' },
  tile: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  label: { fontFamily: fonts.uiSemi, fontSize: 15 },
  sub: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
})
