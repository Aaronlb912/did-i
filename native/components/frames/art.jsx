// The art for every card frame, ported from the approved mockup (frames.html).
// Each entry draws an `under` layer (behind the card, for frame material) and
// an `over` layer (on top of the card edge). Both are drawn in card
// coordinates and may reach PAD px past the card. Material colors (gold,
// walnut, neon) are literal on purpose; anything that follows the look reads
// colors.on.
import { useLayoutEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import * as Reanimated from 'react-native-reanimated'
import { t } from '../../../src/lib/i18n.js'
import {
  conicWedges,
  edgePoint,
  litPath,
  moonIllum,
  moonWeek,
  openTopPath,
  ringProgress,
  rrLength,
  rrPath,
  seeded,
  smoothConic,
  vineLayout,
} from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll, useSharedValue } from './runtime.jsx'

const { withTiming } = Reanimated

const GOLD = '#c9a34e'
const TAU = Math.PI * 2

/* ---------- Small shared pieces ---------- */

/** A stroke centered at offset k from the card edge (negative = outside). */
function Ring({ f, k, color, width, opacity = 1, dash, cap }) {
  const S = svgAll()
  return (
    <S.Path
      d={rrPath(k, k, f.w - 2 * k, f.h - 2 * k, Math.max(0, f.R - k))}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeOpacity={opacity}
      strokeDasharray={dash}
      strokeLinecap={cap}
    />
  )
}

/** A fake blur: thin strokes stepping outward with falling opacity. */
function Halo({ f, from = 0, spread = 14, color, opacity = 0.45, inward = 0 }) {
  const S = svgAll()
  const steps = f.still ? 3 : Math.max(3, Math.round(spread / 2))
  const out = []
  for (let i = 0; i < steps; i++) {
    const k = from - 1 - i * 2
    const a = opacity * Math.pow(1 - i / steps, 1.6)
    out.push(<S.Path key={`o${i}`} d={rrPath(k, k, f.w - 2 * k, f.h - 2 * k, Math.max(0, f.R - k))} fill="none" stroke={color} strokeWidth={2} strokeOpacity={a} />)
  }
  const inSteps = Math.min(f.still ? 2 : 99, Math.round(inward / 2))
  for (let i = 0; i < inSteps; i++) {
    const k = from + 1 + i * 2
    const a = opacity * 0.6 * Math.pow(1 - i / inSteps, 1.6)
    out.push(<S.Path key={`i${i}`} d={rrPath(k, k, f.w - 2 * k, f.h - 2 * k, Math.max(0, f.R - k))} fill="none" stroke={color} strokeWidth={2} strokeOpacity={a} />)
  }
  return out
}

/** Filled rounded rect reaching o px past the card (frame material). */
function Slab({ f, o, fill, stroke, strokeWidth }) {
  const S = svgAll()
  return <S.Path d={rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, f.R + o)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
}

/** The same art in all four corners, rotated, like the mockup's cornerSet. */
// Cards are round, so corner art is trimmed to a rounded edge o px outside the card.
function RoundClip({ f, o, id, children }) {
  const S = svgAll()
  return (
    <>
      <S.Defs>
        <S.ClipPath id={id}>
          <S.Path d={rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, f.R + o)} />
        </S.ClipPath>
      </S.Defs>
      <S.G clipPath={`url(#${id})`}>{children}</S.G>
    </>
  )
}

function Corners({ f, size, off, view = 64, children }) {
  const S = svgAll()
  const k = size / view
  const { w, h } = f
  const spots = [
    [off, off, 0],
    [w - off, off, 90],
    [w - off, h - off, 180],
    [off, h - off, 270],
  ]
  return spots.map(([x, y, r]) => (
    <S.G key={r} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
      {children}
    </S.G>
  ))
}

function GoldDefs({ id = 'gg' }) {
  const S = svgAll()
  return (
    <S.Defs>
      <S.LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor="#fff1c2" />
        <S.Stop offset="0.5" stopColor="#e2b75a" />
        <S.Stop offset="1" stopColor="#8a6420" />
      </S.LinearGradient>
    </S.Defs>
  )
}

/** A view clipped to the rounded rect o px outside the card. Its content sits under the card. */
function ClipBox({ f, o, children }) {
  return (
    <View pointerEvents="none" style={[styles.clip, { left: -o, top: -o, width: f.w + 2 * o, height: f.h + 2 * o, borderRadius: f.R + o }]}>
      {children}
    </View>
  )
}

/** A conic gradient that turns, under a rounded ring. The card covers the middle. */
function SpinConic({ f, o, colors, period, opacity = 1 }) {
  const S = svgAll()
  const W = f.w + 2 * o
  const H = f.h + 2 * o
  const D = Math.ceil(Math.hypot(W, H)) + 4
  const wedges = useMemo(() => conicWedges(D / 2, D / 2, D / 2 + 2, smoothConic(colors, f.still ? 12 : 72)), [D, colors, f.still])
  const spin = (time) => {
    'worklet'
    return { transform: [{ rotate: `${((time / period) % 1) * 360}deg` }] }
  }
  return (
    <ClipBox f={f} o={o}>
      <Moving clock={f.clock} fn={spin} style={{ position: 'absolute', width: D, height: D, left: (W - D) / 2, top: (H - D) / 2, opacity }}>
        <S.Svg width={D} height={D}>
          {wedges.map((wd, i) => (
            <S.Path key={i} d={wd.d} fill={wd.fill} />
          ))}
        </S.Svg>
      </Moving>
    </ClipBox>
  )
}

/** A diagonal band of light that slides across a clipped ring. */
function Sweep({ f, o, period, still = 0.2, alpha = 0.6 }) {
  const S = svgAll()
  const W = f.w + 2 * o
  const H = f.h + 2 * o
  const BW = W * 1.8
  const BH = H * 1.8
  const slide = (time) => {
    'worklet'
    const q = (time / period) % 1
    let k
    if (q < still) k = 0
    else if (q > 0.6) k = 1
    else {
      const x = (q - still) / (0.6 - still)
      k = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
    }
    return { transform: [{ translateX: (-0.6 + 1.2 * k) * BW }] }
  }
  return (
    <ClipBox f={f} o={o}>
      <Moving clock={f.clock} fn={slide} style={{ position: 'absolute', width: BW, height: BH, left: (W - BW) / 2, top: (H - BH) / 2 }}>
        <S.Svg width={BW} height={BH}>
          <S.Defs>
            <S.LinearGradient id="sw" x1="0" y1="0" x2="1" y2="0.47">
              <S.Stop offset="0.42" stopColor="#ffffff" stopOpacity="0" />
              <S.Stop offset="0.5" stopColor="#ffffff" stopOpacity={alpha} />
              <S.Stop offset="0.58" stopColor="#ffffff" stopOpacity="0" />
            </S.LinearGradient>
          </S.Defs>
          <S.Rect x="0" y="0" width={BW} height={BH} fill="url(#sw)" />
        </S.Svg>
      </Moving>
    </ClipBox>
  )
}

function Layer({ f, children }) {
  return (
    <SvgLayer w={f.w} h={f.h}>
      {children}
    </SvgLayer>
  )
}

function Mover({ f, fn, children }) {
  return (
    <Moving clock={f.clock} fn={fn} style={styles.fill}>
      {children}
    </Moving>
  )
}

/* ---------- Coin frames (still) ---------- */

