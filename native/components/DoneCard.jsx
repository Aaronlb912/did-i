import { useEffect, useState } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { clockWords, weekdayName } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { usePrefs } from '../../src/lib/prefs.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { streakNights, streakParts } from '../../src/lib/streak-copy.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { svgParts } from '../lib/svg-parts.js'
import { RollNumber } from './RollNumber.jsx'
import { fonts } from '../theme.js'
import { missDot } from '../palette.js'

// The night-cleared moment, about 1.2 s: the last card flies, the cheer
// bursts from it and the meter fills to the end and glows (0 ms), the done
// card slides up and settles, then the streak rolls up from yesterday's
// number. Marks wait until it is over.
export const SETTLE_AT = 300
export const COUNT_AT = 640
export const CELEBRATE_MS = 1200
// How far below its place the done card starts.
const SLIDE = 48

/** The done card arriving: a small rise into place, once, when `play`. */
export function CardSettle({ play, children }) {
  const reduce = useReduceMotion()
  const moving = play && !reduce
  const lift = useSharedValue(moving ? 1 : 0)

  useEffect(() => {
    if (!moving) return
    lift.value = withDelay(SETTLE_AT, withSpring(0, { damping: 15, stiffness: 170, mass: 0.9 }))
  }, [lift, moving])

  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, Math.min(1, lift.value)),
    transform: [{ translateY: lift.value * SLIDE }, { scale: 1 - lift.value * 0.05 }],
  }))

  return <Animated.View style={[styles.settle, style]}>{children}</Animated.View>
}

export function FlameIcon({ size = 18, color, core, lit = true }) {
  const parts = svgParts()
  if (!parts) {
    return <View style={{ width: size * 0.6, height: size * 0.8, borderRadius: size, backgroundColor: color, opacity: lit ? 1 : 0.4 }} />
  }
  const { Svg, Path } = parts
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none">
      <Path
        d="M12.6 2.2c.5 3-1.2 4.8-2.7 6.6C8.4 10.6 7 12.4 7 15.1 7 18.4 9.3 21 12 21s5-2.6 5-5.9c0-2.4-1.1-4.3-2.5-5.8-.2 1.4-.9 2.5-2 3 .6-3.9-.3-7.5.1-10.1z"
        fill={color}
        opacity={lit ? 1 : 0.4}
      />
      {lit && core ? (
        <Path
          d="M12 20.2c-1.6 0-2.8-1.3-2.8-3 0-1.6 1-2.6 1.9-3.6.2.9.7 1.5 1.4 1.8-.2-1.5.3-2.8 1.1-3.6.4 1.4 1.2 2.5 1.2 4 0 2-1.2 4.4-2.8 4.4z"
          fill={core}
          opacity={0.22}
        />
      ) : null}
    </Svg>
  )
}

/**
 * "3 nights in a row" with a flame. When `from` is given the flame pops as
 * the card settles and the number rolls up from there to `n` (a first night
 * just lands on 1; "0 nights" is not worth a frame).
 */
export function StreakCount({ n, from = null, colors }) {
  const reduce = useReduceMotion()
  const counting = from !== null && from < n && !reduce
  const [shown, setShown] = useState(counting && from > 0 ? from : n)
  // RollNumber mounts on yesterday's number, then rolls to tonight's.
  const [rolled, setRolled] = useState(counting && from > 0 ? from : n)
  const pop = useSharedValue(1)

  useEffect(() => {
    if (shown === n && rolled !== n) {
      const frame = requestAnimationFrame(() => setRolled(n))
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [n, rolled, shown])

  useEffect(() => {
    if (!counting) {
      setShown(n)
      setRolled(n)
      return undefined
    }
    const timer = setTimeout(() => {
      setShown(n)
      // The burst is hidden from screen readers; the new count is said aloud.
      AccessibilityInfo.announceForAccessibility?.(streakNights(n))
      pop.value = withSequence(
        withTiming(1.22, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 9, stiffness: 220 }),
      )
    }, COUNT_AT)
    return () => clearTimeout(timer)
  }, [counting, n, pop])

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))
  // Until the roll starts the line reads yesterday's count in its own words;
  // then only the number moves.
  const parts = counting && shown === n ? streakParts(n) : null
  const ink = [styles.streakText, { color: colors.ink }]

  return (
    <View style={styles.streak} accessible accessibilityRole="text" accessibilityLabel={streakNights(n)}>
      <Animated.View style={[styles.flame, popStyle]}>
        <FlameIcon size={24} color={colors.on} core={colors.bg} lit={n > 0} />
      </Animated.View>
      {parts ? (
        <View style={styles.streakLine} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {parts.before ? <Text style={ink}>{parts.before}</Text> : null}
          <RollNumber value={rolled} style={ink} accessibilityLabel="" />
          {parts.after ? <Text style={ink}>{parts.after}</Text> : null}
        </View>
      ) : (
        <Text style={ink}>{streakNights(shown)}</Text>
      )}
    </View>
  )
}

