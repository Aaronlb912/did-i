import { useEffect, useMemo, useState } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { svgParts } from '../lib/svg-parts.js'
import { holdFor, popsFor } from '../../src/lib/cheer-pops.js'
import { t } from '../../src/lib/i18n.js'
import { useTheme } from '../../src/lib/prefs.js'
import { feelTap } from '../../src/lib/native.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { hallColors, fonts } from '../theme.js'
import { Slot } from './Slot.jsx'

const CHEER_TOP = 3.6 * 16

function toneColor(tone, colors) {
  if (tone === 'gold') return colors.onDeep
  if (tone === 'blue') return colors.late
  if (tone === 'white') return '#fff'
  return colors.on
}

function driftPx(value) {
  const raw = String(value || '1.6rem')
  const n = Number.parseFloat(raw)
  const px = Number.isFinite(n) ? n * 16 : 26
  return raw.includes('-') ? -px : px
}

function ms(value) {
  const n = Number.parseFloat(String(value || '0'))
  return Number.isFinite(n) ? n : 0
}

function remPx(value) {
  const n = Number.parseFloat(String(value || '16'))
  return Number.isFinite(n) ? n * 16 : 24
}

function pct(value, dim) {
  const n = Number.parseFloat(String(value || '50'))
  return (n / 100) * dim
}

function offsetPx(value, dim) {
  const raw = String(value || '0')
  if (raw.includes('rem')) return remPx(raw)
  return pct(raw, dim)
}

function useTimed(delay, duration) {
  const value = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, duration, value])
  return value
}

function Bloom({ delay, size, color }) {
  const progress = useTimed(delay, 950)
  const px = remPx(size)
  const scale = progress.interpolate({ inputRange: [0, 0.55, 0.75, 1], outputRange: [0.15, 1.06, 0.98, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.95, 0.7, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: 3,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

function Pip({ delay, color }) {
  const progress = useTimed(delay, 700)
  const px = remPx('0.85')
  const scale = progress.interpolate({ inputRange: [0, 0.3, 0.45, 1], outputRange: [0.2, 1.3, 1, 0.4] })
  const opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] })
  const translateY = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, -remPx('0.9')] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    />
  )
}

function SparkRay({ delay, rot, len, tone, colors }) {
  const progress = useTimed(delay, 420)
  const height = remPx(len)
  const deg = Number.parseFloat(rot)
  const width = remPx('0.11')
  const scaleY = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.15, 1.15, 0.5] })
  const opacity = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1, 0] })
  const fly = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, height * 0.55] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -width / 2,
        top: 0,
        width,
        height,
        borderRadius: 1,
        backgroundColor: toneColor(tone, colors),
        opacity,
        transform: [{ rotate: `${deg}deg` }, { translateY: fly }, { scaleY }],
      }}
    />
  )
}

function SparkFlash({ delay, color }) {
  const progress = useTimed(delay, 380)
  const px = remPx('2.2')
  const scale = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.2, 1.55, 1.3] })
  const opacity = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 0.85, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

function SparkRing({ delay, size }) {
  const progress = useTimed(delay, 550)
  const px = remPx(size)
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.85)',
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

function Tape({ delay, side, y, fat, colors, stageW, reach }) {
  const progress = useTimed(delay, 900)
  const yPx = Number.parseFloat(y) || 0
  const reachPct = Number.parseFloat(String(reach || '46')) || 46
  const w = Math.min(stageW * (reachPct / 100), remPx('14'))
  const h = fat ? remPx('0.72') : remPx('0.5')
  const scaleX = progress.interpolate({ inputRange: [0, 0.2, 0.3, 0.38, 1], outputRange: [0, 1.12, 0.96, 1, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 1, 0] })
  const translateY = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 26] })
  const tilt = side === 'left' ? -1 : 1
  const rotate = progress.interpolate({
    inputRange: [0, 0.2, 0.3, 0.4, 0.6, 1],
    outputRange: ['0deg', `${-4 * tilt}deg`, `${2 * tilt}deg`, '0deg', '0deg', `${9 * tilt}deg`],
  })
  const edge = remPx('0.2')
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: yPx,
        ...(side === 'left' ? { right: edge } : { left: edge }),
        width: w,
        height: h,
        backgroundColor: fat ? colors.on : colors.ink,
        borderWidth: fat ? 0 : 2,
        borderColor: colors.on,
        opacity,
        // Grow from the side it comes in from, like the web
        // (transform-origin: right/left center), so it whips across.
        transformOrigin: side === 'left' ? 'right center' : 'left center',
        borderRadius: 2,
        transform: [{ translateY }, { rotate }, { scaleX }],
      }}
    />
  )
}

function BoomStem({ delay, color, tall }) {
  const progress = useTimed(delay, 280)
  const w = remPx('0.16')
  const h = remPx(tall || '3.4')
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [remPx('4.2'), 0] })
  const scaleY = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] })
  const opacity = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.4, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        top: 0,
        width: w,
        height: h,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { scaleY }],
      }}
    />
  )
}

function BoomRing({ delay, tone, colors }) {
  const progress = useTimed(delay, 900)
  const px = remPx('0.55')
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 26] })
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 0.8, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: 3,
        borderColor: toneColor(tone, colors),
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

function BoomStreak({ delay, rot, len, tone, colors }) {
  const progress = useTimed(delay, 750)
  const height = remPx(len)
  const deg = Number.parseFloat(rot)
  const width = remPx('0.14')
  const scaleY = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] })
  const opacity = progress.interpolate({
    inputRange: [0, 0.55, 0.62, 0.7, 0.78, 0.86, 1],
    outputRange: [1, 1, 0.35, 1, 0.3, 0.8, 0],
  })
  const sag = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, remPx('1.4')] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -width / 2,
        top: 0,
        width,
        height,
        borderRadius: 1,
        backgroundColor: toneColor(tone, colors),
        opacity,
        transform: [{ translateY: sag }, { rotate: `${deg}deg` }, { scaleY }],
      }}
    />
  )
}

