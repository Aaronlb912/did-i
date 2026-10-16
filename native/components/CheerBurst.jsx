import { useEffect, useMemo, useState } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { svgParts } from '../lib/svg-parts.js'
import { takeCheerAim } from '../lib/cheer-origin.js'
import {
  BALL_STRIPE,
  BELL_BODY,
  BELL_LIP,
  BELL_SHADE,
  BELL_SHINE,
  BELL_VIEW,
  BOLT_PATH,
  BOLT_TIP,
  BOLT_VIEW,
  BOUNCE_KEYS,
  BOW_INNER,
  BOW_KNOT,
  BOW_LOOPS,
  BOW_TAILS,
  BUTTERFLY_DOTS,
  BUTTERFLY_FEELERS,
  BUTTERFLY_FLAPS,
  BUTTERFLY_VIEW,
  CLINK_COLORS,
  CRACKLE_PATH,
  DISCO_COLORS,
  DISCO_LATS,
  GIFT_BAND,
  GIFT_BOW,
  GIFT_BOX,
  GIFT_LID,
  GIFT_LID_BAND,
  GIFT_SHADE,
  GIFT_SHINE,
  GIFT_TOP,
  GIFT_VIEW,
  KERNEL_HULL,
  KERNEL_PUFFS,
  KERNEL_SHINE,
  LAUNCH_FLY_MS,
  MUG_BAND,
  MUG_BASE,
  MUG_BODY,
  MUG_COCOA,
  MUG_CX,
  MUG_FOAM,
  MUG_HANDLE,
  MUG_SHINE,
  MUG_VIEW,
  POPCORN_COLORS,
  RIBBON_SWIRL,
  RIBBON_TOP,
  RIBBON_VIEW,
  SNOW_CORE,
  SNOW_PATH,
  SOUND_ARC,
  SPLAT_DRIPS,
  SPLAT_PATH,
  SPLAT_VIEW,
  WING_LOW_L,
  WING_LOW_R,
  WING_UP_L,
  WING_UP_R,
  ROCKET_BODY,
  ROCKET_FINS,
  ROCKET_FLAME,
  ROCKET_VIEW,
  STAR_PATH,
  holdFor,
  popsFor,
  sunRayLayout,
} from '../../src/lib/cheer-pops.js'
import { t } from '../../src/lib/i18n.js'
import { useTheme } from '../../src/lib/prefs.js'
import { feelTap } from '../../src/lib/native.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useAppInsets } from '../hooks/useAppInsets.js'
import { hallColors, fonts } from '../theme.js'
import { Slot } from './Slot.jsx'

const CHEER_TOP = 3.6 * 16
// A real cheer is gone by this long after the tap, so it never sits on the next card.
const REAL_MAX_MS = 1400
const REAL_FADE_MS = 300

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

// leaf: the Leaves cheer. Same flight, a leaf shape, a little slower (like web .di-leaf).
function Confetti({ delay, x, y, fall, rot, size, fat, color, leaf = false }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: leaf ? 1700 : 1500, easing: Easing.linear, useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, progress])
  const cx = remPx(x)
  const cy = remPx(y)
  const end = remPx(fall)
  const sway = remPx('0.3')
  const down = (k) => cy + (end - cy) * k
  const w = remPx(size) * (leaf ? 0.7 : 1)
  const h = leaf ? w * 1.4 : w * (fat ? 0.8 : 0.5)
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
        ...(leaf
          ? { borderTopLeftRadius: w, borderBottomRightRadius: w, borderTopRightRadius: w * 0.15, borderBottomLeftRadius: w * 0.15 }
          : { borderRadius: 1 }),
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scaleX }],
      }}
    />
  )
}

// A paper lantern floats up and sways, like the web .di-lantern.
const LANTERN_T = [0, 0.12, 0.4, 0.7, 1]

function LanternArt({ w, h, colors }) {
  const parts = svgParts()
  if (!parts) {
    return (
      <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: w * 0.7, height: h * 0.64, borderRadius: w * 0.28, backgroundColor: colors.on }} />
      </View>
    )
  }
  // Rounded rects as paths: svgParts has no Rect.
  const { Svg, Path } = parts
  return (
    <Svg width={w} height={h} viewBox="0 0 32 44">
      <Path d="M12.5 2 H19.5 Q21 2 21 3.5 V4.5 Q21 6 19.5 6 H12.5 Q11 6 11 4.5 V3.5 Q11 2 12.5 2 Z" fill={colors.onDeep} />
      <Path d="M14 6 H18 Q27 6 27 15 V25 Q27 34 18 34 H14 Q5 34 5 25 V15 Q5 6 14 6 Z" fill={colors.on} />
      <Path d="M11 7 C8 15 8 25 11 33 M21 7 C24 15 24 25 21 33 M16 6 V34" stroke={colors.onDeep} strokeWidth="1.4" fill="none" opacity="0.7" />
      <Path d="M12.5 34 H19.5 Q21 34 21 35.5 V36.5 Q21 38 19.5 38 H12.5 Q11 38 11 36.5 V35.5 Q11 34 12.5 34 Z" fill={colors.onDeep} />
      <Path d="M16 38 V43" stroke={colors.onDeep} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}

function Lantern({ delay, size, rise, swing, colors }) {
  const progress = useTimed(delay, 1900)
  const w = remPx(size || '2.2')
  const h = w * 1.375
  const up = remPx(rise || '-3.5rem')
  const dir = swing < 0 ? -1 : 1
  const translateY = progress.interpolate({ inputRange: LANTERN_T, outputRange: [remPx('0.6'), 0, up * 0.35, up * 0.7, up] })
  const rotate = progress.interpolate({ inputRange: LANTERN_T, outputRange: ['0deg', `${6 * dir}deg`, `${-5 * dir}deg`, `${4 * dir}deg`, '0deg'] })
  const scale = progress.interpolate({ inputRange: LANTERN_T, outputRange: [0.7, 1, 1, 0.98, 0.92] })
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        top: -h * 0.69,
        width: w,
        height: h,
        opacity,
        shadowColor: colors.on,
        shadowOpacity: 0.6,
        shadowRadius: 10,
        transform: [{ translateY }, { rotate }, { scale }],
      }}
    >
      <LanternArt w={w} h={h} colors={colors} />
    </Animated.View>
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

// Launch, like the web .di-rocket: climbs, fades out where the stars burst.
function Rocket({ delay, rise, size, colors }) {
  const progress = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration: LAUNCH_FLY_MS + 40,
        easing: Easing.bezier(0.45, 0, 0.75, 0.55),
        useNativeDriver: true,
      }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, progress])
  const px = remPx(size || '1.6')
  const h = px * 1.333
  const top = remPx(rise)
  const translateY = progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [remPx('0.6'), 0, top] })
  const scale = progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.7, 1, 0.85] })
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.92, 1], outputRange: [0, 1, 1, 0] })
  const parts = svgParts()
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -h / 2,
        width: px,
        height: h,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      {parts ? (
        <parts.Svg width={px} height={h} viewBox={ROCKET_VIEW}>
          <parts.Path d={ROCKET_FLAME} fill={colors.onDeep} />
          <parts.Path d={ROCKET_FINS} fill={colors.on} />
          <parts.Path d={ROCKET_BODY} fill={colors.ink} />
          <parts.Circle cx={12} cy={12.5} r={2.4} fill={colors.on} />
        </parts.Svg>
      ) : (
        <View style={{ flex: 1, borderRadius: px / 2, backgroundColor: colors.ink }} />
      )}
    </Animated.View>
  )
}