function FirstOver({ f }) {
  const S = svgAll()
  const gap = 26
  const mid = f.w / 2
  return (
    <Layer f={f}>
      <S.Path d={openTopPath(f.w, f.h, f.R, gap)} fill="none" stroke={f.c.accent} strokeWidth={2} strokeLinecap="round" />
      <S.Circle cx={mid} cy={0} r={11} fill={f.c.accent} />
      <S.Circle cx={mid + 5} cy={-3} r={10} fill={f.c.card} />
      <S.Circle cx={mid - gap - 8} cy={0} r={1.6} fill={f.c.accent} />
      <S.Circle cx={mid + gap + 8} cy={0} r={1.6} fill={f.c.accent} />
    </Layer>
  )
}

function ThinOver({ f }) {
  return (
    <Layer f={f}>
      <Ring f={f} k={1} color={f.c.accent} width={2} />
      <Ring f={f} k={-5.5} color={f.c.accent} width={1} opacity={0.4} />
    </Layer>
  )
}

function DoubleOver({ f }) {
  return (
    <Layer f={f}>
      <Ring f={f} k={1} color={f.c.accent} width={2} />
      <Ring f={f} k={-3.5} color={f.c.accent} width={1} opacity={0.35} />
      <Ring f={f} k={-7} color={f.c.accent} width={2} />
    </Layer>
  )
}

function DottedOver({ f }) {
  return (
    <Layer f={f}>
      <Ring f={f} k={1} color={f.c.accent} width={4} dash="0 12" cap="round" />
    </Layer>
  )
}

// Torn tape edge, from the mockup's clip-path, in a 96 x 28 box.
const TAPE = [[0, 8], [4, 0], [8, 10], [12, 0], [16, 8], [20, 0], [100, 0], [96, 10], [100, 20], [96, 30], [100, 40], [96, 50], [100, 60], [96, 70], [100, 80], [96, 90], [100, 100], [0, 100], [4, 90], [0, 80], [4, 70], [0, 60], [4, 50], [0, 40], [4, 30], [0, 20]]
const TAPE_D = `M ${TAPE.map(([x, y]) => `${(x * 96) / 100} ${(y * 28) / 100}`).join(' L ')} Z`

function WashiOver({ f }) {
  const S = svgAll()
  return (
    <Layer f={f}>
      <S.Defs>
        <S.Pattern id="wa" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <S.Rect x="0" y="0" width="7" height="14" fill="#f2a7c3" />
          <S.Rect x="7" y="0" width="7" height="14" fill="#ffd3e2" />
        </S.Pattern>
        <S.Pattern id="wb" patternUnits="userSpaceOnUse" width="10" height="10">
          <S.Rect x="0" y="0" width="10" height="10" fill="#8fb6dc" />
          <S.Circle cx="5" cy="5" r="2" fill="#ffffff" />
        </S.Pattern>
      </S.Defs>
      <S.G transform={`translate(26 2) rotate(-38) translate(-48 -14)`} opacity={0.88}>
        <S.Path d={TAPE_D} fill="url(#wa)" />
      </S.G>
      <S.G transform={`translate(${f.w - 26} ${f.h - 4}) rotate(-38) translate(-48 -14)`} opacity={0.88}>
        <S.Path d={TAPE_D} fill="url(#wb)" />
      </S.G>
    </Layer>
  )
}

const HEART = 'M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z'

function PixelOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  return (
    <Layer f={f}>
      <S.Rect x={-2} y={-2} width={w + 4} height={h + 4} rx={f.R + 2} fill="none" stroke={f.c.accent} strokeWidth={4} />
      <S.Rect x={-6} y={-6} width={w + 12} height={h + 12} rx={f.R + 6} fill="none" stroke={f.c.card} strokeWidth={4} />
      <S.Rect x={-10} y={-10} width={w + 20} height={h + 20} rx={f.R + 10} fill="none" stroke={f.c.ink} strokeWidth={4} />
      {[[-14, -14], [w - 14, -14], [-14, h - 10], [w - 14, h - 10]].map(([x, y]) => (
        <S.Path key={`${x}${y}`} d={HEART} fill="#ef6a5b" transform={`translate(${x} ${y}) scale(4)`} />
      ))}
    </Layer>
  )
}

function StitchUnder({ f }) {
  const S = svgAll()
  return (
    <Layer f={f}>
      <S.Defs>
        <S.RadialGradient id="le" cx="0.3" cy="0.2" r="0.9">
          <S.Stop offset="0" stopColor="#8b5a35" />
          <S.Stop offset="0.7" stopColor="#5a361d" />
          <S.Stop offset="1" stopColor="#4a2c17" />
        </S.RadialGradient>
      </S.Defs>
      <Slab f={f} o={10} fill="url(#le)" />
      <Ring f={f} k={-9.5} color="rgba(255,220,180,0.25)" width={1} />
      <Ring f={f} k={-4} color="rgba(255,236,210,0.8)" width={2} dash="6 4" />
    </Layer>
  )
}

function PolaroidUnder({ f }) {
  const S = svgAll()
  const day = f.p.date instanceof Date ? f.p.date : new Date()
  let label = ''
  try {
    label = day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  } catch {
    label = day.toDateString()
  }
  const n = Number(f.p.streak) || 0
  // Thumbnails show the date only: a sample number would read as your streak.
  if (n > 0 && !f.still) label += ` · ${n === 1 ? t('tonight.streakOne') : t('tonight.streakMany', { n })}`
  return (
    <Layer f={f}>
      <S.Rect x={-12} y={-10} width={f.w + 24} height={f.h + 54} rx={f.R + 12} fill="#000000" opacity={0.18} />
      <S.Rect x={-12} y={-12} width={f.w + 24} height={f.h + 52} rx={f.R + 12} fill="#faf8f3" />
      <S.Text x={f.w / 2} y={f.h + 27} fontSize={15} fontStyle="italic" fontWeight="600" fill="#2f3a4f" textAnchor="middle">
        {label}
      </S.Text>
    </Layer>
  )
}

function WoodUnder({ f }) {
  const S = svgAll()
  const W = f.w + 20
  const H = f.h + 20
  const cx = -10 + 0.2 * W
  const cy = -10 + 1.2 * H
  const r = Math.hypot(Math.max(cx + 10, W - cx - 10), cy + 10) + 4
  const stops = useMemo(() => {
    // A thumbnail needs only a few grain rings.
    const band = f.still ? r / 6 : Math.max(18, r / 28)
    const k = band / 18
    const parts = [[0, 6, '#8a5a33'], [6, 9, '#7a4c29'], [9, 15, '#94643b'], [15, 18, '#6f4424']]
    const out = []
    for (let base = 0; base < r; base += band) {
      for (const [a, b, col] of parts) {
        out.push([Math.min(1, (base + a * k) / r), col], [Math.min(1, (base + b * k) / r), col])
      }
    }
    return out
  }, [r, f.still])
  return (
    <Layer f={f}>
      <S.Defs>
        <S.RadialGradient id="wd" gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} fx={cx} fy={cy}>
          {stops.map(([o, col], i) => (
            <S.Stop key={i} offset={o} stopColor={col} />
          ))}
        </S.RadialGradient>
      </S.Defs>
      <Slab f={f} o={10} fill="url(#wd)" />
      <Ring f={f} k={-9.5} color="rgba(255,230,200,0.35)" width={1} />
      <Ring f={f} k={-1} color="#3d2512" width={2} />
    </Layer>
  )
}

