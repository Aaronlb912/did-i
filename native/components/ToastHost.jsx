import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { t } from '../../src/lib/i18n.js'
import { feelTap } from '../../src/lib/native.js'
import { markLabel } from '../../src/lib/achievements.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { goHash } from '../navigation/hash.js'
import { dropToast, useToastQueue } from '../lib/toast-queue.js'
import { launchFlight } from './FlyHost.jsx'
import { fonts } from '../theme.js'
import { RollNumber } from './RollNumber.jsx'
import { KeyButton } from './ui.jsx'

const ENTER = { damping: 24, stiffness: 260, mass: 1 }
const FROM_Y = 90
const OUT_MS = 200
// A toast goes if it is swiped this far sideways, or down by SWIPE_DOWN.
const SWIPE_SIDE = 80
const SWIPE_DOWN = 36
const FLING = 800
// A beat between toasts, so the next reads as a new one.
const GAP_MS = 140
const POP = { damping: 9, stiffness: 320, mass: 1 }
const RING = 26
const RING_LINE = 2.5
const RING_SIZE = 24.5

/**
 * The one toast on screen, above the tab bar. The rest of the queue waits.
 */
export function ToastHost({ colors }) {
  const items = useToastQueue()
  const { overlayBottom: bottom } = useAppInsets()
  const [shown, setShown] = useState(null)
  const [pause, setPause] = useState(false)
  const [landed, setLanded] = useState('')
  const layerRef = useRef(null)

  const head = items[0] || null
  const live = shown ? items.find((item) => item.id === shown.id) || null : null

  useEffect(() => {
    if (shown || pause || !head) return
    setShown(head)
  }, [head, pause, shown])

  const gone = useCallback((id) => {
    dropToast(id)
    setShown(null)
    setPause(true)
  }, [])

  // The kit toast found its badge, `rel` inside a toast `wrapWidth` wide. The
  // layer never moves, so the badge's resting place is the layer's spot plus
  // that offset, wherever the toast is in its slide up.
  const aim = useCallback((item, rel, wrapWidth) => {
    const fly = item.fly
    const layer = layerRef.current
    if (!fly || !layer?.measureInWindow) return
    const key = `${item.id}:${item.rev || 0}`
    layer.measureInWindow((lx, ly, lw) => {
      launchFlight({
        from: fly,
        to: { x: lx + (lw - wrapWidth) / 2 + rel.x + rel.w / 2, y: ly + rel.y + rel.h / 2 },
        art: fly.art,
        size: rel.h,
        onLand: () => setLanded(key),
      })
    })
  }, [])

  useEffect(() => {
    if (!pause) return undefined
    const timer = setTimeout(() => setPause(false), GAP_MS)
    return () => clearTimeout(timer)
  }, [pause])

  if (!shown) return null
  const item = live || shown
  const key = `${item.id}:${item.rev || 0}`
  return (
    <View ref={layerRef} collapsable={false} pointerEvents="box-none" style={[styles.layer, { bottom }]}>
      <Toast
        key={key}
        item={item}
        live={Boolean(live)}
        colors={colors}
        onGone={gone}
        onAim={aim}
        landed={landed === key}
      />
    </View>
  )
}

