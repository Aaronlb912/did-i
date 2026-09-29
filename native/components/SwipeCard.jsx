import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
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
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { playClick } from '../../src/lib/native.js'
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
import { fonts } from '../theme.js'

const SPRING = { damping: 20, stiffness: 260 }
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
  kicker,
  title,
  stampDid,
  stampNope,
  onDid,
  onNope,
  colors,
  buddy,
  blockDid = false,
  blockNope = false,
  panelStyle,
  gemLook = '',
  demo = false,
  behind = [],
  didLabel = '',
  nopeLabel = '',
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

  // Cards that mount after the first paint come up from one row deeper.
  useEffect(() => {
    shown.current = true
  }, [])

  const tone = gemLook ? gemLookTone(gemLook, theme) : null
  const line = tone?.ring || colors?.line || '#2b3140'
  const glowStyle = gemLook ? gemGlowHostStyle(gemLook, theme) : null
  const face = { kicker, title, stampDid, stampNope, buddy, children }

  const answer = useCallback(
    (way, from) => {
      const now = live.current
      if (way > 0 ? now.blockDid : now.blockNope) return
      const done = way > 0 ? now.onDid : now.onNope
      const host = fly?.host()
      const stack = stackRef.current
      if (demo || !host || !stack) {
        done?.()
        return
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

  const depth = demo ? [] : behind.slice(0, DEPTH_SHOWN)
  const buttons = !demo && (didLabel || nopeLabel)
  const cardProps = { colors, panelStyle, line, reduce, winW, enter: shown.current }

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.railsHost} pointerEvents="none">
        <SwipeEdgeRails pull={pull} colors={colors} winH={winH} didLabel={stampDid} nopeLabel={stampNope} reduce={reduce} />
      </View>
      <View ref={stackRef} style={styles.stack} collapsable={false}>
        {depth
          .map((card, index) => (
            <StackCard key={card.key} depth={index + 1} {...cardProps}>
              {card.kicker ? (
                <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{card.kicker}</Text>
              ) : null}
              <Text style={[faceCardStyles.title, { color: colors.ink }]} numberOfLines={3}>
                {card.title}
              </Text>
            </StackCard>
          ))
          .reverse()}
        <StackCard
          key={topKey}
          depth={0}
          top
          demo={demo}
          pull={pull}
          face={face}
          glowStyle={glowStyle}
          blockDid={blockDid}
          blockNope={blockNope}
          onAnswer={answer}
          accessible={!demo}
          accessibilityLabel={title}
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
            accessibilityState={{ disabled: blockNope }}
            style={({ pressed }) => [
              styles.answer,
              { borderColor: colors.line, backgroundColor: colors.panel2, opacity: blockNope ? 0.4 : pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.answerText, { color: colors.ink }]} numberOfLines={1}>
              {nopeLabel || stampNope}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => tap(1)}
            disabled={blockDid}
            accessibilityRole="button"
            accessibilityState={{ disabled: blockDid }}
            style={({ pressed }) => [
              styles.answer,
              { borderColor: colors.on, backgroundColor: colors.on, opacity: blockDid ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.answerText, { color: colors.bg }]} numberOfLines={1}>
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
  children,
  ...a11y
}) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const grab = useSharedValue(1)
  const height = useSharedValue(0)
  const zone = useSharedValue(0)
  const level = useSharedValue(enter && !reduce ? depth + 1 : depth)

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
        if (next !== 0) scheduleOnRN(playClick)
        zone.value = next
      }
    },
    onDeactivate: (event) => {
      'worklet'
      zone.value = 0
      pull.value = withTiming(0, { duration: 180 })
      const way = event.canceled ? 0 : releaseWay(x.value, event.velocityX, blockDid, blockNope)
      if (way !== 0) {
        scheduleOnRN(onAnswer, way, {
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

  const card = (
    <Animated.View
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
        styles.origin,
        moving,
      ]}
    >
      <View
        style={[
          ...faceCardStyle(colors, panelStyle),
          top ? null : styles.behindCard,
          { borderWidth: 1, borderColor: line },
        ]}
      >
        {top ? <SwipeFace x={x} colors={colors} {...face} /> : children}
      </View>
    </Animated.View>
  )

  return <GestureDetector gesture={pan}>{card}</GestureDetector>
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
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
  behindCard: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-start',
  },
  origin: { transformOrigin: 'bottom' },
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
