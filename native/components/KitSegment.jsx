import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ripple } from '../lib/ripple.js'
import { fonts } from '../theme.js'

/**
 * The app's tab switcher: a rounded track with the picked tab filled like
 * the Did button. Drawn the same on iPhone and Android so it matches the
 * rest of the app instead of each system's own segmented control.
 */
export function KitSegment({ items, selected, onSelect, colors }) {
  return (
    <View style={[styles.track, { borderColor: colors.line, backgroundColor: colors.panel }]} accessibilityRole="tablist">
      {items.map((item) => {
        const on = selected === item.id
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            android_ripple={ripple(`${colors.on}33`)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            style={[styles.tab, on && { backgroundColor: colors.on }]}
          >
            <Text style={[styles.label, items.length > 3 && styles.labelTight, { color: on ? colors.bg : colors.inkSoft }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexBasis: 0,
    minHeight: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  label: { fontFamily: fonts.uiBold, fontSize: 14 },
  labelTight: { fontSize: 12 },
})