function Star({ delay, x, y, stageW, size, ink, on }) {
  const twinkle = useMemo(() => new Animated.Value(0), [])
  const px = remPx(size || '0.28')
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(twinkle, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(twinkle, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        { iterations: 2 },
      ).start()
    }, delay)
    return () => clearTimeout(timer)
  }, [delay, twinkle])
  const opacity = twinkle.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 1, 1, 0] })
  const scale = twinkle.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.4, 1, 1, 0.4] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: offsetPx(x, stageW) - px / 2,
        top: offsetPx(y, stageW) - px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: ink,
        shadowColor: on,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

function Moon({ delay, color, bg, size }) {
  const progress = useTimed(delay, 1600)
  const px = remPx(size || '3.2')
  const bite = remPx('0.85')
  const translateY = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [remPx('1.8'), 0, -remPx('0.4')] })
  const scale = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.6, 1, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: remPx('0.5') - px / 2,
        top: remPx('-1.8') - px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: color,
        overflow: 'hidden',
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: -bite / 2,
          top: remPx('0.15'),
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: bg,
        }}
      />
    </Animated.View>
  )
}

function Veil({ delay, color, screen, stageW, stageH }) {
  const progress = useTimed(delay, 2000)
  const opacity = progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1, 0] })
  if (screen) {
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: stageW,
          height: stageH,
          backgroundColor: color || 'rgba(8, 10, 14, 0.55)',
          opacity,
        }}
      />
    )
  }
  const w = remPx('14')
  const h = remPx('11')
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: remPx('-5.5') - h / 2,
        left: remPx('-7') - w / 2,
        width: w,
        height: h,
        borderRadius: w / 2,
        backgroundColor: color || 'rgba(8, 10, 14, 0.55)',
        opacity,
      }}
    />
  )
}

function RainDrop({ delay, x, len, fat, stageW, color, ink, fall }) {
  const fallAnim = useMemo(() => new Animated.Value(0), [])
  const opacity = useMemo(() => new Animated.Value(0), [])
  const height = remPx(len)
  const fallPx = remPx(fall || '6.5')
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(fallAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.delay(640),
          Animated.timing(opacity, { toValue: 0, duration: 170, useNativeDriver: true }),
        ]),
      ]),
    ]).start()
  }, [delay, fallAnim, opacity])
  const translateY = fallAnim.interpolate({ inputRange: [0, 1], outputRange: [0, fallPx] })
  // Stretch as it speeds up, then squash flat when it lands.
  const scaleY = fallAnim.interpolate({ inputRange: [0, 0.8, 0.94, 1], outputRange: [0.7, 1.25, 1.25, 0.3] })
  const scaleX = fallAnim.interpolate({ inputRange: [0, 0.94, 1], outputRange: [1, 0.85, 2.2] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: offsetPx(x, stageW) - (fat ? 2.5 : 1.5),
        top: -remPx('3.2'),
        width: fat ? 5 : 3,
        height,
        backgroundColor: fat ? ink : color,
        borderRadius: fat ? 2.5 : 1.5,
        opacity,
        transform: [{ translateY }, { scaleX }, { scaleY }],
      }}
    />
  )
}