function Bouquet() {
  const S = svgAll()
  return (
    <>
      {[[40, 8, 0], [64, 30, 40], [18, 40, 80]].map(([x, y, r]) => (
        <S.Ellipse key={`l${x}`} cx={x} cy={y} rx={15} ry={6} fill="url(#lf2)" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      {[[22, 22, 11], [46, 16, 8], [16, 48, 8], [38, 38, 6]].map(([x, y, s]) => (
        <S.G key={`f${x}${y}`} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((r) => (
            <S.Ellipse key={r} rx={s} ry={s * 0.62} cx={s * 0.8} fill="url(#pt2)" transform={`rotate(${r})`} />
          ))}
          <S.Circle r={s * 0.42} fill="#ffd86b" />
        </S.G>
      ))}
    </>
  )
}

function FlowersOver({ f }) {
  const S = svgAll()
  return (
    <Layer f={f}>
      <S.Defs>
        <S.RadialGradient id="pt2">
          <S.Stop offset="0" stopColor="#fff0f6" />
          <S.Stop offset="0.6" stopColor="#f7b3cc" />
          <S.Stop offset="1" stopColor="#e77aa4" />
        </S.RadialGradient>
        <S.LinearGradient id="lf2" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#9be27f" />
          <S.Stop offset="1" stopColor="#3f8a3a" />
        </S.LinearGradient>
      </S.Defs>
      <Ring f={f} k={0.5} color="rgba(242,167,195,0.45)" width={1} />
      <S.G transform="translate(-20 -20) scale(1.2)">
        <Bouquet />
      </S.G>
      <S.G transform={`translate(${f.w + 20} ${f.h + 20}) rotate(180) scale(1.2)`}>
        <Bouquet />
      </S.G>
    </Layer>
  )
}

const BURST = [[50, 0], [61, 22], [85, 10], [78, 35], [100, 42], [80, 58], [95, 80], [70, 76], [62, 100], [48, 80], [30, 98], [28, 74], [4, 82], [18, 60], [0, 44], [22, 36], [12, 12], [36, 22]]
const BURST_D = `M ${BURST.map(([x, y]) => `${(x * 92) / 100 - 46} ${(y * 92) / 100 - 46}`).join(' L ')} Z`

function ComicUnder({ f }) {
  const S = svgAll()
  return (
    <Layer f={f}>
      <S.Defs>
        <S.Pattern id="ht" patternUnits="userSpaceOnUse" width="8" height="8">
          <S.Rect x="0" y="0" width="8" height="8" fill="#ff5a36" />
          <S.Circle cx="4" cy="4" r="2" fill="#ffd23f" />
        </S.Pattern>
      </S.Defs>
      <S.Path d={rrPath(-11, -11, f.w + 22, f.h + 22, f.R + 4)} fill="url(#ht)" stroke="#111111" strokeWidth={4} />
    </Layer>
  )
}

function ComicOver({ f }) {
  const S = svgAll()
  const word = `${String(t('tonight.answerDid')).toLocaleUpperCase()}!`
  return (
    <Layer f={f}>
      <Ring f={f} k={2} color="#111111" width={4} />
      <S.G transform={`translate(${f.w - 20} 22) rotate(12)`}>
        <S.Path d={BURST_D} fill="#ffe14a" stroke="#111111" strokeWidth={2} strokeLinejoin="round" />
        <S.Text x={0} y={9} fontSize={24} fontWeight="900" fill="#111111" textAnchor="middle">
          {word}
        </S.Text>
      </S.G>
    </Layer>
  )
}

function MoonDisc({ p, r }) {
  const S = svgAll()
  return (
    <S.G>
      <S.Circle r={r} fill="#262c3a" />
      <S.Path d={litPath(p, r)} fill="url(#mlit)" />
      <S.Circle r={r} fill="none" stroke="rgba(241,230,196,0.35)" strokeWidth={0.8} />
    </S.G>
  )
}

function MoonOver({ f }) {
  const S = svgAll()
  const dayKey = f.p.date instanceof Date ? f.p.date.toDateString() : new Date().toDateString()
  const { p, week } = useMemo(() => moonWeek(new Date(dayKey)), [dayKey])
  const halo = 0.15 + 0.35 * moonIllum(p)
  return (
    <Layer f={f}>
      <S.Defs>
        <S.RadialGradient id="mlit" cx="0.4" cy="0.35" r="0.6">
          <S.Stop offset="0" stopColor="#fffaf0" />
          <S.Stop offset="0.7" stopColor="#f1e6c4" />
          <S.Stop offset="1" stopColor="#d8c99a" />
        </S.RadialGradient>
        <S.RadialGradient id="mhalo">
          <S.Stop offset="0" stopColor="#f1e6c4" stopOpacity={halo} />
          <S.Stop offset="1" stopColor="#f1e6c4" stopOpacity="0" />
        </S.RadialGradient>
      </S.Defs>
      <S.Path d={openTopPath(f.w, f.h, f.R, 34)} fill="none" stroke="rgba(241,230,196,0.55)" strokeWidth={1.5} />
      <S.G transform={`translate(${f.w / 2} -2)`}>
        <S.Circle r={44} fill="url(#mhalo)" />
        <MoonDisc p={p} r={20} />
        <S.Circle r={5} cx={-6} cy={4} fill="rgba(0,0,0,0.08)" />
        <S.Circle r={3} cx={7} cy={-7} fill="rgba(0,0,0,0.07)" />
      </S.G>
      {week.map((d, i) => (
        <S.G key={i} transform={`translate(${f.w * (0.12 + i * 0.127)} ${f.h + 1})`}>
          {d.today ? <S.Circle r={12} fill="none" stroke="rgba(241,230,196,0.6)" strokeWidth={1} /> : null}
          <MoonDisc p={d.p} r={d.today ? 8 : 6.5} />
        </S.G>
      ))}
    </Layer>
  )
}

function FiligreeArt() {
  const S = svgAll()
  return (
    <>
      <S.Path d="M6 58 C6 26 26 6 58 6" fill="none" stroke="url(#gg)" strokeWidth={3} />
      <S.Path d="M14 54 C16 32 32 16 54 14" fill="none" stroke="url(#gg)" strokeWidth={1.6} />
      <S.Path d="M6 22 q10 -2 12 -12 q2 10 12 12 q-10 2 -12 12 q-2 -10 -12 -12z" fill="url(#gg)" />
      <S.Circle cx={34} cy={34} r={3} fill="url(#gg)" />
      <S.Path d="M40 8 q6 4 4 10 M8 40 q4 6 10 4" fill="none" stroke="url(#gg)" strokeWidth={1.4} />
    </>
  )
}

function FiligreeOver({ f }) {
  return (
    <Layer f={f}>
      <GoldDefs />
      <Ring f={f} k={0.75} color={GOLD} width={1.5} />
      <Ring f={f} k={6.5} color="rgba(201,163,78,0.5)" width={1} />
      <Corners f={f} size={64} off={-4}>
        <FiligreeArt />
      </Corners>
    </Layer>
  )
}

function DecoUnder({ f }) {
  return (
    <Layer f={f}>
      <Slab f={f} o={10} fill="#0c0c0c" />
      <Ring f={f} k={-9} color={GOLD} width={2} />
      <Ring f={f} k={-4.5} color={GOLD} width={1} />
      <Ring f={f} k={-0.75} color={GOLD} width={1.5} />
    </Layer>
  )
}

function DecoOver({ f }) {
  const S = svgAll()
  return (
    <Layer f={f}>
      <GoldDefs />
      <RoundClip f={f} o={10} id="dcc">
      <Corners f={f} size={72} off={-16}>
        <S.Path d="M3 3 L50 3 A47 47 0 0 1 3 50 Z" fill="none" stroke="url(#gg)" strokeWidth={2} />
        <S.Path d="M3 3 L36 3 A33 33 0 0 1 3 36 Z" fill="none" stroke="url(#gg)" strokeWidth={1.4} />
        <S.Path d="M3 3 L20 3 A17 17 0 0 1 3 20 Z" fill="url(#gg)" />
        {[15, 30, 45, 60, 75].map((a) => (
          <S.Line key={a} x1={3} y1={3} x2={3 + 47 * Math.cos((a * Math.PI) / 180)} y2={3 + 47 * Math.sin((a * Math.PI) / 180)} stroke="url(#gg)" strokeWidth={1} />
        ))}
      </Corners>
      </RoundClip>
    </Layer>
  )
}

function MarbleUnder({ f }) {
  const S = svgAll()
  const W = f.w + 20
  const H = f.h + 20
  const veins = useMemo(() => {
    const rnd = seeded(7)
    const out = []
    for (let i = 0; i < (f.still ? 4 : 9); i++) {
      const y0 = -10 + rnd() * H
      const y1 = y0 + (rnd() - 0.3) * H * 0.7
      out.push({
        d: `M -14 ${y0} C ${W * 0.3} ${y0 + (rnd() - 0.5) * 120}, ${W * 0.6} ${y1 + (rnd() - 0.5) * 120}, ${W + 4} ${y1}`,
        width: 0.6 + rnd() * 1.8,
        opacity: 0.25 + rnd() * 0.35,
      })
    }
    return out
  }, [W, H, f.still])
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="mb" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#f2f0ec" />
          <S.Stop offset="0.45" stopColor="#dcd8d1" />
          <S.Stop offset="0.7" stopColor="#ece9e4" />
          <S.Stop offset="1" stopColor="#c9c4bb" />
        </S.LinearGradient>
        <S.ClipPath id="mc">
          <S.Path d={rrPath(-10, -10, W, H, f.R + 10)} />
        </S.ClipPath>
      </S.Defs>
      <Slab f={f} o={10} fill="url(#mb)" />
      <S.G clipPath="url(#mc)">
        {veins.map((v, i) => (
          <S.Path key={i} d={v.d} fill="none" stroke="#8f887d" strokeWidth={v.width} strokeOpacity={v.opacity} />
        ))}
      </S.G>
      <Ring f={f} k={-9.5} color="rgba(255,255,255,0.7)" width={1} />
      <Ring f={f} k={-0.75} color="#b9b2a6" width={1.5} />
    </Layer>
  )
}

/* ---------- Gem frames (animated) ---------- */

function GlowOver({ f }) {
  const breathe = (time) => {
    'worklet'
    return { opacity: 0.55 + 0.45 * (0.5 - 0.5 * Math.cos((TAU * time) / 3.4)) }
  }
  return (
    <>
      <Mover f={f} fn={breathe}>
        <Layer f={f}>
          <Halo f={f} from={0} spread={22} color={f.c.accent} opacity={0.5} />
        </Layer>
      </Mover>
      <Layer f={f}>
        <Ring f={f} k={0.75} color={f.c.accent} width={1.5} />
        <Ring f={f} k={-0.75} color={f.c.accent} width={1.5} />
      </Layer>
    </>
  )
}

const SILVER = ['#6f7783', '#e9edf2', '#8b939e', '#f7f9fb', '#727a86', '#dfe4ea', '#6f7783']

function SilverUnder({ f }) {
  return (
    <>
      <SpinConic f={f} o={10} colors={SILVER} period={9} />
      <Layer f={f}>
        <Ring f={f} k={-9.5} color="rgba(255,255,255,0.35)" width={1} />
      </Layer>
    </>
  )
}

function SilverOver({ f }) {
  return (
    <Layer f={f}>
      <Ring f={f} k={6.5} color="rgba(180,190,205,0.45)" width={1} />
    </Layer>
  )
}

function GoldUnder({ f }) {
  const S = svgAll()
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#7a5414" />
            <S.Stop offset="0.22" stopColor="#f8dc8a" />
            <S.Stop offset="0.4" stopColor="#b8892b" />
            <S.Stop offset="0.52" stopColor="#fff1c2" />
            <S.Stop offset="0.66" stopColor="#a87a24" />
            <S.Stop offset="0.84" stopColor="#f3d27a" />
            <S.Stop offset="1" stopColor="#7a5414" />
          </S.LinearGradient>
        </S.Defs>
        <Halo f={f} from={-10} spread={12} color="#e2b75a" opacity={0.18} />
        <Slab f={f} o={10} fill="url(#gl)" />
        <Ring f={f} k={-9.5} color="rgba(255,255,255,0.6)" width={1} />
      </Layer>
      <Sweep f={f} o={10} period={4.5} />
    </>
  )
}

