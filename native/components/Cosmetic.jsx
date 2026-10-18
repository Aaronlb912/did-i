import { memo, useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { isGemLook, normalizePurse } from '../../src/lib/purse.js'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { activeLook } from '../../src/lib/active-look.js'
import { useLookColors } from '../hooks/useHallColors.js'
import { useTheme } from '../../src/lib/prefs.js'
import { gemLookChipMeta } from '../lib/gem-look-tone.js'
import { BuddyArt, BuddyPlain } from './BuddyArt.jsx'
import { AccessoryLayer } from './Accessories.jsx'
import { accessoryById, eyeLine, wornLayers } from '../../src/lib/accessories.js'
import { svgParts } from '../lib/svg-parts.js'
import {
  BALL_STRIPE,
  BELL_BODY,
  BELL_LIP,
  BELL_SHADE,
  BELL_VIEW,
  BOLT_PATH,
  BOLT_VIEW,
  BOW_INNER,
  BOW_KNOT,
  BOW_LOOPS,
  BOW_TAILS,
  BUTTERFLY_FEELERS,
  BUTTERFLY_VIEW,
  CLINK_COLORS,
  DISCO_COLORS,
  DISCO_GRID,
  GIFT_BAND,
  GIFT_BOW,
  GIFT_BOX,
  GIFT_LID,
  GIFT_LID_BAND,
  GIFT_SHADE,
  GIFT_VIEW,
  KERNEL_HULL,
  KERNEL_PUFFS,
  MUG_BASE,
  MUG_BODY,
  MUG_COCOA,
  MUG_CX,
  MUG_HANDLE,
  MUG_VIEW,
  POPCORN_COLORS,
  RIBBON_VIEW,
  ROCKET_BODY,
  ROCKET_FINS,
  ROCKET_FLAME,
  ROCKET_VIEW,
  SNOW_CORE,
  SNOW_PATH,
  SPLAT_PATH,
  SPLAT_VIEW,
  WING_LOW_L,
  WING_LOW_R,
  WING_UP_L,
  WING_UP_R,
} from '../../src/lib/cheer-pops.js'
import { Slot } from './Slot.jsx'
import { fonts } from '../theme.js'

const R = 16
const CHIP = 2.4 * R
const CHIP_R = 0.55 * R
const CHIP_BIG = 72

const LOOK_META = {
  lime: { on: '#c9f24d' },
  ink: { on: '#a8b878', bg: '#141618', glow: 'rgba(168, 184, 120, 0.35)' },
  brass: { on: '#e2c36a', bg: '#1a1610', glow: 'rgba(226, 195, 106, 0.4)' },
  night: { on: '#e8d070', bg: '#0a0e14', glow: 'rgba(232, 208, 112, 0.38)' },
  glow: {
    on: '#5ee8ff',
    bg: '#0c1218',
    glow: 'rgba(94, 232, 255, 0.72)',
    dotGlow: 'rgba(94, 232, 255, 0.95)',
    chipShadow: 10,
  },
  ember: {
    on: '#ff9a4a',
    bg: '#140e0a',
    glow: 'rgba(255, 154, 74, 0.55)',
    dotGlow: 'rgba(255, 154, 74, 0.75)',
  },
  moss: { on: '#8fbf7a' },
  plum: { on: '#c8a0ff' },
  rose: { on: '#f0a8b8' },
  steel: { on: '#8eb4d8' },
  wine: { on: '#d86a88' },
  frost: {
    on: '#d8f0ff',
    bg: '#0c1218',
    glow: 'rgba(216, 240, 255, 0.5)',
    dotGlow: 'rgba(216, 240, 255, 0.7)',
  },
  pulse: {
    on: '#ff6ec8',
    bg: '#100a14',
    glow: 'rgba(255, 110, 200, 0.5)',
    dotGlow: 'rgba(255, 110, 200, 0.7)',
  },
  jade: { on: '#4fe0a8' },
  indigo: { on: '#7a8cff' },
  clay: { on: '#d97a5c', bg: '#1a1310', glow: 'rgba(217, 122, 92, 0.35)' },
  sky: { on: '#4aa8ff' },
  maple: { on: '#fa774f' },
  fig: { on: '#d46ba3' },
  cranberry: { on: '#ff4f6a' },
  saffron: { on: '#ffc23d' },
  iris: { on: '#8f6bff' },
  lagoon: { on: '#1ed6d0' },
  emerald: { on: '#36d462' },
  candy: { on: '#ff8cc6' },
  magenta: { on: '#f24ff0' },
  copper: { on: '#f5a484' },
  lemon: { on: '#fdee2c' },
  peacock: { on: '#22b8e0' },
  sunset: { on: '#fe8782' },
  twilight: { on: '#c084e8' },
  orchid: { on: '#dd7bff' },
  chalk: { on: '#ecebe6', bg: '#181817', glow: 'rgba(236, 235, 230, 0.3)' },
  oat: { on: '#f0e6d8', bg: '#141311', glow: 'rgba(240, 230, 216, 0.3)' },
  pine: { on: '#8fd1b5', bg: '#0f1614', glow: 'rgba(143, 209, 181, 0.3)' },
  cocoa: { on: '#cfa577', bg: '#18130f', glow: 'rgba(207, 165, 119, 0.3)' },
  denim: { on: '#8895b9', bg: '#12141a', glow: 'rgba(125, 147, 196, 0.3)' },
  lilac: { on: '#c7b2dc', bg: '#161318', glow: 'rgba(194, 169, 220, 0.3)' },
  rosewood: { on: '#c7918c', bg: '#191212', glow: 'rgba(204, 143, 138, 0.3)' },
  fog: { on: '#b9c2cc', bg: '#121517', glow: 'rgba(179, 192, 205, 0.3)' },
}

function rem(n) {
  return n * R
}

function chipShell(colors, bg, glow, chipShadow, borderless = false) {
  const shell = {
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP_R,
    borderWidth: borderless ? 0 : 1,
    borderColor: borderless ? 'transparent' : colors?.line || '#2b3140',
    backgroundColor: bg || colors?.panel3 || '#242935',
  }
  if (glow) {
    return {
      ...shell,
      shadowColor: glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: chipShadow || 6,
      elevation: chipShadow ? 6 : 4,
    }
  }
  return shell
}

// plain: no glow or ring, for a tile that is not selected (a glow reads as selected).
function LookChipArt({ id, colors, plain = false }) {
  const theme = useTheme()
  const premium = isGemLook(id)
  const lookColors = useLookColors(id)
  const base = premium ? gemLookChipMeta(id, theme) || LOOK_META[id] : LOOK_META[id] || LOOK_META.lime
  // In Light, a coin look's chip takes the look's own Light card colors, so
  // the tile matches the card preview (Ink is cream there, not black).
  const meta = !premium && theme === 'light' ? { on: lookColors.on, bg: lookColors.panel } : base
  const on = meta.on
  const dot = rem(0.34)
  const dotStyle = (i) => ({
    width: dot,
    height: dot,
    borderRadius: dot / 2,
    backgroundColor: on,
    ...(meta.dotGlow && !plain
      ? {
          shadowColor: meta.dotGlow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 4,
        }
      : null),
  })
  const chipBg = meta.bg
  const chipGlow = plain ? null : meta.glow
  const chip = (
    <View style={[styles.lookChip, chipShell(colors, chipBg, chipGlow, meta.chipShadow, id === 'glow')]}>
      {premium && meta.ring && id !== 'glow' ? (
        <View style={[styles.lookInset, { borderColor: meta.ring }]} pointerEvents="none" />
      ) : null}
      <View style={dotStyle(0)} />
      <View style={dotStyle(1)} />
      <View style={dotStyle(2)} />
    </View>
  )

  if (!premium || plain) return chip

  if (id === 'glow') {
    return (
      <View style={styles.premiumWrap}>
        <View style={[styles.premiumHalo, { shadowColor: meta.glow }]} />
        {chip}
      </View>
    )
  }

  return (
    <View style={styles.premiumWrap}>
      <View
        style={[
          styles.premiumRing,
          {
            borderColor: meta.glow,
            shadowColor: meta.glow,
          },
        ]}
      />
      <View
        style={[
          styles.premiumHalo,
          {
            borderColor: meta.glow,
            shadowColor: meta.glow,
          },
        ]}
      />
      {chip}
    </View>
  )
}

function LimeChip({ on }) {
  const rings = [0.5, 0.95, 1.35]
  return (
    <View style={styles.chipBox}>
      {rings.map((size) => {
        const px = rem(size)
        return (
          <View
            key={size}
            style={{
              position: 'absolute',
              left: CHIP / 2 - px / 2,
              top: CHIP / 2 - px / 2,
              width: px,
              height: px,
              borderRadius: px / 2,
              borderWidth: 2,
              borderColor: on,
              backgroundColor: 'transparent',
            }}
          />
        )
      })}
    </View>
  )
}

function SparkChip({ on, onDeep }) {
  const rays = [
    { deg: 0, color: '#fff', h: 0.52 },
    { deg: 45, color: onDeep, h: 0.52 },
    { deg: 90, color: '#fff', h: 0.52 },
    { deg: 135, color: on, h: 0.52 },
    { deg: 225, color: '#fff', h: 0.42 },
  ]
  const pivot = { left: CHIP / 2, top: CHIP / 2 }
  return (
    <View style={styles.chipBox}>
      {rays.map((ray) => {
        const h = rem(ray.h)
        const w = rem(0.1)
        return (
          <View key={ray.deg} style={{ position: 'absolute', ...pivot, width: 0, height: 0 }}>
            <View
              style={{
                position: 'absolute',
                left: -w / 2,
                top: -h,
                width: w,
                height: h,
                borderRadius: 1,
                backgroundColor: ray.color,
                transform: [{ rotate: `${ray.deg}deg` }],
              }}
            />
          </View>
        )
      })}
    </View>
  )
}

function TapeChip({ ink, on }) {
  const bars = [
    { w: 1.45, c: ink },
    { w: 1.1, c: on },
    { w: 1.3, c: ink },
  ]
  return (
    <View style={[styles.chipBox, styles.tapeChip]}>
      {bars.map((bar, i) => (
        <View key={i} style={{ width: rem(bar.w), height: rem(0.16), borderRadius: 1, backgroundColor: bar.c }} />
      ))}
    </View>
  )
}

function PaperChip({ on }) {
  return (
    <View style={[styles.chipBox, styles.paperChip]}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: rem(1.15),
          borderTopWidth: rem(0.36),
          borderBottomWidth: rem(0.36),
          borderLeftColor: on,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
        }}
      />
    </View>
  )
}