// The web bubble's shine is `box-shadow: inset -0.35rem -0.28rem 0` — a solid
// crescent on the lower right. Same shape here: the bubble's circle minus that
// circle shifted up-left, drawn even-odd; the round bubble clips the rest.
function BubbleShine({ px, shine, color }) {
  const parts = svgParts()
  // Inside the 3px border like the web padding box, tucked 1px under it so
  // no seam shows between border and shine.
  const inner = px - 4
  if (!parts || inner <= 0) {
    return (
      <View
        style={{
          position: 'absolute',
          right: shine * 0.4,
          bottom: shine * 0.3,
          width: shine,
          height: shine * 0.8,
          borderRadius: shine,
          backgroundColor: color,
          opacity: 0.35,
        }}
      />
    )
  }
  const { Svg, Path } = parts
  const r = inner / 2
  const dx = remPx('0.35')
  const dy = remPx('0.28')
  const ring = (cx, cy) =>
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`
  return (
    <Svg width={inner} height={inner} style={{ position: 'absolute', left: -1, top: -1 }}>
      <Path d={`${ring(r, r)} ${ring(r - dx, r - dy)}`} fill={color} fillRule="evenodd" />
    </Svg>
  )
}

function Bubble({ delay, x, size, color, stageW, drift, rise }) {
  const riseAnim = useMemo(() => new Animated.Value(0), [])
  const opacity = useMemo(() => new Animated.Value(0), [])
  const px = remPx(size)
  const driftX = driftPx(drift)
  const risePx = remPx(rise || '8')
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(riseAnim, {
          toValue: 1,
          duration: 1850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.95, duration: 220, useNativeDriver: true }),
          Animated.delay(1480),
          Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]),
      ]),
    ]).start()
  }, [delay, opacity, riseAnim])
  const translateY = riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -risePx] })
  const sway = remPx('0.45')
  const translateX = riseAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, driftX * 0.25 + sway, driftX * 0.5 - sway, driftX * 0.75 + sway * 0.6, driftX],
  })
  // Grows as it rises, then swells fast and pops at the top.
  const scale = riseAnim.interpolate({ inputRange: [0, 0.85, 0.93, 1], outputRange: [0.35, 1.1, 1.1, 1.45] })
  const wobbleX = riseAnim.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [1, 1.08, 0.94, 1.06, 0.97, 1] })
  const wobbleY = riseAnim.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [1, 0.93, 1.06, 0.95, 1.03, 1] })
  const shine = px * 0.35
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: offsetPx(x, stageW) - px / 2,
        bottom: -remPx('1'),
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: 3,
        borderColor: color,
        opacity,
        overflow: 'hidden',
        transform: [{ translateX }, { translateY }, { scale }, { scaleX: wobbleX }, { scaleY: wobbleY }],
      }}
    >
      <BubbleShine px={px} shine={shine} color={color} />
    </Animated.View>
  )
}

function Stamp({ delay, rot, color, panel }) {
  const progress = useTimed(delay, 850)
  const deg = Number.parseFloat(rot) || 0
  const scale = progress.interpolate({ inputRange: [0, 0.16, 0.28, 1], outputRange: [2.5, 0.9, 1.06, 1.06] })
  const opacity = progress.interpolate({ inputRange: [0, 0.16, 0.72, 1], outputRange: [0, 1, 1, 0] })
  const shake = progress.interpolate({ inputRange: [0, 0.16, 0.19, 0.22, 0.25, 0.28, 1], outputRange: [0, 0, -4, 4, -2, 0, 0] })
  const ring = remPx('4')
  const ringScale = progress.interpolate({ inputRange: [0, 0.16, 0.5, 1], outputRange: [0.5, 0.5, 1.7, 1.7] })
  const ringOpacity = progress.interpolate({ inputRange: [0, 0.15, 0.17, 0.5, 1], outputRange: [0, 0, 0.6, 0, 0] })
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
    <Animated.View
      style={{
        position: 'absolute',
        left: -ring / 2,
        top: -ring / 2,
        width: ring,
        height: ring,
        borderRadius: ring / 2,
        borderWidth: 3,
        borderColor: color,
        opacity: ringOpacity,
        transform: [{ scale: ringScale }],
      }}
    />
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: remPx('-3.4'),
        top: remPx('-1.6'),
        borderWidth: 5,
        borderColor: color,
        borderRadius: remPx('0.45'),
        backgroundColor: panel,
        paddingHorizontal: remPx('0.9'),
        paddingTop: remPx('0.45'),
        paddingBottom: remPx('0.38'),
        opacity,
        transform: [{ translateX: shake }, { rotate: `${deg}deg` }, { scale }],
      }}
    >
      <Text style={[styles.stampBurst, { color }]}>{t('tonight.swipeDid')}</Text>
    </Animated.View>
    </View>
  )
}

// Length of "M10 27 L26 43 L62 9" in viewBox units, for the draw-on stroke.
const TICK_LEN = Math.hypot(16, 16) + Math.hypot(36, 34)

function Tick({ delay, color, scale }) {
  const parts = svgParts()
  const draw = useMemo(() => new Animated.Value(0), [])
  const AnimatedPath = useMemo(() => (parts ? Animated.createAnimatedComponent(parts.Path) : null), [parts])
  useEffect(() => {
    // SVG props cannot run on the native driver.
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(draw, { toValue: 1, duration: 550, easing: Easing.out(Easing.ease), useNativeDriver: false }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, draw])
  const boxW = remPx('7.2') * (scale || 1)
  const boxH = remPx('5') * (scale || 1)
  const opacity = draw.interpolate({ inputRange: [0, 0.02, 1], outputRange: [0, 1, 1] })
  const pop = draw.interpolate({ inputRange: [0, 0.8, 0.92, 1], outputRange: [0.92, 1, 1.14, 1] })
  const frame = {
    transform: [{ scale: pop }],
    position: 'absolute',
    left: -boxW / 2,
    top: -boxH / 2,
    width: boxW,
    height: boxH,
    opacity,
  }
  if (!AnimatedPath) {
    const thick = Math.max(4, boxH * 0.12)
    return (
      <Animated.View pointerEvents="none" style={frame}>
        <View
          style={{
            position: 'absolute',
            width: boxW * 0.28,
            height: thick,
            left: boxW * 0.14,
            top: boxH * 0.52,
            backgroundColor: color,
            borderRadius: thick,
            transform: [{ rotate: '42deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: boxW * 0.52,
            height: thick,
            left: boxW * 0.3,
            top: boxH * 0.38,
            backgroundColor: color,
            borderRadius: thick,
            transform: [{ rotate: '-48deg' }],
          }}
        />
      </Animated.View>
    )
  }
  const { Svg } = parts
  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [TICK_LEN, 0] })
  return (
    <Animated.View pointerEvents="none" style={frame}>
      <Svg width={boxW} height={boxH} viewBox="0 0 72 50">
        <AnimatedPath
          d="M10 27 L26 43 L62 9"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[TICK_LEN, TICK_LEN]}
          strokeDashoffset={dashOffset}
          fill="none"
        />
      </Svg>
    </Animated.View>
  )
}

function useDanceLoop(delay, duration) {
  const sway = useMemo(() => new Animated.Value(0), [])
  const limb = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const half = duration / 2
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    )
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(limb, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(limb, { toValue: 0, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    )
    let anim = null
    const timer = setTimeout(() => {
      anim = Animated.parallel([bob, wave])
      anim.start()
    }, delay)
    return () => {
      clearTimeout(timer)
      sway.stopAnimation()
      limb.stopAnimation()
      anim?.stop()
    }
  }, [delay, duration, limb, sway])
  return { sway, limb }
}

function Dancer({ delay, hop, color, ink, inkSoft }) {
  const duration = hop === 2 ? 380 : hop === 3 ? 540 : 460
  const { sway, limb } = useDanceLoop(delay, duration)
  const tx = sway.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] })
  const ty = sway.interpolate({ inputRange: [0, 1], outputRange: [0, -18] })
  const rot = sway.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '8deg'] })
  const armL = limb.interpolate({ inputRange: [0, 1], outputRange: ['28deg', '-38deg'] })
  const armR = limb.interpolate({ inputRange: [0, 1], outputRange: ['-38deg', '28deg'] })
  const legL = limb.interpolate({ inputRange: [0, 1], outputRange: ['16deg', '-18deg'] })
  const legR = limb.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '16deg'] })
  const legColor = inkSoft || ink
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.dancer, { transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot }] }]}
    >
      <View style={[styles.dancerHead, { backgroundColor: color }]} />
      <Animated.View style={[styles.dancerArmLeft, { backgroundColor: color, transform: [{ rotate: armL }] }]} />
      <Animated.View style={[styles.dancerArmRight, { backgroundColor: color, transform: [{ rotate: armR }] }]} />
      <View style={[styles.dancerBody, { backgroundColor: ink }]} />
      <Animated.View style={[styles.dancerLegLeft, { backgroundColor: legColor, transform: [{ rotate: legL }] }]} />
      <Animated.View style={[styles.dancerLegRight, { backgroundColor: legColor, transform: [{ rotate: legR }] }]} />
    </Animated.View>
  )
}

const FLIP_W = remPx('3.2')
const FLIP_H = remPx('4.4')
const FLIP_MS = 960
const FLIP_MS_LONG = 1180
const FLIP_EASE = Easing.bezier(0.2, 0.7, 0.3, 1)
const FLIP_LIFT = [remPx('0.6'), -remPx('0.2'), -remPx('1.4')]
const FLIP_FRONT_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: remPx('0.35') },
  shadowOpacity: 0.35,
  shadowRadius: remPx('0.8'),
  elevation: 6,
}
// |cos| over two turns — full width at each face, thin only at the quarter turns.
const FLIP_SPIN_RANGE = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
const FLIP_WIDTH_RANGE = [1, 0.72, 0.06, 0.72, 1, 0.72, 0.06, 0.72, 1]
// Hard face swap at 90° / 270° — no crossfade blink.
const FLIP_FACE_RANGE = [0, 0.249, 0.25, 0.499, 0.5, 0.749, 0.75, 0.999, 1]
const FLIP_FRONT_RANGE = [1, 1, 0, 0, 1, 1, 0, 0, 1]
const FLIP_BACK_RANGE = [0, 0, 1, 1, 0, 0, 1, 1, 0]

function FlipCard({ delay, hops, colors }) {
  const spin = useMemo(() => new Animated.Value(0), [])
  const lift = useMemo(() => new Animated.Value(0), [])
  const fade = useMemo(() => new Animated.Value(0), [])
  const duration = hops >= 3 ? FLIP_MS_LONG : FLIP_MS

  useEffect(() => {
    spin.setValue(0)
    lift.setValue(0)
    fade.setValue(0)
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(spin, { toValue: 1, duration, easing: FLIP_EASE, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 1, duration, easing: FLIP_EASE, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(fade, { toValue: 1, duration: duration * 0.08, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 1, duration: duration * 0.84, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: duration * 0.08, useNativeDriver: true }),
        ]),
      ]),
    ]).start()
  }, [delay, duration, fade, lift, spin])

  const translateY = lift.interpolate({ inputRange: [0, 0.45, 1], outputRange: FLIP_LIFT })
  const scaleX = spin.interpolate({ inputRange: FLIP_SPIN_RANGE, outputRange: FLIP_WIDTH_RANGE })
  const frontOpacity = spin.interpolate({ inputRange: FLIP_FACE_RANGE, outputRange: FLIP_FRONT_RANGE })
  const backOpacity = spin.interpolate({ inputRange: FLIP_FACE_RANGE, outputRange: FLIP_BACK_RANGE })

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.flipCard, { opacity: fade, transform: [{ translateY }] }]}
    >
      <Animated.View style={[styles.flipBody, { transform: [{ scaleX }] }]}>
        <Animated.View
          style={[
            styles.flipFace,
            FLIP_FRONT_SHADOW,
            {
              backgroundColor: colors.on,
              borderColor: colors.onDeep,
              opacity: frontOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.flipFace,
            {
              backgroundColor: colors.panel2,
              borderColor: colors.line,
              opacity: backOpacity,
            },
          ]}
        />
      </Animated.View>
    </Animated.View>
  )
}

function Plane({ delay, from, hop, colors, stageW, stageH }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  const duration = hop === 2 ? 1150 : hop === 3 ? 1500 : 1350
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, duration, progress])
  const left = from === 'right'
  const x = progress.interpolate({
    inputRange: [0, 1],
    outputRange: left ? [stageW * 0.46, -stageW * 0.48] : [-stageW * 0.46, stageW * 0.48],
  })
  const y0 = left ? stageH * 0.22 : stageH * 0.18
  const y1 = left ? -stageH * 0.38 : -stageH * 0.42
  const dip = remPx('1.2')
  const y = progress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [y0, y0 + (y1 - y0) * 0.33 + dip, y0 + (y1 - y0) * 0.66 - dip, y1],
  })
  const rotate = progress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: left ? ['162deg', '176deg', '190deg', '198deg'] : ['-18deg', '4deg', '-10deg', '12deg'],
  })
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.plane, { opacity, transform: [{ translateX: x }, { translateY: y }, { rotate }] }]}
    >
      <View style={[styles.planeBody, { borderLeftColor: colors.on }]} />
      <View style={[styles.planeWing, { borderLeftColor: colors.ink }]} />
    </Animated.View>
  )
}

function Cloud({ delay, color, width }) {
  const progress = useTimed(delay, 2200)
  const w = remPx(width || '6')
  const h = w * 0.42
  const parts = svgParts()
  if (!parts) return null
  const { Svg, Circle, Path } = parts
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.95, 0.95, 0] })
  const scale = progress.interpolate({ inputRange: [0, 0.12, 0.2, 1], outputRange: [0.6, 1.06, 1, 1] })
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, remPx('0.6')] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        // Bottom edge sits just over where the drops start.
        top: -remPx('3.2') - h + remPx('0.5'),
        width: w,
        height: h,
        opacity,
        transform: [{ translateX }, { scale }],
      }}
    >
      <Svg width={w} height={h}>
        <Circle cx={w * 0.3} cy={h * 0.62} r={h * 0.34} fill={color} />
        <Circle cx={w * 0.52} cy={h * 0.42} r={h * 0.42} fill={color} />
        <Circle cx={w * 0.72} cy={h * 0.6} r={h * 0.32} fill={color} />
        <Path d={`M ${w * 0.14} ${h * 0.7} Q ${w * 0.14} ${h * 0.96} ${w * 0.3} ${h * 0.96} L ${w * 0.76} ${h * 0.96} Q ${w * 0.9} ${h * 0.96} ${w * 0.88} ${h * 0.7} Z`} fill={color} />
      </Svg>
    </Animated.View>
  )
}

function Puddle({ delay, color, width, fall }) {
  const scale = useMemo(() => new Animated.Value(0.15), [])
  const opacity = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 300, useNativeDriver: true }),
          Animated.delay(550),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]).start()
  }, [delay, opacity, scale])
  const w = remPx(width || '4.5')
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        // Where the drops land (they start 3.2rem up and fall `fall`).
        top: remPx(fall || '6.5') - remPx('2'),
        width: w,
        height: remPx('0.7'),
        borderRadius: 999,
        backgroundColor: color,
        opacity,
        transform: [{ scaleX: scale }],
      }}
    />
  )
}

function Shoot({ delay, color, len }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [delay, progress])
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] })
  const scaleX = progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] })
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, remPx('12')] })
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, remPx('7')] })
  const w = remPx(len || '4.2')
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: remPx('-2.4'),
        left: remPx('-2.8'),
        width: w,
        height: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scaleX }, { rotate: '28deg' }],
      }}
    />
  )
}

function confettiColor(tone, colors) {
  return tone === 'ink' ? colors.ink : toneColor(tone, colors)
}

function Puff({ delay, size, color }) {
  const progress = useTimed(delay, 450)
  const px = remPx(size || '1.3')
  // Squeeze, then pop: the paper leaves as it opens.
  const scale = progress.interpolate({ inputRange: [0, 0.18, 0.45, 1], outputRange: [0.55, 0.4, 1.35, 1.8] })
  const opacity = progress.interpolate({ inputRange: [0, 0.18, 0.45, 1], outputRange: [0.5, 0.6, 0.4, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

// Same arc as the web keyframes: up fast, then a slow flutter down.
const CONFETTI_T = [0, 0.04, 0.08, 0.16, 0.25, 0.4, 0.55, 0.7, 0.78, 0.85, 1]

function Confetti({ delay, x, y, fall, rot, size, fat, color }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, progress])
  const cx = remPx(x)
  const cy = remPx(y)
  const end = remPx(fall)
  const sway = remPx('0.3')
  const down = (k) => cy + (end - cy) * k
  const w = remPx(size)
  const h = w * (fat ? 0.8 : 0.5)
  const deg = Number.parseFloat(rot) || 0
  const translateX = progress.interpolate({
    inputRange: CONFETTI_T,
    outputRange: [0, cx * 0.1, cx * 0.2, cx * 0.4, cx * 0.6, cx * 0.72, cx * 0.82 + sway, cx * 0.9, cx * 0.93, cx * 0.96 - sway, cx],
  })
  const translateY = progress.interpolate({
    inputRange: CONFETTI_T,
    outputRange: [0, cy * 0.28, cy * 0.54, cy * 0.87, cy, down(0.09), down(0.25), down(0.47), down(0.6), down(0.72), end],
  })
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${deg}deg`] })
  const scaleX = progress.interpolate({
    inputRange: [0, 0.08, 0.16, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
    outputRange: [1, 0.6, 1, 0.3, 1, 0.25, 1, 0.35, 1],
  })
  const opacity = progress.interpolate({ inputRange: [0, 0.04, 0.78, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        top: -h / 2,
        width: w,
        height: h,
        borderRadius: 1,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scaleX }],
      }}
    />
  )
}