function GoldOver({ f }) {
  return (
    <Layer f={f}>
      <GoldDefs />
      <Corners f={f} size={64} off={-14}>
        <FiligreeArt />
      </Corners>
    </Layer>
  )
}

const AURORA = ['#46f0c0', '#6aa8ff', '#c38bff', '#ff7ad9', '#46f0c0']

function AuroraUnder({ f }) {
  const S = svgAll()
  const breathe = (time) => {
    'worklet'
    return { opacity: 0.6 + 0.4 * (0.5 - 0.5 * Math.cos((TAU * time) / 7)) }
  }
  return (
    <>
      <Mover f={f} fn={breathe}>
        <Layer f={f}>
          <S.Defs>
            <S.LinearGradient id="au" x1="0" y1="0" x2="1" y2="1">
              <S.Stop offset="0" stopColor="#46f0c0" />
              <S.Stop offset="0.35" stopColor="#6aa8ff" />
              <S.Stop offset="0.7" stopColor="#c38bff" />
              <S.Stop offset="1" stopColor="#ff7ad9" />
            </S.LinearGradient>
          </S.Defs>
          <Halo f={f} from={-3} spread={30} color="url(#au)" opacity={0.42} />
        </Layer>
      </Mover>
      <SpinConic f={f} o={3} colors={AURORA} period={7} />
    </>
  )
}

function neonFlicker(time, period, reverse) {
  'worklet'
  let ph = (time % period) / period
  if (reverse) ph = 1 - ph
  if (ph > 0.905 && ph < 0.925) return 0.4
  if (ph > 0.945 && ph < 0.958) return 0.6
  return 1
}

function NeonOver({ f }) {
  const pink = (time) => {
    'worklet'
    return { opacity: neonFlicker(time, 5, false) }
  }
  const cyan = (time) => {
    'worklet'
    return { opacity: neonFlicker(time, 6.3, true) }
  }
  return (
    <>
      <Mover f={f} fn={cyan}>
        <Layer f={f}>
          <Halo f={f} from={-8} spread={14} color="#4ee6ff" opacity={0.5} inward={4} />
          <Ring f={f} k={-8} color="#4ee6ff" width={2} />
        </Layer>
      </Mover>
      <Mover f={f} fn={pink}>
        <Layer f={f}>
          <Halo f={f} from={0} spread={20} color="#ff5fd2" opacity={0.55} inward={12} />
          <Ring f={f} k={1} color="#ff5fd2" width={2} />
        </Layer>
      </Mover>
    </>
  )
}

/* ---------- Particles ---------- */

function useItems(make, deps) {
  return useMemo(make, deps)
}

function fireflyAt(time, it, w, h) {
  'worklet'
  const u = (((it.u + it.s * 0.96 * time) % 1) + 1) % 1
  const p = edgePoint(w, h, u)
  return {
    x: p[0] + Math.sin(time * 1.7 + it.ph) * 12,
    y: p[1] + Math.cos(time * 1.3 + it.ph) * 12,
    o: 0.35 + 0.65 * Math.max(0, Math.sin(time * 2.2 + it.ph)),
  }
}