function NightChip({ on, ink, panel3 }) {
  const moon = rem(1.05)
  const bite = rem(0.28)
  return (
    <View style={styles.chipBox}>
      <View
        style={{
          position: 'absolute',
          left: CHIP / 2 - moon / 2,
          top: CHIP / 2 - moon / 2,
          width: moon,
          height: moon,
          borderRadius: moon / 2,
          backgroundColor: on,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: -bite / 2,
            top: 0,
            width: moon,
            height: moon,
            borderRadius: moon / 2,
            backgroundColor: panel3,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          top: rem(0.32),
          right: rem(0.32),
          width: rem(0.16),
          height: rem(0.16),
          borderRadius: rem(0.08),
          backgroundColor: ink,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: rem(0.38),
          left: rem(0.38),
          width: rem(0.16),
          height: rem(0.16),
          borderRadius: rem(0.08),
          backgroundColor: ink,
        }}
      />
    </View>
  )
}

function BoomChip({ on, onDeep }) {
  const outer = rem(0.7)
  const inner = rem(0.42)
  return (
    <View style={styles.chipBox}>
      <View
        style={{
          position: 'absolute',
          left: CHIP / 2 - outer / 2,
          top: CHIP / 2 - outer / 2,
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: 2,
          borderColor: onDeep,
          backgroundColor: 'transparent',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: CHIP / 2 - inner / 2,
          top: CHIP / 2 - inner / 2,
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          borderWidth: 2,
          borderColor: on,
          backgroundColor: 'transparent',
        }}
      />
    </View>
  )
}