// Two lobes on a turned square, like the web .di-heart. The square sits a
// little low so the whole heart centers on the pop.
function HeartShape({ px, color, shine = false }) {
  const s = px * 0.585
  return (
    <View
      style={{
        position: 'absolute',
        left: px * 0.2075,
        top: px * 0.25,
        width: s,
        height: s,
        backgroundColor: color,
        transform: [{ rotate: '-45deg' }],
      }}
    >
      <View style={{ position: 'absolute', top: -s / 2, left: 0, width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: 0, left: s / 2, width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />
      {shine ? (
        <View
          style={{
            position: 'absolute',
            top: -s * 0.28,
            left: s * 0.34,
            width: s * 0.32,
            height: s * 0.2,
            borderRadius: s,
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
          }}
        />
      ) : null}
    </View>
  )
}

const HEART_T = [0, 0.08, 0.14, 0.22, 0.3, 0.38, 0.46, 0.54, 0.6, 0.64, 0.72, 0.8, 1]
const HEART_SCALE = [0.2, 0.75, 1.22, 0.92, 1, 0.94, 1.2, 0.97, 1, 0.95, 1.16, 1, 1.02]

function Heart({ delay, size, color }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, progress])
  const px = remPx(size || '3')
  const scale = progress.interpolate({ inputRange: HEART_T, outputRange: HEART_SCALE })
  const translateY = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0, -px * 0.5] })
  const opacity = progress.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      // Fade the heart as one shape; per-child alpha shows the square seam.
      needsOffscreenAlphaCompositing
      renderToHardwareTextureAndroid
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        opacity,
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 7,
        transform: [{ translateY }, { scale }],
      }}
    >
      <HeartShape px={px} color={color} shine />
    </Animated.View>
  )
}