function FirefliesOver({ f }) {
  const S = svgAll()
  const items = useItems(() => {
    const rnd = seeded(11)
    return Array.from({ length: 22 }, () => ({ u: rnd(), s: 0.012 + rnd() * 0.02, ph: rnd() * 9, r: 1.5 + rnd() * 1.8 }))
  }, [])
  // Still tiles have no clock, so the drifting lights never show: draw a few
  // fixed ones along the edges instead, so the tile does not look empty.
  if (f.still) {
    const spots = [[0.08, 0.12], [0.94, 0.2], [0.04, 0.55], [0.97, 0.66], [0.2, 0.96], [0.72, 0.94], [0.5, 0.03]]
    return (
      <S.Svg width={f.w} height={f.h}>
        {spots.map(([x, y], i) => (
          <S.G key={i}>
            <S.Circle cx={x * f.w} cy={y * f.h} r={16} fill={f.c.glow} fillOpacity={0.3} />
            <S.Circle cx={x * f.w} cy={y * f.h} r={8} fill={f.c.spark} />
          </S.G>
        ))}
      </S.Svg>
    )
  }
  return items.map((it, i) => (
    <Particle key={i} clock={f.clock} item={it} fn={fireflyAt} w={f.w} h={f.h} size={28}>
      <S.Svg width={28} height={28}>
        <S.Defs>
          <S.RadialGradient id="ff">
            <S.Stop offset="0" stopColor={f.c.glow} stopOpacity="1" />
            <S.Stop offset="1" stopColor={f.c.glow} stopOpacity="0" />
          </S.RadialGradient>
        </S.Defs>
        <S.Circle cx={14} cy={14} r={14} fill="url(#ff)" />
        <S.Circle cx={14} cy={14} r={it.r} fill={f.c.spark} />
      </S.Svg>
    </Particle>
  ))
}

function twinkleAt(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: it.base + it.amp * Math.abs(Math.sin(time * it.speed + it.ph)) }
}

/** Shooting star: two of them take turns, as in the mockup's streak(). */
function streakAt(time, it, w, h) {
  'worklet'
  const q = (((time * it.rate) % 1) + it.off) % 1
  if (q >= 0.22) return { x: -999, y: -999, o: 0 }
  const p = q / 0.22
  const W = w + 80
  const H = h + 80
  const sy = it.top ? 22 : H * 0.55
  return { x: W * it.sx + p * 150 - 40 - 43, y: sy - p * 60 - 40 + 16, o: 1 }
}

function Streaks({ f, rate }) {
  const S = svgAll()
  const items = useMemo(() => [{ off: 0, sx: 0.62, top: true, rate }, { off: 0.5, sx: 0.15, top: false, rate }], [rate])
  // The view is 86 x 86; the star's head sits at its center-right.
  return items.map((it, i) => (
    <Particle key={i} clock={f.clock} item={it} fn={streakAt} w={f.w} h={f.h} size={86}>
      <S.Svg width={86} height={86}>
        <S.Defs>
          <S.LinearGradient id="st" x1="0" y1="1" x2="1" y2="0">
            <S.Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <S.Stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
          </S.LinearGradient>
        </S.Defs>
        <S.Line x1={3} y1={59} x2={83} y2={27} stroke="url(#st)" strokeWidth={2.2} strokeLinecap="round" />
        <S.Circle cx={83} cy={27} r={2.2} fill="#ffffff" />
      </S.Svg>
    </Particle>
  ))
}

function ShootOver({ f }) {
  const items = useItems(() => {
    const rnd = seeded(21)
    const W = f.w + 80
    const H = f.h + 80
    const out = []
    while (out.length < 22) {
      const x = rnd() * W
      const y = rnd() * H
      if (x > 48 && x < W - 48 && y > 48 && y < H - 48) continue
      out.push({ x: x - 40, y: y - 40, ph: rnd() * 9, base: 0.3, amp: 0.5, speed: 1 })
    }
    return out
  }, [f.w, f.h])
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={0.5} color="rgba(200,220,255,0.35)" width={1} />
      </Layer>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={twinkleAt} w={f.w} h={f.h} size={2}>
          <View style={[styles.square, { backgroundColor: f.c.sky }]} />
        </Particle>
      ))}
      <Streaks f={f} rate={0.34} />
    </>
  )
}

function ConstOver({ f }) {
  const S = svgAll()
  const stars = useItems(() => {
    const rnd = seeded(5)
    const n = 24
    return Array.from({ length: n }, (_, i) => {
      const off = (rnd() - 0.5) * 16
      const p = edgePoint(f.w, f.h, (i + rnd() * 0.6) / n)
      const r = 0.8 + rnd() * 1.6
      return { x: p[0] + off, y: p[1] + off * 0.4, r, ph: rnd() * 9, base: 0.4, amp: 0.6, speed: 1.3 }
    })
  }, [f.w, f.h])
  const line = `M ${stars.map((s) => `${s.x} ${s.y}`).join(' L ')} Z`
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={0.5} color={f.c.light ? f.c.sky : 'rgba(170,200,255,0.4)'} width={1} />
        <S.Path d={line} fill="none" stroke={f.c.sky} strokeOpacity={f.c.lineOpacity} strokeWidth={1} />
      </Layer>
      {stars.map((s, i) => (
        <Particle key={i} clock={f.clock} item={s} fn={twinkleAt} w={f.w} h={f.h} size={14}>
          {s.r > 1.8 ? <View style={[styles.crossH, { backgroundColor: f.c.sky, opacity: 0.6 }]} /> : null}
          {s.r > 1.8 ? <View style={[styles.crossV, { backgroundColor: f.c.sky, opacity: 0.6 }]} /> : null}
          <View style={{ width: s.r * 2, height: s.r * 2, borderRadius: s.r, backgroundColor: f.c.sky }} />
        </Particle>
      ))}
      <Streaks f={f} rate={0.12} />
    </>
  )
}

// Stained glass panes from the mockup's conic-gradient, starting at 10deg.
const GLASS = [
  ['#c8402f', 0, 0.09], ['#1e1e1e', 0.09, 0.1], ['#e3a34a', 0.1, 0.19], ['#1e1e1e', 0.19, 0.2],
  ['#3fa37a', 0.2, 0.3], ['#1e1e1e', 0.3, 0.31], ['#3f6fb3', 0.31, 0.42], ['#1e1e1e', 0.42, 0.43],
  ['#8a5cc7', 0.43, 0.54], ['#1e1e1e', 0.54, 0.55], ['#c8402f', 0.55, 0.65], ['#1e1e1e', 0.65, 0.66],
  ['#e3a34a', 0.66, 0.76], ['#1e1e1e', 0.76, 0.77], ['#3fa37a', 0.77, 0.88], ['#1e1e1e', 0.88, 0.89],
  ['#3f6fb3', 0.89, 1],
]

function GlassUnder({ f }) {
  const S = svgAll()
  const o = 12
  const wedges = useMemo(() => conicWedges(f.w / 2, f.h / 2, Math.hypot(f.w, f.h), GLASS, 10), [f.w, f.h])
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.ClipPath id="gc">
            <S.Path d={rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, f.R + 10)} />
          </S.ClipPath>
        </S.Defs>
        <S.G clipPath="url(#gc)">
          {wedges.map((wd, i) => (
            <S.Path key={i} d={wd.d} fill={wd.fill} />
          ))}
        </S.G>
        <Ring f={f} k={-1.5} color="#1e1e1e" width={3} />
      </Layer>
      <Sweep f={f} o={o} period={6} still={0} alpha={0.35} />
    </>
  )
}

/* Tonight Ring */

function burstAt(time, it, w, h) {
  'worklet'
  void time
  const k = it.prog.value
  if (k <= 0 || k >= 1) return { x: -999, y: -999, o: 0 }
  const n = k * 55
  return { x: it.x + it.vx * n, y: it.y + it.vy * n + 0.015 * n * n, o: 1 - k }
}