function DanceChip({ ink, on }) {
  const barW = rem(0.22)
  const barH = rem(0.7)
  const head = rem(0.26)
  return (
    <View style={[styles.chipBox, styles.danceChip]}>
      {[0, 1].map((i) => (
        <View key={i} style={{ width: barW, height: barH, position: 'relative' }}>
          <View
            style={{
              position: 'absolute',
              top: -rem(0.28),
              left: -rem(0.02),
              width: head,
              height: head,
              borderRadius: head / 2,
              backgroundColor: on,
            }}
          />
          <View
            style={{
              width: barW,
              height: barH,
              borderTopLeftRadius: 1,
              borderTopRightRadius: 1,
              backgroundColor: ink,
            }}
          />
        </View>
      ))}
    </View>
  )
}

function StampChip({ on }) {
  return (
    <View style={[styles.chipBox, styles.stampChip]}>
      <Text style={[styles.stampText, { color: on }]}>DID</Text>
    </View>
  )
}

function RainChip({ on }) {
  const drops = [0.85, 1.15, 0.7]
  return (
    <View style={[styles.chipBox, styles.rainChip]}>
      {drops.map((h, i) => (
        <View key={i} style={{ width: rem(0.12), height: rem(h), borderRadius: 1, backgroundColor: on }} />
      ))}
    </View>
  )
}