function HeartBit({ delay, x, y, size, color }) {
  const progress = useTimed(delay, 900)
  const px = remPx(size || '0.6')
  const hx = remPx(x)
  const hy = remPx(y)
  const translateX = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, hx, hx] })
  const translateY = progress.interpolate({ inputRange: [0, 0.45, 0.6, 1], outputRange: [0, hy, hy, hy - remPx('0.9')] })
  const scale = progress.interpolate({ inputRange: [0, 0.45, 0.6, 1], outputRange: [0, 1.25, 0.95, 0.9] })
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      needsOffscreenAlphaCompositing
      renderToHardwareTextureAndroid
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <HeartShape px={px} color={color} />
    </Animated.View>
  )
}

// The medal hangs from the top of its ribbon: drop in, swing, settle, lift off.
const MEDAL_T = [0, 0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.84, 1]
const MEDAL_SWING = [16, -12, 9, -6, 3.5, -1.5, 0.5, 0, 0, 0]
const MEDAL_STAR =
  'M20 40.8 L21.53 44.9 L25.9 45.08 L22.47 47.8 L23.64 52.02 L20 49.6 L16.36 52.02 L17.53 47.8 L14.1 45.08 L18.47 44.9 Z'

function MedalArt({ w, h, colors }) {
  const parts = svgParts()
  if (!parts) {
    const disc = w * 0.78
    return (
      <View style={{ width: w, height: h }}>
        <View style={{ position: 'absolute', left: w * 0.3, top: 0, width: w * 0.4, height: h * 0.55, backgroundColor: colors.onDeep }} />
        <View
          style={{
            position: 'absolute',
            left: (w - disc) / 2,
            top: h * 0.734 - disc / 2,
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            borderWidth: 3,
            borderColor: colors.onDeep,
            backgroundColor: colors.on,
          }}
        />
      </View>
    )
  }
  const { Svg, Circle, Ellipse, Path, Polygon } = parts
  return (
    <Svg width={w} height={h} viewBox="0 0 40 64">
      <Polygon points="4,0 15,0 24,36 15,37" fill={colors.late} />
      <Polygon points="25,0 36,0 25,37 16,36" fill={colors.onDeep} />
      <Circle cx="20" cy="47" r="15.5" fill={colors.on} stroke={colors.onDeep} strokeWidth="2.5" />
      <Circle cx="20" cy="47" r="10.5" fill="none" stroke={colors.onDeep} strokeWidth="1.4" opacity="0.6" />
      <Path d={MEDAL_STAR} fill={colors.onDeep} />
      <Ellipse cx="13.5" cy="41" rx="3.2" ry="1.8" fill="#fff" opacity="0.45" transform="rotate(-35 13.5 41)" />
    </Svg>
  )
}