function RingOver({ f }) {
  const S = svgAll()
  const { answered, total } = f.p
  const prog = ringProgress(answered, total)
  const done = prog >= 1
  const was = useRef(prog)
  const prev = was.current
  const mix = useSharedValue(1)
  const burst = useSharedValue(0)
  const L = rrLength(f.w + 12, f.h + 12, f.R + 6)
  const items = useMemo(() => {
    const rnd = seeded(3)
    return Array.from({ length: 28 }, () => {
      const p = edgePoint(f.w + 12, f.h + 12, rnd())
      const a = rnd() * TAU
      const v = 1 + rnd() * 2.5
      return { x: p[0] - 6, y: p[1] - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, prog: burst }
    })
  }, [f.w, f.h, burst])

  useLayoutEffect(() => {
    const before = was.current
    was.current = prog
    if (before === prog) return
    if (!f.active) {
      mix.value = 1
      return
    }
    mix.value = 0
    mix.value = withTiming ? withTiming(1, { duration: 800 }) : 1
    if (prog >= 1 && before < 1 && withTiming) {
      burst.value = 0
      burst.value = withTiming(1, { duration: 920 })
    }
  }, [prog, f.active, mix, burst])

  const path = rrPath(-6, -6, f.w + 12, f.h + 12, f.R + 6)
  const arc = (p) => (
    <S.Path d={path} fill="none" stroke="url(#rg)" strokeWidth={5} strokeLinecap="round" strokeDasharray={`${Math.max(0.01, p * L)} ${L}`} />
  )
  const defs = (
    <S.Defs>
      <S.LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor="#e6f2ff" />
        <S.Stop offset="1" stopColor={f.c.accent} />
      </S.LinearGradient>
    </S.Defs>
  )
  const fadeIn = () => {
    'worklet'
    return { opacity: mix.value }
  }
  const fadeOut = () => {
    'worklet'
    return { opacity: 1 - mix.value }
  }
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={-6} color={f.c.line} width={5} />
        {done ? <Halo f={f} from={-6} spread={14} color={f.c.accent} opacity={0.3} inward={6} /> : null}
      </Layer>
      {prev !== prog ? (
        <Mover f={f} fn={fadeOut}>
          <Layer f={f}>
            {defs}
            {prev > 0 ? arc(prev) : null}
          </Layer>
        </Mover>
      ) : null}
      <Mover f={f} fn={fadeIn}>
        <Layer f={f}>
          {defs}
          {prog > 0 ? arc(prog) : null}
        </Layer>
      </Mover>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={burstAt} w={f.w} h={f.h} size={4}>
          <View style={[styles.dot4, { backgroundColor: '#c8e1ff' }]} />
        </Particle>
      ))}
    </>
  )
}

/* ---------- Earned frames ---------- */

function VineOver({ f }) {
  const S = svgAll()
  const streak = Number(f.p.streak) || 0
  const v = useMemo(() => vineLayout(streak, f.w, f.h, f.R), [streak, f.w, f.h, f.R])
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="lf" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#a6e889" />
          <S.Stop offset="1" stopColor="#3c8636" />
        </S.LinearGradient>
        <S.RadialGradient id="pt">
          <S.Stop offset="0" stopColor="#fff2f7" />
          <S.Stop offset="0.6" stopColor="#f7b3cc" />
          <S.Stop offset="1" stopColor="#e57aa3" />
        </S.RadialGradient>
      </S.Defs>
      <S.Path d={rrPath(0, 0, f.w, f.h, f.R)} fill="none" stroke="#3f7a35" strokeWidth={3.2} strokeLinecap="round" strokeDasharray={`${v.usable} ${v.length}`} />
      {v.leaves.map((l, i) => (
        <S.Ellipse key={`l${i}`} cx={l.x} cy={l.y} rx={8} ry={3.8} fill="url(#lf)" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
      ))}
      {v.flowers.map((fl, i) => (
        <S.G key={`f${i}`} transform={`translate(${fl.x} ${fl.y}) rotate(${fl.rot})`}>
          {[0, 72, 144, 216, 288].map((r) => (
            <S.Ellipse key={r} rx={fl.sz} ry={fl.sz * 0.62} cx={fl.sz * 0.82} fill="url(#pt)" transform={`rotate(${r})`} />
          ))}
          <S.Circle r={fl.sz * 0.42} fill="#ffd86b" />
        </S.G>
      ))}
      <S.Circle cx={v.tip.x} cy={v.tip.y} r={3.4} fill="#a6e889" />
    </Layer>
  )
}

function emberAt(time, it, w, h) {
  'worklet'
  const p = (((time + it.off) / it.life) % 1 + 1) % 1
  const age = p * it.life
  const y = h - it.vy * age
  return { x: it.x * w + it.vx * age + Math.sin(time * 3 + y * 0.05) * 6, y, o: 1 - p }
}

function EmberUnder({ f }) {
  return (
    <Layer f={f}>
      <Halo f={f} from={0} spread={26} color="#ff5a1e" opacity={0.22} />
    </Layer>
  )
}

function EmberOver({ f }) {
  const S = svgAll()
  const items = useItems(() => {
    const rnd = seeded(30)
    return Array.from({ length: 26 }, (_, i) => ({
      x: rnd(),
      vx: (rnd() - 0.5) * 36,
      vy: 36 + rnd() * 84,
      life: 1.7 + rnd() * 1.1,
      off: rnd() * 3,
      r: 1 + rnd() * 2.2,
      warm: i % 2 === 0,
    }))
  }, [])
  const flicker = (time) => {
    'worklet'
    return { opacity: 0.78 + 0.22 * Math.sin(time * 6) }
  }
  return (
    <>
      <Mover f={f} fn={flicker}>
        <Layer f={f}>
          <S.Defs>
            <S.LinearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
              <S.Stop offset="0" stopColor="#ff7828" stopOpacity="0" />
              <S.Stop offset="1" stopColor="#ff6e28" stopOpacity="0.45" />
            </S.LinearGradient>
          </S.Defs>
          {/* Trimmed to the card's round corners, so the glow never pokes past them. */}
          <RoundClip f={f} o={0} id="ebc">
            <S.Rect x={0} y={f.h - 70} width={f.w} height={70} fill="url(#eg)" />
          </RoundClip>
        </Layer>
      </Mover>
      <Layer f={f}>
        <Ring f={f} k={0.5} color="rgba(255,140,60,0.55)" width={1} />
      </Layer>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={emberAt} w={f.w} h={f.h} size={it.r * 2}>
          <View style={{ width: it.r * 2, height: it.r * 2, borderRadius: it.r, backgroundColor: it.warm ? '#ffd27a' : '#ff7a2a' }} />
        </Particle>
      ))}
    </>
  )
}

function sparkleAt(time, it) {
  'worklet'
  const a = Math.max(0, Math.sin(time * 1.6 + it.ph))
  return { x: it.x, y: it.y, o: a < 0.6 ? 0 : a, s: a }
}

