// Pumpkin Patch (docs/ideas/halloween-2026/pumpkin-patch.html): a special
// frame, free Oct 28 to 31, 2026 and kept after. One jack-o'-lantern per
// question today on a vine along the bottom and lower sides; each Did lights
// one. When every question is answered a moon rises behind the top right
// corner with two bats. Same contract as art.jsx: draws in card space, reaches
// up to PAD past the card, nothing covers the card edge. Still tiles and cards
// behind the top one draw everything in two svg layers; only the top card
// gets the candle flicker, the moon rise and the bats.
import { useEffect, useMemo } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { rrPointAt, seeded } from './geometry.js'
import { Animated, Moving, Particle, SvgLayer, svgAll, useAnimatedStyle, useSharedValue } from './runtime.jsx'

const { Easing, withTiming } = Reanimated
const r2 = (n) => Math.round(n * 100) / 100
const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }
const VO = 6 // vine ring offset: the vine never touches the card

function Layer({ f, children }) {
  return (
    <SvgLayer w={f.w} h={f.h}>
      {children}
    </SvgLayer>
  )
}

const ringAt = (f, o, d) => rrPointAt(-o, -o, f.w + 2 * o, f.h + 2 * o, f.R + o, d)

function arcLen(f, o) {
  const W = f.w + 2 * o
  const H = f.h + 2 * o
  const rr = Math.max(0, Math.min(f.R + o, W / 2, H / 2))
  return { rr, arc: (Math.PI * rr) / 2, sh: W - 2 * rr, sv: H - 2 * rr }
}

// Geometry only: it depends on the card size and the number of questions,
// never on how many are answered.
function patchLayout(f, T) {
  const tile = f.still && f.w <= 220
  const K = tile ? 1.7 : 1
  const big = f.w > 250
  const many = T >= 7
  const sd = (many ? (big ? 92 : 76) : big ? 56 : 46) * (tile ? 1.1 : 1)
  const g = arcLen(f, 12)
  const U = 2 * sd + 2 * g.arc + g.sh
  const bs = T <= 4 ? 1 : T <= 6 ? 0.92 : 1
  const rnd = seeded(77 + T)
  const spots = []
  for (let i = 0; i < T; i++) {
    const u = (i + 0.5) / T
    spots.push({ i, d: sd - U * u })
  }
  // The lowest pumpkin on the left side of a full card sits just off the corner curl.
  if (many && big) {
    const left = spots.filter((s) => s.d > 0)
    if (left.length) left.reduce((a, b) => (b.d < a.d ? b : a)).d += 5
  }
  // In the tile the two pumpkins that face down the most are a little smaller.
  const small = new Set()
  if (tile) {
    spots
      .map((s) => ({ i: s.i, ny: Math.abs(ringAt(f, 12, s.d).ny) }))
      .sort((a, b) => b.ny - a.ny)
      .slice(0, 2)
      .forEach((s) => small.add(s.i))
  }
  const pumps = spots.map(({ i, d }) => {
    const n0 = ringAt(f, 12, d)
    const w = Math.abs(n0.ny)
    const sc = K * (many ? 0.62 : bs * (0.78 + 0.22 * w)) * (small.has(i) ? 0.9 : 1)
    // Gap from the card: the pumpkin's reach along the outward normal (the stem counts at the bottom), plus 1.5 px.
    const ext = Math.max(Math.hypot(14.3 * n0.nx, 11 * n0.ny), 12.4 * Math.max(0, n0.ny)) * sc
    const op = ext + 1.5
    const pt = ringAt(f, op, d)
    return { x: pt.x, y: pt.y, rot: -pt.nx * 3 + (rnd() - 0.5) * 5, sc, i }
  })
  // The vine: a thick lower run plus thin runs up both sides to the top corners.
  const gv = arcLen(f, VO)
  const sdv = sd + (big ? 46 : 38)
  const dL = gv.sv + gv.arc + (big ? 70 : 56)
  const upR = Math.min(gv.sv, f.h + VO - gv.rr - (big ? 46 : 40))
  const dR = -(gv.arc + gv.sh + gv.arc + upR)
  const UV = dL - dR
  const vp = []
  for (let s = 0; s <= UV; s += 3) {
    const pt = ringAt(f, VO, dL - s)
    const w = 1.6 * Math.sin(s / 16) + 0.35 * Math.sin(s / 7.5 + 1.7)
    vp.push({ x: pt.x + pt.nx * w, y: pt.y + pt.ny * w, nx: pt.nx, ny: pt.ny })
  }
  return { tile, pumps, vp, UV, s0: dL - sdv, s1: dL + (2 * gv.arc + gv.sh + sdv) }
}