function Medal({ delay, size, swing, colors }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, progress])
  const w = remPx(size || '2.4')
  const h = w * 1.6
  const dir = swing < 0 ? -1 : 1
  const translateY = progress.interpolate({
    inputRange: MEDAL_T,
    outputRange: [-remPx('2.4'), remPx('0.25'), -remPx('0.1'), 0, 0, 0, 0, 0, 0, -remPx('0.5')],
  })
  const rotate = progress.interpolate({
    inputRange: MEDAL_T,
    outputRange: MEDAL_SWING.map((deg) => `${deg * dir}deg`),
  })
  const scale = progress.interpolate({ inputRange: [0, 0.12, 0.2, 0.3, 1], outputRange: [0.6, 1.06, 0.97, 1, 0.96] })
  const opacity = progress.interpolate({ inputRange: [0, 0.08, 0.84, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        top: -h * 0.734,
        width: w,
        height: h,
        opacity,
        transformOrigin: 'top center',
        transform: [{ translateY }, { rotate }, { scale }],
      }}
    >
      <MedalArt w={w} h={h} colors={colors} />
    </Animated.View>
  )
}

// A four-point twinkle: two crossed bars that pop, turn, and fade.
function Glint({ delay, x, y, size, color }) {
  const progress = useTimed(delay, 650)
  const px = remPx(size || '0.5')
  const bar = Math.max(2, px * 0.24)
  const scale = progress.interpolate({ inputRange: [0, 0.35, 0.55, 1], outputRange: [0, 1.3, 1, 0] })
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] })
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: remPx(x) - px / 2,
        top: remPx(y) - px / 2,
        width: px,
        height: px,
        opacity,
        transform: [{ rotate }, { scale }],
      }}
    >
      <View style={{ position: 'absolute', left: (px - bar) / 2, top: 0, width: bar, height: px, borderRadius: bar, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: (px - bar) / 2, left: 0, width: px, height: bar, borderRadius: bar, backgroundColor: color }} />
    </Animated.View>
  )
}

const SUN_T = [0, 0.2, 0.3, 0.38, 0.46, 0.82, 1]

function SunRay({ progress, index, rays, size, colors }) {
  const long = index % 2 === 0
  const len = size * (long ? 0.42 : 0.28)
  const w = Math.max(3, size * 0.11)
  const gap = size * 0.62
  const t0 = 0.14 + (index / rays) * 0.12
  const scaleY = progress.interpolate({
    inputRange: [0, t0, t0 + 0.12, t0 + 0.2, 1],
    outputRange: [0, 0, 1.25, 1, 1],
    extrapolate: 'clamp',
  })
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        transform: [{ rotate: `${(360 / rays) * index}deg` }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: -w / 2,
          top: -gap - len,
          width: w,
          height: len,
          borderRadius: w / 2,
          backgroundColor: long ? colors.on : colors.onDeep,
          transformOrigin: 'bottom center',
          transform: [{ scaleY }],
        }}
      />
    </View>
  )
}