function CheckChip({ on }) {
  return (
    <View style={styles.chipBox}>
      <View
        style={{
          position: 'absolute',
          width: rem(0.55),
          height: rem(0.2),
          left: rem(0.42),
          bottom: rem(0.72),
          backgroundColor: on,
          borderRadius: 1,
          transform: [{ rotate: '42deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: rem(1.05),
          height: rem(0.2),
          left: rem(0.72),
          bottom: rem(0.82),
          backgroundColor: on,
          borderRadius: 1,
          transform: [{ rotate: '-48deg' }],
        }}
      />
    </View>
  )
}

function BubbleChip({ on }) {
  const big = rem(0.72)
  const small = rem(0.42)
  const shine = rem(0.35)
  return (
    <View style={styles.chipBox}>
      <View
        style={{
          position: 'absolute',
          width: big,
          height: big,
          borderRadius: big / 2,
          borderWidth: 2,
          borderColor: on,
          left: rem(0.38),
          top: rem(0.55),
          backgroundColor: 'transparent',
          overflow: 'hidden',
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
            backgroundColor: on,
            opacity: 0.35,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          width: small,
          height: small,
          borderRadius: small / 2,
          borderWidth: 2,
          borderColor: on,
          right: rem(0.32),
          top: rem(0.32),
          backgroundColor: 'transparent',
        }}
      />
    </View>
  )
}

function FlipChip({ on, panel2, panel3, line }) {
  const w = rem(0.95)
  const h = rem(1.25)
  const left = CHIP / 2 - rem(0.48)
  const top = CHIP / 2 - rem(0.62)
  const card = {
    position: 'absolute',
    width: w,
    height: h,
    borderRadius: rem(0.12),
    left,
    top,
  }
  return (
    <View style={[styles.chipBox, styles.flipChip]}>
      <View
        style={[
          card,
          {
            backgroundColor: on,
            transform: [{ rotateY: '-28deg' }],
            shadowColor: panel3,
            shadowOffset: { width: rem(0.14), height: rem(0.08) },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 2,
          },
        ]}
      />
      <View
        style={[
          card,
          {
            borderWidth: 1,
            borderColor: line,
            backgroundColor: panel2,
            transform: [{ rotateY: '52deg' }, { translateX: rem(0.35) }],
          },
        ]}
      />
    </View>
  )
}

function ConfettiChip({ on, onDeep, late, ink }) {
  const bits = [
    { top: 0.55, left: 0.5, deg: -25, c: on },
    { top: 0.75, left: 1.35, deg: 35, c: onDeep },
    { top: 1.3, left: 0.75, deg: 70, c: late },
    { top: 1.55, left: 1.4, deg: -12, c: ink },
    { top: 0.35, left: 1.2, deg: 20, c: on, square: true },
  ]
  return (
    <View style={styles.chipBox}>
      {bits.map((bit, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: rem(bit.top),
            left: rem(bit.left),
            width: rem(bit.square ? 0.24 : 0.42),
            height: rem(bit.square ? 0.24 : 0.2),
            borderRadius: 1,
            backgroundColor: bit.c,
            transform: [{ rotate: `${bit.deg}deg` }],
          }}
        />
      ))}
    </View>
  )
}

function HeartChip({ on }) {
  const s = rem(0.7)
  return (
    <View style={styles.chipBox}>
      <View
        style={{
          position: 'absolute',
          left: CHIP / 2 - s / 2,
          top: CHIP / 2 - rem(0.3),
          width: s,
          height: s,
          backgroundColor: on,
          transform: [{ rotate: '-45deg' }],
        }}
      >
        <View style={{ position: 'absolute', top: -s / 2, left: 0, width: s, height: s, borderRadius: s / 2, backgroundColor: on }} />
        <View style={{ position: 'absolute', top: 0, left: s / 2, width: s, height: s, borderRadius: s / 2, backgroundColor: on }} />
      </View>
    </View>
  )
}

function LaunchChip({ on, onDeep, ink }) {
  const parts = svgParts()
  if (!parts) return <DefaultChip n={1} on={on} />
  const { Svg, Path, Circle } = parts
  const h = rem(1.5)
  return (
    <View style={styles.center}>
      <Svg width={h * 0.75} height={h} viewBox={ROCKET_VIEW}>
        <Path d={ROCKET_FLAME} fill={onDeep} />
        <Path d={ROCKET_FINS} fill={on} />
        <Path d={ROCKET_BODY} fill={ink} />
        <Circle cx={12} cy={12.5} r={2.4} fill={on} />
      </Svg>
    </View>
  )
}

// A gift box with its bow, like the web chip.
function GiftChip({ on, ink }) {
  const parts = svgParts()
  if (!parts) return <DefaultChip n={1} on={on} />
  const { Svg, Path, Circle } = parts
  const h = rem(1.5)
  return (
    <View style={styles.center}>
      <Svg width={h * (40 / 44)} height={h} viewBox={GIFT_VIEW}>
        <Path d={GIFT_BOX} fill={on} />
        <Path d={GIFT_SHADE} fill="#000" fillOpacity={0.22} />
        <Path d={GIFT_BAND} fill={ink} />
        <Path d={GIFT_LID} fill={on} />
        <Path d={GIFT_LID_BAND} fill={ink} />
        <Path d={GIFT_BOW} fill={ink} />
        <Circle cx={20} cy={11.5} r={2.4} fill={ink} />
      </Svg>
    </View>
  )
}

// One popped kernel, buttered, like the web chip.
function PopcornChip({ on }) {
  const parts = svgParts()
  if (!parts) return <DefaultChip n={1} on={on} />
  const { Svg, Path, Circle } = parts
  const h = rem(1.5)
  return (
    <View style={styles.center}>
      <Svg width={h} height={h} viewBox="0 0 24 24">
        <Path d={KERNEL_HULL} fill={POPCORN_COLORS.hull} />
        {KERNEL_PUFFS.map(([cx, cy, r], i) => (
          <Circle key={i} cx={cx} cy={cy} r={r} fill={POPCORN_COLORS.puff} stroke={POPCORN_COLORS.edge} strokeWidth={1.2} />
        ))}
        {KERNEL_PUFFS.map(([cx, cy, r], i) => (
          <Circle key={`in-${i}`} cx={cx} cy={cy} r={r - 0.9} fill={i === 1 ? POPCORN_COLORS.butter : POPCORN_COLORS.puff} />
        ))}
      </Svg>
    </View>
  )
}