function Smoke({ delay, x, y, size, color }) {
  const progress = useTimed(delay, 900)
  const px = remPx(size || '0.8')
  const sx = remPx(x)
  const sy = remPx(y)
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [sx, sx * 3] })
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [sy, sy + remPx('0.6')] })
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] })
  const opacity = progress.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.35, 0] })
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
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  )
}

function StarBit({ delay, oy, x, y, size, rot, color }) {
  const progress = useTimed(delay, 1100)
  const px = remPx(size || '1')
  const hx = remPx(x)
  const hy = remPx(y)
  const turn = Number.parseFloat(String(rot || '0')) || 0
  const translateX = progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, hx, hx] })
  const translateY = progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, hy, hy + remPx('0.8')] })
  const scale = progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1.1, 0.7] })
  const rotate = progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: ['0deg', `${turn}deg`, `${turn}deg`] })
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.55, 1], outputRange: [0, 1, 1, 0] })
  const parts = svgParts()
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: remPx(oy) - px / 2,
        width: px,
        height: px,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}
    >
      {parts ? (
        <parts.Svg width={px} height={px} viewBox="0 0 24 24">
          <parts.Path d={STAR_PATH} fill={color} />
        </parts.Svg>
      ) : (
        <View style={{ flex: 1, borderRadius: px / 2, backgroundColor: color }} />
      )}
    </Animated.View>
  )
}

function LaunchWord({ delay, oy, size, colors }) {
  const progress = useTimed(delay, 1400)
  const px = remPx(size || '1.5')
  const scale = progress.interpolate({ inputRange: [0, 0.18, 0.3, 1], outputRange: [0.3, 1.15, 1, 1.02] })
  const translateY = progress.interpolate({ inputRange: [0, 0.78, 1], outputRange: [0, 0, -remPx('0.5')] })
  const opacity = progress.interpolate({ inputRange: [0, 0.18, 0.78, 1], outputRange: [0, 1, 1, 0] })
  const w = px * 6
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        top: remPx(oy) - px * 0.6,
        width: w,
        alignItems: 'center',
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.display,
          fontSize: px,
          lineHeight: px * 1.2,
          fontWeight: '800',
          letterSpacing: px * 0.08,
          color: colors.on,
          textShadowColor: colors.bg,
          textShadowRadius: 8,
        }}
      >
        {t('cheer.launch.word')}
      </Text>
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

// Each ray turns inside a box as big as the whole sun, so it pivots on the
// disc's center. A 0x0 wrapper's pivot drifted on the phone.
function SunRay({ progress, index, rays, box, ray, colors }) {
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
        width: box,
        height: box,
        transform: [{ rotate: `${ray.deg}deg` }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: ray.left,
          top: ray.top,
          width: ray.w,
          height: ray.len,
          borderRadius: ray.w / 2,
          backgroundColor: ray.long ? colors.on : colors.onDeep,
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
  const layout = sunRayLayout(px, rays)
  const half = layout.box / 2
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
      <Animated.View
        style={{ position: 'absolute', left: -half, top: -half, width: layout.box, height: layout.box, transform: [{ rotate: spin }] }}
      >
        {layout.rays.map((ray, i) => (
          <SunRay key={i} progress={progress} index={i} rays={layout.count} box={layout.box} ray={ray} colors={colors} />
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

// A gift box pops in, shakes twice and its lid flies off, like the web .di-gift.
const GIFT_T = [0, 0.12, 0.2, 0.26, 0.3, 0.34, 0.38, 0.42, 0.46, 0.5, 0.55, 0.6, 0.82, 1]
const GIFT_SCALE = [0.2, 1.15, 0.95, 1, 1, 1, 1, 1, 1, 1.04, 0.99, 1, 1, 0.9]
const GIFT_TILT = [0, 0, 0, 0, -8, 7, -5, 3, 0, 0, 0, 0, 0, 0]
const LID_T = [0, 0.5, 0.62, 0.78, 1]

function useLinear(delay, duration) {
  const value = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
    ])
    anim.start()
    return () => anim.stop()
  }, [delay, duration, value])
  return value
}

function Gift({ delay, size, swing, colors }) {
  const progress = useLinear(delay, 1700)
  const parts = svgParts()
  const w = remPx(size || '2.6')
  const h = w * 1.1
  const dir = swing < 0 ? -1 : 1
  const scale = progress.interpolate({ inputRange: GIFT_T, outputRange: GIFT_SCALE })
  const rotate = progress.interpolate({ inputRange: GIFT_T, outputRange: GIFT_TILT.map((d) => `${d}deg`) })
  const translateY = progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, 0, remPx('0.4')] })
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.82, 1], outputRange: [0, 1, 1, 0] })
  // The lid with its bow is about 0.75 of the box wide and 0.29 tall (the web
  // fill-box), so these match the web percentages.
  const lidW = w * 0.75
  const lidH = h * 0.29
  const lidX = progress.interpolate({ inputRange: LID_T, outputRange: [0, 0, 0.2 * lidW * dir, 0.55 * lidW * dir, 0.85 * lidW * dir] })
  const lidY = progress.interpolate({ inputRange: LID_T, outputRange: [0, 0, -1.9 * lidH, -2.9 * lidH, -2.4 * lidH] })
  const lidSpin = progress.interpolate({ inputRange: LID_T, outputRange: ['0deg', '0deg', `${20 * dir}deg`, `${45 * dir}deg`, `${75 * dir}deg`] })
  const lidFade = progress.interpolate({ inputRange: [0, 0.78, 1], outputRange: [1, 1, 0] })
  const band = { fill: colors.ink, stroke: colors.onDeep, strokeWidth: 0.8, strokeOpacity: 0.7 }
  let box = null
  let lid = null
  if (parts) {
    const { Svg, Path, Circle } = parts
    box = (
      <Svg width={w} height={h} viewBox={GIFT_VIEW}>
        <Path d={GIFT_BOX} fill={colors.on} />
        <Path d={GIFT_SHADE} fill="#000" fillOpacity={0.22} />
        <Path d={GIFT_BAND} {...band} />
      </Svg>
    )
    lid = (
      <Svg width={w} height={h} viewBox={GIFT_VIEW}>
        <Path d={GIFT_LID} fill={colors.on} />
        <Path d={GIFT_SHINE} stroke="#fff" strokeOpacity={0.4} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        <Path d={GIFT_LID_BAND} {...band} />
        <Path d={GIFT_BOW} {...band} />
        <Circle cx={20} cy={11.5} r={2.4} {...band} />
      </Svg>
    )
  } else {
    box = <View style={{ position: 'absolute', left: w * 0.18, top: h * 0.41, width: w * 0.64, height: h * 0.52, borderRadius: 3, backgroundColor: colors.on }} />
  }
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        top: -h * GIFT_TOP,
        width: w,
        height: h,
        opacity,
        transformOrigin: '50% 70%',
        transform: [{ translateY }, { rotate }, { scale }],
      }}
    >
      {box}
      {lid ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: w,
            height: h,
            opacity: lidFade,
            transformOrigin: '50% 33%',
            transform: [{ translateX: lidX }, { translateY: lidY }, { rotate: lidSpin }],
          }}
        >
          {lid}
        </Animated.View>
      ) : null}
    </Animated.View>
  )
}