function Sun({ delay, size, rays, turn, colors }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, progress])
  const px = remPx(size || '2')
  const count = Math.max(8, Math.floor(Number(rays) || 8))
  const translateY = progress.interpolate({
    inputRange: SUN_T,
    outputRange: [remPx('1.6'), -remPx('0.25'), remPx('0.06'), 0, 0, 0, -remPx('0.3')],
  })
  const scale = progress.interpolate({ inputRange: SUN_T, outputRange: [0.3, 1.12, 0.95, 1.02, 1, 1, 1.08] })
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.82, 1], outputRange: [0, 1, 1, 0] })
  const spin = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['0deg', `${14 * (turn < 0 ? -1 : 1)}deg`, `${50 * (turn < 0 ? -1 : 1)}deg`],
  })
  const shine = px * 0.36
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity, transform: [{ translateY }, { scale }] }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ rotate: spin }] }}>
        {Array.from({ length: count }, (_, i) => (
          <SunRay key={i} progress={progress} index={i} rays={count} size={px} colors={colors} />
        ))}
      </Animated.View>
      <View
        style={{
          position: 'absolute',
          left: -px / 2,
          top: -px / 2,
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: colors.on,
          borderWidth: Math.max(2, px * 0.05),
          borderColor: colors.onDeep,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: px * 0.16,
            top: px * 0.14,
            width: shine,
            height: shine * 0.62,
            borderRadius: shine,
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            transform: [{ rotate: '-30deg' }],
          }}
        />
      </View>
    </Animated.View>
  )
}

function SunGlow({ delay, size, color }) {
  const progress = useTimed(delay, 1400)
  const px = remPx(size || '4')
  const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1, 1.08] })
  const opacity = progress.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.26, 0.2, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  )
}

function Bit({ bit, wait, colors, stageW, stageH, screen = false }) {
  if (bit.screen && !screen) return null
  if (!bit.screen && screen) return null
  const delay = ms(wait) + ms(bit.delay)
  const on = colors.on

  if (bit.bloom) return <Bloom delay={delay} size={bit.size} color={on} />
  if (bit.pip) return <Pip delay={delay} color={on} />
  if (bit.sparkFlash) return <SparkFlash delay={delay} color={on} />
  if (bit.spark) return <SparkRay delay={delay} rot={bit.rot} len={bit.len} tone={bit.tone} colors={colors} />
  if (bit.sparkRing) return <SparkRing delay={delay} size={bit.size} />
  if (bit.tape) {
    return (
      <Tape
        delay={delay}
        side={bit.side}
        y={bit.y}
        fat={bit.fat}
        reach={bit.reach}
        colors={colors}
        stageW={stageW}
      />
    )
  }
  if (bit.streak) return <BoomStreak delay={delay} rot={bit.rot} len={bit.len} tone={bit.tone} colors={colors} />
  if (bit.ring) return <BoomRing delay={delay} tone={bit.tone} colors={colors} />
  if (bit.stem) return <BoomStem delay={delay} color={colors.onDeep} tall={bit.tall} />
  if (bit.star) {
    return (
      <Star
        delay={delay}
        x={bit.x}
        y={bit.y}
        size={bit.size}
        stageW={stageW}
        ink={colors.ink}
        on={on}
      />
    )
  }
  if (bit.veil) {
    return (
      <Veil
        delay={delay}
        color={colors.veil}
        screen={bit.screen}
        stageW={stageW}
        stageH={stageH}
      />
    )
  }
  if (bit.moon) return <Moon delay={delay} color={on} bg={colors.bg} size={bit.size} />
  if (bit.drop) {
    return (
      <RainDrop
        delay={delay}
        x={bit.x}
        len={bit.len}
        fall={bit.fall}
        fat={bit.fat}
        stageW={stageW}
        color={on}
        ink={colors.ink}
      />
    )
  }
  if (bit.cloud) return <Cloud delay={delay} color={colors.inkSoft || on} width={bit.width} />
  if (bit.puddle) return <Puddle delay={delay} color={on} width={bit.width} fall={bit.fall} />
  if (bit.shoot) return <Shoot delay={delay} color={on} len={bit.len} />
  if (bit.bubble) {
    return (
      <Bubble
        delay={delay}
        x={bit.x}
        size={bit.size}
        rise={bit.rise}
        color={on}
        stageW={stageW}
        drift={bit.drift}
      />
    )
  }
  if (bit.stamp) return <Stamp delay={delay} rot={bit.rot} color={on} panel={colors.panel} />
  if (bit.tick) return <Tick delay={delay} color={on} scale={bit.scale} />
  if (bit.dancer) {
    return (
      <Dancer
        delay={delay}
        hop={bit.hop}
        color={on}
        ink={colors.ink}
        inkSoft={colors.inkSoft}
      />
    )
  }
  if (bit.flip) return <FlipCard delay={delay} hops={bit.hops} colors={colors} />
  if (bit.puff) return <Puff delay={delay} size={bit.size} color={on} />
  if (bit.confetti) {
    return (
      <Confetti
        delay={delay}
        x={bit.x}
        y={bit.y}
        fall={bit.fall}
        rot={bit.rot}
        size={bit.size}
        fat={bit.fat}
        color={confettiColor(bit.tone, colors)}
      />
    )
  }
  if (bit.heart) return <Heart delay={delay} size={bit.size} color={on} />
  if (bit.heartBit) return <HeartBit delay={delay} x={bit.x} y={bit.y} size={bit.size} color={toneColor(bit.tone, colors)} />
  if (bit.medal) return <Medal delay={delay} size={bit.size} swing={bit.swing} colors={colors} />
  if (bit.glint) {
    return <Glint delay={delay} x={bit.x} y={bit.y} size={bit.size} color={confettiColor(bit.tone, colors)} />
  }
  if (bit.sunGlow) return <SunGlow delay={delay} size={bit.size} color={on} />
  if (bit.sun) return <Sun delay={delay} size={bit.size} rays={bit.rays} turn={bit.turn} colors={colors} />
  if (bit.plane) return <Plane delay={delay} from={bit.from} hop={bit.hop} colors={colors} stageW={stageW} stageH={stageH} />
  return <Pip delay={delay} color={on} />
}