// Chips for the winter drop cheers, like the web chips: the shapes the cheers draw.
function WinterChip({ id, on, onDeep, ink, inkSoft, late }) {
  const parts = svgParts()
  if (!parts) return <DefaultChip n={1} on={on} />
  const { Svg, Path, Circle, Ellipse } = parts
  const h = rem(1.5)
  let art = null
  switch (id) {
    case 'snowflake':
      art = (
        <Svg width={h} height={h} viewBox="0 0 24 24">
          <Path d={SNOW_PATH} stroke={on} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Path d={SNOW_CORE} stroke={on} strokeWidth={2} strokeLinejoin="round" fill="none" />
        </Svg>
      )
      break
    case 'bell':
      art = (
        <Svg width={h * (40 / 44)} height={h} viewBox={BELL_VIEW}>
          <Circle cx={20} cy={40} r={3} fill={onDeep} />
          <Path d={BELL_BODY} fill={on} />
          <Path d={BELL_SHADE} fill="#000" fillOpacity={0.2} />
          <Path d={BELL_LIP} fill={onDeep} />
          <Circle cx={20} cy={4} r={2.4} stroke={onDeep} strokeWidth={1.6} fill="none" />
        </Svg>
      )
      break
    case 'disco':
      art = (
        <Svg width={h} height={h} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} fill={DISCO_COLORS.mid} />
          <Path d={DISCO_GRID} stroke={DISCO_COLORS.line} strokeWidth={0.9} fill="none" />
          <Circle cx={8.5} cy={7.5} r={2} fill={DISCO_COLORS.hi} />
        </Svg>
      )
      break
    case 'ribbon':
      art = (
        <Svg width={h} height={h} viewBox={RIBBON_VIEW}>
          <Path d={BOW_TAILS} fill={on} />
          <Path d={BOW_LOOPS} fill={on} />
          <Path d={BOW_INNER} fill={onDeep} fillOpacity={0.55} />
          <Path d={BOW_KNOT} fill={onDeep} />
        </Svg>
      )
      break
    case 'clink': {
      // No G in svgParts: each mug is its own svg, turned on its base.
      const m = rem(0.95)
      const mug = (fill, flip, tilt, cx) => {
        const mid = flip < 0 ? 1 - MUG_CX : MUG_CX
        return (
          <View
            style={{
              position: 'absolute',
              left: cx - m * mid,
              top: CHIP / 2 + m * 0.45 - m * MUG_BASE,
              width: m,
              height: m,
              transformOrigin: `${mid * 100}% ${MUG_BASE * 100}%`,
              transform: [{ rotate: `${tilt}deg` }, { scaleX: flip }],
            }}
          >
            <Svg width={m} height={m} viewBox={MUG_VIEW}>
              <Path d={MUG_HANDLE} stroke={fill} strokeWidth={3.2} strokeLinecap="round" fill="none" />
              <Path d={MUG_BODY} fill={fill} />
              <Ellipse cx={MUG_COCOA[0]} cy={MUG_COCOA[1]} rx={MUG_COCOA[2]} ry={MUG_COCOA[3]} fill={CLINK_COLORS.cocoa} stroke={fill} strokeWidth={1.2} />
            </Svg>
          </View>
        )
      }
      return (
        <View style={styles.chipBox}>
          {mug(on, -1, 12, CHIP / 2 - m * 0.3)}
          {mug(late, 1, -12, CHIP / 2 + m * 0.3)}
        </View>
      )
    }
    case 'balldrop':
      art = (
        <Svg width={h} height={h} viewBox="0 0 24 24">
          <Path d="M12 1 V21 M7 22 H17" stroke={inkSoft} strokeWidth={1.8} strokeLinecap="round" fill="none" />
          <Circle cx={12} cy={12} r={6} fill={on} stroke={onDeep} strokeWidth={1.2} />
          <Circle cx={10} cy={10} r={1.5} fill="#fff" fillOpacity={0.6} />
        </Svg>
      )
      break
    case 'bolt':
      art = (
        <Svg width={h / 2} height={h} viewBox={BOLT_VIEW}>
          <Path d={BOLT_PATH} fill={on} />
        </Svg>
      )
      break
    case 'splat':
      art = (
        <Svg width={h} height={h} viewBox={SPLAT_VIEW}>
          <Path d={SPLAT_PATH} fill={on} />
          <Circle cx={36} cy={33} r={2} fill={on} />
          <Circle cx={4} cy={31} r={1.5} fill={on} />
        </Svg>
      )
      break
    case 'butterfly':
      art = (
        <Svg width={h} height={h * 0.8} viewBox={BUTTERFLY_VIEW}>
          <Path d={WING_UP_L} fill={on} />
          <Path d={WING_UP_R} fill={on} />
          <Path d={WING_LOW_L} fill={onDeep} />
          <Path d={WING_LOW_R} fill={onDeep} />
          <Ellipse cx={20} cy={17} rx={1.6} ry={7} fill={ink} />
          <Path d={BUTTERFLY_FEELERS} stroke={ink} strokeWidth={1} strokeLinecap="round" fill="none" />
        </Svg>
      )
      break
    case 'bounce':
      art = (
        <Svg width={h * (24 / 28)} height={h} viewBox="0 0 24 28">
          <Ellipse cx={12} cy={26} rx={7} ry={1.6} fill={ink} fillOpacity={0.25} />
          <Circle cx={12} cy={12} r={11} fill={on} />
          <Path d={BALL_STRIPE} fill="#000" fillOpacity={0.2} />
        </Svg>
      )
      break
    default:
      return <DefaultChip n={1} on={on} />
  }
  return <View style={styles.center}>{art}</View>
}

