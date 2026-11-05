import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { SWIPE_THRESHOLD, SWIPE_WAKE } from '../../src/lib/swipe-face.js'
import { t } from '../../src/lib/i18n.js'
import { tourActive } from '../lib/tour.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { feelTap } from '../../src/lib/native.js'
import { useTheme } from '../../src/lib/prefs.js'
import { gemGlowHostStyle, gemLookTone } from '../lib/gem-look-tone.js'
import { SwipeEdgeRails } from './SwipeEdgeRails.jsx'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import {
  DEPTH_PEEK,
  DEPTH_SHOWN,
  RISE_SPRING,
  cardTilt,
  depthLook,
  grabSide,
  releaseWay,
} from '../lib/swipe-motion.js'
import { SwipeFace } from './SwipeFace.jsx'
import { useSwipeFly } from './SwipeFly.jsx'
import { aimCheer } from '../lib/cheer-origin.js'
import { fonts } from '../theme.js'
import { CardFrame } from './frames/CardFrame.jsx'

const SPRING = { damping: 20, stiffness: 260 }

// The selection tick for crossing the Did or nope line.
function feelEdge() {
  feelTap('edge')
}

// Undo sends the answered card back the way it left. The last throw is kept
// here, outside the card, because a night that just cleared unmounts the
// whole stack. flyBackNext() arms it for the next card with that key.
const BACK_SPRING = { damping: 23, stiffness: 210, mass: 1 }
const BACK_WITHIN_MS = 15000
let lastThrow = null
// It comes back a little low, as it left, and rises as it lands.
const BACK_DROP = 40
let comingBack = null

export function flyBackNext() {
  comingBack = lastThrow && Date.now() - lastThrow.at < BACK_WITHIN_MS ? lastThrow : null
  lastThrow = null
}
// The card follows sideways fully and up and down a little, so it feels
// held rather than slid on a rail.
const FOLLOW_Y = 0.35

/**
 * The Tonight stack. The face follows the finger on the UI thread; a flick
 * answers by where it was headed; the answered card is thrown off along its
 * path and the next card grows up out of the stack behind it. Nope and Did
 * buttons below do the same throw for a tap, VoiceOver and TalkBack.
 *
 * Every card keeps its identity by key, so the card behind is the same view
 * that becomes the face and can scale up rather than cut in.
 */