// A popcorn kernel: same path as the web .di-kernel, the pop is a squash and bounce.
const KERNEL_T = [0, 0.05, 0.14, 0.3, 0.55, 0.8, 1]
const KERNEL_POP_T = [0, 0.08, 0.15, 0.21, 0.27, 0.33, 1]

function KernelArt({ px, butter }) {
  const parts = svgParts()
  if (!parts) {
    return <View style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: POPCORN_COLORS.puff, borderWidth: 1, borderColor: POPCORN_COLORS.edge }} />
  }
  const { Svg, Path, Circle, Ellipse } = parts
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24">
      <Path d={KERNEL_HULL} fill={POPCORN_COLORS.hull} />
      {KERNEL_PUFFS.map(([cx, cy, r], i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} fill={POPCORN_COLORS.puff} stroke={POPCORN_COLORS.edge} strokeWidth={1.2} />
      ))}
      {KERNEL_PUFFS.map(([cx, cy, r], i) => (
        <Circle key={`in-${i}`} cx={cx} cy={cy} r={r - 0.9} fill={butter && i === 1 ? POPCORN_COLORS.butter : POPCORN_COLORS.puff} />
      ))}
      <Ellipse cx={KERNEL_SHINE[0]} cy={KERNEL_SHINE[1]} rx={KERNEL_SHINE[2]} ry={KERNEL_SHINE[3]} fill="#fff" fillOpacity={0.85} />
    </Svg>
  )
}