function leafPath(L, wd) {
  return `M0 0C${r2(L * 0.22)} ${r2(-wd)} ${r2(L * 0.68)} ${r2(-wd * 0.95)} ${r2(L)} 0C${r2(L * 0.68)} ${r2(wd * 0.95)} ${r2(L * 0.22)} ${r2(wd)} 0 0Z`
}

function curl(x, y, a0, r0, turns, dir) {
  let d = `M${r2(x)} ${r2(y)}`
  const n = Math.round(turns * 14)
  const cx = x + Math.cos(a0 + (dir * Math.PI) / 2) * r0
  const cy = y + Math.sin(a0 + (dir * Math.PI) / 2) * r0
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const ang = a0 - (dir * Math.PI) / 2 + dir * t * turns * 2 * Math.PI
    const r = r0 * (1 - 0.86 * t)
    d += `L${r2(cx + Math.cos(ang) * r)} ${r2(cy + Math.sin(ang) * r)}`
  }
  return d
}

const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${r2(p.x)} ${r2(p.y)}`).join('')

/* ---------- The vine ---------- */

function buildVine(S, L) {
  const { vp, s0, s1, UV } = L
  const tot = vp.length
  const at = (s) => vp[Math.max(0, Math.min(tot - 1, Math.round(s / 3)))]
  const seg = (a, b) => vp.slice(Math.max(0, Math.round(a / 3)), Math.min(tot, Math.round(b / 3) + 1))
  const thick = seg(s0, s1)
  const mid = seg(s0 - 40, s1 + 40)
  const mid2 = seg(s0 - 90, s1 + 90)
  const rnd = seeded(31)
  const leaves = []
  const tends = []
  let k = 0
  const leaf = (q, side, len, j) => {
    const na = Math.atan2(q.ny, q.nx)
    const a = na + side * (0.8 + rnd() * 0.3)
    leaves.push(
      <S.G key={`lf${k++}`} transform={`translate(${r2(q.x)} ${r2(q.y)}) rotate(${r2((a * 180) / Math.PI)})`}>
        <S.Path d={leafPath(len, len * 0.4)} fill={j % 3 ? 'url(#pkLf)' : 'url(#pkLg)'} stroke="#1d3d1a" strokeWidth={0.6} strokeLinejoin="round" />
        <S.Path d={`M0 0C${r2(len * 0.3)} ${r2(side * -0.4)} ${r2(len * 0.6)} 0 ${r2(len * 0.88)} 0`} fill="none" stroke="#173415" strokeWidth={0.6} opacity={0.7} />
        <S.Path
          d={`M${r2(len * 0.1)} ${r2(-len * 0.08)}C${r2(len * 0.3)} ${r2(-len * 0.26)} ${r2(len * 0.55)} ${r2(-len * 0.27)} ${r2(len * 0.74)} ${r2(-len * 0.14)}`}
          fill="none"
          stroke="#b9e08a"
          strokeOpacity={0.55}
          strokeWidth={0.7}
        />
      </S.G>,
    )
  }
  const tendril = (d, color, w, extra) => {
    tends.push(<S.Path key={`td${k++}`} d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...extra} />)
  }
  for (let j = 0, s = s0 + 10; s < s1 - 8; j++, s += 24 + rnd() * 8) leaf(at(s), j % 2 ? 1 : -1, 11 + rnd() * 5, j)
  ;[[s0 * 0.3, 1], [s0 * 0.68, -1], [s1 + (UV - s1) * 0.32, -1], [s1 + (UV - s1) * 0.7, 1]].forEach(([s, sd], j) => leaf(at(s), sd, 8.5, j + 1))
  for (let j = 0, s = s0 + 36; s < s1 - 30; j++, s += 64 + rnd() * 30) {
    const q = at(s)
    const na = Math.atan2(q.ny, q.nx)
    tendril(curl(q.x + q.nx * 1.5, q.y + q.ny * 1.5, na, 5.5 + rnd() * 1.5, 1.45, j % 2 ? 1 : -1), '#3d7a30', 1.2)
  }
  ;[s0 * 0.5, s1 + (UV - s1) * 0.5].forEach((s, j) => {
    const q = at(s)
    tendril(curl(q.x, q.y, Math.atan2(q.ny, q.nx), 4.6, 1.4, j ? 1 : -1), '#3d7a30', 1)
  })
  ;[[vp[0], vp[1], -1], [vp[tot - 1], vp[tot - 2], 1]].forEach(([e, n, dir]) => {
    const c = curl(e.x, e.y, Math.atan2(e.y - n.y, e.x - n.x), 6.6, 1.7, dir)
    tendril(c, '#2c5a28', 1.8)
    tendril(c, '#6aa84a', 0.6, { strokeOpacity: 0.7 })
  })
  const body = (pts, w, c) => <S.Path key={`v${k++}`} d={line(pts)} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  return [
    <S.Path key="shadow" d={line(vp)} transform="translate(.6 .9)" fill="none" stroke="#0a1a09" strokeOpacity={0.36} strokeWidth={4.1} strokeLinecap="round" strokeLinejoin="round" />,
    ...tends,
    ...leaves,
    body(vp, 2.9, '#244f22'),
    body(vp, 2, '#3b7a30'),
    body(mid2, 3.4, '#244f22'),
    body(mid2, 2.4, '#3b7a30'),
    body(mid, 3.9, '#244f22'),
    body(mid, 2.7, '#3b7a30'),
    body(thick, 4.6, '#244f22'),
    body(thick, 3.3, '#3b7a30'),
    <S.Path key="hi" d={line(vp.map((p) => ({ x: p.x - p.nx * 0.6, y: p.y - p.ny * 0.6 })))} fill="none" stroke="#9ed06a" strokeOpacity={0.55} strokeWidth={0.7} strokeLinecap="round" />,
  ]
}

/* ---------- A pumpkin ---------- */

const LOBES = [
  [-9.6, 1, 4.8, 8.2],
  [9.6, 1, 4.8, 8.2],
  [-5.5, 0.2, 7.1, 9.8],
  [5.5, 0.2, 7.1, 9.8],
  [0, 0, 7.4, 10.5],
]
const EYE_L = 'M-6.5 -1.1L-2.3 -2.3L-3.9 -6.3Z'
const EYE_R = 'M6.5 -1.1L2.3 -2.3L3.9 -6.3Z'
const NOSE = 'M0 -.3L-1.9 2.6L1.9 2.6Z'
const MOUTH = 'M-7.1 3.1Q0 7.4 7.1 3.1L6.4 5.7L4.7 4.9L3.5 7.3L1.7 6.2L0 8.2L-1.7 6.2L-3.5 7.3L-4.7 4.9L-6.4 5.7Z'
const CUTS = [EYE_L, EYE_R, NOSE, MOUTH]
const STEM = 'M-2.3 -9.4C-3 -12.2 -1.8 -14.6 .9 -15.8L3.5 -14.4C1.9 -13.4 1.9 -11.4 2.5 -9.4Z'

function FaceDefs({ S }) {
  return (
    <S.Defs>
      <S.RadialGradient id="pkFc" gradientUnits="userSpaceOnUse" cx="0" cy="1" r="8.5">
        <S.Stop offset="0" stopColor="#fffbd6" />
        <S.Stop offset="0.4" stopColor="#ffe45a" />
        <S.Stop offset="1" stopColor="#ffa11c" />
      </S.RadialGradient>
      <S.RadialGradient id="pkSpill" cx="0.5" cy="0.5" r="0.5">
        <S.Stop offset="0" stopColor="#ffe57a" stopOpacity="0.28" />
        <S.Stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
      </S.RadialGradient>
    </S.Defs>
  )
}

// What a lit pumpkin shows through its cuts. It flickers, so the live card draws it apart.
function Face({ S }) {
  return (
    <>
      <S.Ellipse cx={0} cy={2} rx={10} ry={8} fill="url(#pkSpill)" />
      {CUTS.map((d, i) => (
        <S.Path key={i} d={d} fill="url(#pkFc)" stroke="#8a2d00" strokeWidth={0.5} strokeLinejoin="round" />
      ))}
    </>
  )
}

function Pump({ S, p, lit, face }) {
  const g = lit ? 'url(#pkLit)' : 'url(#pkDim)'
  const st = lit ? '#8a3004' : '#1f0d05'
  return (
    <S.G transform={`translate(${r2(p.x)} ${r2(p.y)}) rotate(${r2(p.rot)}) scale(${r2(p.sc)})`}>
      <S.Path d={STEM} fill={lit ? '#587a2a' : '#3b4a20'} stroke={lit ? '#27380f' : '#1b2409'} strokeWidth={0.7} strokeLinejoin="round" />
      {lit ? <S.Path d="M-1 -10.2C-1.2 -12 -.6 -13.4 .6 -14.4" fill="none" stroke="#9ac05a" strokeWidth={0.7} opacity={0.8} /> : null}
      {LOBES.map(([cx, cy, rx, ry], i) => (
        <S.Ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={g} stroke={st} strokeWidth={0.75} strokeOpacity={0.9} />
      ))}
      {LOBES.slice(0, 2).map(([cx, cy, rx, ry], i) => (
        <S.Ellipse key={`s${i}`} cx={cx} cy={cy} rx={rx} ry={ry} fill="#3a1200" opacity={lit ? 0.2 : 0.22} />
      ))}
      {LOBES.slice(2, 4).map(([cx, cy, rx, ry], i) => (
        <S.Ellipse key={`m${i}`} cx={cx} cy={cy} rx={rx} ry={ry} fill="#3a1200" opacity={lit ? 0.08 : 0.12} />
      ))}
      {lit
        ? LOBES.map(([cx, cy, rx, ry], i) => (
            <S.Ellipse key={`h${i}`} cx={r2(cx - rx * 0.32)} cy={r2(cy - ry * 0.52)} rx={r2(rx * 0.3)} ry={r2(ry * 0.17)} fill="#ffffff" opacity={0.14} transform={`rotate(-18 ${r2(cx - rx * 0.32)} ${r2(cy - ry * 0.52)})`} />
          ))
        : null}
      <S.Path d="M-8.4 6.6Q0 11.8 8.4 6.6Q0 9.2 -8.4 6.6Z" fill="#1e0a02" opacity={0.34} />
      {lit ? (
        face ? <Face S={S} /> : null
      ) : (
        CUTS.map((d, i) => <S.Path key={i} d={d} fill="#080301" stroke="#1d0b04" strokeWidth={0.4} strokeLinejoin="round" />)
      )}
    </S.G>
  )
}

function PumpDefs({ S }) {
  return (
    <>
      <FaceDefs S={S} />
      <S.Defs>
      <S.RadialGradient id="pkLit" cx="0.5" cy="0.56" r="0.68">
        <S.Stop offset="0" stopColor="#ffb84a" />
        <S.Stop offset="0.45" stopColor="#f77f14" />
        <S.Stop offset="1" stopColor="#a63d06" />
      </S.RadialGradient>
      <S.RadialGradient id="pkDim" cx="0.4" cy="0.34" r="0.85">
        <S.Stop offset="0" stopColor="#8a4a22" />
        <S.Stop offset="0.55" stopColor="#5e2e12" />
        <S.Stop offset="1" stopColor="#33160a" />
      </S.RadialGradient>
      <S.LinearGradient id="pkLf" x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor="#6aa94a" />
        <S.Stop offset="1" stopColor="#2f6128" />
      </S.LinearGradient>
      <S.LinearGradient id="pkLg" x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor="#4f8d3a" />
        <S.Stop offset="1" stopColor="#244d20" />
      </S.LinearGradient>
      </S.Defs>
    </>
  )
}

/* ---------- Shared state: who is lit, is it done, is it the top card ---------- */

function usePatch(f) {
  const P = f.p
  const T = Math.max(1, Math.min(8, P.total || 4))
  const L = useMemo(() => patchLayout(f, T), [f.w, f.h, f.R, f.still, T]) // eslint-disable-line react-hooks/exhaustive-deps
  const A = Math.min(T, P.answered || 0)
  const done = f.still ? true : P.total > 0 && (P.answered || 0) + (P.skipped || 0) >= P.total
  const lit = (p) => L.tile || p.i < A
  const live = Boolean(f.active) && !f.still
  return { L, done, lit, live }
}

/* ---------- Flicker, bats, moon ---------- */

// 0.76 to 1, a different pace and phase for each pumpkin.
function flickerAt(t, it) {
  'worklet'
  const a = (t / it.per + it.ph) * 6.2832
  return 0.88 + 0.07 * Math.sin(a) + 0.05 * Math.sin(a * 2.7 + 1)
}

function flameAt(t, it) {
  'worklet'
  return { x: it.x, y: it.y, o: flickerAt(t, it), r: it.r, s: it.s }
}

function batAt(t, it) {
  'worklet'
  const u0 = (t - it.delay) / it.per
  if (u0 < 0) return { x: it.x, y: it.y, o: 0, s: it.s }
  const u = u0 - Math.floor(u0)
  const o = u < 0.12 ? u / 0.12 : u > 0.88 ? (1 - u) / 0.12 : 1
  return { x: it.x + it.dir * it.a * (2 * u - 1), y: it.y + it.y0 + it.k * Math.sin(Math.PI * u), o, s: it.s }
}

function flapAt(t) {
  'worklet'
  return { transform: [{ scaleY: 0.725 + 0.275 * Math.cos(t * 12.566) }] }
}

const BAT_D =
  'M0 -.4C-1.4 -2.4 -4 -3.8 -7.2 -2.6C-5.8 -1.6 -5.2 -.1 -4.6 1.3C-3.5 .3 -2.5 .4 -1.7 1.6C-1.1 .8 -.5 .9 0 2.3C.5 .9 1.1 .8 1.7 1.6C2.5 .4 3.5 .3 4.6 1.3C5.2 -.1 5.8 -1.6 7.2 -2.6C4 -3.8 1.4 -2.4 0 -.4Z'
const BAT_EARS = 'M-1.3 -1L-1.1 -3.2L0 -1.9L1.1 -3.2L1.3 -1Z'

function BatShape({ S }) {
  return (
    <>
      <S.Path d={BAT_D} fill="#1d1530" />
      <S.Path d={BAT_EARS} fill="#1d1530" />
    </>
  )
}

function MoonDefs({ S, light }) {
  const halo = light ? '#8c78c0' : '#f6e9b8'
  return (
    <S.Defs>
      <S.RadialGradient id="pkMn" cx="0.38" cy="0.34" r="0.75">
        <S.Stop offset="0" stopColor="#fffdee" />
        <S.Stop offset="0.62" stopColor={light ? '#f3e2a2' : '#f6ebc2'} />
        <S.Stop offset="1" stopColor={light ? '#c9b36a' : '#cdbd84'} />
      </S.RadialGradient>
      <S.RadialGradient id="pkMh" cx="0.5" cy="0.5" r="0.5">
        <S.Stop offset="0" stopColor={halo} stopOpacity={light ? 0.34 : 0.5} />
        <S.Stop offset="0.5" stopColor={halo} stopOpacity={light ? 0.14 : 0.2} />
        <S.Stop offset="1" stopColor={halo} stopOpacity="0" />
      </S.RadialGradient>
    </S.Defs>
  )
}

function GlowDefs({ S, light }) {
  return (
    <S.RadialGradient id="pkGl" cx="0.5" cy="0.5" r="0.5">
      <S.Stop offset="0" stopColor={light ? '#ff9d00' : '#ffb42e'} stopOpacity={light ? 0.6 : 0.7} />
      <S.Stop offset={light ? 0.5 : 0.4} stopColor={light ? '#ff8a00' : '#ff8a1c'} stopOpacity={light ? 0.3 : 0.34} />
      <S.Stop offset="1" stopColor="#ff7a10" stopOpacity="0" />
    </S.RadialGradient>
  )
}

// Shop sheets clip 28px past the card, so a glow that would reach further is
// slid toward the card (under it) until it fades out inside that.
const GLOW_REACH = 28

function glowSpot(p, light, tile, f) {
  const r = Math.max((light ? 24 : 34) * p.sc * (tile ? 0.9 : 1) * (light ? 1.15 : 1), light ? 20 : 26)
  const y = p.y + 1
  const dx = Math.min(Math.max(p.x, 0), f.w) - p.x
  const dy = Math.min(Math.max(y, 0), f.h) - y
  const out = Math.hypot(dx, dy)
  const slide = Math.max(0, out + r - GLOW_REACH)
  if (!out || !slide) return { x: p.x, y, r }
  return { x: p.x + (dx / out) * slide, y: y + (dy / out) * slide, r }
}

const MX = (f) => f.w - 10
const MY = -4

function MoonBody({ S, mx, my, light }) {
  return (
    <>
      <S.Circle cx={mx} cy={my} r={42} fill="url(#pkMh)" />
      {light ? <S.Circle cx={mx} cy={my} r={23.5} fill="none" stroke="#7b66b0" strokeOpacity={0.55} strokeWidth={2} /> : null}
      <S.Circle cx={mx} cy={my} r={21} fill="url(#pkMn)" />
      <S.Circle cx={mx - 5.5} cy={my - 3} r={3.6} fill="#b9a76c" opacity={0.26} />
      <S.Circle cx={mx + 5} cy={my - 6} r={2.5} fill="#b9a76c" opacity={0.22} />
      <S.Circle cx={mx + 3.5} cy={my + 3.5} r={4.6} fill="#b9a76c" opacity={0.18} />
      <S.Circle cx={mx - 9} cy={my + 4} r={2} fill="#b9a76c" opacity={0.2} />
      <S.Circle cx={mx + 10} cy={my - 1} r={1.7} fill="#b9a76c" opacity={0.2} />
      <S.Circle cx={mx} cy={my} r={21} fill="none" stroke={light ? '#9a8238' : 'rgba(120,100,50,.35)'} strokeOpacity={light ? 0.85 : 1} strokeWidth={light ? 1.2 : 0.7} />
    </>
  )
}

// The moon climbs in once, when the last question is answered. Reduced motion,
// low power and cards behind the top one mount it already risen.
function MoonRise({ f, children }) {
  const rise = useSharedValue(f.active ? 0 : 1)
  useEffect(() => {
    if (f.active) rise.value = withTiming(1, { duration: 2600, easing: Easing.out(Easing.cubic) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 26 }] }))
  return (
    <Animated.View pointerEvents="none" style={[FILL, style]}>
      {children}
    </Animated.View>
  )
}

function Bat({ S, f, item }) {
  return (
    <Particle clock={f.clock} item={item} fn={batAt} w={f.w} h={f.h} size={16}>
      <Moving clock={f.clock} fn={flapAt} style={BAT_BOX}>
        <S.Svg width={16} height={16} viewBox="-8 -8 16 16">
          <BatShape S={S} />
        </S.Svg>
      </Moving>
    </Particle>
  )
}
const BAT_BOX = { width: 16, height: 16 }

/* ---------- Under: halos and the moon ---------- */

export function PumpkinsUnder({ f }) {
  const S = svgAll()
  const { L, done, lit, live } = usePatch(f)
  const light = f.c.light
  const mx = MX(f)
  const lights = L.pumps.filter(lit)
  const items = useMemo(
    () =>
      lights.map((p) => {
        const g = glowSpot(p, light, L.tile, f)
        return { x: g.x, y: g.y, r: 0, s: 1, per: 2.9 + p.i * 0.41, ph: (p.i * 1.1) / (2.9 + p.i * 0.41), p, g }
      }), // eslint-disable-line react-hooks/exhaustive-deps
    [L, f.p.answered, f.still], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const bats = useMemo(
    () => [
      { x: mx, y: MY - 8, y0: 3, k: -6, a: 26, dir: 1, per: 9, delay: 0, s: 1.75 },
      { x: mx, y: MY + 7, y0: -2, k: 5, a: 24, dir: -1, per: 13, delay: 3, s: 1.3 },
    ],
    [mx],
  )
  if (!S) return null
  if (live) {
    return (
      <>
        {items.map((it) => {
          const size = 2 * it.g.r
          return (
            <Particle key={it.p.i} clock={f.clock} item={it} fn={flameAt} w={f.w} h={f.h} size={size}>
              <S.Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <S.Defs>
                  <GlowDefs S={S} light={light} />
                </S.Defs>
                <S.Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#pkGl)" />
              </S.Svg>
            </Particle>
          )
        })}
        {done ? (
          <>
            <MoonRise f={f}>
              <Layer f={f}>
                <MoonDefs S={S} light={light} />
                <MoonBody S={S} mx={mx} my={MY} light={light} />
              </Layer>
            </MoonRise>
            <Bat S={S} f={f} item={bats[0]} />
            <Bat S={S} f={f} item={bats[1]} />
          </>
        ) : null}
      </>
    )
  }
  if (!lights.length && !done) return null
  return (
    <Layer f={f}>
      <S.Defs>
        <GlowDefs S={S} light={light} />
      </S.Defs>
      {done ? <MoonDefs S={S} light={light} /> : null}
      {lights.map((p) => {
        const g = glowSpot(p, light, L.tile, f)
        return <S.Circle key={p.i} cx={r2(g.x)} cy={r2(g.y)} r={r2(g.r)} fill="url(#pkGl)" />
      })}
      {done ? (
        <>
          <MoonBody S={S} mx={mx} my={MY} light={light} />
          <S.G transform={`translate(${mx} ${MY - 8}) scale(1.75)`}>
            <S.G transform="translate(-6 0)">
              <BatShape S={S} />
            </S.G>
          </S.G>
        </>
      ) : null}
    </Layer>
  )
}

/* ---------- Over: vine and pumpkins, then the flickering faces ---------- */

export function PumpkinsOver({ f }) {
  const S = svgAll()
  const { L, lit, live } = usePatch(f)
  const vine = useMemo(() => {
    const S = svgAll()
    return S ? buildVine(S, L) : null
  }, [L])
  const faces = useMemo(
    () => L.pumps.filter(lit).map((p) => ({ x: p.x, y: p.y, r: (p.rot * Math.PI) / 180, s: p.sc, per: 2.5 + p.i * 0.37, ph: (p.i * 0.9) / (2.5 + p.i * 0.37), i: p.i })), // eslint-disable-line react-hooks/exhaustive-deps
    [L, f.p.answered, f.still], // eslint-disable-line react-hooks/exhaustive-deps
  )
  if (!S || !vine) return null
  return (
    <>
      <Layer f={f}>
        <PumpDefs S={S} />
        {vine}
        {L.pumps.map((p) => (
          <Pump key={p.i} S={S} p={p} lit={lit(p)} face={!live} />
        ))}
      </Layer>
      {live
        ? faces.map((it) => (
            <Particle key={it.i} clock={f.clock} item={it} fn={flameAt} w={f.w} h={f.h} size={24}>
              <S.Svg width={24} height={24} viewBox="-12 -12 24 24">
                <FaceDefs S={S} />
                <Face S={S} />
              </S.Svg>
            </Particle>
          ))
        : null}
    </>
  )
}

export const FRAME_ART_2026_10_28 = {
  pumpkins: { under: PumpkinsUnder, over: PumpkinsOver, animated: true },
}