function Toast({ item, live, colors, onGone, onAim, landed }) {
  const reduce = useReduceMotion()
  const wrapRef = useRef(null)
  const wrapWidth = useRef(0)
  const x = useSharedValue(0)
  const y = useSharedValue(reduce ? 0 : FROM_Y)
  const fade = useSharedValue(reduce ? 0 : 1)
  const leaving = useRef(false)

  const finish = useCallback(() => onGone(item.id), [item.id, onGone])

  const leave = useCallback(
    (dx = 0, dy = FROM_Y) => {
      if (leaving.current) return
      leaving.current = true
      item.onGone?.()
      // The timer, not the animation callback, lets go of the toast, so a
      // fallback without native animation never leaves one on screen.
      setTimeout(finish, OUT_MS + 40)
      const out = { duration: OUT_MS, easing: Easing.in(Easing.quad) }
      if (reduce) {
        fade.value = withTiming(0, { duration: 160 })
        return
      }
      x.value = withTiming(x.value + dx, out)
      y.value = withTiming(Math.max(0, y.value) + dy, out)
      fade.value = withTiming(0, out)
    },
    [fade, finish, item, reduce, x, y],
  )

  useEffect(() => {
    if (reduce) fade.value = withTiming(1, { duration: 160 })
    else y.value = withSpring(0, ENTER)
  }, [fade, reduce, y])

  // Undo lasts until its own clock runs out; the rest for their `ms`.
  useEffect(() => {
    const wait = item.until ? item.until - Date.now() : item.ms || 5200
    const timer = setTimeout(() => leave(), Math.max(400, wait))
    return () => clearTimeout(timer)
  }, [item.until, item.ms, leave])

  useEffect(() => {
    if (!live) leave(0, FROM_Y)
  }, [leave, live])

  const swipeAway = useCallback((dx, dy) => leave(dx, dy), [leave])

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    activeOffsetY: [-12, 12],
    onBegin: () => {
      'worklet'
      cancelAnimation(y)
    },
    onUpdate: (event) => {
      'worklet'
      x.value = event.translationX
      y.value = Math.max(-10, event.translationY)
    },
    onDeactivate: (event) => {
      'worklet'
      const side = Math.abs(x.value) > SWIPE_SIDE || Math.abs(event.velocityX) > FLING
      if (side) {
        scheduleOnRN(swipeAway, (x.value >= 0 ? 1 : -1) * 360, 0)
        return
      }
      if (y.value > SWIPE_DOWN || event.velocityY > FLING) {
        scheduleOnRN(swipeAway, 0, FROM_Y)
        return
      }
      x.value = withSpring(0, ENTER)
      y.value = withSpring(0, ENTER)
    },
  })

  const moving = useAnimatedStyle(() => ({
    opacity: fade.value * (1 - Math.min(0.6, Math.abs(x.value) / 300)),
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }))

  let press
  if (item.kind === 'undo') {
    press = () => {
      item.onPress?.()
      leave(0, FROM_Y)
    }
  } else if (item.kind === 'kit') {
    press = () => {
      goHash('/kit')
      leave(0, FROM_Y)
    }
  } else if (item.kind === 'we') {
    // A Did we someone else finished: opens its card.
    press = () => {
      goHash('/we', { id: item.cardId })
      leave(0, FROM_Y)
    }
  }

  const aimAt = useCallback((rel) => onAim(item, rel, wrapWidth.current), [item, onAim])
  let label
  if (item.kind === 'undo') label = `${item.label} ${item.hint}`
  else if (item.kind === 'kit') label = `${item.name}. ${t('kit.added')}`
  else if (item.kind === 'we' || item.kind === 'done' || !item.kind) label = item.text || t('confirm.done')

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        ref={wrapRef}
        style={[styles.toastWrap, moving]}
        onLayout={(event) => {
          wrapWidth.current = event.nativeEvent.layout.width
        }}
      >
        <Pressable
          onPress={press}
          disabled={!press}
          accessibilityRole={press ? 'button' : undefined}
          accessibilityLabel={label}
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              backgroundColor: colors.panel2,
              borderColor: item.kind === 'error' ? colors.miss : item.kind === 'we' ? colors.we || colors.line : colors.line,
            },
          ]}
        >
          {item.kind === 'undo' ? <UndoBody item={item} colors={colors} reduce={reduce} /> : null}
          {item.kind === 'mark' ? <MarkBody item={item} colors={colors} onOk={() => leave(0, FROM_Y)} /> : null}
          {/* A plain toast (no kind) is just its text. */}
          {item.kind === 'error' || item.kind === 'we' || item.kind === 'done' || !item.kind ? <ErrorBody item={item} colors={colors} /> : null}
          {item.kind === 'kit' ? (
            <KitBody item={item} colors={colors} reduce={reduce} wrapRef={wrapRef} onAim={aimAt} landed={landed} />
          ) : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}

function UndoBody({ item, colors, reduce }) {
  return (
    <>
      <CountdownRing until={item.until} total={item.total} colors={colors} reduce={reduce} />
      <View style={styles.copy}>
        <Text style={[styles.saved, { color: colors.inkSoft }]}>{item.label}</Text>
        <Text style={[styles.hint, { color: colors.ink }]}>{item.hint}</Text>
      </View>
    </>
  )
}

/**
 * A thin ring that empties as the time to undo runs out. Drawn with plain
 * views, two half rings each turning inside its own half, so nothing SVG moves.
 */
