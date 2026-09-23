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
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] })
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
  const scale = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 1, 0.4] })
  const opacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1, 0] })
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

function SparkRay({ delay, rot, len, tone, colors }) {
  const progress = useTimed(delay, 420)
  const height = remPx(len)
  const deg = Number.parseFloat(rot)
  const width = remPx('0.11')
  const scaleY = progress.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1, 0] })
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
        transform: [{ rotate: `${deg}deg` }, { scaleY }],
      }}
    />
  )
}

function SparkFlash({ delay, color }) {
  const progress = useTimed(delay, 380)
  const px = remPx('2.2')
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.35] })
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] })
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
  const scaleX = progress.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0, 1, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.28, 0.78, 1], outputRange: [0, 1, 1, 0] })
  const translateY = progress.interpolate({ inputRange: [0, 0.78, 1], outputRange: [0, 0, 12] })
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
        transform: [{ scaleX }, { translateY }],
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
  const scaleY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
  const opacity = progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1, 0] })
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
        transform: [{ rotate: `${deg}deg` }, { scaleY }],
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
          duration: 1050,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 105, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: 945, useNativeDriver: true }),
        ]),
      ]),
    ]).start()
  }, [delay, fallAnim, opacity])
  const translateY = fallAnim.interpolate({ inputRange: [0, 1], outputRange: [0, fallPx] })
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
        borderRadius: 1,
        opacity,
        transform: [{ translateY }],
      }}
    />
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
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.9, duration: 220, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.85, duration: 1220, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 410, useNativeDriver: true }),
        ]),
      ]),
    ]).start()
  }, [delay, opacity, riseAnim])
  const translateY = riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -risePx] })
  const translateX = riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, driftX] })
  const scale = riseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.15] })
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
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
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
    </Animated.View>
  )
}

function Stamp({ delay, rot, color, panel }) {
  const progress = useTimed(delay, 850)
  const deg = Number.parseFloat(rot) || 0
  const scale = progress.interpolate({ inputRange: [0, 0.16, 0.28, 1], outputRange: [2.5, 0.9, 1.06, 1.06] })
  const opacity = progress.interpolate({ inputRange: [0, 0.16, 0.72, 1], outputRange: [0, 1, 1, 0] })
  return (
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
        transform: [{ rotate: `${deg}deg` }, { scale }],
      }}
    >
      <Text style={[styles.stampBurst, { color }]}>{t('tonight.swipeDid')}</Text>
    </Animated.View>
  )
}

function Tick({ color, scale }) {
  const parts = svgParts()
  const boxW = remPx('7.2') * (scale || 1)
  const boxH = remPx('5') * (scale || 1)
  const frame = {
    position: 'absolute',
    left: -boxW / 2,
    top: -boxH / 2,
    width: boxW,
    height: boxH,
  }
  if (!parts) {
    const thick = Math.max(4, boxH * 0.12)
    return (
      <View pointerEvents="none" style={frame}>
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
      </View>
    )
  }
  const { Svg, Path } = parts
  return (
    <View pointerEvents="none" style={frame}>
      <Svg width={boxW} height={boxH} viewBox="0 0 72 50">
        <Path
          d="M10 27 L26 43 L62 9"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
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
  const y = progress.interpolate({
    inputRange: [0, 1],
    outputRange: left ? [stageH * 0.22, -stageH * 0.38] : [stageH * 0.18, -stageH * 0.42],
  })
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: left ? ['162deg', '198deg'] : ['-18deg', '12deg'],
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

function Puddle({ delay, color, width }) {
  const scale = useMemo(() => new Animated.Value(0.15), [])
  const opacity = useMemo(() => new Animated.Value(0), [])
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 470, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.45, duration: 470, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 880, useNativeDriver: true }),
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
        bottom: -remPx('0.55'),
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
  if (bit.puddle) return <Puddle delay={delay} color={on} width={bit.width} />
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
  if (bit.tick) return <Tick color={on} scale={bit.scale} />
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
  const { bottom: navBottom } = useAppInsets()
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

  const colors = hallColors(burst.look, theme)
  const pops = burst.pops
  const screenPop = pops.find((pop) => pop.bits.some((bit) => bit.screen))
  const stageTop = burst.preview ? insets.top + 12 : insets.top + CHEER_TOP
  const stageH = Math.max(180, winH - stageTop - navBottom)
  const stageW = winW

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Text
        pointerEvents="none"
        style={[styles.cheerName, { color: colors.on, top: stageTop + stageH * 0.36 }]}
      >
        {t(`cheer.${burst.kind}.name`)}
      </Text>
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
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    elevation: 30,
  },
  stage: {
    position: 'absolute',
    left: 0,
    overflow: 'visible',
  },
  cheerName: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 1,
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
