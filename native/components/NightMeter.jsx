import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { nightProgress } from '../../src/lib/night-progress.js'
import { countedTonightRows } from '../../src/lib/recurrence.js'
import { t } from '../../src/lib/i18n.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { gemMeterStyle } from '../lib/gem-look-tone.js'
import { useTheme } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'
import { goHash } from '../navigation/hash.js'

// Once the bar is full it glows: flaring as the night clears, then resting.
const GLOW_REST = 0.45
// When the bar has about reached a new width, for the glow to wait on.
const FILL_MS = 420
// The bar springs to each new width, passing it by a hair.
const FILL_SPRING = { damping: 14, stiffness: 180, mass: 1 }

// waiting: the "+2 family" chip (peopleWaitingLine), shown beside the count only.
export function NightMeter({ due, we = null, colors, hallOn = false, gemLook = '', celebrate = false, waiting = '' }) {
  const theme = useTheme()
  const gemMeter = gemLook ? gemMeterStyle(gemLook, theme) : null
  const reduce = useReduceMotion()
  const { total, answered, ratio } = nightProgress(due, we)

  // The bar springs to each answer instead of jumping; the last one fills it.
  const fill = useSharedValue(ratio)
  useEffect(() => {
    fill.value = reduce ? ratio : withSpring(ratio, FILL_SPRING)
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
  // A nope is answered for now, so it is counted apart from what is still open.
  // Same rows as the total, or an optional Not yet hides a required open one.
  const nope = countedTonightRows((due || []).filter((row) => row?.lamp && row?.dateIso)).filter((row) => row.answer?.status === 'skip').length
  const open = Math.max(0, left - nope)
  // Counts answers, so it reads as done and left, not as a card position.
  const label = [
    t('tonight.meterDone'),
    nope ? t('tonight.meterNope', { n: nope }) : '',
    open ? t('tonight.meterLeft', { n: open }) : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    // The count opens So far, the same page the streak line opens.
    <Pressable
      onPress={() => goHash('/stats')}
      accessibilityRole="button"
      accessibilityHint={t('stats.title')}
      style={styles.wrap}
      accessibilityLabel={`${t('tonight.meterDoneAria', { n: answered, left: open })}${nope ? `, ${t('tonight.meterNope', { n: nope })}` : ''}${waiting ? `, ${waiting}` : ''}`}>
      <View style={styles.top}>
        {/* Plain text, not RollNumber: its digit moves on the UI thread, which
            the cheer keeps busy, so done lagged the left count by a second. */}
        <Text style={[styles.count, { color: hallOn || done ? colors.on : colors.ink }]} accessible={false}>
          {answered}
        </Text>
        <Text style={[styles.label, { color: colors.inkDim }]}>{label}</Text>
        {waiting ? (
          <View style={[styles.chip, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
            <Text style={[styles.chipText, { color: colors.inkSoft }]} numberOfLines={1}>{waiting}</Text>
          </View>
        ) : null}
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
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 12, width: '100%' },
  // The count is a row of rolling digit columns, so the label sits on its
  // foot instead of a shared baseline.
  top: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
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
    paddingBottom: 8,
  },
  chip: {
    marginLeft: 'auto',
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
  },
  chipText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6 },
  barWrap: { position: 'relative' },
  glow: { ...StyleSheet.absoluteFill, borderRadius: 999 },
  bar: { height: 7, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
})