function CountdownRing({ until, total, colors, reduce }) {
  const left = () => Math.max(0, Math.min(1, (until - Date.now()) / (total || 1)))
  const share = useSharedValue(left())

  useEffect(() => {
    const now = left()
    share.value = now
    if (!reduce) {
      share.value = withTiming(0, { duration: now * (total || 0), easing: Easing.linear })
      return undefined
    }
    // Under Reduce Motion the ring steps down once a second instead of sliding.
    const timer = setInterval(() => {
      share.value = left()
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until, total, reduce])

  // The arc runs clockwise from the top. The right half shows its first 180
  // degrees and the left half the rest.
  const rightTurn = useAnimatedStyle(() => ({
    transform: [{ rotate: `${45 + Math.min(share.value * 360, 180) - 180}deg` }],
  }))
  const leftTurn = useAnimatedStyle(() => ({
    transform: [{ rotate: `${45 + Math.max(0, share.value * 360 - 180)}deg` }],
  }))
  const half = [styles.halfRing, { borderTopColor: colors.on, borderRightColor: colors.on }]
  return (
    <View style={styles.ring}>
      <View style={[styles.track, { borderColor: colors.line }]} />
      <View style={[styles.clip, styles.clipRight]}>
        <Animated.View style={[half, styles.fromRight, rightTurn]} />
      </View>
      <View style={[styles.clip, styles.clipLeft]}>
        <Animated.View style={[half, leftTurn]} />
      </View>
    </View>
  )
}

function MarkBody({ item, colors, onOk }) {
  const mark = item.mark || {}
  return (
    <>
      <View style={styles.copy}>
        <Text style={[styles.kicker, { color: colors.on }]}>{t('marks.new')}</Text>
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
          {markLabel(mark.id, 'name')}
        </Text>
        {mark.id ? (
          <Text style={[styles.line, { color: colors.inkSoft }]} numberOfLines={2}>
            {markLabel(mark.id, 'line')}
          </Text>
        ) : null}
        {mark.more ? (
          <Text style={[styles.line, { color: colors.inkDim }]}>{t('marks.more', { n: mark.more })}</Text>
        ) : null}
      </View>
      <KeyButton label={t('marks.ok')} colors={colors} onPress={onOk} />
    </>
  )
}

/**
 * A buy, now in the Collection. With a flight on its way the badge still
 * shows the old count, and rolls up with a pop when the item lands on it.
 */
function KitBody({ item, colors, reduce, wrapRef, onAim, landed }) {
  const badgeRef = useRef(null)
  const flying = Boolean(item.fly) && !reduce
  const pop = useSharedValue(1)

  useEffect(() => {
    if (!flying || !landed) return
    feelTap('tick')
    pop.value = withSequence(withTiming(1.28, { duration: 110 }), withSpring(1, POP))
  }, [flying, landed, pop])

  const popping = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))
  const count = flying && !landed ? Math.max(0, item.count - 1) : item.count

  return (
    <>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.line, { color: colors.inkSoft }]} numberOfLines={1}>
          {t('kit.added')}
        </Text>
      </View>
      <Animated.View
        ref={badgeRef}
        collapsable={false}
        style={[styles.kitBadge, { backgroundColor: colors.on }, popping]}
        onLayout={() => {
          if (!flying || !wrapRef.current) return
          badgeRef.current?.measureLayout?.(wrapRef.current, (x, y, w, h) => onAim({ x, y, w, h }), () => {})
        }}
      >
        <RollNumber value={count} reduce={reduce} style={[styles.kitCount, { color: colors.bg }]} />
      </Animated.View>
    </>
  )
}

function ErrorBody({ item, colors }) {
  return (
    <View style={styles.copy}>
      <Text style={[styles.line, styles.error, { color: colors.ink }]} numberOfLines={3}>
        {item.text || t('confirm.done')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 90,
    elevation: 26,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  toastWrap: { width: '100%', maxWidth: 416 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 52,
  },
  ring: { width: RING, height: RING, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  track: { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: RING_LINE },
  clip: { position: 'absolute', top: (RING - RING_SIZE) / 2, width: RING_SIZE / 2, height: RING_SIZE, overflow: 'hidden' },
  clipLeft: { left: (RING - RING_SIZE) / 2 },
  clipRight: { left: RING / 2 },
  // A ring coloured on its top and right sides; turned 45 degrees it is the
  // right half, and each half turns it in or out of view.
  halfRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_LINE,
    borderColor: 'transparent',
  },
  fromRight: { marginLeft: -RING_SIZE / 2 },
  copy: { flex: 1, gap: 2 },
  saved: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
  hint: { fontFamily: fonts.uiSemi, fontSize: 14, lineHeight: 18 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontFamily: fonts.uiBold, fontSize: 15 },
  line: { fontFamily: fonts.ui, fontSize: 13 },
  error: { fontSize: 14, lineHeight: 19 },
  kitBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kitCount: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 18, fontWeight: '700' },
})
