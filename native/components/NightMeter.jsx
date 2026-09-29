import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated'
import { nightProgress } from '../../src/lib/night-progress.js'
import { t } from '../../src/lib/i18n.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { usePop } from '../hooks/usePop.js'
import { gemMeterStyle } from '../lib/gem-look-tone.js'
import { useTheme } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'

// Once the bar is full it glows: flaring as the night clears, then resting.
const GLOW_REST = 0.45
const FILL_MS = 420

export function NightMeter({ due, colors, hallOn = false, gemLook = '', celebrate = false }) {
  const theme = useTheme()
  const gemMeter = gemLook ? gemMeterStyle(gemLook, theme) : null
  const reduce = useReduceMotion()
  const { total, answered, ratio } = nightProgress(due)
  const pop = usePop(answered)
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (reduce || pop !== 'is-pop') return
    scale.setValue(1)
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 140, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start()
  }, [pop, reduce, scale])

  // The bar fills to each answer instead of jumping; the last one fills it.
  const fill = useSharedValue(ratio)
  useEffect(() => {
    fill.value = reduce ? ratio : withTiming(ratio, { duration: FILL_MS, easing: Easing.out(Easing.cubic) })
  }, [fill, ratio, reduce])
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fill.value)) * 100}%` }))

  const full = ratio >= 1
  const glow = useSharedValue(full ? GLOW_REST : 0)
  useEffect(() => {
    if (!full) {
      glow.value = reduce ? 0 : withTiming(0, { duration: 200 })
      return
    }
    if (reduce || !celebrate) {
      glow.value = GLOW_REST
      return
    }
    glow.value = withDelay(
      FILL_MS - 120,
      withSequence(
        withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(GLOW_REST, { duration: 520, easing: Easing.inOut(Easing.quad) }),
      ),
    )
  }, [celebrate, full, glow, reduce])
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }))

  if (!total) return null
  const done = ratio >= 1
  const left = total - answered
  // Counts answers, so it reads as done and left, not as a card position.
  const label = left
    ? `${t('tonight.meterDone')} · ${t('tonight.meterLeft', { n: left })}`
    : t('tonight.meterDone')

  return (
    <View style={styles.wrap} accessible accessibilityLabel={t('tonight.meterDoneAria', { n: answered, left })}>
      <View style={styles.top}>
        <Animated.Text
          style={[
            styles.count,
            { color: hallOn || done ? colors.on : colors.ink, transform: [{ scale }] },
          ]}
        >
          {answered}
        </Animated.Text>
        <Text style={[styles.label, { color: colors.inkDim }]}>{label}</Text>
      </View>
      <View style={styles.barWrap}>
        <Reanimated.View
          pointerEvents="none"
          style={[styles.glow, { boxShadow: `0 0 12px 2px ${colors.on}` }, glowStyle]}
        />
        <View
          style={[
            styles.bar,
            { backgroundColor: colors.open },
            gemMeter ? { borderWidth: 1, borderColor: gemMeter.barBorderColor } : null,
          ]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: answered }}
        >
          <Reanimated.View
            style={[
              styles.fill,
              { backgroundColor: colors.on },
              fillStyle,
              gemMeter
                ? {
                    shadowColor: gemMeter.fillShadowColor,
                    shadowOpacity: 0.85,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 4,
                  }
                : null,
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 12, width: '100%' },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  count: {
    fontFamily: fonts.display,
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 42,
    letterSpacing: -1,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingBottom: 2,
  },
  barWrap: { position: 'relative' },
  glow: { ...StyleSheet.absoluteFill, borderRadius: 999 },
  bar: { height: 7, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
})