function nightState(night, gentle) {
  if (night.empty) return 'a11y.dayNone'
  if (night.on) return 'jewelKey.did'
  if (night.miss && !gentle) return 'later.missed'
  return 'jewelKey.open'
}

/** The last seven nights as dots, tonight last and ringed. A tap on one asks why. */
export function NightWeek({ nights, colors, onNight }) {
  // Gentle mode: a missed night looks like a blank one.
  const prefs = usePrefs()
  const gentle = prefs.gentle === true
  const done = nights.filter((night) => night.on).length
  return (
    <View style={styles.week} accessibilityLabel={t('tonight.weekAria', { n: done })}>
      {nights.map((night) => (
        <Pressable
          key={night.iso}
          style={({ pressed }) => [styles.night, pressed && { opacity: 0.6 }]}
          disabled={!onNight}
          onPress={() => onNight?.(night.iso)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${weekdayName(night.iso, 'long', prefs.locale)}, ${t(nightState(night, gentle))}`}
          accessibilityState={{ selected: night.isToday }}
        >
          <View style={styles.dotWrap}>
            {night.isToday ? <View style={[styles.ring, { borderColor: night.on ? colors.on : colors.line }]} /> : null}
            <View
              style={[
                styles.dot,
                // A night with nothing due is a hollow ring, so it reads as
                // empty on the light card too, not as a missing dot.
                night.empty
                  ? { borderWidth: 1.5, borderColor: colors.line }
                  : night.on
                    ? { backgroundColor: colors.on }
                    : night.miss && !gentle
                      ? missDot(colors)
                      : { backgroundColor: colors.open },
              ]}
            />
          </View>
          <Text maxFontSizeMultiplier={1.4} style={[styles.weekday, { color: night.isToday ? colors.ink : colors.inkDim }]}>
            {weekdayName(night.iso, 'narrow', prefs.locale)}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

// Days 2, 3 and 7 in a row get their own title; every other day keeps the usual one.
export function doneTitleKey(streak) {
  return { 2: 'tonight.doneDay2', 3: 'tonight.doneDay3', 7: 'tonight.doneDay7' }[streak] || ''
}

/** "Tomorrow: 4 questions from 8:00 PM", so done has a next step. */
// streak: today's streak when the first week is still being built (else 0).
export function tomorrowLine({ count, from, next }, streak = 0) {
  if (!count && next) return t('tonight.nextOn', { date: formatBoardDate(next) })
  if (!count) return t('tonight.tomorrowNone')
  const time = from ? clockWords(from) : ''
  const line = count === 1
    ? time ? t('tonight.tomorrowOne', { time }) : t('tonight.tomorrowOneAny')
    : time ? t('tonight.tomorrowMany', { n: count, time }) : t('tonight.tomorrowManyAny', { n: count })
  return streak > 0 && streak < 7 ? `${line} ${t('tonight.tomorrowStake', { n: streak + 1 })}` : line
}

const styles = StyleSheet.create({
  settle: { width: '100%' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, maxWidth: 300 },
  night: { alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 44, minHeight: 44 },
  dotWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  weekday: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.5 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  flame: { width: 24, height: 24, marginLeft: -4, marginRight: -2 },
  streakText: { fontFamily: fonts.uiBold, fontSize: 16, lineHeight: 22 },
  streakLine: { flexDirection: 'row', alignItems: 'center' },
})
