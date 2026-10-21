import { useEffect, useRef, useState } from 'react'
import { BackHandler, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useAccount } from '../../src/lib/account.js'
import { readTour } from '../../src/lib/first-run.js'
import { t } from '../../src/lib/i18n.js'
import { readPrefs } from '../../src/lib/prefs.js'
import { TOUR_PARTS } from '../../src/lib/tour-steps.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useHallColors } from '../hooks/useHallColors.js'
import {
  claimPendingTour,
  moreNudgeDue,
  startMoreNudge,
  startTour,
  tourActive,
  tourBegin,
  tourClose,
  tourMore,
  tourNext,
  tourRetry,
  tourSkip,
  tourWidgetNext,
  useTour,
} from '../lib/tour.js'
import { fonts, radius } from '../theme.js'
import { whenNoSheet } from './SheetHost.jsx'
import { firstSwipeDue } from './FirstSwipe.jsx'
import { DidButton, KeyButton } from './ui.jsx'

const TODAY = new Set(['/', '/home', '/tonight'])
const BOOT_WAIT = 3000
const PAD = 6
const BUBBLE_MAX = 380

// A soft dot that sweeps across the card, the same pretend thumb as FirstSwipe.
// Reduced motion keeps it still in the middle.
function Hand({ rect, colors }) {
  const reduce = useReduceMotion()
  const sweep = useSharedValue(0)
  useEffect(() => {
    if (reduce) {
      sweep.value = 0
      return undefined
    }
    sweep.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }), -1, true)
    return () => cancelAnimation(sweep)
  }, [reduce, sweep])
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (sweep.value - 0.5) * rect.w * 0.5 }],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hand,
        { left: rect.x + rect.w / 2 - 17, top: rect.y + rect.h / 2 - 17, backgroundColor: colors.on, borderColor: colors.bg },
        style,
      ]}
    />
  )
}

function Dots({ n, at, colors }) {
  return (
    <View style={styles.dots} accessible accessibilityLabel={t('tour.stepOf', { n: at + 1, total: n })}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i === at ? colors.on : colors.line }]} />
      ))}
    </View>
  )
}

function Card({ colors, style, children }) {
  return <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }, style]}>{children}</View>
}

function EndCard({ tour, colors }) {
  const { part, pays, claim, coins } = tour
  const worth = TOUR_PARTS[part].coins
  const paid = pays && !(claim === 'ok' && coins === 0)
  return (
    <Card colors={colors} style={styles.center}>
      <Text style={[styles.title, { color: colors.ink }]}>{paid ? t('tour.endTitle', { n: worth }) : t('tour.endNone')}</Text>
      <Text style={[styles.line, { color: colors.inkSoft }]}>{t(part === 'basics' ? 'tour.endLine' : 'tour.moreEndLine')}</Text>
      {pays && claim === 'signin' ? <Text style={[styles.chip, { color: colors.on, borderColor: colors.on }]}>{t('tour.signIn', { n: worth })}</Text> : null}
      {pays && claim === 'fail' ? (
        <>
          <Text accessibilityRole="alert" style={[styles.line, { color: colors.miss }]}>{t('tour.claimFailed')}</Text>
          <KeyButton colors={colors} label={t('tour.retry')} onPress={tourRetry} />
        </>
      ) : null}
      <View style={styles.buttons}>
        {part === 'basics' ? (
          <>
            <DidButton colors={colors} label={t('tour.showMore')} onPress={tourMore} />
            <KeyButton colors={colors} label={t('tour.later')} onPress={tourClose} />
          </>
        ) : (
          <DidButton colors={colors} label={t('tour.done')} onPress={tourClose} />
        )}
      </View>
    </Card>
  )
}