function Pop({ pop, burstKey, colors, stageW, stageH }) {
  return (
    <View pointerEvents="none" style={[styles.pop, { left: pct(pop.ox, stageW), top: pct(pop.oy, stageH) }]}>
      {pop.bits.map((bit) => (
        <Bit
          key={`${burstKey}-${bit.id}`}
          bit={bit}
          wait={pop.wait}
          colors={colors}
          stageW={stageW}
          stageH={stageH}
        />
      ))}
    </View>
  )
}

export function CheerBurst() {
  const reduce = useReduceMotion()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { overlayBottom: navBottom } = useAppInsets()
  const [burst, setBurst] = useState(null)
  const { width: winW, height: winH } = Dimensions.get('window')
  useEffect(() => {
    function onCheer(event) {
      const preview = Boolean(event.detail?.preview)
      if (reduce && !preview) return
      const kind = event.detail?.kind || 'lime'
      const stage = event.detail?.stage || 1
      const look = event.detail?.look || 'lime'
      const pops = popsFor(kind, stage)
      setBurst({ kind, stage, look, pops, preview, key: Date.now() })
      feelTap(preview ? 'did' : 'hall-on')
    }
    window.addEventListener('did-i-cheer', onCheer)
    return () => window.removeEventListener('did-i-cheer', onCheer)
  }, [reduce])

  useEffect(() => {
    if (!burst) return undefined
    const timer = setTimeout(
      () => setBurst(null),
      holdFor(burst.kind, burst.stage, burst.pops.length),
    )
    return () => clearTimeout(timer)
  }, [burst])

  if ((reduce && !burst?.preview) || !burst?.pops?.length) return null

  const colors = hallColors(burst.look || burst.kind, theme)
  const pops = burst.pops
  const screenPop = pops.find((pop) => pop.bits.some((bit) => bit.screen))
  const stageTop = burst.preview ? insets.top + 12 : insets.top + CHEER_TOP
  const stageH = Math.max(180, winH - stageTop - navBottom)
  const stageW = winW

  const layerStyle = burst.preview ? [styles.layer, styles.layerPreview] : styles.layer

  return (
    <View pointerEvents="none" style={layerStyle} collapsable={false}>
      <Slot key={burst.key}>
        <View style={[styles.stage, { top: stageTop, width: stageW, height: stageH }]}>
          {screenPop
            ? screenPop.bits
                .filter((bit) => bit.screen)
                .map((bit) => (
                  <Bit
                    key={`${burst.key}-screen-${bit.id}`}
                    bit={bit}
                    wait={screenPop.wait}
                    colors={colors}
                    stageW={stageW}
                    stageH={stageH}
                    screen
                  />
                ))
            : null}
          {pops.map((pop, index) => (
            <Pop
              key={`${burst.key}-${index}`}
              pop={pop}
              burstKey={burst.key}
              colors={colors}
              stageW={stageW}
              stageH={stageH}
            />
          ))}
        </View>
      </Slot>
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 120,
    elevation: 30,
  },
  layerPreview: {
    zIndex: 240,
    elevation: 48,
  },
  stage: {
    position: 'absolute',
    left: 0,
    overflow: 'visible',
  },
  pop: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'visible',
  },
  popFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'visible',
  },
  stampBurst: {
    fontFamily: fonts.display,
    fontSize: remPx('2.2'),
    fontWeight: '700',
    letterSpacing: remPx('0.14'),
    textTransform: 'uppercase',
  },
  dancer: {
    position: 'absolute',
    left: remPx('-0.85'),
    top: remPx('-3.4'),
    width: remPx('1.7'),
    height: remPx('3.4'),
  },
  dancerHead: {
    position: 'absolute',
    top: 0,
    left: remPx('0.48'),
    width: remPx('0.74'),
    height: remPx('0.74'),
    borderRadius: remPx('0.37'),
  },
  dancerBody: {
    position: 'absolute',
    top: remPx('0.78'),
    left: remPx('0.62'),
    width: remPx('0.46'),
    height: remPx('1.15'),
    borderRadius: 2,
  },
  dancerArmLeft: {
    position: 'absolute',
    top: remPx('0.92'),
    left: remPx('0.22'),
    width: remPx('0.22'),
    height: remPx('0.95'),
    borderRadius: 1,
  },
  dancerArmRight: {
    position: 'absolute',
    top: remPx('0.92'),
    right: remPx('0.22'),
    width: remPx('0.22'),
    height: remPx('0.95'),
    borderRadius: 1,
  },
  dancerLegLeft: {
    position: 'absolute',
    top: remPx('1.85'),
    left: remPx('0.52'),
    width: remPx('0.22'),
    height: remPx('1.15'),
    borderRadius: 1,
  },
  dancerLegRight: {
    position: 'absolute',
    top: remPx('1.85'),
    left: remPx('0.96'),
    width: remPx('0.22'),
    height: remPx('1.15'),
    borderRadius: 1,
  },
  flipCard: {
    position: 'absolute',
    left: remPx('-1.6'),
    top: remPx('-2.2'),
    width: FLIP_W,
    height: FLIP_H,
    overflow: 'visible',
  },
  flipBody: {
    width: FLIP_W,
    height: FLIP_H,
  },
  flipFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FLIP_W,
    height: FLIP_H,
    borderRadius: remPx('0.35'),
    borderWidth: 1,
  },
  plane: {
    position: 'absolute',
    left: remPx('-1.2'),
    top: remPx('-0.55'),
    width: remPx('2.4'),
    height: remPx('1.1'),
  },
  planeBody: {
    position: 'absolute',
    top: remPx('0.28'),
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: remPx('0.32'),
    borderBottomWidth: remPx('0.32'),
    borderLeftWidth: remPx('2.1'),
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  planeWing: {
    position: 'absolute',
    top: remPx('0.42'),
    left: remPx('0.55'),
    width: 0,
    height: 0,
    borderTopWidth: remPx('0.42'),
    borderLeftWidth: remPx('0.85'),
    borderTopColor: 'transparent',
  },
})
