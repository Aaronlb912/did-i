import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { ripple } from '../lib/ripple.js'
import { fonts } from '../theme.js'
import { MenuIcon } from './MenuIcon.jsx'

// A settings row that shows its current value and opens in place.
// Lives inside a SetCard; the last row drops its bottom rule.
// onShown gets the row's view once it has opened, so the page can bring it into view.
export function HangFold({ label, value, icon, open, onToggle, last, colors, children, onShown }) {
  const reduce = useReduceMotion()
  const turn = useRef(new Animated.Value(open ? 1 : 0)).current
  const box = useRef(null)
  const wasOpen = useRef(open)

  useEffect(() => {
    const opened = open && !wasOpen.current
    wasOpen.current = open
    if (!opened || !onShown) return undefined
    // After the body has laid out (and the fold ease has run).
    const id = setTimeout(() => box.current && onShown(box.current), reduce ? 30 : 240)
    return () => clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (reduce) {
      turn.setValue(open ? 1 : 0)
      return undefined
    }
    const run = Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    })
    run.start()
    return () => run.stop()
  }, [open, reduce, turn])

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] })
  const rule = last && !open ? null : { borderBottomWidth: 1, borderBottomColor: colors.lineSoft }

  return (
    <View ref={box} collapsable={false} style={[open && { backgroundColor: colors.panel2 }, last && open ? null : rule]}>
      <Pressable
        onPress={onToggle}
        android_ripple={ripple(colors.panel3)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}, ${value}`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed && !open ? colors.panel2 : 'transparent' },
        ]}
      >
        <View style={styles.start}>
          {icon ? (
            <View style={[styles.tile, { backgroundColor: open ? colors.panel3 : colors.panel2 }]}>
              <MenuIcon name={icon} color={open ? colors.on : colors.inkSoft} size={17} stroke />
            </View>
          ) : null}
          <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        </View>
        <View style={styles.end}>
          <Text style={[styles.value, { color: open ? colors.on : colors.inkDim }]} numberOfLines={1}>
            {value}
          </Text>
          <Animated.Text style={[styles.chev, { color: colors.inkDim, transform: [{ rotate }] }]}>
            ›
          </Animated.Text>
        </View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  start: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 },
  tile: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 20 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  value: { fontFamily: fonts.ui, fontSize: 15, flexShrink: 1, textAlign: 'right' },
  chev: { fontFamily: fonts.ui, fontSize: 22, lineHeight: 24, width: 12, textAlign: 'center' },
  body: { paddingHorizontal: 15, paddingTop: 2, paddingBottom: 16, gap: 10 },
})