// The tour overlay. The app shell mounts one (scope "main"); Add is a native
// sheet on iPhone and covers it, so AddScreen mounts a second (scope "add").
// Both read the same runner state and draw only the steps that are theirs.
export function TourHost({ scope = 'main', path = '', hasQuestion = false }) {
  const tour = useTour()
  const colors = useHallColors()
  const account = useAccount()
  const { width, height } = useWindowDimensions()
  const root = useRef(null)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [bubbleH, setBubbleH] = useState(190)
  const main = scope === 'main'
  const mounted = useRef(Date.now())
  const step = TOUR_PARTS[tour.part].steps[tour.index]
  const onAddSheet = Platform.OS === 'ios' && step?.scope === 'add'

  // The start gate: Today, a question, the opening played, no sheet, 3s after boot.
  useEffect(() => {
    if (!main || !TODAY.has(path) || !hasQuestion) return undefined
    if (readPrefs().openingSeen !== true) return undefined
    const first = readTour().basics === 'new'
    if (!first && !moreNudgeDue()) return undefined
    let alive = true
    const due = () => (first ? readTour().basics === 'new' : moreNudgeDue())
    const ok = () => alive && !tourActive() && !firstSwipeDue() && TODAY.has(path) && due()
    const timer = setTimeout(async () => {
      if (!ok()) return
      await whenNoSheet()
      if (!ok()) return
      if (first) startTour('basics', { welcome: true })
      else startMoreNudge()
    }, Math.max(0, BOOT_WAIT - (Date.now() - mounted.current)))
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [main, path, hasQuestion, account.user?.id])

  // Coins from a part finished signed out or offline are claimed once signed in.
  useEffect(() => {
    if (main && account.user && tour.phase === 'idle') claimPendingTour()
  }, [main, account.user, tour.phase])

  useEffect(() => {
    if (!main || tour.phase === 'idle') return undefined
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tour.phase === 'end') tourClose()
      else tourSkip()
      return true
    })
    return () => sub.remove()
  }, [main, tour.phase])

  const mine = onAddSheet
    ? !main && (tour.phase === 'step' || (tour.phase === 'loading' && step?.scope === 'add'))
    : main && tour.phase !== 'idle'
  if (!mine) return null

  const measureRoot = () => root.current?.measureInWindow?.((x, y) => setOrigin({ x, y }))
  const placed = tour.phase === 'step' && tour.rect
    ? { x: tour.rect.x - origin.x - PAD, y: tour.rect.y - origin.y - PAD, w: tour.rect.w + PAD * 2, h: tour.rect.h + PAD * 2 }
    : null
  const steps = TOUR_PARTS[tour.part].steps
  const dotsN = steps.length - tour.skips.length
  const dotsAt = tour.index - tour.skips.filter((i) => i < tour.index).length
  const bubbleW = Math.min(width - 32, BUBBLE_MAX)
  // The bubble goes on the side with room. A target too tall for either side
  // is cut shorter so the bubble never covers it.
  const need = bubbleH + 12
  let rect = placed
  let below = false
  if (placed) {
    const roomBelow = height - (placed.y + placed.h) - 24
    const roomAbove = placed.y - 24
    below = roomBelow >= need || (roomAbove < need && roomBelow >= roomAbove)
    if (roomBelow < need && roomAbove < need) {
      rect = below
        ? { ...placed, h: Math.max(64, height - 24 - need - placed.y) }
        : { ...placed, y: Math.max(placed.y, need + 24), h: Math.max(64, placed.y + placed.h - Math.max(placed.y, need + 24)) }
    }
  }
  const bubbleTop = rect ? (below ? rect.y + rect.h + 12 : Math.max(24, rect.y - need)) : 0
  const veil = colors.veil

  return (
    <View
      ref={root}
      collapsable={false}
      onLayout={measureRoot}
      style={styles.fill}
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      {tour.phase === 'loading' || tour.phase === 'tip' ? (
        <View style={[styles.fill, styles.loadFill]}>
          <KeyButton colors={colors} label={t('tour.skip')} onPress={tourSkip} />
        </View>
      ) : null}

      {tour.phase === 'welcome' ? (
        <View style={[styles.fill, styles.centerFill, { backgroundColor: veil }]}>
          <Card colors={colors} style={styles.center}>
            <Text style={[styles.title, { color: colors.ink }]}>{t(tour.part === 'more' ? 'tour.moreWelcomeTitle' : 'tour.welcomeTitle')}</Text>
            <Text style={[styles.line, { color: colors.inkSoft }]}>{t(tour.part === 'more' ? 'tour.moreWelcomeLine' : 'tour.welcomeLine')}</Text>
            <Text style={[styles.chip, { color: colors.on, borderColor: colors.on }]}>{t('tour.welcomeChip', { n: TOUR_PARTS[tour.part].coins })}</Text>
            <View style={styles.buttons}>
              <DidButton colors={colors} label={t('tour.showMe')} onPress={tourBegin} />
              <KeyButton colors={colors} label={t('tour.notNow')} onPress={tourSkip} />
            </View>
          </Card>
        </View>
      ) : null}

      {tour.phase === 'end' ? (
        <View style={[styles.fill, styles.centerFill, { backgroundColor: veil }]}>
          <EndCard tour={tour} colors={colors} />
        </View>
      ) : null}

      {tour.phase === 'widget' ? (
        <View style={[styles.fill, styles.centerFill, { backgroundColor: veil }]}>
          <Card colors={colors} style={styles.center}>
            <Text style={[styles.title, { color: colors.ink }]}>{t(step.titleKey)}</Text>
            <Text style={[styles.line, { color: colors.inkSoft }]}>{t(step.lineKey)}</Text>
            <Dots n={dotsN} at={dotsAt} colors={colors} />
            <View style={styles.buttons}>
              <DidButton colors={colors} label={t('tour.next')} onPress={() => tourWidgetNext(colors)} />
              <KeyButton colors={colors} label={t('tour.skip')} onPress={tourSkip} />
            </View>
          </Card>
        </View>
      ) : null}

      {rect ? (
        <>
          <View style={[styles.dim, { backgroundColor: veil, left: 0, right: 0, top: 0, height: Math.max(0, rect.y) }]} />
          <View style={[styles.dim, { backgroundColor: veil, left: 0, right: 0, top: rect.y + rect.h, bottom: 0 }]} />
          <View style={[styles.dim, { backgroundColor: veil, left: 0, width: Math.max(0, rect.x), top: rect.y, height: rect.h }]} />
          <View style={[styles.dim, { backgroundColor: veil, left: rect.x + rect.w, right: 0, top: rect.y, height: rect.h }]} />
          {/* The real control stays visible but does not take taps: the tour never sends, answers or buys. */}
          <View
            accessible={false}
            style={[styles.ring, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderColor: colors.on }]}
          />
          <Pressable accessible={false} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />
          {step.hand ? <Hand rect={{ x: rect.x, y: rect.y, w: rect.w, h: rect.h }} colors={colors} /> : null}
          <View
            onLayout={(event) => setBubbleH(Math.ceil(event.nativeEvent.layout.height))}
            style={[styles.bubble, { top: bubbleTop, left: (width - bubbleW) / 2, width: bubbleW, backgroundColor: colors.panel, borderColor: colors.line }]}
          >
            <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">{t(step.titleKey)}</Text>
            <Text style={[styles.line, { color: colors.inkSoft }]}>{t(step.lineKey)}</Text>
            <Dots n={dotsN} at={dotsAt} colors={colors} />
            <View style={styles.buttons}>
              <DidButton colors={colors} label={t('tour.next')} onPress={tourNext} />
              <KeyButton colors={colors} label={t('tour.skip')} onPress={tourSkip} />
            </View>
          </View>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, zIndex: 300, elevation: 60 },
  centerFill: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadFill: { justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 48 },
  dim: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 2, borderRadius: 14 },
  hand: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2, opacity: 0.9 },
  bubble: { position: 'absolute', borderWidth: 1, borderRadius: radius.r, padding: 16, gap: 10 },
  card: { borderWidth: 1, borderRadius: radius.r, padding: 20, gap: 12, width: '100%', maxWidth: BUBBLE_MAX },
  center: { alignItems: 'stretch' },
  title: { fontFamily: fonts.uiBold, fontSize: 18, lineHeight: 24 },
  line: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  chip: {
    alignSelf: 'flex-start',
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttons: { gap: 8, marginTop: 4 },
})
