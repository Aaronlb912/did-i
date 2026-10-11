import { Pressable, StyleSheet, Text, View } from 'react-native'
import { fonts } from '../theme.js'

// One choice in a 2-column picker (When, How it counts), the same on every form.
export function ScheduleTile({ label, sub, on, onPress, accent, colors }) {
  const lit = accent || colors.on
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: Boolean(on) }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={[styles.tile, { borderColor: on ? lit : colors.line, backgroundColor: on ? colors.panel3 : colors.panel }]}
    >
      <Text style={[styles.label, { color: on ? lit : colors.ink }]}>{label}</Text>
      {sub ? <Text style={[styles.sub, { color: colors.inkSoft }]}>{sub}</Text> : null}
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
  tile: { width: '48.5%', minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  label: { fontFamily: fonts.uiSemi, fontSize: 15 },
  sub: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
})