export function SwipeCard({
  cardKey = '',
  head,
  kicker,
  mark,
  title,
  stampDid,
  stampNope,
  onDid,
  onNope,
  colors,
  buddy,
  onEdit,
  blockDid = false,
  blockNope = false,
  panelStyle,
  gemLook = '',
  demo = false,
  behind = [],
  didLabel = '',
  nopeLabel = '',
  // The worn card frame (CardFrame props) or null. Only the top card animates.
  frame = null,
  // Sit at the top of its box instead of the middle (Home's stack, so it lines up with a picked card).
  alignTop = false,
  children,
}) {
  const theme = useTheme()
  const reduce = useReduceMotion()
  const fly = useSwipeFly()
  const { width: winW, height: winH } = useWindowDimensions()
  const pull = useSharedValue(0)
  const stackRef = useRef(null)
  const shown = useRef(false)
  const [thrown, setThrown] = useState('')
  const live = useRef(null)
  live.current = { onDid, onNope, blockDid, blockNope }
  // Two taps before the next render would both answer this card: Did then
  // Not yet would overwrite the Did. One throw per card until it re-renders.
  const threw = useRef({ key: '', at: 0 })

  // Cards that mount after the first paint come up from one row deeper.
  useEffect(() => {
    shown.current = true
  }, [])

  const tone = gemLook ? gemLookTone(gemLook, theme) : null
  const line = tone?.ring || colors?.line || '#2b3140'
  const glowStyle = gemLook ? gemGlowHostStyle(gemLook, theme) : null
  const face = { head, kicker, mark, title, stampDid, stampNope, buddy, onEdit, children }

  const answer = useCallback(
    (way, from) => {
      const now = live.current
      // A refused throw reports false, so the card springs back home.
      if (way > 0 ? now.blockDid : now.blockNope) return false
      // The tour never answers a question.
      if (tourActive()) return false
      if (threw.current.key === cardKey && Date.now() - threw.current.at < 700) return false
      threw.current = { key: cardKey, at: Date.now() }
      const done = way > 0 ? now.onDid : now.onNope
      lastThrow = { key: cardKey, way, at: Date.now() }
      const host = fly?.host()
      const stack = stackRef.current
      if (demo || !host || !stack) {
        done?.()
        return
      }
      // A Did's cheer bursts from where the card sits, not where the finger
      // let go of it, so it plays centred instead of off to the Did side.
      if (way > 0) {
        stack.measureInWindow((x, y, width, height) => {
          if (width > 0) aimCheer(x + width / 2, y + height / 2)
        })
      }
      // Hand the card to the fly layer and save in the same update, so the
      // thrown copy appears exactly where this card was let go.
      stack.measureLayout(
        host,
        (left, top, width, height) => {
          fly.add({
            id: `${cardKey}:${Date.now()}`,
            frame: { left, top, width, height },
            from,
            way,
            reduce,
            winW,
            face,
            colors,
            panelStyle,
            glowStyle,
            line,
          })
          setThrown(cardKey)
          done?.()
        },
        () => done?.(),
      )
    },
    [cardKey, colors, demo, face, fly, glowStyle, line, panelStyle, reduce, winW],
  )

  const tap = useCallback((way) => answer(way, { x: 0, y: 0, vx: 0, vy: 0, grab: 1 }), [answer])

  const actions = [
    ...(blockNope ? [] : [{ name: 'nope', label: nopeLabel || stampNope }]),
    ...(blockDid ? [] : [{ name: 'did', label: didLabel || stampDid }]),
  ]
  function onAction(event) {
    if (event.nativeEvent.actionName === 'did') tap(1)
    if (event.nativeEvent.actionName === 'nope') tap(-1)
  }

  // A card that is answered but stays on top (the same key comes back) is a
  // fresh card rising from behind, not the one that was just thrown.
  const topKey = thrown && thrown === cardKey ? `${cardKey}:again` : cardKey
  useEffect(() => {
    if (thrown && thrown !== cardKey) setThrown('')
  }, [cardKey, thrown])

  // The card that was on top a moment ago keeps its place when it is pushed
  // back down (by an undo) instead of rising again from the back.
  const wasTop = useRef(topKey)
  const lastTop = wasTop.current
  useEffect(() => {
    wasTop.current = topKey
  }, [topKey])
  // After an answer the old card unmounts; a screen reader moves on to the
  // next question instead of falling back to the top of the screen.
  const topRef = useRef(null)
  const firstTop = useRef(true)
  useEffect(() => {
    if (firstTop.current || demo) {
      firstTop.current = false
      return undefined
    }
    let live = true
    const id = setTimeout(() => {
      AccessibilityInfo.isScreenReaderEnabled?.().then((on) => {
        const node = live && on && topRef.current && findNodeHandle(topRef.current)
        if (node) AccessibilityInfo.setAccessibilityFocus(node)
      }).catch(() => {})
    }, 150)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [topKey, demo])
  const back = !demo && comingBack && comingBack.key === topKey ? comingBack.way : 0

  const depth = demo ? [] : behind.slice(0, DEPTH_SHOWN)
  const buttons = !demo && (didLabel || nopeLabel)
  const cardProps = { colors, panelStyle, line, reduce, winW, enter: shown.current, frame: demo ? null : frame }

  return (
    <View style={[styles.host, alignTop ? styles.hostTop : null]} pointerEvents="box-none">
      {/* The rails span the whole screen, so a demo card would draw them over the page it sits in. */}
      {demo ? null : (
        <View style={styles.railsHost} pointerEvents="none">
          <SwipeEdgeRails pull={pull} colors={colors} winH={winH} didLabel={stampDid} nopeLabel={stampNope} reduce={reduce} />
        </View>
      )}
      <View ref={stackRef} style={styles.stack} collapsable={false}>
        {depth
          .map((card, index) => (
            <StackCard key={card.key} depth={index + 1} start={card.key === lastTop ? 0 : undefined} {...cardProps}>
              {card.kicker ? (
                <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{card.kicker}</Text>
              ) : null}
              <Text style={[faceCardStyles.title, { color: colors.ink }]} numberOfLines={3} maxFontSizeMultiplier={2}>
                {card.title}
              </Text>
            </StackCard>
          ))
          .reverse()}
        <StackCard
          key={topKey}
          depth={0}
          back={back}
          top
          demo={demo}
          pull={pull}
          face={face}
          glowStyle={glowStyle}
          blockDid={blockDid}
          blockNope={blockNope}
          onAnswer={answer}
          focusRef={topRef}
          accessible={!demo}
          // The folder above the question is read too, as it is shown.
          accessibilityLabel={[kicker, title].filter(Boolean).join(', ')}
          accessibilityHint={demo ? undefined : t('a11y.swipeHint')}
          accessibilityActions={demo ? undefined : actions}
          onAccessibilityAction={demo ? undefined : onAction}
          {...cardProps}
        />
      </View>
      {buttons ? (
        <View style={[styles.answers, depth.length ? { marginTop: 14 + DEPTH_PEEK * depth.length } : null]}>
          <Pressable
            onPress={() => tap(-1)}
            disabled={blockNope}
            accessibilityRole="button"
            accessibilityLabel={`${nopeLabel || stampNope}: ${title}`}
            accessibilityState={{ disabled: blockNope }}
            style={({ pressed }) => [
              styles.answer,
              { borderColor: colors.line, backgroundColor: colors.panel2, opacity: blockNope ? 0.4 : pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.answerText, { color: colors.ink }]} numberOfLines={2} maxFontSizeMultiplier={2}>
              {nopeLabel || stampNope}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => tap(1)}
            disabled={blockDid}
            accessibilityRole="button"
            accessibilityLabel={`${didLabel || stampDid}: ${title}`}
            accessibilityState={{ disabled: blockDid }}
            style={({ pressed }) => [
              styles.answer,
              { borderColor: colors.on, backgroundColor: colors.on, opacity: blockDid ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.answerText, { color: colors.bg }]} numberOfLines={2} maxFontSizeMultiplier={2}>
              {didLabel || stampDid}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

function StackCard({
  depth,
  enter,
  start,
  back = 0,
  top = false,
  demo = false,
  reduce,
  winW,
  colors,
  panelStyle,
  glowStyle,
  line,
  pull,
  face,
  blockDid = false,
  blockNope = false,
  onAnswer,
  frame = null,
  focusRef,
  children,
  ...a11y
}) {
  const returning = back !== 0 && !reduce
  const x = useSharedValue(returning ? back * winW * 1.3 : 0)
  const y = useSharedValue(returning ? BACK_DROP : 0)
  // While it flies home the card shows no Did or nope stamp: it is not
  // being answered, it is coming back.
  const homing = useSharedValue(returning ? 1 : 0)
  const faceX = useDerivedValue(() => (homing.value ? 0 : x.value))
  const grab = useSharedValue(1)
  const height = useSharedValue(0)
  const zone = useSharedValue(0)
  const throwCard = (way, from) => {
    if (onAnswer(way, from) !== false) return
    x.value = withSpring(0, SPRING)
    y.value = withSpring(0, SPRING)
  }
  const level = useSharedValue(
    reduce ? depth : returning ? 0 : start !== undefined ? start : enter ? depth + 1 : depth,
  )

  // An undone card flies back in from the side it left and lands on top.
  useEffect(() => {
    if (back === 0) return
    comingBack = null
    if (!returning) return
    x.value = withSpring(0, BACK_SPRING, () => {
      homing.value = 0
    })
    y.value = withSpring(0, BACK_SPRING)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    cancelAnimation(level)
    level.value = reduce ? depth : withSpring(depth, RISE_SPRING)
  }, [depth, level, reduce])

  // The sign-in backdrop swings the card both ways on a loop.
  useEffect(() => {
    if (!top || !demo || reduce) return undefined
    const frame = requestAnimationFrame(() => {
      const out = { duration: 780, easing: Easing.out(Easing.cubic) }
      x.value = withRepeat(
        withSequence(
          withDelay(700, withTiming(148, out)),
          withDelay(180, withTiming(0, { duration: 200 })),
          withDelay(480, withTiming(-148, out)),
          withDelay(180, withTiming(0, { duration: 200 })),
          withDelay(620, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      )
    })
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimation(x)
      x.value = 0
    }
  }, [demo, reduce, top, x])

  useAnimatedReaction(
    () => (top && demo ? x.value : null),
    (now) => {
      if (now !== null) pull.value = now
    },
  )

  // Measured from where the finger went down, not from where the pan woke
  // up, so the card stays under the finger instead of lagging by SWIPE_WAKE.
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)

  const pan = usePanGesture({
    enabled: top && !demo,
    activeOffsetX: [-SWIPE_WAKE, SWIPE_WAKE],
    failOffsetY: [-SWIPE_WAKE * 3, SWIPE_WAKE * 3],
    onBegin: (event) => {
      'worklet'
      cancelAnimation(x)
      cancelAnimation(y)
      startX.value = event.absoluteX - x.value
      startY.value = event.absoluteY - y.value / FOLLOW_Y
      grab.value = grabSide(event.y, height.value)
    },
    onUpdate: (event) => {
      'worklet'
      const dx = event.absoluteX - startX.value
      x.value = dx
      y.value = (event.absoluteY - startY.value) * FOLLOW_Y
      pull.value = dx
      const next = dx >= SWIPE_THRESHOLD && !blockDid ? 1 : dx <= -SWIPE_THRESHOLD && !blockNope ? -1 : 0
      if (next !== zone.value) {
        if (next !== 0) scheduleOnRN(feelEdge)
        zone.value = next
      }
    },
    onDeactivate: (event) => {
      'worklet'
      const edged = zone.value
      zone.value = 0
      pull.value = withTiming(0, { duration: 180 })
      const way = event.canceled ? 0 : releaseWay(x.value, event.velocityX, blockDid, blockNope, event.velocityY)
      if (way !== 0 && edged === 0) scheduleOnRN(feelEdge)
      if (way !== 0) {
        scheduleOnRN(throwCard, way, {
          x: x.value,
          y: y.value,
          vx: event.velocityX,
          vy: event.velocityY * FOLLOW_Y,
          grab: grab.value,
        })
        return
      }
      x.value = withSpring(0, { ...SPRING, velocity: event.velocityX })
      y.value = withSpring(0, SPRING)
    },
  })

  const moving = useAnimatedStyle(() => {
    const look = depthLook(level.value)
    return {
      opacity: look.opacity,
      transform: [
        { translateX: x.value },
        { translateY: y.value + look.translateY },
        { scale: look.scale },
        { rotate: `${reduce ? 0 : cardTilt(x.value, winW, grab.value)}deg` },
      ],
    }
  })

  const inner = (
    <View
      style={[
        ...faceCardStyle(colors, panelStyle),
        // The label and question sit in the middle of the card (owner call, 2026-10-06).
        top ? styles.topCard : styles.behindCard,
        { borderWidth: 1, borderColor: line },
      ]}
    >
      {top ? <SwipeFace x={faceX} colors={colors} {...face} /> : children}
    </View>
  )

  const card = (
    <Animated.View
      ref={focusRef}
      {...a11y}
      importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!top}
      pointerEvents={top ? 'auto' : 'none'}
      onLayout={(event) => {
        height.value = event.nativeEvent.layout.height
      }}
      style={[
        top ? styles.face : styles.behind,
        top ? glowStyle : null,
        // The room for the frame goes outside the look's glow, so the glow hugs the card.
        frame?.id ? styles.framed : null,
        styles.origin,
        moving,
      ]}
    >
      {frame?.id ? (
        <CardFrame {...frame} pull={top ? pull : null} active={top && Boolean(frame.active)} style={top ? null : styles.behindFrame}>
          {inner}
        </CardFrame>
      ) : (
        inner
      )}
    </Animated.View>
  )

  return <GestureDetector gesture={pan}>{card}</GestureDetector>
}

const styles = StyleSheet.create({
  host: {
    // Its own height, not flex: 1, so a tall card makes room instead of
    // spilling over the pills above it.
    flexGrow: 1,
    flexShrink: 0,
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  hostTop: { justifyContent: 'flex-start' },
  railsHost: {
    ...StyleSheet.absoluteFill,
    zIndex: 8,
    overflow: 'visible',
  },
  stack: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  face: {
    zIndex: 1,
  },
  behind: {
    ...StyleSheet.absoluteFill,
  },
  topCard: { justifyContent: 'center' },
  behindCard: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  origin: { transformOrigin: 'bottom' },
  // Room for the frame, so it stays clear of the pills and the week dots.
  framed: { margin: 8 },
  behindFrame: { flex: 1 },
  answers: { flexDirection: 'row', gap: 12, marginTop: 14 },
  answer: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  answerText: { fontFamily: fonts.uiBold, fontSize: 16 },
})