function MedalChip({ on, onDeep, late }) {
  const strap = { position: 'absolute', top: rem(0.32), width: rem(0.22), height: rem(0.8), borderRadius: 1 }
  const disc = rem(0.95)
  return (
    <View style={styles.chipBox}>
      <View style={[strap, { left: CHIP / 2 - rem(0.32), backgroundColor: late, transform: [{ rotate: '-16deg' }] }]} />
      <View style={[strap, { left: CHIP / 2 + rem(0.1), backgroundColor: onDeep, transform: [{ rotate: '16deg' }] }]} />
      <View
        style={{
          position: 'absolute',
          top: rem(0.95),
          left: CHIP / 2 - disc / 2,
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          borderWidth: 2,
          borderColor: onDeep,
          backgroundColor: on,
        }}
      />
    </View>
  )
}

function SunChip({ on }) {
  const disc = rem(0.8)
  const ray = rem(0.26)
  return (
    <View style={styles.chipBox}>
      {Array.from({ length: 8 }, (_, i) => (
        <View
          key={i}
          style={{ position: 'absolute', left: CHIP / 2, top: CHIP / 2, width: 0, height: 0, transform: [{ rotate: `${i * 45}deg` }] }}
        >
          <View
            style={{ position: 'absolute', left: -rem(0.07), top: -disc / 2 - rem(0.1) - ray, width: rem(0.14), height: ray, borderRadius: 1, backgroundColor: on }}
          />
        </View>
      ))}
      <View
        style={{
          position: 'absolute',
          left: CHIP / 2 - disc / 2,
          top: CHIP / 2 - disc / 2,
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          backgroundColor: on,
        }}
      />
    </View>
  )
}

// Two leaves, one tipped each way, like the web chip.
function LeavesChip({ on, warm }) {
  const leaf = { position: 'absolute', width: rem(0.7), height: rem(1), borderTopLeftRadius: rem(0.7), borderBottomRightRadius: rem(0.7) }
  return (
    <View style={styles.chipBox}>
      <View style={[leaf, { left: CHIP / 2 - rem(0.7), top: CHIP / 2 - rem(0.65), backgroundColor: on, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[leaf, { left: CHIP / 2, top: CHIP / 2 - rem(0.35), backgroundColor: warm, transform: [{ rotate: '25deg' }] }]} />
    </View>
  )
}

// A lantern: rounded glowing body with a cap above and below.
function LanternChip({ on, onDeep }) {
  return (
    <View style={styles.chipBox}>
      <View
        style={{
          position: 'absolute',
          left: CHIP / 2 - rem(0.25),
          top: CHIP / 2 - rem(0.75),
          width: rem(0.5),
          height: rem(1.5),
          borderTopWidth: rem(0.2),
          borderBottomWidth: rem(0.2),
          borderColor: onDeep,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: CHIP / 2 - rem(0.475),
          top: CHIP / 2 - rem(0.575),
          width: rem(0.95),
          height: rem(1.15),
          borderRadius: rem(0.45),
          backgroundColor: on,
          shadowColor: on,
          shadowOpacity: 0.55,
          shadowRadius: 6,
        }}
      />
    </View>
  )
}

function DefaultChip({ n, on }) {
  const bit = rem(0.28)
  return (
    <View style={[styles.center, { flexDirection: 'row', gap: rem(0.16) }]}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ width: bit, height: bit, borderRadius: 1, backgroundColor: on }} />
      ))}
    </View>
  )
}

