import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { fonts } from '../theme.js'

const PAD = 4
const GAP = 4

/**
 * The app's tab switcher: a rounded track with the picked tab filled like
 * the Did button. The fill slides to the tab you pick (it jumps instead
 * with Less motion on). Drawn the same on iPhone and Android.
 */
export function KitSegment({ items, selected, onSelect, colors }) {
  const reduce = useReduceMotion()
  const [width, setWidth] = useState(0)
  const at = Math.max(0, items.findIndex((item) => item.id === selected))
  const slide = useRef(new Animated.Value(at)).current
  const placed = useRef(false)

  useEffect(() => {
    if (!width) return
    if (reduce || !placed.current) {
      slide.setValue(at)
      placed.current = true
      return
    }
    Animated.timing(slide, {
      toValue: at,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [at, width, reduce, slide])

  const tabWidth = width ? (width - 2 - PAD * 2 - GAP * (items.length - 1)) / items.length : 0
  const left = slide.interpolate({
    inputRange: [0, Math.max(1, items.length - 1)],
    outputRange: [0, Math.max(1, items.length - 1) * (tabWidth + GAP)],
  })

  return (
    <View
      style={[styles.track, { borderColor: colors.line, backgroundColor: colors.panel }]}
      accessibilityRole="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {tabWidth ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { width: tabWidth, backgroundColor: colors.on, transform: [{ translateX: left }] }]}
        />
      ) : null}
      {items.map((item) => {
        const on = selected === item.id
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            style={[styles.tab, items.length > 4 && styles.tabTight, on && !tabWidth && { backgroundColor: colors.on }]}
          >
            <Text
              style={[styles.label, items.length > 3 && styles.labelTight, items.length > 4 && styles.labelTiny, { color: on ? colors.bg : colors.inkSoft }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={items.length > 4 ? 0.85 : 0.8}
            >
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
    padding: PAD,
    gap: GAP,
  },
  fill: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 999,
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
  // Five tabs (gifts): one smaller size for all, so "Accessories" fits whole.
  tabTight: { paddingHorizontal: 1 },
  labelTiny: { fontSize: 11, letterSpacing: -0.2 },
})