function Kernel({ delay, x, y, fall, rot, size, tone }) {
  const progress = useLinear(delay, 1600)
  const px = remPx(size || '1')
  const cx = remPx(x)
  const cy = remPx(y)
  const end = remPx(fall)
  const down = (k) => cy + (end - cy) * k
  const deg = Number.parseFloat(rot) || 0
  const translateX = progress.interpolate({ inputRange: KERNEL_T, outputRange: [0, cx * 0.1, cx * 0.25, cx * 0.6, cx * 0.8, cx * 0.93, cx] })
  const translateY = progress.interpolate({ inputRange: KERNEL_T, outputRange: [0, cy * 0.2, cy * 0.6, cy, down(0.13), down(0.51), end] })
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${deg}deg`] })
  const scaleX = progress.interpolate({ inputRange: KERNEL_POP_T, outputRange: [0.3, 0.3, 1.3, 0.9, 1.04, 1, 1] })
  const scaleY = progress.interpolate({ inputRange: KERNEL_POP_T, outputRange: [0.3, 0.3, 1.12, 1.06, 1.04, 1, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.05, 0.8, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scaleX }, { scaleY }],
      }}
    >
      <KernelArt px={px} butter={tone === 'butter'} />
    </Animated.View>
  )
}

// Winter drop cheers. Each keyframe table matches its web @keyframes in did-i.css.
function paintColor(tone, colors) {
  return tone === 'warm' ? colors.miss : confettiColor(tone, colors)
}

function degs(values, dir = 1) {
  return values.map((d) => `${d * dir}deg`)
}

// Snowflake: spins in, overshoots, flashes and bursts (web .di-flake).
const FLAKE_T = [0, 0.08, 0.3, 0.38, 0.44, 0.48, 0.52, 0.6, 1]

function Snowflake({ delay, x, y, size, turn, color }) {
  const progress = useLinear(delay, 1500)
  const px = remPx(size || '2.6')
  const dir = turn < 0 ? -1 : 1
  const rotate = progress.interpolate({ inputRange: FLAKE_T, outputRange: degs([-200, -143, 12, -5, 0, 0, 0, 0, 0], dir) })
  const scale = progress.interpolate({ inputRange: FLAKE_T, outputRange: [0.2, 0.45, 1.12, 0.95, 1, 1.08, 1.25, 1.45, 1.45] })
  const opacity = progress.interpolate({ inputRange: FLAKE_T, outputRange: [0, 1, 1, 1, 1, 1, 1, 0, 0] })
  const flash = progress.interpolate({ inputRange: [0, 0.42, 0.48, 0.62, 1], outputRange: [0, 0, 0.55, 0, 0] })
  const flashScale = progress.interpolate({ inputRange: [0, 0.42, 0.48, 0.62, 1], outputRange: [0.5, 0.5, 1.1, 1.6, 1.6] })
  const parts = svgParts()
  let art = <View style={{ width: px, height: px, borderRadius: px / 2, borderWidth: 2, borderColor: color }} />
  if (parts) {
    const { Svg, Path } = parts
    art = (
      <Svg width={px} height={px} viewBox="0 0 24 24">
        <Path d={SNOW_PATH} stroke={color} strokeWidth={1.7} strokeLinecap="round" fill="none" />
        <Path d={SNOW_CORE} stroke={color} strokeWidth={1.7} strokeLinejoin="round" fill="none" />
      </Svg>
    )
  }
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: remPx(x || '0') - px / 2,
        top: remPx(y || '0') - px / 2,
        width: px,
        height: px,
        opacity,
        shadowColor: color,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        transform: [{ rotate }, { scale }],
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: -px * 0.05,
          top: -px * 0.05,
          width: px * 1.1,
          height: px * 1.1,
          borderRadius: px * 0.55,
          backgroundColor: color,
          opacity: flash,
          transform: [{ scale: flashScale }],
        }}
      />
      {art}
    </Animated.View>
  )
}

function IceDust({ delay, x, y, size, color }) {
  const progress = useLinear(delay, 750)
  const px = remPx(size || '0.3')
  const dx = remPx(x)
  const dy = remPx(y)
  const translateX = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, dx * 0.8, dx] })
  const translateY = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, dy * 0.8, dy + remPx('0.6')] })
  const scale = progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.4, 1, 0.3] })
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.7, 0.8, 1], outputRange: [0, 1, 0.5, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -px / 2,
        top: -px / 2,
        width: px,
        height: px,
        borderRadius: 1,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate: '45deg' }, { scale }],
      }}
    />
  )
}

// Bell: swings in from its knob and rings with a bounce (web .di-bell).
const BELL_T = [0, 0.1, 0.18, 0.27, 0.29, 0.34, 0.41, 0.43, 0.48, 0.55, 0.57, 0.62, 0.7, 0.78, 0.86, 1]
const BELL_TILT = [-50, -30, 22, -12, -11, 10, -9, -8, 7, -6, -5, 4, -2, 0, 0, 0]
const BELL_SCALE = [0.6, 0.85, 1.05, 1, 1.07, 1, 1, 1.06, 1, 1, 1.05, 1, 1, 1, 1, 0.9]
const CLAPPER_TILT = [0, 0, -14, 10, 8, -12, 10, 8, -9, 8, 6, -5, 3, 0, 0, 0]

function Bell({ delay, size, swing, colors }) {
  const progress = useLinear(delay, 1600)
  const w = remPx(size || '2.6')
  const h = w * 1.1
  const dir = swing < 0 ? -1 : 1
  const rotate = progress.interpolate({ inputRange: BELL_T, outputRange: degs(BELL_TILT, dir) })
  const scale = progress.interpolate({ inputRange: BELL_T, outputRange: BELL_SCALE })
  const clapper = progress.interpolate({ inputRange: BELL_T, outputRange: degs(CLAPPER_TILT, dir) })
  const translateY = progress.interpolate({ inputRange: [0, 0.1, 0.18, 1], outputRange: [-remPx('0.6'), -remPx('0.3'), 0, 0] })
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.86, 1], outputRange: [0, 1, 1, 0] })
  const parts = svgParts()
  let body = <View style={{ position: 'absolute', left: w * 0.2, top: h * 0.14, width: w * 0.6, height: h * 0.72, borderTopLeftRadius: w * 0.3, borderTopRightRadius: w * 0.3, backgroundColor: colors.on }} />
  let ringer = null
  if (parts) {
    const { Svg, Path, Circle } = parts
    body = (
      <Svg width={w} height={h} viewBox={BELL_VIEW}>
        <Path d={BELL_BODY} fill={colors.on} />
        <Path d={BELL_SHADE} fill="#000" fillOpacity={0.2} />
        <Path d={BELL_LIP} fill={colors.onDeep} />
        <Path d={BELL_SHINE} stroke="#fff" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Circle cx={20} cy={4} r={2.4} stroke={colors.onDeep} strokeWidth={1.6} fill="none" />
      </Svg>
    )
    ringer = (
      <Svg width={w} height={h} viewBox={BELL_VIEW}>
        <Path d="M20 30 V37" stroke={colors.onDeep} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={20} cy={40} r={3} fill={colors.onDeep} />
      </Svg>
    )
  }
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -w / 2,
        top: -h / 2,
        width: w,
        height: h,
        opacity,
        transformOrigin: '50% 9%',
        transform: [{ translateY }, { rotate }, { scale }],
      }}
    >
      {ringer ? (
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '50% 13.6%', transform: [{ rotate: clapper }] }}>
          {ringer}
        </Animated.View>
      ) : null}
      {body}
    </Animated.View>
  )
}

function SoundArc({ delay, x, y, size, turn, color }) {
  const progress = useLinear(delay, 550)
  const h = remPx(size || '1.2')
  const w = h / 2
  const dir = turn < 0 ? -1 : 1
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dir * h * 0.5] })
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] })
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] })
  const parts = svgParts()
  if (!parts) return null
  const { Svg, Path } = parts
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: remPx(x) - w / 2, top: remPx(y) - h / 2, width: w, height: h, opacity, transform: [{ translateX }, { scale }] }}
    >
      <View style={{ width: w, height: h, transform: [{ scaleX: dir }] }}>
        <Svg width={w} height={h} viewBox="0 0 12 24">
          <Path d={SOUND_ARC} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
      </View>
    </Animated.View>
  )
}

// Disco: drops in on its line, bobs and turns; the tiles slide past
// inside the round mask, like the web background-position turn.
const DISCO_T = [0, 0.18, 0.26, 0.32, 0.38, 0.84, 1]
const DISCO_TILES = [DISCO_COLORS.hi, DISCO_COLORS.mid, DISCO_COLORS.lo, DISCO_COLORS.mid]

function Disco({ delay, size, turn, colors }) {
  const progress = useLinear(delay, 1800)
  const px = remPx(size || '2.4')
  const dir = turn < 0 ? -1 : 1
  const tile = px / 8
  const translateY = progress.interpolate({ inputRange: DISCO_T, outputRange: [-2.6, 0.22, -0.08, 0.03, 0, 0, -1.8].map((k) => k * px) })
  const opacity = progress.interpolate({ inputRange: [0, 0.06, 0.84, 1], outputRange: [0, 1, 1, 0] })
  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: dir > 0 ? [0, -1.5 * px] : [-1.5 * px, 0] })
  const parts = svgParts()
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity, transform: [{ translateY }] }}>
      <View style={{ position: 'absolute', left: -1, top: -px / 2 - 640 + 1, width: 2, height: 640, backgroundColor: colors.inkSoft, opacity: 0.7 }} />
      <View
        style={{
          position: 'absolute',
          left: -px / 2,
          top: -px / 2,
          width: px,
          height: px,
          borderRadius: px / 2,
          overflow: 'hidden',
          backgroundColor: DISCO_COLORS.mid,
          shadowColor: colors.on,
          shadowOpacity: 0.5,
          shadowRadius: 8,
        }}
      >
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, height: px, flexDirection: 'row', transform: [{ translateX: slide }] }}>
          {Array.from({ length: 20 }, (_, i) => (
            <View key={i} style={{ width: tile, height: px, backgroundColor: DISCO_TILES[i % 4], borderRightWidth: Math.max(1, tile * 0.12), borderColor: DISCO_COLORS.line }} />
          ))}
        </Animated.View>
        {parts ? (
          <parts.Svg width={px} height={px} viewBox="0 0 24 24" style={{ position: 'absolute', left: 0, top: 0 }}>
            <parts.Path d={DISCO_LATS} stroke={DISCO_COLORS.line} strokeWidth={0.8} fill="none" />
          </parts.Svg>
        ) : null}
        <View style={{ position: 'absolute', left: 0, top: 0, width: px, height: px, borderRadius: px / 2, borderWidth: px * 0.09, borderColor: 'rgba(0, 0, 0, 0.28)' }} />
        <View style={{ position: 'absolute', left: px * 0.22, top: px * 0.18, width: px * 0.18, height: px * 0.18, borderRadius: px * 0.09, backgroundColor: 'rgba(255, 255, 255, 0.8)' }} />
      </View>
    </Animated.View>
  )
}

function DiscoSpot({ delay, rot, turn, len, size, color }) {
  const progress = useLinear(delay, 1100)
  const px = remPx(size || '0.7')
  const far = remPx(len)
  const from = Number.parseFloat(rot) || 0
  const sweep = Number(turn) || 0
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: [`${from}deg`, `${from + sweep}deg`] })
  const translateY = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [-far * 0.25, -far * 0.85, -far] })
  const scale = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 1, 1.1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 0.9, 0.85, 0] })
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, transform: [{ rotate }] }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: -px / 2,
          top: -px / 2,
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: color,
          opacity,
          shadowColor: color,
          shadowOpacity: 0.8,
          shadowRadius: px * 0.3,
          transform: [{ translateY }, { scale }],
        }}
      />
    </Animated.View>
  )
}

// Ribbon: a swirl spins in, then pulls into a bow (web .di-ribbon).
const SWIRL_T = [0, 0.12, 0.3, 0.42, 0.5, 1]
const BOW_T = [0, 0.4, 0.47, 0.53, 0.58, 0.64, 0.86, 1]

function Ribbon({ delay, size, turn, colors }) {
  const progress = useLinear(delay, 1600)
  const px = remPx(size || '3')
  const dir = turn < 0 ? -1 : 1
  const swirlTurn = progress.interpolate({ inputRange: SWIRL_T, outputRange: degs([-220, -120, -20, 40, 90, 90], dir) })
  const swirlScale = progress.interpolate({ inputRange: SWIRL_T, outputRange: [0.3, 0.7, 0.92, 0.6, 0.2, 0.2] })
  const swirlFade = progress.interpolate({ inputRange: SWIRL_T, outputRange: [0, 1, 1, 1, 0, 0] })
  const bowScale = progress.interpolate({ inputRange: BOW_T, outputRange: [0, 0, 1.6, 1.2, 1.42, 1.35, 1.35, 1.25] })
  const bowTurn = progress.interpolate({ inputRange: BOW_T, outputRange: degs([0, 0, -8, 6, -3, 0, 0, 0], dir) })
  const bowFade = progress.interpolate({ inputRange: [0, 0.4, 0.47, 0.86, 1], outputRange: [0, 0, 1, 1, 0] })
  const parts = svgParts()
  if (!parts) return <Bloom delay={delay} size={size} color={colors.on} />
  const { Svg, Path } = parts
  const layer = { position: 'absolute', left: 0, top: 0, width: px, height: px, transformOrigin: '50% 46%' }
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -px / 2, top: -px * RIBBON_TOP, width: px, height: px }}>
      <Animated.View style={[layer, { opacity: swirlFade, transform: [{ rotate: swirlTurn }, { scale: swirlScale }] }]}>
        <Svg width={px} height={px} viewBox={RIBBON_VIEW}>
          <Path d={RIBBON_SWIRL} stroke={colors.on} strokeWidth={4.5} strokeLinecap="round" fill="none" />
          <Path d={RIBBON_SWIRL} stroke={colors.onDeep} strokeOpacity={0.55} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View style={[layer, { opacity: bowFade, transform: [{ rotate: bowTurn }, { scale: bowScale }] }]}>
        <Svg width={px} height={px} viewBox={RIBBON_VIEW}>
          <Path d={BOW_TAILS} fill={colors.on} />
          <Path d={BOW_LOOPS} fill={colors.on} />
          <Path d={BOW_INNER} fill={colors.onDeep} fillOpacity={0.55} />
          <Path d={BOW_KNOT} fill={colors.onDeep} />
        </Svg>
      </Animated.View>
    </View>
  )
}

// Clink: a cocoa mug swings in and touches rims with its partner (web .di-cup).
const CUP_T = [0, 0.14, 0.26, 0.3, 0.36, 0.44, 0.52, 0.86, 1]
const CUP_X = [1.9, 1, 0.47, 0.47, 0.66, 0.5, 0.55, 0.55, 0.7]
const CUP_TILT = [-25, -5, 18, 18, 4, 14, 10, 10, 0]
const CUP_Y = [0.4, 0, 0, 0, 0, 0, 0, 0, 0.25]

function Cup({ delay, side, size, colors }) {
  const progress = useLinear(delay, 1600)
  const px = remPx(size || '2.2')
  const dir = side === 'left' ? -1 : 1
  const cup = dir < 0 ? colors.on : colors.late
  const translateX = progress.interpolate({ inputRange: CUP_T, outputRange: CUP_X.map((k) => k * px * dir) })
  const translateY = progress.interpolate({ inputRange: CUP_T, outputRange: CUP_Y.map((k) => k * px) })
  const rotate = progress.interpolate({ inputRange: CUP_T, outputRange: degs(CUP_TILT, -dir) })
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.86, 1], outputRange: [0, 1, 1, 0] })
  const parts = svgParts()
  let art = <View style={{ position: 'absolute', left: px * 0.16, top: px * 0.28, width: px * 0.56, height: px * 0.66, borderRadius: px * 0.12, backgroundColor: cup }} />
  if (parts) {
    const { Svg, Path, Circle, Ellipse } = parts
    art = (
      <Svg width={px} height={px} viewBox={MUG_VIEW}>
        <Path d={MUG_HANDLE} stroke={cup} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Path d={MUG_BODY} fill={cup} />
        <Path d={MUG_BAND} fill="#000" fillOpacity={0.18} />
        <Path d={MUG_SHINE} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Ellipse cx={MUG_COCOA[0]} cy={MUG_COCOA[1]} rx={MUG_COCOA[2]} ry={MUG_COCOA[3]} fill={CLINK_COLORS.cocoa} stroke={cup} strokeWidth={1.2} />
        {MUG_FOAM.map(([cx, cy, r], i) => (
          <Circle key={i} cx={cx} cy={cy} r={r} fill={CLINK_COLORS.foam} />
        ))}
      </Svg>
    )
  }
  // A zero-size pivot at the mug's base; the left mug is the right one mirrored.
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity, transform: [{ translateX }, { translateY }, { rotate }] }}>
      <View
        style={{
          position: 'absolute',
          left: -px * (dir < 0 ? 1 - MUG_CX : MUG_CX),
          top: -px * MUG_BASE,
          width: px,
          height: px,
          transform: dir < 0 ? [{ scaleX: -1 }] : undefined,
        }}
      >
        {art}
      </View>
    </Animated.View>
  )
}

function Fizz({ delay, x, y, rise, size, color }) {
  const progress = useLinear(delay, 900)
  const px = remPx(size || '0.4')
  const up = remPx(rise)
  const t = [0, 0.15, 0.4, 0.7, 0.85, 1]
  const translateX = progress.interpolate({ inputRange: t, outputRange: [0, remPx('0.1'), remPx('0.25'), -remPx('0.2'), 0, 0] })
  const translateY = progress.interpolate({ inputRange: t, outputRange: [0, up * 0.15, up * 0.45, up * 0.8, up * 0.92, up] })
  const scale = progress.interpolate({ inputRange: t, outputRange: [0.3, 1, 1, 1, 1, 1.5] })
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: remPx(x) - px / 2,
        top: remPx(y) - px / 2,
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  )
}

// Ball drop: the pole, then a glowing ball that slides down it and flashes.
function Pole({ delay, size, fall, color }) {
  const progress = useLinear(delay, 1700)
  const px = remPx(size || '1.6')
  const drop = remPx(fall)
  const opacity = progress.interpolate({ inputRange: [0, 0.08, 0.86, 1], outputRange: [0, 0.8, 0.8, 0] })
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity }}>
      <View style={{ position: 'absolute', left: -1, top: -drop - px * 0.7, width: 2, height: drop + px * 1.5, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: -px * 0.45, top: px * 0.73, width: px * 0.9, height: px * 0.14, borderRadius: px * 0.07, backgroundColor: color }} />
    </Animated.View>
  )
}

const DROP_T = [0, 0.08, 0.3, 0.42, 0.46, 0.5, 0.56, 0.62, 0.86, 1]

function DropBall({ delay, size, fall, colors }) {
  const progress = useLinear(delay, 1700)
  const px = remPx(size || '1.6')
  const drop = remPx(fall)
  const translateY = progress.interpolate({ inputRange: DROP_T, outputRange: [-drop, -drop, -drop * 0.4, -drop * 0.08, 0, 0, 0, 0, 0, 0] })
  const scale = progress.interpolate({ inputRange: DROP_T, outputRange: [0.6, 1, 1, 1, 1, 1.18, 0.96, 1, 1, 0.9] })
  const opacity = progress.interpolate({ inputRange: [0, 0.08, 0.86, 1], outputRange: [0, 1, 1, 0] })
  const halo = progress.interpolate({ inputRange: [0, 0.46, 0.5, 0.7, 1], outputRange: [0.12, 0.15, 0.45, 0.2, 0] })
  const flash = progress.interpolate({ inputRange: [0, 0.45, 0.48, 0.62, 1], outputRange: [0, 0, 0.45, 0, 0] })
  const flashScale = progress.interpolate({ inputRange: [0, 0.45, 0.48, 0.62, 1], outputRange: [0.4, 0.4, 1, 1.3, 1.3] })
  const round = (d) => ({ position: 'absolute', left: -d / 2, top: -d / 2, width: d, height: d, borderRadius: d / 2 })
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity, transform: [{ translateY }, { scale }] }}>
      <Animated.View style={[round(px * 2.8), { backgroundColor: colors.on, opacity: flash, transform: [{ scale: flashScale }] }]} />
      <Animated.View style={[round(px * 1.8), { backgroundColor: colors.on, opacity: halo }]} />
      <View
        style={[
          round(px),
          { backgroundColor: colors.on, borderWidth: Math.max(1.5, px * 0.06), borderColor: colors.onDeep, shadowColor: colors.on, shadowOpacity: 0.7, shadowRadius: px * 0.3 },
        ]}
      >
        <View style={{ position: 'absolute', left: px * 0.2, top: px * 0.16, width: px * 0.24, height: px * 0.2, borderRadius: px * 0.12, backgroundColor: 'rgba(255, 255, 255, 0.6)' }} />
      </View>
    </Animated.View>
  )
}

function Beam({ delay, rot, len, size, color }) {
  const progress = useLinear(delay, 700)
  const px = remPx(size || '1.6')
  const h = remPx(len)
  const w = Math.max(2, px * 0.07)
  const scaleY = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1.1, 0.6] })
  const translateY = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, -h * 0.6] })
  const opacity = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1, 0] })
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, transform: [{ rotate: `${Number.parseFloat(rot) || 0}deg` }] }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: -w / 2,
          top: -px * 0.65 - h,
          width: w,
          height: h,
          borderRadius: w / 2,
          backgroundColor: color,
          opacity,
          transformOrigin: 'bottom',
          transform: [{ translateY }, { scaleY }],
        }}
      />
    </View>
  )
}

// Bolt: a window slides down over the still bolt to draw it top to bottom
// (the web clip-path), then it flickers.
function Bolt({ delay, size, colors }) {
  const progress = useLinear(delay, 1200)
  const w = remPx(size || '2')
  const h = w * 2
  const tipX = w * BOLT_TIP[0]
  const wipe = progress.interpolate({ inputRange: [0, 0.1, 1], outputRange: [-h, 0, 0] })
  const hold = progress.interpolate({ inputRange: [0, 0.1, 1], outputRange: [h, 0, 0] })
  const flicker = progress.interpolate({ inputRange: [0, 0.1, 0.14, 0.18, 0.22, 0.26, 0.7, 1], outputRange: [1, 1, 0.35, 1, 0.5, 1, 1, 0] })
  const flash = progress.interpolate({ inputRange: [0, 0.1, 0.35, 1], outputRange: [0, 0.5, 0, 0] })
  const flashScale = progress.interpolate({ inputRange: [0, 0.1, 0.35, 1], outputRange: [0.3, 1, 1.4, 1.4] })
  const f = w * 2.2
  const parts = svgParts()
  const art = parts ? (
    <parts.Svg width={w} height={h} viewBox={BOLT_VIEW}>
      <parts.Path d={BOLT_PATH} fill={colors.on} stroke={colors.ink} strokeOpacity={0.5} strokeWidth={1} strokeLinejoin="round" />
    </parts.Svg>
  ) : (
    <View style={{ position: 'absolute', left: tipX - 2, top: 0, width: 4, height: h, backgroundColor: colors.on }} />
  )
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: -tipX, top: -h, width: w, height: h }}>
      <Animated.View
        style={{ position: 'absolute', left: tipX - f / 2, top: h - f / 2, width: f, height: f, borderRadius: f / 2, backgroundColor: colors.on, opacity: flash, transform: [{ scale: flashScale }] }}
      />
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: flicker, shadowColor: colors.on, shadowOpacity: 0.8, shadowRadius: 6 }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, overflow: 'hidden', transform: [{ translateY: wipe }] }}>
          <Animated.View style={{ width: w, height: h, transform: [{ translateY: hold }] }}>{art}</Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

function Crackle({ delay, rot, len, size, color }) {
  const progress = useLinear(delay, 450)
  const px = remPx(size || '0.8')
  const h = px * (9 / 14)
  const far = remPx(len)
  const translateX = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, far * 0.5, far] })
  const scale = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.8] })
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 0.4, 0.55, 1], outputRange: [0, 1, 0.3, 1, 0] })
  const parts = svgParts()
  if (!parts) return null
  const { Svg, Path } = parts
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, transform: [{ rotate: `${Number.parseFloat(rot) || 0}deg` }] }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: -h / 2, width: px, height: h, opacity, transformOrigin: '0% 50%', transform: [{ translateX }, { scale }] }}>
        <Svg width={px} height={h} viewBox="0 0 14 9">
          <Path d={CRACKLE_PATH} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  )
}

// Splat: a blob flies in from its throw angle, splats with an overshoot and
// drips (web .di-splat).
const SPLAT_T = [0, 0.23, 0.24, 0.29, 0.34, 0.39, 0.44, 1]

function Splat({ delay, x, y, rot, len, size, color }) {
  const progress = useLinear(delay, 1600)
  const px = remPx(size || '2.6')
  const angle = ((Number.parseFloat(rot) || 0) * Math.PI) / 180
  const far = remPx(len)
  const bx = Math.cos(angle) * far
  const by = Math.sin(angle) * far
  const blob = px * 0.55
  const blobX = progress.interpolate({ inputRange: [0, 0.24, 1], outputRange: [bx, 0, 0] })
  const blobY = progress.interpolate({ inputRange: [0, 0.24, 1], outputRange: [by, 0, 0] })
  const blobScale = progress.interpolate({ inputRange: [0, 0.24, 1], outputRange: [0.35, 1.1, 1.1] })
  const blobFade = progress.interpolate({ inputRange: [0, 0.06, 0.24, 0.25, 1], outputRange: [0, 1, 1, 0, 0] })
  const scale = progress.interpolate({ inputRange: SPLAT_T, outputRange: [0.3, 0.3, 0.35, 1.18, 0.94, 1.03, 1, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.23, 0.24, 0.86, 1], outputRange: [0, 0, 1, 1, 0] })
  const drip = progress.interpolate({ inputRange: [0, 0.3, 0.85, 1], outputRange: [0, 0, 1, 1] })
  const dripFade = progress.interpolate({ inputRange: [0, 0.86, 1], outputRange: [1, 1, 0] })
  const parts = svgParts()
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: remPx(x), top: remPx(y) }}>
      <Animated.View
        style={{ position: 'absolute', left: -blob / 2, top: -blob / 2, width: blob, height: blob, borderRadius: blob / 2, backgroundColor: color, opacity: blobFade, transform: [{ translateX: blobX }, { translateY: blobY }, { scale: blobScale }] }}
      />
      {SPLAT_DRIPS.map(([dx, top, dw, dl], i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: px * (dx / 40 - 0.5) - (px * dw) / 80,
            top: px * (top / 40 - 0.5),
            width: (px * dw) / 40,
            height: (px * dl) / 40,
            borderRadius: (px * dw) / 80,
            backgroundColor: color,
            opacity: dripFade,
            transformOrigin: 'top',
            transform: [{ scaleY: drip }],
          }}
        />
      ))}
      <Animated.View style={{ position: 'absolute', left: -px / 2, top: -px / 2, width: px, height: px, opacity, transform: [{ scale }] }}>
        {parts ? (
          <parts.Svg width={px} height={px} viewBox={SPLAT_VIEW}>
            <parts.Path d={SPLAT_PATH} fill={color} />
            <parts.Ellipse cx={15} cy={15} rx={3.2} ry={2} fill="#fff" fillOpacity={0.3} />
          </parts.Svg>
        ) : (
          <View style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: color }} />
        )}
      </Animated.View>
    </View>
  )
}

function SplatDot({ delay, x, y, size, color }) {
  const progress = useLinear(delay, 1200)
  const px = remPx(size || '0.3')
  const dx = remPx(x)
  const dy = remPx(y)
  const translateX = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [dx * 0.5, dx, dx] })
  const translateY = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [dy * 0.5, dy, dy] })
  const scale = progress.interpolate({ inputRange: [0, 0.15, 0.25, 1], outputRange: [0, 1.25, 1, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.05, 0.8, 1], outputRange: [0, 1, 1, 0] })
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: -px / 2, top: -px / 2, width: px, height: px, borderRadius: px / 2, backgroundColor: color, opacity, transform: [{ translateX }, { translateY }, { scale }] }}
    />
  )
}

// Butterfly: flutters up on a wavy path; each wing beats about the body.
const FLY_T = [0, 0.12, 0.3, 0.5, 0.7, 0.85, 1]
const FLAP_T = Array.from({ length: BUTTERFLY_FLAPS * 2 + 1 }, (_, i) => i / (BUTTERFLY_FLAPS * 2))
const FLAP_X = FLAP_T.map((_, i) => (i % 2 ? 0.25 : 1))

function Butterfly({ delay, x, y, size, turn, color, ink }) {
  const progress = useLinear(delay, 1800)
  const w = remPx(size || '2')
  const h = w * 0.8
  const bx = remPx(x)
  const by = remPx(y)
  const dir = turn < 0 ? -1 : 1
  const wob = remPx('0.5') * dir
  const translateX = progress.interpolate({
    inputRange: FLY_T,
    outputRange: [0, bx * 0.08 + wob, bx * 0.25 - wob, bx * 0.45 + wob, bx * 0.68 - wob * 0.8, bx * 0.85 + wob * 0.5, bx],
  })
  const translateY = progress.interpolate({
    inputRange: FLY_T,
    outputRange: [0, by * 0.12, by * 0.28 + remPx('0.2'), by * 0.5, by * 0.66 + remPx('0.15'), by * 0.82, by],
  })
  const rotate = progress.interpolate({ inputRange: FLY_T, outputRange: degs([0, 10, -8, 8, -6, 6, 0], dir) })
  const scale = progress.interpolate({ inputRange: FLY_T, outputRange: [0.2, 1.05, 1, 1, 1, 0.95, 0.8] })
  const opacity = progress.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] })
  const flap = progress.interpolate({ inputRange: FLAP_T, outputRange: FLAP_X })
  const parts = svgParts()
  if (!parts) return <Pip delay={delay} color={color} />
  const { Svg, Path, Circle, Ellipse } = parts
  const wing = (up, low, dot) => (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: [{ scaleX: flap }] }}>
      <Svg width={w} height={h} viewBox={BUTTERFLY_VIEW}>
        <Path d={up} fill={color} />
        <Path d={low} fill={color} />
        <Path d={low} fill="#000" fillOpacity={0.22} />
        <Circle cx={dot[0]} cy={dot[1]} r={dot[2]} fill="#fff" fillOpacity={0.7} />
      </Svg>
    </Animated.View>
  )
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, opacity, transform: [{ translateX }, { translateY }, { rotate }, { scale }] }}
    >
      {wing(WING_UP_L, WING_LOW_L, BUTTERFLY_DOTS[0])}
      {wing(WING_UP_R, WING_LOW_R, BUTTERFLY_DOTS[1])}
      <Svg width={w} height={h} viewBox={BUTTERFLY_VIEW} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Ellipse cx={20} cy={17} rx={1.6} ry={7} fill={ink} />
        <Path d={BUTTERFLY_FEELERS} stroke={ink} strokeWidth={1} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  )
}

// Rubber ball: drops and bounces lower each time, squashing on landing.
const HOP_T = BOUNCE_KEYS.map((k) => k[0])

function RubberBall({ delay, x, len, fall, size, color, ink }) {
  const progress = useLinear(delay, 1700)
  const px = remPx(size || '1.6')
  const high = remPx(fall)
  const roll = remPx(len)
  const spin = (roll / (Math.PI * px)) * 360
  const rollX = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, roll, roll] })
  const translateY = progress.interpolate({ inputRange: HOP_T, outputRange: BOUNCE_KEYS.map((k) => k[1] * high) })
  const scaleX = progress.interpolate({ inputRange: HOP_T, outputRange: BOUNCE_KEYS.map((k) => k[2]) })
  const scaleY = progress.interpolate({ inputRange: HOP_T, outputRange: BOUNCE_KEYS.map((k) => k[3]) })
  const shadow = progress.interpolate({ inputRange: HOP_T, outputRange: BOUNCE_KEYS.map((k) => 0.35 + 0.65 * (1 + k[1])) })
  const rotate = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: ['0deg', `${spin}deg`, `${spin}deg`] })
  const opacity = progress.interpolate({ inputRange: [0, 0.05, 0.86, 1], outputRange: [0, 1, 1, 0] })
  const shade = progress.interpolate({ inputRange: [0, 0.05, 0.86, 1], outputRange: [0, 0.2, 0.2, 0] })
  const parts = svgParts()
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: remPx(x), top: 0, transform: [{ translateX: rollX }] }}>
      <Animated.View
        style={{ position: 'absolute', left: -px * 0.45, top: -px * 0.11, width: px * 0.9, height: px * 0.22, borderRadius: px * 0.45, backgroundColor: ink, opacity: shade, transform: [{ scale: shadow }] }}
      />
      <Animated.View
        style={{ position: 'absolute', left: -px / 2, top: -px, width: px, height: px, opacity, transformOrigin: 'bottom', transform: [{ translateY }, { scaleX }, { scaleY }] }}
      >
        <Animated.View style={{ width: px, height: px, transform: [{ rotate }] }}>
          {parts ? (
            <parts.Svg width={px} height={px} viewBox="0 0 24 24">
              <parts.Circle cx={12} cy={12} r={11} fill={color} />
              <parts.Path d={BALL_STRIPE} fill="#000" fillOpacity={0.2} />
            </parts.Svg>
          ) : (
            <View style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: color }} />
          )}
        </Animated.View>
        <View style={{ position: 'absolute', left: px * 0.22, top: px * 0.18, width: px * 0.26, height: px * 0.16, borderRadius: px * 0.13, backgroundColor: 'rgba(255, 255, 255, 0.5)', transform: [{ rotate: '-25deg' }] }} />
      </Animated.View>
    </Animated.View>
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
  if (bit.rocket) return <Rocket delay={delay} rise={bit.rise} size={bit.size} colors={colors} />
  if (bit.smoke) return <Smoke delay={delay} x={bit.x} y={bit.y} size={bit.size} color={colors.ink} />
  if (bit.star) {
    return <StarBit delay={delay} oy={bit.oy} x={bit.x} y={bit.y} size={bit.size} rot={bit.rot} color={toneColor(bit.tone, colors)} />
  }
  if (bit.launchWord) return <LaunchWord delay={delay} oy={bit.oy} size={bit.size} colors={colors} />
  if (bit.heart) return <Heart delay={delay} size={bit.size} color={on} />
  if (bit.heartBit) return <HeartBit delay={delay} x={bit.x} y={bit.y} size={bit.size} color={toneColor(bit.tone, colors)} />
  if (bit.medal) return <Medal delay={delay} size={bit.size} swing={bit.swing} colors={colors} />
  if (bit.glint) {
    return <Glint delay={delay} x={bit.x} y={bit.y} size={bit.size} color={confettiColor(bit.tone, colors)} />
  }
  if (bit.sunGlow) return <SunGlow delay={delay} size={bit.size} color={on} />
  if (bit.sun) return <Sun delay={delay} size={bit.size} rays={bit.rays} turn={bit.turn} colors={colors} />
  if (bit.leaf) {
    return (
      <Confetti
        leaf
        delay={delay}
        x={bit.x}
        y={bit.y}
        fall={bit.fall}
        rot={bit.rot}
        size={bit.size}
        color={bit.tone === 'warm' ? colors.miss : toneColor(bit.tone, colors)}
      />
    )
  }
  if (bit.lantern) {
    return <Lantern delay={delay} size={bit.size} rise={bit.rise} swing={bit.swing} colors={colors} />
  }
  if (bit.gift) {
    return <Gift delay={delay} size={bit.size} swing={bit.swing} colors={colors} />
  }
  if (bit.kernel) {
    return <Kernel delay={delay} x={bit.x} y={bit.y} fall={bit.fall} rot={bit.rot} size={bit.size} tone={bit.tone} />
  }
  if (bit.snowflake) {
    return <Snowflake delay={delay} x={bit.x} y={bit.y} size={bit.size} turn={bit.turn} color={on} />
  }
  if (bit.iceDust) {
    return <IceDust delay={delay} x={bit.x} y={bit.y} size={bit.size} color={paintColor(bit.tone, colors)} />
  }
  if (bit.bell) return <Bell delay={delay} size={bit.size} swing={bit.swing} colors={colors} />
  if (bit.soundArc) {
    return <SoundArc delay={delay} x={bit.x} y={bit.y} size={bit.size} turn={bit.turn} color={paintColor(bit.tone, colors)} />
  }
  if (bit.disco) return <Disco delay={delay} size={bit.size} turn={bit.turn} colors={colors} />
  if (bit.discoSpot) {
    return <DiscoSpot delay={delay} rot={bit.rot} turn={bit.turn} len={bit.len} size={bit.size} color={paintColor(bit.tone, colors)} />
  }
  if (bit.ribbon) return <Ribbon delay={delay} size={bit.size} turn={bit.turn} colors={colors} />
  if (bit.cup) return <Cup delay={delay} side={bit.side} size={bit.size} colors={colors} />
  if (bit.fizz) {
    return <Fizz delay={delay} x={bit.x} y={bit.y} rise={bit.rise} size={bit.size} color={paintColor(bit.tone, colors)} />
  }
  if (bit.pole) return <Pole delay={delay} size={bit.size} fall={bit.fall} color={colors.inkSoft || colors.ink} />
  if (bit.dropBall) return <DropBall delay={delay} size={bit.size} fall={bit.fall} colors={colors} />
  if (bit.beam) {
    return <Beam delay={delay} rot={bit.rot} len={bit.len} size={bit.size} color={paintColor(bit.tone, colors)} />
  }
  if (bit.bolt) return <Bolt delay={delay} size={bit.size} colors={colors} />
  if (bit.crackle) {
    return <Crackle delay={delay} rot={bit.rot} len={bit.len} size={bit.size} color={paintColor(bit.tone, colors)} />
  }
  if (bit.splat) {
    return <Splat delay={delay} x={bit.x} y={bit.y} rot={bit.rot} len={bit.len} size={bit.size} color={paintColor(bit.tone, colors)} />
  }
  if (bit.splatDot) {
    return <SplatDot delay={delay} x={bit.x} y={bit.y} size={bit.size} color={paintColor(bit.tone, colors)} />
  }
  if (bit.butterfly) {
    return <Butterfly delay={delay} x={bit.x} y={bit.y} size={bit.size} turn={bit.turn} color={paintColor(bit.tone, colors)} ink={colors.ink} />
  }
  if (bit.rubberBall) {
    return <RubberBall delay={delay} x={bit.x} len={bit.len} fall={bit.fall} size={bit.size} color={paintColor(bit.tone, colors)} ink={colors.ink} />
  }
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
      // A real cheer comes from a Did, which already gave its one success
      // haptic; only a shop preview needs its own.
      const aim = preview ? null : takeCheerAim()
      setBurst({ kind, stage, look, pops, preview, aim, key: Date.now() })
      if (preview) feelTap('did')
    }
    window.addEventListener('did-i-cheer', onCheer)
    return () => window.removeEventListener('did-i-cheer', onCheer)
  }, [reduce])

  // A real cheer plays over Home while the next card comes up, so it fades
  // out by REAL_MAX_MS instead of sitting on that card. Previews play in full.
  const fade = useMemo(() => new Animated.Value(1), [])
  useEffect(() => {
    if (!burst) return undefined
    const hold = holdFor(burst.kind, burst.stage, burst.pops.length)
    // A cheer that cleared the night has no next card to cover: it plays in full.
    const full = burst.preview || Date.now() - (window.__didICheerFull || 0) < 1000
    const end = full ? hold : Math.min(hold, REAL_MAX_MS)
    fade.setValue(1)
    const fadeTimer =
      end < hold
        ? setTimeout(
            () => Animated.timing(fade, { toValue: 0, duration: REAL_FADE_MS, useNativeDriver: true }).start(),
            end - REAL_FADE_MS,
          )
        : null
    const timer = setTimeout(() => setBurst(null), end)
    return () => {
      clearTimeout(timer)
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [burst, fade])

  if ((reduce && !burst?.preview) || !burst?.pops?.length) return null

  const colors = hallColors(burst.look || burst.kind, theme)
  const pops = burst.pops
  const screenPop = pops.find((pop) => pop.bits.some((bit) => bit.screen))
  const stageTop = burst.preview ? insets.top + 12 : insets.top + CHEER_TOP
  const stageH = Math.max(180, winH - stageTop - navBottom)
  const stageW = winW
  // From the answered card: slide the stage so its first burst point
  // (the middle, 42% down) lands on the card.
  const shift = burst.aim
    ? { left: burst.aim.x - stageW * 0.5, top: burst.aim.y - stageH * 0.42 }
    : { left: 0, top: stageTop }

  const layerStyle = burst.preview ? [styles.layer, styles.layerPreview] : styles.layer

  return (
    <Animated.View pointerEvents="none" style={[layerStyle, { opacity: fade }]} collapsable={false}>
      <Slot key={burst.key}>
        <View style={[styles.stage, { top: shift.top, left: shift.left, width: stageW, height: stageH }]}>
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
    </Animated.View>
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
