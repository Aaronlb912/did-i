import { useEffect } from 'react'
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
import { ROCKET_BODY, ROCKET_FINS, ROCKET_FLAME, ROCKET_VIEW } from '../../src/lib/cheer-pops.js'
import { Slot } from './Slot.jsx'
import { fonts } from '../theme.js'

const R = 16
const CHIP = 2.4 * R
const CHIP_R = 0.55 * R

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
  orchid: { on: '#dd7bff' },
  chalk: { on: '#ecebe6', bg: '#181817', glow: 'rgba(236, 235, 230, 0.3)' },
  oat: { on: '#f0e6d8', bg: '#141311', glow: 'rgba(240, 230, 216, 0.3)' },
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

export function LookChip({ id, colors }) {
  const theme = useTheme()
  const meta = isGemLook(id) ? gemLookChipMeta(id, theme) || LOOK_META[id] : LOOK_META[id] || LOOK_META.lime
  const on = meta.on
  const premium = isGemLook(id)
  const dot = rem(0.34)
  const dotStyle = (i) => ({
    width: dot,
    height: dot,
    borderRadius: dot / 2,
    backgroundColor: on,
    ...(meta.dotGlow
      ? {
          shadowColor: meta.dotGlow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 4,
        }
      : null),
  })
  const chipBg = meta.bg
  const chipGlow = meta.glow
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

  if (!premium) return chip

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

export function CheerChip({ id, stage = 1, colors }) {
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
function useBuddyLife(alive) {
  const reduce = useReduceMotion()
  const on = alive && !reduce
  const blink = useSharedValue(0)
  const sway = useSharedValue(0.5)
  useEffect(() => {
    if (!on) return undefined
    sway.value = 0
    sway.value = withRepeat(withTiming(1, { duration: SWAY_MS, easing: Easing.inOut(Easing.sin) }), -1, true)
    let timer = null
    const later = () => {
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
      <Animated.View style={[styles.buddySway, life.idle]}>
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
export function AccessoryChip({ id, buddyId = 'ant', tone }) {
  const slot = accessoryById(id)?.slot || 'head'
  if (slot === 'eyes') {
    const w = 72
    const h = (w * 58) / 48
    const k = w / 48
    return (
      <View style={[styles.accessoryChip, styles.accessoryChipZoom]}>
        <View style={{ position: 'absolute', left: CHIP / 2 - 24 * k, top: CHIP / 2 - eyeLine(buddyId) * k, width: w, height: h }}>
          <Dressed id={buddyId} worn={{ eyes: id }} tone={tone} width={w} height={h} />
        </View>
      </View>
    )
  }
  return (
    <View style={styles.accessoryChip}>
      <Dressed id={buddyId} worn={{ [slot]: id }} tone={tone} width={28} height={34} />
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
    : null
  return (
    <Animated.View style={[inline ? styles.buddyInline : styles.buddyHang, lift, drop, styles.buddySway, life.idle]} pointerEvents="none">
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
  buddyHang: { position: 'absolute', top: -8, right: 12, zIndex: 2 },
  buddyInline: { alignItems: 'center', justifyContent: 'center' },
  buddyOwl: { marginTop: -6 },
  buddyDropped: { top: 6 },
  // A hanging buddy sways from its top.
  buddySway: { transformOrigin: 'top' },
})
