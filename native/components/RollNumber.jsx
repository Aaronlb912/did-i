import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { rollColumns, rollStops } from '../lib/roll-digits.js'

const SPRING = { damping: 20, stiffness: 220, mass: 1 }
// The ones roll first, each column after the one to its right.
const STAGGER = 60
// A column that is only blank after a roll folds away once the roll is over.
const FOLD_MS = 900

// A blank, 0-9, then a blank and 0-9 again, so a roll can wrap forward
// (9 to 0 going up) without spinning back through every digit.
const STRIP = [' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * A number whose digits roll to their new value, one column at a time.
 * `style` must carry the text's fontSize and lineHeight; the digits use
 * tabular figures so a column never changes width while it rolls.
 */
export function RollNumber({ value, style, reduce = false, accessibilityLabel }) {
  const flat = StyleSheet.flatten(style) || {}
  const line = flat.lineHeight || Math.round((flat.fontSize || 16) * 1.2)
  const n = Math.max(0, Math.floor(Number(value) || 0))
  const seen = useRef(n)
  const [roll, setRoll] = useState({ from: n, to: n, key: 0 })

  useEffect(() => {
    if (n === seen.current) return undefined
    const from = seen.current
    seen.current = n
    setRoll((prev) => ({ from: reduce ? n : from, to: n, key: prev.key + 1 }))
    if (reduce) return undefined
    const fold = setTimeout(() => setRoll((prev) => (prev.to === n ? { from: n, to: n, key: prev.key } : prev)), FOLD_MS)
    return () => clearTimeout(fold)
  }, [n, reduce])

  const columns = rollColumns(roll.from, roll.to)
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? String(n)}
    >
      {columns.map((col, index) => (
        <Column
          key={columns.length - index}
          col={col}
          order={columns.length - 1 - index}
          rollKey={roll.key}
          up={roll.to >= roll.from}
          line={line}
          style={style}
          reduce={reduce}
        />
      ))}
    </View>
  )
}

function Column({ col, order, rollKey, up, line, style, reduce }) {
  const { from, to, wide } = rollStops(col.from, col.to, up)
  const pos = useSharedValue(from)

  useEffect(() => {
    if (reduce || from === to) {
      pos.value = to
      return
    }
    // Start where the old digit shows, roll to the new one, then settle on
    // the same digit in the first half of the strip.
    pos.value = from
    pos.value = withDelay(order * STAGGER, withSequence(withSpring(wide, SPRING), withTiming(to, { duration: 0 })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey])

  const moving = useAnimatedStyle(() => ({ transform: [{ translateY: -pos.value * line }] }))
  const shown = col.to === ' ' ? col.from : col.to

  return (
    <View style={[styles.col, { height: line }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Text style={[style, styles.digits, styles.hold]}>{shown === ' ' ? '0' : shown}</Text>
      <Animated.View style={[styles.strip, moving]}>
        {STRIP.map((char, index) => (
          <Text key={index} style={[style, styles.digits, { height: line, lineHeight: line }]}>
            {char === ' ' ? '' : char}
          </Text>
        ))}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  col: { overflow: 'hidden', position: 'relative' },
  digits: { fontVariant: ['tabular-nums'], textAlign: 'center' },
  // Sizes the column; the strip draws the digit.
  hold: { opacity: 0 },
  strip: { position: 'absolute', left: 0, right: 0, top: 0 },
})
