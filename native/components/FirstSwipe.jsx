import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { t } from '../../src/lib/i18n.js'
import { readPrefs, writePrefs } from '../../src/lib/prefs.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { fonts, radius } from '../theme.js'

const ease = Easing.bezier(0.2, 0.8, 0.2, 1)

/** True until the opening has played once on this phone. */
export function firstSwipeDue() {
  return readPrefs().openingSeen !== true
}

// The first open: a card rises, a thumb swipes it right to Did, and it flies
// off to show sign-in underneath. Plays once (prefs.openingSeen); a tap ends
// it early, and reduced motion never plays it.
export function FirstSwipe({ colors }) {
  const reduce = useReduceMotion()
  const { width } = useWindowDimensions()
  const [gone, setGone] = useState(() => reduce || !firstSwipeDue())

  const rise = useSharedValue(1)
  const drag = useSharedValue(0)
  const fly = useSharedValue(0)
  const hand = useSharedValue(0)
  const rail = useSharedValue(0)
  const veil = useSharedValue(1)

  useEffect(() => {
    if (gone) return
    // Marked at the start, so closing the app mid-way does not replay it.
    writePrefs({ openingSeen: true })
    rise.value = withTiming(0, { duration: 570, easing: ease })
    hand.value = withSequence(withDelay(780, withTiming(1, { duration: 200 })), withDelay(620, withTiming(0, { duration: 220 })))
    drag.value = withDelay(1000, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }))
    rail.value = withDelay(1150, withTiming(1, { duration: 450, easing: ease }))
    fly.value = withDelay(1600, withTiming(1, { duration: 520, easing: Easing.in(Easing.quad) }))
    veil.value = withDelay(2050, withTiming(0, { duration: 450 }, (ok) => ok && runOnJS(setGone)(true)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cardStyle = useAnimatedStyle(() => ({
    opacity: 1 - rise.value,
    transform: [
      { translateY: rise.value * 260 },
      { translateX: drag.value * 60 + fly.value * width },
      { rotate: `${drag.value * 8 + fly.value * 14}deg` },
    ],
  }))
  const stampStyle = useAnimatedStyle(() => ({ opacity: rail.value }))
  const railStyle = useAnimatedStyle(() => ({
    opacity: rail.value * (1 - fly.value),
    transform: [{ translateX: (1 - rail.value) * 30 }],
  }))
  const handStyle = useAnimatedStyle(() => ({
    opacity: hand.value * 0.7,
    transform: [{ translateX: drag.value * 70 }, { translateY: drag.value * 4 }],
  }))
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }))

  if (gone) return null

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, veilStyle]}>
      <Pressable
        style={styles.fill}
        onPress={() => setGone(true)}
        accessibilityRole="button"
        accessibilityLabel={t('opening.tap')}
      >
        <View style={styles.center}>
          <Animated.View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }, cardStyle]}>
            <Animated.Text style={[styles.stamp, { color: colors.on }, stampStyle]}>{t('tonight.swipeDid')}</Animated.Text>
            <Text style={[styles.kicker, { color: colors.on }]}>{t('home.tonight').toUpperCase()}</Text>
            <Text style={[styles.title, { color: colors.ink }]}>{t('opening.question')}</Text>
          </Animated.View>
          <Animated.View style={[styles.rail, { backgroundColor: colors.on }, railStyle]}>
            <Text style={[styles.railText, { color: colors.bg }]}>{t('tonight.swipeDid')}</Text>
          </Animated.View>
          <Animated.View style={[styles.hand, { backgroundColor: colors.ink }, handStyle]} />
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  card: {
    height: 190,
    borderWidth: 1,
    borderRadius: radius.r + 4,
    padding: 22,
    justifyContent: 'center',
    gap: 10,
  },
  stamp: { position: 'absolute', top: 16, left: 20, fontFamily: fonts.display, fontSize: 15, letterSpacing: 1 },
  kicker: { fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 2 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  rail: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -95,
    width: 46,
    height: 190,
    borderTopLeftRadius: 46,
    borderBottomLeftRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railText: { fontFamily: fonts.display, fontSize: 12, letterSpacing: 1.5, transform: [{ rotate: '-90deg' }] },
  // The pretend thumb: a soft dot that drags the card.
  hand: {
    position: 'absolute',
    left: '42%',
    top: '52%',
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0,
  },
})