function GemsOver({ f }) {
  const S = svgAll()
  const lit = Array.isArray(f.p.weekLit) ? f.p.weekLit : []
  const xs = Array.from({ length: 7 }, (_, i) => f.w * (0.12 + i * 0.127))
  const sparks = useMemo(() => xs.map((x, i) => ({ x, y: f.h + 2 - 8, ph: i * 1.7 })), [f.w, f.h])
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="gm" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#fff6d6" />
            <S.Stop offset="0.55" stopColor="#ffd25e" />
            <S.Stop offset="1" stopColor="#d99a1e" />
          </S.LinearGradient>
        </S.Defs>
        <Ring f={f} k={0.75} color="#ffd25e" width={1.5} opacity={0.45} />
        {xs.map((x, i) => {
          const on = Boolean(lit[i])
          return (
            <S.G key={i} transform={`translate(${x} ${f.h + 2})`}>
              {on ? <S.Circle r={14} fill="#ffd25e" opacity={0.18} /> : null}
              <S.Path d="M0.00 -11.00 L2.70 -3.72 L10.46 -3.40 L4.37 1.42 L6.47 8.90 L0.00 4.60 L-6.47 8.90 L-4.37 1.42 L-10.46 -3.40 L-2.70 -3.72 Z" fill={on ? 'url(#gm)' : f.c.line} stroke={on ? '#fff6d6' : 'none'} strokeWidth={0.8} strokeLinejoin="round" />
            </S.G>
          )
        })}
      </Layer>
      {sparks.map((it, i) =>
        lit[i] ? (
          <Particle key={i} clock={f.clock} item={it} fn={sparkleAt} w={f.w} h={f.h} size={16}>
            <View style={[styles.sparkH, { backgroundColor: '#fff3c4' }]} />
            <View style={[styles.sparkV, { backgroundColor: '#fff3c4' }]} />
          </Particle>
        ) : null,
      )}
    </>
  )
}

function glintAt(time, it) {
  'worklet'
  const a = Math.max(0, Math.sin(time * 2 + it.ph))
  return { x: it.x, y: it.y, o: a }
}

function FrostCorner() {
  const S = svgAll()
  return (
    <>
      <S.Path d="M2 2 L58 2 L48 10 L62 16 L40 20 L50 32 L28 28 L32 48 L20 38 L16 62 L10 48 L2 58 Z" fill="url(#fg)" opacity={0.9} />
      <S.Path d="M8 8 L34 34 M18 6 L22 22 M6 18 L22 22 M30 10 L28 20 M10 30 L20 28" stroke="#ffffff" strokeWidth={1.3} opacity={0.9} strokeLinecap="round" />
    </>
  )
}

function FrostOver({ f }) {
  const S = svgAll()
  const show = f.p.frozenRecently !== false
  const items = useItems(() => {
    const rnd = seeded(17)
    return Array.from({ length: 24 }, () => {
      const c = Math.floor(rnd() * 4)
      const r = rnd() * 60
      const a = (rnd() * Math.PI) / 2
      const cx = c % 2 ? f.w : 0
      const cy = c < 2 ? 0 : f.h
      return { x: cx + (c % 2 ? -1 : 1) * Math.cos(a) * r, y: cy + (c < 2 ? 1 : -1) * Math.sin(a) * r, ph: rnd() * 9 }
    })
  }, [f.w, f.h])
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#e8fbff" />
            <S.Stop offset="1" stopColor="#7fd4ec" stopOpacity="0.15" />
          </S.LinearGradient>
        </S.Defs>
        <Halo f={f} from={0} spread={16} color="#7fd4ec" opacity={0.22} inward={10} />
        <Ring f={f} k={0.75} color="rgba(127,212,236,0.7)" width={1.5} />
        {show ? (
          <RoundClip f={f} o={8} id="frc">
            <Corners f={f} size={70} off={-8}>
              <FrostCorner />
            </Corners>
          </RoundClip>
        ) : null}
      </Layer>
      {show
        ? items.map((it, i) => (
            <Particle key={i} clock={f.clock} item={it} fn={glintAt} w={f.w} h={f.h} size={10}>
              <View style={[styles.glintH, { backgroundColor: '#dcf8ff' }]} />
              <View style={[styles.glintV, { backgroundColor: '#dcf8ff' }]} />
              <View style={[styles.dot3, { backgroundColor: '#dcf8ff' }]} />
            </Particle>
          ))
        : null}
    </>
  )
}

/* ---------- Seasonal frames ---------- */

function WebArt() {
  const S = svgAll()
  return (
    <S.G stroke="rgba(210,210,220,0.65)" strokeWidth={1} fill="none">
      <S.Path d="M2 2 L64 34 M2 2 L34 64 M2 2 L54 54" />
      {[16, 30, 44, 58].map((r) => (
        <S.Path key={r} d={`M${r} 2 Q${r * 0.9} ${r * 0.38} ${r * 0.88} ${r * 0.47} Q${r * 0.72} ${r * 0.72} ${r * 0.47} ${r * 0.88} Q${r * 0.38} ${r * 0.9} 2 ${r}`} />
      ))}
    </S.G>
  )
}

function WebOver({ f }) {
  const S = svgAll()
  const k = 84 / 72
  const x = f.w - 46
  const bob = (time) => {
    'worklet'
    return { transform: [{ translateY: 5 - 5 * Math.cos((TAU * time) / 3) }] }
  }
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={0.5} color="rgba(180,180,190,0.4)" width={1} />
        <RoundClip f={f} o={1} id="wbc">
          <S.G transform={`translate(-6 -6) scale(${k})`}>
            <WebArt />
          </S.G>
          <S.G transform={`translate(${f.w + 6} ${f.h + 6}) rotate(180) scale(${k})`}>
            <WebArt />
          </S.G>
        </RoundClip>
      </Layer>
      <Mover f={f} fn={bob}>
        <Layer f={f}>
          <S.Line x1={x + 1} y1={-6} x2={x + 1} y2={56} stroke="rgba(200,200,210,0.6)" strokeWidth={1.5} />
          <S.G transform={`translate(${x + 1} 62)`} stroke="#2a2a30" strokeWidth={1.4} strokeLinecap="round" fill="none">
            {[-1, 1].map((s) => (
              <S.G key={s}>
                <S.Path d={`M0 -1 L${s * 8} -6 L${s * 10} -2`} />
                <S.Path d={`M0 0 L${s * 9} -2 L${s * 11} 2`} />
                <S.Path d={`M0 1 L${s * 9} 3 L${s * 10} 7`} />
                <S.Path d={`M0 2 L${s * 7} 6 L${s * 8} 10`} />
              </S.G>
            ))}
            <S.Ellipse cx={0} cy={1} rx={4.5} ry={5.5} fill="#2a2a30" stroke="none" />
            <S.Circle cx={0} cy={-5} r={3} fill="#2a2a30" stroke="none" />
          </S.G>
        </Layer>
      </Mover>
    </>
  )
}

/** Falling things: y wraps over the whole box around the card (card + 40 each side). */
function fallAt(time, it, w, h) {
  'worklet'
  const H = h + 80 + 12
  const y = ((((it.y + it.v * 60 * time) % H) + H) % H) - 12 - 40
  return {
    x: it.x * (w + 80) - 40 + Math.sin(time * it.sway + it.ph) * it.amp,
    y,
    o: 1,
    r: it.rot + it.vr * 60 * time,
  }
}

function confettiAt(time, it, w, h) {
  'worklet'
  const s = fallAt(time, it, w, h)
  const inCard = s.x > 8 && s.x < w - 8 && s.y > 20 && s.y < h - 8
  return { x: s.x, y: s.y, o: inCard ? 0 : 1, r: s.r }
}

// Leaves fade out near the top and bottom of their box, so a parent that
// clips close to the card never shows them cut on a straight line.
function leafAt(time, it, w, h) {
  'worklet'
  const s = fallAt(time, it, w, h)
  const top = Math.min(1, Math.max(0, (s.y + 40) / 28))
  const bottom = Math.min(1, Math.max(0, (h + 24 - s.y) / 24))
  return { x: s.x, y: s.y, o: Math.min(top, bottom), r: s.r }
}

const LEAF_COLORS =['#d9822b', '#c94f2c', '#e6b23a', '#a8541f']