function CheerChipArt({ id, stage = 1, colors }) {
  const on = colors?.on || '#c9f24d'
  const ink = colors?.ink || '#f4f6fa'
  const onDeep = colors?.onDeep || on
  const panel2 = colors?.panel2 || '#1d212a'
  const panel3 = colors?.panel3 || '#242935'
  const line = colors?.line || '#2b3140'
  const shell = chipShell(colors)

  let art = null
  switch (id) {
    case 'lime':
      art = <LimeChip on={on} />
      break
    case 'spark':
      art = <SparkChip on={on} onDeep={onDeep} />
      break
    case 'tape':
      art = <TapeChip ink={ink} on={on} />
      break
    case 'paper':
      art = <PaperChip on={on} />
      break
    case 'night':
      art = <NightChip on={on} ink={ink} panel3={panel3} />
      break
    case 'boom':
      art = <BoomChip on={on} onDeep={onDeep} />
      break
    case 'dance':
      art = <DanceChip ink={ink} on={on} />
      break
    case 'stamp':
      art = <StampChip on={on} />
      break
    case 'rain':
      art = <RainChip on={on} />
      break
    case 'check':
      art = <CheckChip on={on} />
      break
    case 'bubble':
      art = <BubbleChip on={on} />
      break
    case 'flip':
      art = <FlipChip on={on} panel2={panel2} panel3={panel3} line={line} />
      break
    case 'confetti':
      art = <ConfettiChip on={on} onDeep={onDeep} late={colors?.late || '#6fb7ff'} ink={ink} />
      break
    case 'heart':
      art = <HeartChip on={on} />
      break
    case 'launch':
      art = <LaunchChip on={on} onDeep={onDeep} ink={ink} />
      break
    case 'medal':
      art = <MedalChip on={on} onDeep={onDeep} late={colors?.late || '#6fb7ff'} />
      break
    case 'sun':
      art = <SunChip on={on} />
      break
    case 'leaves':
      art = <LeavesChip on={on} warm={colors?.miss || '#ff6f61'} />
      break
    case 'lantern':
      art = <LanternChip on={on} onDeep={onDeep} />
      break
    case 'gift':
      art = <GiftChip on={on} ink={ink} />
      break
    case 'popcorn':
      art = <PopcornChip on={on} />
      break
    case 'snowflake':
    case 'bell':
    case 'disco':
    case 'ribbon':
    case 'clink':
    case 'balldrop':
    case 'bolt':
    case 'splat':
    case 'butterfly':
    case 'bounce':
      art = <WinterChip id={id} on={on} onDeep={onDeep} ink={ink} inkSoft={colors?.inkSoft || ink} late={colors?.late || '#6fb7ff'} />
      break
    default: {
      const n = Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
      art = <DefaultChip n={n} on={on} />
    }
  }

  return <View style={[styles.cheerChip, shell]}>{art}</View>
}