function LeavesOver({ f }) {
  const S = svgAll()
  const items = useItems(() => {
    const rnd = seeded(41)
    return Array.from({ length: 20 }, (_, i) => ({
      x: rnd(), y: rnd() * 600, v: 0.5 + rnd() * 0.7, rot: rnd() * 6, vr: (rnd() - 0.5) * 0.05,
      s: 6 + rnd() * 5, c: LEAF_COLORS[i % 4], sway: 1.2, ph: rnd() * 9, amp: 16,
    }))
  }, [])
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={0.5} color="rgba(217,130,43,0.5)" width={1} />
      </Layer>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={leafAt} w={f.w} h={f.h} size={24}>
          <S.Svg width={24} height={24} viewBox="-12 -12 24 24">
            <S.Path d={`M0 ${-it.s} Q${it.s * 0.9} 0 0 ${it.s} Q${-it.s * 0.9} 0 0 ${-it.s} Z`} fill={it.c} />
            <S.Line x1={0} y1={-it.s} x2={0} y2={it.s} stroke="rgba(60,30,10,0.5)" strokeWidth={1} />
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}

function SnowOver({ f }) {
  const S = svgAll()
  const items = useItems(() => {
    const rnd = seeded(52)
    return Array.from({ length: 30 }, () => {
      const r = 0.8 + rnd() * 2.2
      return { x: rnd(), y: rnd() * 600, v: 0.3 + rnd() * 0.8, rot: 0, vr: 0, r, sway: 1, ph: rnd() * 9, amp: 8 }
    })
  }, [])
  const sx = (f.w + 8) / 300
  const cap = 'M0 18 Q10 6 22 14 Q34 2 48 12 Q62 0 78 12 Q92 4 108 13 Q124 2 140 12 Q156 4 172 12 Q188 0 204 12 Q220 4 236 13 Q252 2 268 12 Q284 4 300 14 L300 26 L0 26 Z'
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={0.5} color="rgba(220,235,255,0.5)" width={1} />
        <S.G transform={`translate(-4 -10) scale(${sx} 1)`}>
          <S.Path d={cap} fill="#f4f8ff" />
          <S.Path d="M0 22 L300 22" stroke="#dbe6f5" strokeWidth={2} />
        </S.G>
      </Layer>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={fallAt} w={f.w} h={f.h} size={it.r * 2}>
          <View style={{ width: it.r * 2, height: it.r * 2, borderRadius: it.r, backgroundColor: f.c.snow, opacity: 0.5 + it.r / 5 }} />
        </Particle>
      ))}
    </>
  )
}

function SakuraOver({ f }) {
  const S = svgAll()
  const items = useItems(() => {
    const rnd = seeded(63)
    return Array.from({ length: 24 }, () => ({
      x: rnd(), y: rnd() * 600, v: 0.4 + rnd() * 0.6, rot: rnd() * 6, vr: (rnd() - 0.5) * 0.04,
      s: 4 + rnd() * 4, sway: 1, ph: rnd() * 9, amp: 14,
    }))
  }, [])
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={0.5} color="rgba(242,167,195,0.6)" width={1} />
      </Layer>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={fallAt} w={f.w} h={f.h} size={18}>
          <S.Svg width={18} height={18} viewBox="-9 -9 18 18">
            <S.Defs>
              <S.LinearGradient id="pe" x1="0" y1="0" x2="1" y2="0">
                <S.Stop offset="0" stopColor="#ffd3e2" />
                <S.Stop offset="1" stopColor="#f290b2" />
              </S.LinearGradient>
            </S.Defs>
            <S.Ellipse cx={0} cy={0} rx={it.s} ry={it.s * 0.6} fill="url(#pe)" />
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}

const PARTY = ['#ef6a5b', '#e3a34a', '#5ab88f', '#8fb6dc', '#c38bff', '#ffe14a']

function BdayOver({ f }) {
  const S = svgAll()
  const items = useItems(() => {
    const rnd = seeded(74)
    return Array.from({ length: 30 }, (_, i) => ({
      x: rnd(), y: rnd() * 600, v: 0.6 + rnd() * 0.9, rot: rnd() * 6, vr: (rnd() - 0.5) * 0.2,
      c: PARTY[i % 6], wd: 4 + rnd() * 4, sway: 2, ph: rnd() * 9, amp: 10,
    }))
  }, [])
  const X = (x) => -14 + (x * (f.w + 28)) / 330
  const flags = Array.from({ length: 10 }, (_, i) => {
    const x = 16 + i * 33
    const y = 6 + 24 * Math.sin((Math.PI * x) / 330) * 0.75
    return { d: `M${X(x - 11)} ${y - 14} L${X(x + 11)} ${y - 14} L${X(x)} ${y + 4} Z`, c: PARTY[i % 5] }
  })
  const sway = (time) => {
    'worklet'
    return { transform: [{ rotate: `${0.75 - 0.75 * Math.cos((TAU * time) / 3)}deg` }] }
  }
  return (
    <>
      <Layer f={f}>
        <Ring f={f} k={0.5} color="rgba(255,159,191,0.5)" width={1} />
      </Layer>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={confettiAt} w={f.w} h={f.h} size={it.wd}>
          <View style={{ width: it.wd, height: it.wd / 2, backgroundColor: it.c }} />
        </Particle>
      ))}
      <Mover f={f} fn={sway}>
        <Layer f={f}>
          <S.Path d={`M${X(0)} -8 Q${f.w / 2} 16 ${X(330)} -8`} fill="none" stroke="#d6d9e0" strokeWidth={1.5} />
          {flags.map((fl, i) => (
            <S.Path key={i} d={fl.d} fill={fl.c} />
          ))}
        </Layer>
      </Mover>
    </>
  )
}

/* ---------- The map ---------- */

export const FRAME_ART = {
  first: { over: FirstOver },
  thin: { over: ThinOver },
  double: { over: DoubleOver },
  dotted: { over: DottedOver },
  washi: { over: WashiOver },
  pixel: { over: PixelOver },
  stitch: { under: StitchUnder },
  polaroid: { under: PolaroidUnder },
  wood: { under: WoodUnder },
  flowers: { over: FlowersOver },
  comic: { under: ComicUnder, over: ComicOver },
  moon: { over: MoonOver },
  filigree: { over: FiligreeOver },
  deco: { under: DecoUnder, over: DecoOver },
  marble: { under: MarbleUnder },
  glow: { over: GlowOver, animated: true },
  silver: { under: SilverUnder, over: SilverOver, animated: true },
  neon: { over: NeonOver, animated: true },
  fireflies: { over: FirefliesOver, animated: true },
  shoot: { over: ShootOver, animated: true },
  glass: { under: GlassUnder, animated: true },
  gold: { under: GoldUnder, over: GoldOver, animated: true },
  const: { over: ConstOver, animated: true },
  ring: { over: RingOver, animated: true },
  aurora: { under: AuroraUnder, animated: true },
  vine: { over: VineOver },
  ember: { under: EmberUnder, over: EmberOver, animated: true },
  gems: { over: GemsOver, animated: true },
  frost: { over: FrostOver, animated: true },
  web: { over: WebOver, animated: true },
  leaves: { over: LeavesOver, animated: true },
  snow: { over: SnowOver, animated: true },
  sakura: { over: SakuraOver, animated: true },
  bday: { over: BdayOver, animated: true },
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  clip: { position: 'absolute', overflow: 'hidden' },
  square: { width: 1.6, height: 1.6 },
  dot3: { width: 2.8, height: 2.8, borderRadius: 1.4 },
  dot4: { width: 4, height: 4, borderRadius: 2 },
  crossH: { position: 'absolute', width: 12, height: 1 },
  crossV: { position: 'absolute', width: 1, height: 12 },
  sparkH: { position: 'absolute', width: 16, height: 1.2 },
  sparkV: { position: 'absolute', width: 1.2, height: 16 },
  glintH: { position: 'absolute', width: 10, height: 1 },
  glintV: { position: 'absolute', width: 1, height: 10 },
})