// A shop buddy is alive: it blinks now and then and sways a little from
// where it hangs. Still under Less motion and the phone's Reduce Motion.
const SWAY_MS = 1800
const LIFE_SWAYS = 8
const LIFE_BLINKS = 5
function useBuddyLife(alive) {
  const reduce = useReduceMotion()
  const on = alive && !reduce
  const blink = useSharedValue(0)
  const sway = useSharedValue(0.5)
  useEffect(() => {
    if (!on) return undefined
    sway.value = 0
    // A few sways and blinks, then it rests, so it is not animating all night.
    sway.value = withSequence(
      withRepeat(withTiming(1, { duration: SWAY_MS, easing: Easing.inOut(Easing.sin) }), LIFE_SWAYS, true),
      withTiming(0.5, { duration: SWAY_MS / 2, easing: Easing.out(Easing.sin) }),
    )
    let timer = null
    let blinks = 0
    const later = () => {
      if (blinks >= LIFE_BLINKS) return
      blinks += 1
      timer = setTimeout(() => {
        blink.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 120 }))
        later()
      }, 2200 + Math.random() * 2600)
    }
    later()
    return () => {
      clearTimeout(timer)
      cancelAnimation(sway)
      cancelAnimation(blink)
      sway.value = 0.5
      blink.value = 0
    }
  }, [blink, on, sway])
  const idle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(sway.value - 0.5) * 6}deg` }, { translateY: -Math.abs(sway.value - 0.5) * 3 }],
  }))
  return { blink: on ? blink : null, idle: on ? idle : null }
}

export function BuddyChip({ id, alive = false }) {
  const life = useBuddyLife(alive)
  if (!id) return null
  return (
    <View style={styles.buddyChip}>
      <Animated.View style={[styles.buddySway, life.idle]} renderToHardwareTextureAndroid={Boolean(life.idle)} shouldRasterizeIOS={Boolean(life.idle)}>
        <Slot fallback={<BuddyPlain id={id} width={28} height={34} />}>
          <BuddyArt id={id} width={28} height={34} blink={life.blink} />
        </Slot>
      </Animated.View>
    </View>
  )
}

// The buddy with what it has on: wings behind, the rest on top.
function Dressed({ id, worn, tone, width, height, blink }) {
  const { behind, front } = wornLayers(worn)
  if (!behind.length && !front.length) return <BuddyArt id={id} width={width} height={height} blink={blink} />
  return (
    <View style={{ width, height }}>
      <AccessoryLayer ids={behind} buddyId={id} tone={tone} width={width} height={height} />
      <BuddyArt id={id} width={width} height={height} blink={blink} />
      <AccessoryLayer ids={front} buddyId={id} tone={tone} width={width} height={height} />
    </View>
  )
}

// A shop tile: the buddy wearing just this one item, small enough that wings
// fit. Eye items are too small to read on a whole buddy, so those tiles show
// the face up close instead.
// big: the Collection grid, where a tiny buddy makes every hat look alike.
export function AccessoryChip({ id, buddyId = 'ant', tone, big = false }) {
  const slot = accessoryById(id)?.slot || 'head'
  const box = big ? CHIP_BIG : CHIP
  if (slot === 'eyes') {
    const w = big ? 132 : 72
    const h = (w * 58) / 48
    const k = w / 48
    return (
      <View style={[styles.accessoryChip, styles.accessoryChipZoom, big && styles.accessoryChipBig]}>
        <View style={{ position: 'absolute', left: box / 2 - 24 * k, top: box / 2 - eyeLine(buddyId) * k, width: w, height: h }}>
          <Dressed id={buddyId} worn={{ eyes: id }} tone={tone} width={w} height={h} />
        </View>
      </View>
    )
  }
  return (
    <View style={[styles.accessoryChip, big && styles.accessoryChipBig]}>
      <Dressed id={buddyId} worn={{ [slot]: id }} tone={tone} width={big ? 58 : 28} height={big ? 70 : 34} />
    </View>
  )
}

// What your buddy has on, and the look's colour for the parts that take it.
// Read from the shelf, so every card that hangs your buddy dresses it the same.
function useMyOutfit() {
  const book = currentBook(readShelf())
  const colors = useLookColors(activeLook(book))
  return { worn: book ? normalizePurse(book).worn : {}, tone: colors.on }
}

const TALL_EARS = new Set(['rabbit', 'fox', 'duck'])

export function BuddyHang({ id, inline = false, alive = false, worn = null, tone = '' }) {
  const life = useBuddyLife(alive)
  const mine = useMyOutfit()
  if (!id) return null
  const width = inline ? 48 : 40
  const height = inline ? 58 : 48
  // The owl's face sits lower in the same box than the other three.
  const lift = id === 'owl' ? styles.buddyOwl : null
  const outfit = worn || mine.worn
  // The card clips at its top edge and the buddy hangs past it, so anything
  // worn above the head (a hat, a cloud, antennae) would be cut off. Hang
  // lower then, so it fits on the card.
  const drop = !inline && (outfit.head || outfit.around || outfit.back === 'butterfly' || outfit.back === 'bee')
    ? styles.buddyDropped
    // Long ears reach the top of the drawing: hang just low enough to keep them.
    : !inline && TALL_EARS.has(id)
      ? styles.buddyTallEars
      : null
  return (
    <Animated.View style={[inline ? styles.buddyInline : styles.buddyHang, lift, drop, styles.buddySway, life.idle]} pointerEvents="none" renderToHardwareTextureAndroid={Boolean(life.idle)} shouldRasterizeIOS={Boolean(life.idle)}>
      <Slot fallback={<BuddyPlain id={id} width={width} height={height} />}>
        <Dressed id={id} worn={outfit} tone={tone || mine.tone} width={width} height={height} blink={life.blink} />
      </Slot>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  premiumWrap: {
    width: CHIP + 6,
    height: CHIP + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: CHIP_R + 3,
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  premiumHalo: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: CHIP_R + 5,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  lookInset: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: CHIP_R - 1,
    opacity: 0.55,
  },
  lookChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rem(0.16),
    overflow: 'hidden',
  },
  cheerChip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: CHIP,
    height: CHIP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBox: {
    width: CHIP,
    height: CHIP,
    position: 'relative',
  },
  tapeChip: {
    flex: 1,
    gap: rem(0.2),
    paddingVertical: rem(0.32),
    paddingHorizontal: rem(0.28),
    justifyContent: 'center',
  },
  paperChip: { alignItems: 'center', justifyContent: 'center' },
  flipChip: {
    transform: [{ perspective: rem(2.4) }],
  },
  stampChip: { alignItems: 'center', justifyContent: 'center' },
  danceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: rem(0.28),
    paddingBottom: rem(0.22),
    paddingHorizontal: rem(0.15),
  },
  rainChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: rem(0.22),
    paddingTop: rem(0.28),
    paddingHorizontal: rem(0.2),
    paddingBottom: rem(0.2),
  },
  stampText: {
    fontFamily: fonts.display,
    fontSize: rem(0.58),
    fontWeight: '700',
    letterSpacing: rem(0.1),
  },
  buddyChip: { width: CHIP, height: CHIP, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  accessoryChip: { width: CHIP, height: CHIP, alignItems: 'center', justifyContent: 'center' },
  accessoryChipZoom: { overflow: 'hidden', borderRadius: CHIP_R },
  accessoryChipBig: { width: CHIP_BIG, height: CHIP_BIG },
  buddyHang: { position: 'absolute', top: -8, right: 12, zIndex: 2 },
  buddyInline: { alignItems: 'center', justifyContent: 'center' },
  buddyOwl: { marginTop: -6 },
  buddyDropped: { top: 6 },
  buddyTallEars: { top: 0 },
  // A hanging buddy sways from its top.
  buddySway: { transformOrigin: 'top' },
})

// A shop or Collection list draws dozens of these; a tap elsewhere on the
// screen (a sheet, a peek) must not redraw them all.
export const LookChip = memo(LookChipArt)
export const CheerChip = memo(CheerChipArt)
