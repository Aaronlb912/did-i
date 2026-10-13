// Frames from the 2027-01-29 drop (docs/ideas/frames-drop-2027-01-29.html):
// Lace (coin, still), Paper Boats (gem, living: a boat sails for each answer
// and the lighthouse comes on when tonight is done) and Thaw (Feb 20 to
// Mar 5, seasonal: one more flower and a little less snow each day). Same
// contract as art.jsx: each draws in card space and may reach PAD past the
// card; still tiles draw no particles and no moving views.
import { useMemo } from 'react'
import { rrLength, rrPath, rrPointAt, seeded } from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll } from './runtime.jsx'
import { countdownDay } from './art-drop.jsx'

const r2 = (n) => Math.round(n * 100) / 100
const lerp = (a, b, t) => a + (b - a) * t
const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }

function Layer({ f, children }) {
  return (
    <SvgLayer w={f.w} h={f.h}>
      {children}
    </SvgLayer>
  )
}

/** A rounded ring o px outside the card. */
function ring(f, o) {
  return rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, Math.max(0, f.R + o))
}

function mix(c1, c2, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const a = p(c1)
  const b = p(c2)
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join('')
}

const circ = (x, y, r) => `M${r2(x - r)} ${r2(y)}A${r} ${r} 0 1 0 ${r2(x + r)} ${r2(y)}A${r} ${r} 0 1 0 ${r2(x - r)} ${r2(y)}Z`

function sparkD(x, y, s) {
  return `M${r2(x)} ${r2(y - s)}Q${r2(x)} ${r2(y)} ${r2(x + s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y + s)}Q${r2(x)} ${r2(y)} ${r2(x - s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y - s)}Z`
}

/* ---------- Lace: two paper doilies under the card (coin, still) ---------- */

// The top sheet's outline walks the card edge and takes the larger of small
// scallops (8 px reach at the top), a deep lace edge along the bottom that fans
// round both bottom corners, and two side fans. Every cut-out is a subpath of
// one evenodd Path. The sheet under it is shifted half a scallop.
function laceLayout(f) {
  const { w, h, R } = f
  const L = rrLength(w, h, R)
  const sv = h - 2 * R
  const sh = w - 2 * R
  const arc = (Math.PI * R) / 2
  const P0 = (s) => rrPointAt(0, 0, w, h, R, s)
  const wrap = (d) => {
    d = ((d % L) + L) % L
    return d > L / 2 ? d - L : d
  }
  const FANS = [
    [sv / 2, 12.5, 5],
    [sv + 2 * arc + sh + sv / 2, 12.5, 5],
  ]
  const FC = FANS.map(([s0]) => P0(s0))
  const NS = Math.round(L / 10.6)
  const P = L / NS
  const C = 2.6
  const SR = P / 2
  const sB = 2 * sv + 3 * arc + sh + sh / 2
  const half = sh / 2 + arc + 24
  const TP = 18
  const NB = Math.round((2 * half) / 17.5)
  const PB = (2 * half) / NB
  const RB = PB / 2
  const CB = 9.4
  const win = (s) => {
    const d = Math.abs(wrap(s - sB))
    if (d >= half) return 0
    const t = Math.min(1, (half - d) / TP)
    return t * t * (3 - 2 * t)
  }
  const small = (s, ph = 0) => {
    const u = ((((s + ph) % P) + P) % P) - SR
    return C + Math.sqrt(Math.max(0, SR * SR - u * u))
  }
  const big = (s, ph = 0, c = CB) => {
    const k = win(s)
    if (!k) return 0
    const d = wrap(s - sB) + half + ph
    const u = ((d % PB) + PB) % PB - RB
    return k * (c + Math.sqrt(Math.max(0, RB * RB - u * u)))
  }
  const fanH = (s, p) => {
    let m = 0
    FANS.forEach(([s0, Rf], j) => {
      const d = wrap(s - s0)
      if (Math.abs(d) >= Rf + 6) return
      const Cn = FC[j]
      const tx = Math.cos(Cn.ang)
      const ty = Math.sin(Cn.ang)
      const k = Math.round(Rf / 2.1)
      const vx = p.x - Cn.x
      const vy = p.y - Cn.y
      const b = vx * p.nx + vy * p.ny
      const c0 = vx * vx + vy * vy
      let rho = Rf
      let t = 0
      for (let it = 0; it < 3; it++) {
        const D = b * b - (c0 - rho * rho)
        if (D < 0) return
        t = -b + Math.sqrt(D)
        const qx = vx + p.nx * t
        const qy = vy + p.ny * t
        const th = Math.atan2(qx * tx + qy * ty, qx * Cn.nx + qy * Cn.ny)
        if (Math.abs(th) > Math.PI / 2) return
        const ph = (th + Math.PI / 2) / (Math.PI / k)
        const fr = ph - Math.floor(ph)
        rho = Rf - 1.4 + 2.1 * Math.sqrt(Math.max(0, 1 - (2 * fr - 1) ** 2))
      }
      m = Math.max(m, t)
    })
    return m
  }
  const inFan = (s, pad) => FANS.some(([s0, Rf]) => Math.abs(wrap(s - s0)) < Rf + pad)
  const step = f.still ? 1 : 0.5
  const n = Math.ceil(L / step)
  const pt = (p, o) => r2(p.x + p.nx * o) + ' ' + r2(p.y + p.ny * o)
  let o1 = ''
  let o2 = ''
  let in2 = ''
  for (let i = 0; i < n; i++) {
    const s = (i * L) / n
    const p = P0(s)
    const fh = fanH(s, p)
    const a = Math.max(small(s), big(s), fh)
    const b = Math.max(small(s, SR), big(s, RB, CB + 0.8), fh ? fh + 1.2 : 0)
    const c = i ? 'L' : 'M'
    o1 += c + pt(p, a)
    o2 += c + pt(p, b)
    in2 += c + pt(p, a - 2.4)
  }
  const at = (p) => {
    const tx = Math.cos(p.ang)
    const ty = Math.sin(p.ang)
    return (a, b) => [p.x + a * tx + b * p.nx, p.y + a * ty + b * p.ny]
  }
  const petal = (M, cx, cy, ax, ay, l, wd) => {
    const bx = ay
    const by = -ax
    const Q = (u, v) => M(cx + u * bx + v * ax, cy + u * by + v * ay).map(r2).join(' ')
    const hl = l / 2
    const hw = wd / 2
    return `M${Q(0, hl)}C${Q(hw * 1.1, hl * 0.35)} ${Q(hw, -hl * 0.9)} ${Q(0, -hl)}C${Q(-hw, -hl * 0.9)} ${Q(-hw * 1.1, hl * 0.35)} ${Q(0, hl)}Z`
  }
  let holes = ''
  for (let j = 0; j < NS; j++) {
    const s = (j + 0.5) * P
    if (!inFan(s, 3.2) && win(s) < 0.15) holes += petal(at(P0(s)), 0, 4.9, 0, 1, 3.7, 2.3)
    const s2 = j * P
    if (!inFan(s2, 1.5) && win(s2) < 0.5) {
      const [x, y] = at(P0(s2))(0, 1.45)
      holes += circ(x, y, 0.72)
    }
  }
  // Deep lace: an open fan of three petals in each big scallop, an eyelet at
  // its root, two pin holes beside it and a round hole in each valley.
  for (let j = 0; j < NB; j++) {
    const s = sB - half + (j + 0.5) * PB
    if (win(s) < 0.75) continue
    const M = at(P0(s))
    const o = CB - 1.2
    for (const a of [-40, 0, 40]) {
      const th = (a * Math.PI) / 180
      const ax = Math.sin(th)
      const ay = Math.cos(th)
      holes += petal(M, ax * 5.5, o + ay * 5.5, ax, ay, 6, 3.4)
    }
    for (const a of [-68, 68]) {
      const th = (a * Math.PI) / 180
      const [x, y] = M(Math.sin(th) * 6.4, o + Math.cos(th) * 6.4)
      holes += circ(x, y, 0.85)
    }
    const [ex, ey] = M(0, o)
    holes += circ(ex, ey, 1.15)
    const [px, py] = M(0, 2.3)
    holes += circ(px, py, 0.6)
  }
  for (let j = 1; j < NB; j++) {
    const s = sB - half + j * PB
    if (win(s) < 0.75) continue
    const [x, y] = at(P0(s))(0, 5.2)
    holes += circ(x, y, 1.6)
  }
  for (const [s0, Rf, np] of FANS) {
    const M = at(P0(s0))
    const k = Rf / 17
    for (let i = 0; i < np; i++) {
      const th = ((-66 + (132 * i) / (np - 1)) * Math.PI) / 180
      const ax = Math.sin(th)
      const ay = Math.cos(th)
      holes += petal(M, ax * 8.6 * k, ay * 8.6 * k, ax, ay, 4.6 * k, 2.7 * k)
    }
    const nd = np + 2
    for (let i = 0; i < nd; i++) {
      const th = ((-68 + (136 * i) / (nd - 1)) * Math.PI) / 180
      const [x, y] = M(Math.sin(th) * 13.2 * k, Math.cos(th) * 13.2 * k)
      holes += circ(x, y, 0.72)
    }
  }
  return { top: `${o1}Z${holes}${ring(f, -3)}`, under: `${o2}Z${in2}Z` }
}

export function LaceUnder({ f }) {
  const S = svgAll()
  const { top, under } = useMemo(() => laceLayout(f), [f.w, f.h, f.R, f.still]) // eslint-disable-line react-hooks/exhaustive-deps
  const LT = f.c.light
  const P1 = LT ? '#fffaf0' : '#f7eedb'
  const P2 = LT ? '#efd9ad' : '#e0c99c'
  const S1 = LT ? '#e6cc98' : '#c8a978'
  const S2 = LT ? '#d2b07a' : '#a8875a'
  const EDGE = LT ? '#9c7440' : '#b08e5c'
  const SHC = '#3a2608'
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="lcP" x1="0" y1="0" x2={f.w} y2={f.h} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor={P1} />
          <S.Stop offset="0.55" stopColor={mix(P1, P2, 0.45)} />
          <S.Stop offset="1" stopColor={P2} />
        </S.LinearGradient>
        <S.LinearGradient id="lcU" x1="0" y1="0" x2="0" y2={f.h + 20} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor={S1} />
          <S.Stop offset="1" stopColor={S2} />
        </S.LinearGradient>
      </S.Defs>
      <S.Path d={under} fillRule="evenodd" fill={SHC} fillOpacity={LT ? 0.16 : 0.35} transform="translate(1.8 3.4)" />
      <S.Path d={under} fillRule="evenodd" fill="url(#lcU)" stroke={EDGE} strokeWidth={0.5} />
      <S.Path d={top} fillRule="evenodd" fill={SHC} fillOpacity={LT ? 0.14 : 0.3} transform="translate(1.8 3.4)" />
      <S.Path d={top} fillRule="evenodd" fill={SHC} fillOpacity={LT ? 0.26 : 0.45} transform="translate(0.6 1.3)" />
      <S.Path d={top} fillRule="evenodd" fill="url(#lcP)" stroke={EDGE} strokeWidth={0.6} />
      <S.Path d={ring(f, 1.2)} fill="none" stroke="#ffffff" strokeOpacity={LT ? 0.9 : 0.5} strokeWidth={0.6} />
      <S.Path d={ring(f, 0.6)} fill="none" stroke={SHC} strokeOpacity={LT ? 0.16 : 0.3} strokeWidth={2.6} />
    </Layer>
  )
}

/* ---------- Paper Boats: a harbor along the bottom (gem, living) ---------- */

const PAPERS = ['#fffaf0', '#ffd27f', '#a8d8ff', '#ffb6c8', '#c6ee98', '#d6c3ff']
const HULL = 'M-10 -4.6L-6.3 1.9L6.3 1.9L10 -4.6L5 -3.2L0 -12.6L-5 -3.2Z'

/** A folded paper boat with its waterline at (0,0), about 20 by 15. */
function Boat({ S, col, shade = 0.16, transform }) {
  return (
    <S.G transform={transform}>
      <S.Path d="M0 -12.6L5 -3.2L0 -3.2ZM0 -12.6L-5 -3.2L0 -3.2ZM-10 -4.6L-6.3 1.9L6.3 1.9L10 -4.6L5 -3.2L-5 -3.2Z" fill={col} />
      <S.Path d="M0 -12.6L5 -3.2L0 -3.2ZM10 -4.6L5 -3.2L6.4 -.2Z" fill="#000000" fillOpacity={shade} />
      <S.Path d="M-7.8 -.9L-6.3 1.9L6.3 1.9L7.8 -.9Z" fill="#000000" fillOpacity={shade * 0.8} />
      <S.Path d="M-3.9 -5.2L0 -12.6L-.6 -5.4ZM-10 -4.6L-5 -3.2L-6.4 -.2Z" fill="#ffffff" fillOpacity={0.32} />
      <S.Path d="M0 -12.6V-3.2M-5 -3.2H5M-10 -4.6L-6.3 1.9H6.3L10 -4.6L5 -3.2L0 -12.6L-5 -3.2Z" fill="none" stroke="#3a3020" strokeOpacity={0.5} strokeWidth={0.5} strokeLinejoin="round" />
      <S.Path d="M-9.2 -4.2L-5.4 -3.1" stroke="#ffffff" strokeWidth={0.7} strokeLinecap="round" />
    </S.G>
  )
}

const LAM = 30

function boatsLayout(f) {
  const { w, h } = f
  const P = f.p
  const T = Math.max(0, Math.min(10, P.total || 0))
  const A = Math.min(T, P.answered || 0)
  const SK = Math.min(T - A, P.skipped || 0)
  const done = f.still || T === 0 || A >= T
  const n = T || 4
  const wait = done ? 0 : T - A - SK
  const e = Math.max(0, Math.min(1, P.evening ?? 0.5))
  // Shop tiles: set pieces drawn 1.5x so the scene still reads at 120 px.
  const K = f.still && w <= 220 ? 1.5 : 1
  const Y0 = h + 11 + (K - 1) * 8
  const x0 = -24 - LAM
  const x1 = w + 24 + LAM
  const yAt = (x, y, a, ph) => y + a * Math.sin((x / LAM) * 2 * Math.PI + ph)
  const wave = (y, a, ph) => {
    let d = ''
    for (let x = x0; x <= x1; x += 2) d += (x === x0 ? 'M' : 'L') + r2(x) + ' ' + r2(yAt(x, y, a, ph))
    return d
  }
  const fill = (d) => `${d}L${x1} ${h + 30}L${x0} ${h + 30}Z`
  const back = wave(Y0 - 2, 0.9, 1.3)
  const front = wave(Y0 + 1.8, 1.1, 0)
  const sail = []
  const xL = 54 + SK * 19
  const xR = w - 64
  if (done) {
    const g = Math.min(23, (w - 80) / Math.max(1, n - 1))
    for (let i = 0; i < n; i++) sail.push({ x: w - 18 - i * g, i, y: i % 2 ? 1.2 : 0 })
  } else {
    const g = Math.min(38, (xR - xL) / Math.max(1, T - 1))
    for (let i = 0; i < A; i++) sail.push({ x: xR - i * g, i, y: 0 })
  }
  const SC = (done ? 1.05 : 1.15) * K
  for (const b of sail) {
    b.wy = yAt(b.x, Y0 + b.y, 1.1, 0) + 1.2
    b.s = SC
    b.rot = 0
    b.ph = b.i * 0.9
    b.col = PAPERS[b.i % 6]
  }
  const deckY = h + 7
  const tied = []
  let rope = ''
  for (let i = 0; i < SK; i++) {
    const b = { x: 46 + i * 19, i: A + i, y: 0.6, s: 0.95, rot: -5, ph: i * 1.3 + 0.4, col: PAPERS[(A + i) % 6] }
    b.wy = yAt(b.x, Y0 + b.y, 1.1, 0) + 1.2
    tied.push(b)
    const sx = i ? b.x - 19 + 9.4 * b.s : 29.1
    const sy = i ? b.wy - 3.8 : deckY - 3
    const ex = b.x - 9.4 * b.s
    const ey = b.wy - 3.8
    rope += `M${r2(sx)} ${r2(sy)}Q${r2((sx + ex) / 2)} ${r2(Math.max(sy, ey) + 4.5)} ${r2(ex)} ${r2(ey)}`
  }
  const onDeck = []
  const ds = Math.min(10, 40 / Math.max(1, wait))
  for (let i = 0; i < wait; i++) onDeck.push({ x: -12 + i * ds, col: PAPERS[(A + SK + i) % 6] })
  const ripples = sail.map((b) => `M${r2(b.x - 13)} ${r2(b.wy + 1.4)}q2.5 -1.2 5 0M${r2(b.x + 8)} ${r2(b.wy + 1.4)}q2.5 -1.2 5 0`).join('')
  return { T, A, SK, done, e, K, Y0, back, front, fill, sail, tied, rope, onDeck, deckY, ripples, foam: wave(Y0 + 5.6, 0.6, 2) }
}

function bobFor(pull) {
  return (time, it) => {
    'worklet'
    const v = pull ? Math.max(-1, Math.min(1, pull.value / 110)) : 0
    const k = Math.sin((2 * Math.PI * time) / 3.2 + it.ph)
    return { x: it.x, y: it.wy - 0.5 - 0.5 * k, r: ((it.rot + v * 8 + 2.6 * k) * Math.PI) / 180 }
  }
}

function riseFor(pull) {
  return () => {
    'worklet'
    const v = pull ? Math.min(1, Math.abs(pull.value) / 110) : 0
    return { transform: [{ translateY: -2.4 * v }] }
  }
}

function breathe(time) {
  'worklet'
  return { opacity: 0.72 + 0.28 * (0.5 - 0.5 * Math.cos((2 * Math.PI * time) / 4.2)) }
}

function BoatSprite({ S, b }) {
  const z = 32
  return (
    <S.Svg width={z} height={z} viewBox={`${-z / 2} ${-z / 2} ${z} ${z}`}>
      <Boat S={S} col={b.col} transform={`scale(${r2(b.s)})`} />
    </S.Svg>
  )
}

export function BoatsOver({ f }) {
  const S = svgAll()
  const L = useMemo(() => boatsLayout(f), [f.w, f.h, f.R, f.still, f.p.total, f.p.answered, f.p.skipped, f.p.evening]) // eslint-disable-line react-hooks/exhaustive-deps
  const bob = useMemo(() => bobFor(f.pull), [f.pull])
  const rise = useMemo(() => riseFor(f.pull), [f.pull])
  const { w, h } = f
  const LT = f.c.light
  const live = !f.still
  const { done, e, K, deckY } = L
  const W0 = mix('#164a6c', '#0b1a38', e)
  const W2 = mix('#66c6dc', '#3f78b8', e)
  const W1 = mix('#2a84a8', '#1b3f78', e)
  // Lighthouse on rocks at the bottom right corner.
  const lx = w + 10.5
  const base = h + 10
  const top = h - 46
  const tw = (y) => lerp(8, 5.4, (base - y) / (base - top))
  const slab = (ya, yb) => `M${r2(lx - tw(ya))} ${r2(ya)}L${r2(lx + tw(ya))} ${r2(ya)}L${r2(lx + tw(yb))} ${r2(yb)}L${r2(lx - tw(yb))} ${r2(yb)}Z`
  const bh = (base - top) / 5
  const red = [0, 2, 4].map((i) => slab(base - i * bh, base - (i + 1) * bh)).join('')
  const white = [1, 3].map((i) => slab(base - i * bh, base - (i + 1) * bh)).join('')
  const ly = top - 6
  const full = e >= 0.57 || done
  const px = -15.5
  const pt = h - 48
  const gy = h + 18 - (h + 18 - ly) * K
  const tile = () => `translate(${lx} ${h + 18}) scale(${K}) translate(${-lx} ${-h - 18})`
  const dockT = `translate(-20 ${deckY}) scale(${K}) translate(20 ${-deckY})`
  const ST = [[0.18, -4.5, 1.6], [0.42, -5.5, 1.2], [0.66, -4, 1.5], [0.88, -5.5, 1.1], [-9, 38, 1.4], [-12, 84, 1.1], [-8, 132, 1.3], [w + 9, 30, 1.5], [w + 12, 74, 1.1]]
  const stars = ST.map(([x, y, s]) => sparkD(x <= 1 && x > 0 ? w * x : x, y, s * (K > 1 ? 1.4 : 1))).join('')
  const gull = (x, y, s) => `M${r2(x - 4 * s)} ${r2(y)}q${r2(2 * s)} ${r2(-2.4 * s)} ${r2(4 * s)} 0q${r2(2 * s)} ${r2(-2.4 * s)} ${r2(4 * s)} 0`
  const gulls = gull(w + 8, h - 100, 1.35 * K) + gull(w + 15, h - 114, 1.05 * K) + gull(-11, 64, 1.1 * K)
  let streaks = ''
  for (let i = 0; i < 6; i++) {
    const y = h + 11.5 + i * 1.7
    const x = lx - 8 - i * 6
    const l = 8 - i * 0.7
    streaks += `M${r2(x - l / 2)} ${r2(y)}H${r2(x + l / 2)}`
  }
  const rocks = [[lx - 7, h + 13, 9, 5.4], [lx + 3.5, h + 14, 6, 5], [lx - 2, h + 18, 11, 3.6]]
  const glowOut = `${rrPath(-60, -60, w + 120, h + 120, f.R + 60)} ${ring(f, 0.5)}`
  const clipW = rrPath(-20 * K, -20 * K, w + 40 * K, h + 40 * K, f.R + 20 * K)
  const glows = (
    <Layer f={f}>
      <S.Defs>
        <S.RadialGradient id="boGl" cx="0.5" cy="0.5" r="0.5">
          <S.Stop offset="0" stopColor="#ffe08a" stopOpacity="0.85" />
          <S.Stop offset="0.4" stopColor="#ffc85a" stopOpacity="0.32" />
          <S.Stop offset="1" stopColor="#ffc85a" stopOpacity="0" />
        </S.RadialGradient>
        <S.ClipPath id="boOut">
          <S.Path d={glowOut} clipRule="evenodd" />
        </S.ClipPath>
      </S.Defs>
      <S.G clipPath="url(#boOut)">
        {done ? <S.Ellipse cx={lx} cy={r2(gy)} rx={r2(13 * K)} ry={r2(30 * K)} fill="url(#boGl)" /> : null}
        <S.G transform={dockT} opacity={full ? 1 : 0.5}>
          <S.Ellipse cx={px + 1.7} cy={pt - 3} rx={9} ry={16} fill="url(#boGl)" />
        </S.G>
      </S.G>
    </Layer>
  )
  const staticBoats = (list) => list.map((b, i) => <Boat key={i} S={S} col={b.col} transform={`translate(${r2(b.x)} ${r2(b.wy)}) rotate(${b.rot}) scale(${r2(b.s)})`} />)
  return (
    <>
      {live ? (
        <Moving clock={f.clock} fn={breathe} style={FILL}>
          {glows}
        </Moving>
      ) : (
        glows
      )}
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="boW0" x1="0" y1={h + 4} x2="0" y2={h + 22} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor={W0} />
            <S.Stop offset="1" stopColor={mix(W0, '#000000', 0.3)} />
          </S.LinearGradient>
          <S.ClipPath id="boCw">
            <S.Path d={clipW} />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={ring(f, 1.6)} fill="none" stroke={LT ? '#3b86a8' : '#8fd0e6'} strokeOpacity={LT ? 0.35 : 0.3} strokeWidth={1} />
        <S.Path d={stars} fill={LT ? '#6f83aa' : '#e6edff'} opacity={LT ? 0.8 : 0.9} />
        <S.Path d={gulls} fill="none" stroke={LT ? '#3a4252' : '#e8edf5'} strokeWidth={1.1} strokeLinecap="round" />
        <S.G clipPath="url(#boCw)">
          <S.Path d={L.fill(L.back)} fill="url(#boW0)" />
          <S.Path d={L.back} fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.7} />
          {L.sail.map((b, i) => (
            <S.Path key={i} d={HULL} fill={b.col} opacity={LT ? 0.3 : 0.22} transform={`translate(${r2(b.x)} ${r2(b.wy + 1.4)}) scale(${r2(b.s)} ${r2(-b.s * 0.55)})`} />
          ))}
          <S.G transform={dockT}>
            <S.Path d="M-15 0h3.4v17h-3.4ZM5 0h3.4v17h-3.4ZM25 0h3.4v17h-3.4Z" transform={`translate(0 ${deckY})`} fill="#7a4d2a" stroke="#3e2714" strokeWidth={0.5} />
          </S.G>
        </S.G>
        {live ? null : staticBoats([...L.sail, ...L.tied])}
      </Layer>
      {live
        ? [...L.sail, ...L.tied].map((b, i) => (
            <Particle key={i} clock={f.clock} item={b} fn={bob} w={w} h={h} size={32}>
              <BoatSprite S={S} b={b} />
            </Particle>
          ))
        : null}
      <Moving clock={f.clock} fn={rise} style={FILL}>
        <Layer f={f}>
          <S.Defs>
            <S.LinearGradient id="boW1" x1="0" y1={h + 8} x2="0" y2={h + 22} gradientUnits="userSpaceOnUse">
              <S.Stop offset="0" stopColor={W2} />
              <S.Stop offset="0.45" stopColor={W1} />
              <S.Stop offset="1" stopColor={mix(W1, '#000000', 0.25)} />
            </S.LinearGradient>
            <S.LinearGradient id="boBm" x1={lx} y1="0" x2={lx - 70} y2="0" gradientUnits="userSpaceOnUse">
              <S.Stop offset="0" stopColor="#ffe7a0" stopOpacity="0.75" />
              <S.Stop offset="1" stopColor="#ffe7a0" stopOpacity="0" />
            </S.LinearGradient>
            <S.ClipPath id="boCw2">
              <S.Path d={clipW} />
            </S.ClipPath>
          </S.Defs>
          <S.G clipPath="url(#boCw2)">
            <S.Path d={L.fill(L.front)} fill="url(#boW1)" fillOpacity={0.94} />
            <S.Path d={L.front} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.9} />
            <S.Path d={L.foam} fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.7} strokeDasharray="5 9" />
            {done ? <S.Path d={`M${lx - 5} ${h + 11}L${lx + 3} ${h + 11}L${lx - 14} ${h + 24}L${lx - 70} ${h + 24}Z`} fill="url(#boBm)" /> : null}
            {L.ripples ? <S.Path d={L.ripples} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.7} strokeLinecap="round" /> : null}
            <S.Path d={streaks} stroke={done ? '#ffe39a' : '#cfe6f5'} strokeOpacity={done ? 0.75 : 0.28} strokeWidth={1.1} strokeLinecap="round" />
          </S.G>
        </Layer>
      </Moving>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="boWd" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#b98252" />
            <S.Stop offset="1" stopColor="#6e4526" />
          </S.LinearGradient>
          <S.RadialGradient id="boRk" cx="0.35" cy="0.3" r="0.8">
            <S.Stop offset="0" stopColor="#9aa3b2" />
            <S.Stop offset="1" stopColor="#4a5160" />
          </S.RadialGradient>
          <S.RadialGradient id="boLp" cx="0.5" cy="0.5" r="0.6">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="0.5" stopColor="#ffe9a6" />
            <S.Stop offset="1" stopColor="#ffc24a" />
          </S.RadialGradient>
        </S.Defs>
        {L.rope ? (
          <>
            <S.Path d={L.rope} fill="none" stroke="#3a2a18" strokeWidth={1.9} strokeLinecap="round" />
            <S.Path d={L.rope} fill="none" stroke="#ecd9a8" strokeWidth={1} strokeLinecap="round" strokeDasharray="1.6 .7" />
          </>
        ) : null}
        <S.G transform={dockT}>
          <S.Rect x={px} y={pt} width={3.4} height={deckY - pt} rx={1} fill="#3a3f4c" />
          <S.Path d={`M${px + 0.8} ${pt + 2}V${deckY - 1}`} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={0.7} />
          <S.Path d={`M${px - 1.6} ${pt}H${px + 5}L${px + 4} ${pt - 6}H${px - 0.6}Z`} fill={full ? 'url(#boLp)' : '#e9b65c'} stroke="#2f3646" strokeWidth={0.7} strokeLinejoin="round" />
          <S.Path d={`M${px - 2.4} ${pt - 6}H${px + 5.8}L${px + 1.7} ${pt - 9}Z`} fill="#2f3646" />
          <S.Path d={`M-15.4 ${deckY - 1.6}h4.2v2h-4.2ZM4.6 ${deckY - 1.6}h4.2v2h-4.2ZM24.6 ${deckY - 1.6}h4.2v2h-4.2Z`} fill="#8a5a33" />
          <S.Rect x={-20} y={deckY} width={52} height={3.8} rx={1.2} fill="url(#boWd)" stroke="#3e2714" strokeWidth={0.6} />
          <S.Path d={`M-12 ${deckY + 0.4}v3M-3 ${deckY + 0.4}v3M8 ${deckY + 0.4}v3M17 ${deckY + 0.4}v3`} stroke="#3e2714" strokeOpacity={0.6} strokeWidth={0.5} />
          <S.Path d={`M-19 ${deckY + 0.7}H31`} stroke="#f0c89a" strokeOpacity={0.6} strokeWidth={0.6} />
          <S.Path d={`M27.4 ${deckY}V${deckY - 2.6}Q29.1 ${deckY - 4.4} 30.8 ${deckY - 2.6}V${deckY}Z`} fill="#3a3f4c" stroke="#1e222b" strokeWidth={0.5} />
          {L.onDeck.map((b, i) => (
            <Boat key={i} S={S} col={b.col} shade={0.2} transform={`translate(${r2(b.x)} ${deckY - 0.4}) scale(.72)`} />
          ))}
        </S.G>
        <S.G transform={tile()}>
          {rocks.map(([x, y, rx, ry], i) => (
            <S.Ellipse key={i} cx={r2(x)} cy={y} rx={rx} ry={ry} fill="url(#boRk)" stroke="#2a303c" strokeWidth={0.5} />
          ))}
          <S.Path
            d={rocks.map(([x, y, rx, ry]) => `M${r2(x - rx * 0.6)} ${r2(y - ry * 0.45)}Q${r2(x - rx * 0.1)} ${r2(y - ry * 0.95)} ${r2(x + rx * 0.4)} ${r2(y - ry * 0.7)}`).join('')}
            fill="none"
            stroke="#c8d0dc"
            strokeOpacity={0.55}
            strokeWidth={0.7}
            strokeLinecap="round"
          />
          <S.Path d={red} fill="#e45545" />
          <S.Path d={white} fill="#fbf4e6" />
          <S.Path d={`M${r2(lx + tw(base) * 0.25)} ${base}L${r2(lx + tw(top) * 0.25)} ${top}L${r2(lx + tw(top))} ${top}L${r2(lx + tw(base))} ${base}Z`} fill="#000000" fillOpacity={0.2} />
          <S.Path d={`M${r2(lx - tw(base) + 1.4)} ${base - 1}L${r2(lx - tw(top) + 1.1)} ${top + 1}`} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.9} strokeLinecap="round" />
          <S.Path d={slab(base, top)} fill="none" stroke="#5a2a22" strokeOpacity={0.6} strokeWidth={0.6} />
          <S.Rect x={lx - 2} y={base - 7} width={4} height={7} rx={2} fill="#4a2a1c" />
          {[base - bh * 2.5, base - bh * 4.4].map((y, i) => (
            <S.Rect key={i} x={lx - 1.3} y={r2(y - 1.8)} width={2.6} height={3.6} rx={0.7} fill={done ? '#ffd77a' : '#2b3446'} stroke="#5a2a22" strokeOpacity={0.5} strokeWidth={0.4} />
          ))}
          <S.Rect x={lx - 7.4} y={top - 1.6} width={14.8} height={2.4} rx={1} fill="#2f3646" />
          <S.Path d={`M${lx - 7} ${top - 1.6}V${top - 4.2}H${lx + 7}V${top - 1.6}M${lx - 3.5} ${top - 1.6}V${top - 4.2}M${lx} ${top - 1.6}V${top - 4.2}M${lx + 3.5} ${top - 1.6}V${top - 4.2}`} fill="none" stroke="#2f3646" strokeWidth={0.6} />
          <S.Rect x={lx - 4.2} y={ly - 3.2} width={8.4} height={7.4} rx={1} fill={done ? 'url(#boLp)' : '#33405a'} stroke="#2f3646" strokeWidth={0.9} />
          <S.Path d={`M${lx} ${ly - 3}V${ly + 4}`} stroke="#2f3646" strokeWidth={0.6} />
          <S.Path d={`M${lx - 5.6} ${ly - 3}L${lx} ${ly - 8.6}L${lx + 5.6} ${ly - 3}Z`} fill="#d84a3c" stroke="#7a2418" strokeWidth={0.6} strokeLinejoin="round" />
          <S.Path d={`M${lx - 3.6} ${ly - 4.2}L${lx - 0.6} ${ly - 7.4}`} stroke="#ff9a8a" strokeWidth={0.7} strokeLinecap="round" />
          <S.Circle cx={lx} cy={ly - 9.4} r={1.2} fill="#2f3646" />
        </S.G>
      </Layer>
    </>
  )
}

/* ---------- Thaw: late winter melts round the card (Feb 20 to Mar 5) ---------- */

/** Day 0 (Feb 20) to 13 (Mar 5). Outside the window it shows full thaw. */
export function thawDay(date) {
  const { m, d } = countdownDay(date)
  const t = Date.UTC(2027, m - 1, d)
  const k = Math.round((t - Date.UTC(2027, 1, 20)) / 864e5)
  return { k: k >= 0 && k <= 13 ? k : 13, inWin: k >= 0 && k <= 13 }
}

function Snowdrop({ S, bud }) {
  return (
    <>
      <S.Path d="M-.6 0C-2.9 -3 -3.4 -6.8 -1.9 -9.8C-1.2 -6.2 -.8 -3.4 .4 0ZM.5 0C2.4 -2.6 2.6 -5.4 1.6 -7.6C1.4 -5 1 -2.6 -.2 0Z" fill="url(#thLf)" />
      <S.Path d="M0 0C0 -5 .2 -9.4 2.6 -11.4" fill="none" stroke="#4f8a3c" strokeWidth={1} />
      <S.Circle cx={3} cy={-11} r={1} fill="#6fae52" />
      {bud ? (
        <>
          <S.Ellipse cx={3.4} cy={-8.4} rx={1.5} ry={2.7} fill="url(#thSd)" stroke="#9fb2c8" strokeWidth={0.4} />
          <S.Path d="M3 -10.4V-6.6" stroke="#ffffff" strokeWidth={0.5} />
        </>
      ) : (
        <>
          <S.Ellipse cx={1.3} cy={-8.2} rx={1.25} ry={2.8} transform="rotate(28 1.3 -8.2)" fill="url(#thSd)" stroke="#9fb2c8" strokeWidth={0.35} />
          <S.Ellipse cx={5.1} cy={-8.2} rx={1.25} ry={2.8} transform="rotate(-28 5.1 -8.2)" fill="url(#thSd)" stroke="#9fb2c8" strokeWidth={0.35} />
          <S.Ellipse cx={3.2} cy={-7.7} rx={1.45} ry={3.1} fill="url(#thSd)" stroke="#9fb2c8" strokeWidth={0.35} />
          <S.Path d="M2.5 -5.1h1.4" stroke="#6fae52" strokeWidth={0.7} strokeLinecap="round" />
        </>
      )}
    </>
  )
}

const CROCUS_OPEN = 'M-2.9 -6.6C-3.4 -9.8 -2.1 -12.2 -1 -12.6C-.4 -10.8 -.2 -8.6 0 -6.2Q-1.5 -5.5 -2.9 -6.6ZM2.9 -6.6C3.4 -9.8 2.1 -12.2 1 -12.6C.4 -10.8 .2 -8.6 0 -6.2Q1.5 -5.5 2.9 -6.6Z'
const CROCUS_MID = 'M-1.6 -6.2C-1.8 -9.6 -.8 -12.8 0 -13.4C.8 -12.8 1.8 -9.6 1.6 -6.2Q0 -5.4 -1.6 -6.2Z'

function Crocus({ S, c, bud }) {
  const c2 = c === 'P' ? '#5b3fa3' : '#a8760c'
  return (
    <>
      <S.Path d="M-.4 0C-1.8 -3 -2 -6.2 -1.2 -9.2M.5 0C1.8 -3 2.2 -5.8 1.8 -8.4" fill="none" stroke="#5f9a46" strokeWidth={1.1} strokeLinecap="round" />
      <S.Path d="M0 0V-6" stroke="#cfe3b8" strokeWidth={1.1} />
      {bud ? (
        <S.Path d="M-1.6 -6C-1.8 -8.8 -.9 -11 0 -11.5C.9 -11 1.8 -8.8 1.6 -6Q0 -5.2 -1.6 -6Z" fill={`url(#th${c})`} stroke={c2} strokeWidth={0.45} />
      ) : (
        <>
          <S.Path d={CROCUS_OPEN} fill={`url(#th${c})`} stroke={c2} strokeWidth={0.4} />
          <S.Path d={CROCUS_MID} fill={`url(#th${c})`} stroke={c2} strokeWidth={0.4} />
          <S.Path d="M0 -12.6V-7.2M-1.9 -11.4L-1.3 -7.2M1.9 -11.4L1.3 -7.2" stroke={c2} strokeOpacity={0.45} strokeWidth={0.35} />
          <S.Path d="M-.5 -12l.5 -1.6l.5 1.6" fill="#ff9a2a" />
        </>
      )}
    </>
  )
}

const CL = [0.5, 0.27, 0.73, 0.1, 0.9, 0.39, 0.61]
const HF = [1.18, 0.9, 1.3, 0.95, 1.05, 0.82, 1.22]

function thawLayout(f, k, inWin) {
  const { w, h, R } = f
  const m = k / 13
  const K = f.still && w <= 220 ? 1.4 : 1
  const rnd = seeded(17)
  const GY = h + 15
  let grass = ''
  for (let x = -18; x < w + 18; x += 3.1) {
    const r = rnd()
    const l = 2 + r * 2.6
    grass += `M${r2(x)} ${r2(GY + 0.6)}q${r2(0.4 + r)} ${r2(-l * 0.6)} ${r2(0.2 + r * 1.4)} ${r2(-l)}`
  }
  let ground = `M-22 ${GY}`
  for (let i = 0; i < Math.ceil((w + 44) / 16); i++) ground += `Q${r2(-14 + i * 16)} ${r2(GY - 1.4 + rnd() * 1.2)} ${r2(-6 + i * 16)} ${GY}`
  ground += `L${w + 30} ${h + 26}L-22 ${h + 26}Z`
  // Snow mounds melt by day; each leaves a dark wet ring of soil round it.
  const lumps = []
  for (let x = -10; x <= w + 10; x += 22) {
    const r = rnd()
    const q = rnd()
    lumps.push({ x: x + (q - 0.5) * 6, H: 10 + 6 * r, W: 34 + 10 * q, r: rnd() })
  }
  lumps.push({ x: -4, H: 22, W: 48, r: 0.05 }, { x: w + 4, H: 20, W: 46, r: 0.15 })
  let snowD = ''
  const wet = []
  const yb = h + 18
  for (const L of lumps) {
    const f2 = Math.max(0, Math.min(1, 1.3 * (1 - m) - 0.38 * L.r + (L.r < 0.22 ? 0.16 : 0)))
    const W2 = L.W * (0.55 + 0.45 * f2)
    if (f2 < 1) wet.push({ x: L.x, rx: W2 * 0.5 + 4 + 5 * (1 - f2), ry: 3 + 1.4 * (1 - f2), o: 0.55 + 0.3 * (1 - f2) })
    if (f2 < 0.08) continue
    const H = L.H * f2 * K
    snowD += `M${r2(L.x - W2 / 2)} ${yb}C${r2(L.x - W2 * 0.36)} ${r2(yb - H * 1.05)} ${r2(L.x - W2 * 0.1)} ${r2(yb - H * 1.3)} ${r2(L.x + W2 * 0.08)} ${r2(yb - H)}C${r2(L.x + W2 * 0.28)} ${r2(yb - H * 0.9)} ${r2(L.x + W2 * 0.4)} ${r2(yb - H * 0.6)} ${r2(L.x + W2 / 2)} ${yb}Z`
  }
  // Meltwater puddles: one from day one, more as it melts.
  const puddles = []
  ;[[0.56, 9], [0.3, 10], [0.78, 8], [0.14, 7], [0.44, 8]].forEach(([u, rx], i) => {
    const t = Math.min(1, (m - i * 0.2) * 4 + (i ? 0 : 0.7))
    if (t <= 0) return
    puddles.push({ x: w * u, R: rx * t * K, t })
  })
  // Flowers come up in clusters, one more each day, at mixed heights; the
  // second in each cluster stands behind the snow. Day one is a single bud.
  const back = []
  const front = []
  let tufts = ''
  let holes = ''
  const used = new Set()
  for (let i = 0; i <= k; i++) {
    const c = i % 7
    const j = Math.floor(i / 7)
    const x = w * CL[c] + (j ? 5.5 : -1.5) * (c % 2 ? -1 : 1)
    const hf = HF[c] * (j ? 0.78 : 1)
    const bud = inWin && i === k && k < 13
    const s = 1.45 * K * (j ? 0.9 : 1) * (bud && k === 0 ? 1.25 : 1)
    const ext = Math.max(0, (hf - 0.8) * 13 * K)
    const kind = i === 0 || i % 3 === 0 ? 'drop' : i % 3 === 1 ? 'P' : 'Y'
    const fl = { x, y: GY + 1.6 + (j ? -1 : 0), ext, s, kind, bud }
    if (j) back.push(fl)
    else {
      front.push(fl)
      holes += `M${r2(x - 5.5 * K)} ${GY + 1.8}a${r2(5.5 * K)} ${r2(1.9 * K)} 0 1 0 ${r2(11 * K)} 0a${r2(5.5 * K)} ${r2(1.9 * K)} 0 1 0 ${r2(-11 * K)} 0Z`
    }
    if (!used.has(c)) {
      used.add(c)
      tufts += `M${r2(x - 5)} ${GY + 1}q1.2 -4 .6 -7M${r2(x + 4.5)} ${GY + 1}q-.6 -3.6 1.2 -6.4M${r2(x - 2.4)} ${GY + 1}q-1.8 -2.6 -1.4 -5`
    }
  }
  // Snow on the two top corners, thinner each day, with icicles that drip.
  const sv = h - 2 * R
  const arc = (Math.PI * R) / 2
  const sh = w - 2 * R
  const tmax = 7.6 * (1 - 0.45 * m)
  const tAt = (u) => (u <= 0 || u >= 1 ? 0 : tmax * Math.pow(Math.sin(Math.PI * u), 0.6) * (1 + 0.1 * Math.sin(u * 31)))
  const cap = (sA, sB) => {
    const o = []
    const inn = []
    for (let i = 0; i <= 40; i++) {
      const u = i / 40
      const p = rrPointAt(0, 0, w, h, R, sA + (sB - sA) * u)
      const t = tAt(u)
      o.push(r2(p.x + p.nx * t) + ' ' + r2(p.y + p.ny * t))
      inn.push(r2(p.x - p.nx * 0.4) + ' ' + r2(p.y - p.ny * 0.4))
    }
    return `M${o.join('L')}L${inn.reverse().join('L')}Z`
  }
  const LA = sv - 6
  const LB = sv + arc + 30
  const RA = sv + arc + sh - 30
  const RB = sv + 2 * arc + sh + 6
  const caps = cap(LA, LB) + cap(RA, RB)
  let ice = ''
  let shine = ''
  const drips = []
  for (const mr of [false, true]) {
    ;[[0.1, 21], [0.2, 15], [0.3, 10], [0.4, 7]].forEach(([u, l], i) => {
      const uu = mr ? 1 - u : u
      const s = mr ? RA + (RB - RA) * uu : LA + (LB - LA) * uu
      const p = rrPointAt(0, 0, w, h, R, s)
      const t = tAt(uu) * 0.7
      const x = p.x + p.nx * t
      const y = p.y + p.ny * t
      const Ln = l * K * (1 - 0.6 * m)
      const hw = 1.5 * K + Ln * 0.07
      if (Ln < 2.5) return
      ice += `M${r2(x - hw)} ${r2(y)}Q${r2(x - hw * 0.4)} ${r2(y + Ln * 0.6)} ${r2(x)} ${r2(y + Ln)}Q${r2(x + hw * 0.4)} ${r2(y + Ln * 0.6)} ${r2(x + hw)} ${r2(y)}Z`
      shine += `M${r2(x - hw * 0.4)} ${r2(y + 1)}L${r2(x - 0.2)} ${r2(y + Ln * 0.7)}`
      if (i < 2) drips.push({ x: r2(x), y: r2(y + Ln + 0.4), dl: (mr ? 1.7 : 0) + i * 1.1, k: K })
    })
  }
  const glints = [[18, -5], [-5, 16], [w - 18, -5], [w + 5, 16]].map(([x, y]) => sparkD(x, y, 1.7)).join('')
  return { K, GY, grass, ground, wet, snowD, puddles, back, front, tufts, holes, caps, ice, shine, drips, glints, m }
}

const DRIP = 'M0 0Q1.3 2 0 3.1Q-1.3 2 0 0Z'

function dripAt(time, it) {
  'worklet'
  const ph = (((time + it.dl) % 3.6) + 3.6) % 3.6 / 3.6
  if (ph < 0.55) return { x: it.x, y: it.y, o: 0, s: 0.2 }
  if (ph < 0.62) {
    const g = (ph - 0.55) / 0.07
    return { x: it.x, y: it.y + 1.5 * it.k, o: g, s: (0.2 + 0.8 * g) * it.k }
  }
  const g = (ph - 0.62) / 0.38
  return { x: it.x, y: it.y + 1.5 * it.k + 46 * g * g, o: 1 - g, s: (1 - 0.1 * g) * it.k }
}

function Flower({ S, fl }) {
  return (
    <S.G transform={`translate(${r2(fl.x)} ${r2(fl.y)})`}>
      {fl.ext ? <S.Path d={`M0 0V${r2(-fl.ext)}`} stroke="#4f8a3c" strokeWidth={1.1} /> : null}
      <S.G transform={`translate(0 ${r2(-fl.ext)}) scale(${r2(fl.s)})`}>{fl.kind === 'drop' ? <Snowdrop S={S} bud={fl.bud} /> : <Crocus S={S} c={fl.kind} bud={fl.bud} />}</S.G>
    </S.G>
  )
}

export function ThawOver({ f }) {
  const S = svgAll()
  const { k, inWin } = thawDay(f.p.date)
  const T = useMemo(() => thawLayout(f, k, inWin), [f.w, f.h, f.R, f.still, k, inWin]) // eslint-disable-line react-hooks/exhaustive-deps
  const { w, h } = f
  const LT = f.c.light
  const live = !f.still
  const { K, GY } = T
  const SN = '#f8fbff'
  const SH = LT ? '#a9bdd6' : '#9fb3cf'
  const OUT = LT ? '#7f97b8' : '#c4d4ea'
  const dripPaint = { fill: '#a9d4fb', stroke: '#3f78b0', strokeWidth: 0.45 }
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="thGr" x1="0" y1={GY - 2} x2="0" y2={h + 22} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#7a6644" />
            <S.Stop offset="1" stopColor="#3a2f1e" />
          </S.LinearGradient>
          <S.LinearGradient id="thSn" x1="0" y1={h - 12} x2="0" y2={h + 18} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="0.6" stopColor="#eef4fb" />
            <S.Stop offset="1" stopColor="#cddbec" />
          </S.LinearGradient>
          <S.LinearGradient id="thIc" x1="0" y1="0" x2="1" y2="0">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="0.45" stopColor="#d4eaff" />
            <S.Stop offset="1" stopColor="#8fbde8" />
          </S.LinearGradient>
          <S.LinearGradient id="thLf" x1="0" y1="0" x2="1" y2="0">
            <S.Stop offset="0" stopColor="#7cc05a" />
            <S.Stop offset="1" stopColor="#3f7a32" />
          </S.LinearGradient>
          <S.LinearGradient id="thSd" x1="0" y1="0" x2="1" y2="0">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="0.6" stopColor="#f3f6fa" />
            <S.Stop offset="1" stopColor="#cdd8e6" />
          </S.LinearGradient>
          <S.LinearGradient id="thP" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#cdb8f6" />
            <S.Stop offset="1" stopColor="#7656c4" />
          </S.LinearGradient>
          <S.LinearGradient id="thY" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#ffec94" />
            <S.Stop offset="1" stopColor="#e8a817" />
          </S.LinearGradient>
          <S.RadialGradient id="thPd" cx="0.4" cy="0.35" r="0.7">
            <S.Stop offset="0" stopColor="#d4ecfb" />
            <S.Stop offset="0.6" stopColor="#86b4da" />
            <S.Stop offset="1" stopColor="#4f7fab" />
          </S.RadialGradient>
          <S.RadialGradient id="thGw" cx="0.5" cy="0.5" r="0.5">
            <S.Stop offset="0" stopColor="#e9ffc8" stopOpacity="0.7" />
            <S.Stop offset="1" stopColor="#e9ffc8" stopOpacity="0" />
          </S.RadialGradient>
          <S.ClipPath id="thCg">
            <S.Path d={rrPath(-19, -19, w + 38, h + 38, f.R + 19)} />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={ring(f, 0.8)} fill="none" stroke={LT ? '#7f9fc6' : '#cfe2f5'} strokeOpacity={LT ? 0.55 : 0.35} strokeWidth={1} />
        <S.G clipPath="url(#thCg)">
          <S.Path d={T.ground} fill="url(#thGr)" />
          {T.wet.map((e, i) => (
            <S.Ellipse key={i} cx={r2(e.x)} cy={GY + 2.2} rx={r2(e.rx)} ry={r2(e.ry)} fill="#21170d" opacity={r2(e.o)} />
          ))}
          <S.Path d={T.grass} fill="none" stroke="#7fb24e" strokeWidth={0.8} strokeLinecap="round" opacity={r2(0.3 + 0.7 * T.m)} />
          <S.Path d={T.tufts} fill="none" stroke="#5f9a46" strokeWidth={1.2} strokeLinecap="round" />
          {T.back.map((fl, i) => (
            <Flower key={i} S={S} fl={fl} />
          ))}
          {T.snowD ? (
            <>
              <S.Path d={T.snowD} fill={SH} transform="translate(.9 1.6)" />
              <S.Path d={T.snowD} fill="none" stroke={OUT} strokeWidth={1.4} />
              <S.Path d={T.snowD} fill="url(#thSn)" />
            </>
          ) : null}
          {T.holes ? <S.Path d={T.holes} fill="#21170d" opacity={0.85} /> : null}
          {T.puddles.map((p, i) => (
            <S.G key={i}>
              <S.Ellipse cx={r2(p.x)} cy={GY + 2.6} rx={r2(p.R + 1.2)} ry={r2(2.6 * p.t + 0.6)} fill="#1a120a" opacity={0.6} />
              <S.Ellipse cx={r2(p.x)} cy={GY + 2.4} rx={r2(p.R)} ry={r2(2 * p.t)} fill="url(#thPd)" />
              <S.Path d={`M${r2(p.x - p.R * 0.55)} ${r2(GY + 1.7)}Q${r2(p.x - p.R * 0.1)} ${r2(GY + 1.2)} ${r2(p.x + p.R * 0.25)} ${r2(GY + 1.7)}`} fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={0.7} strokeLinecap="round" />
            </S.G>
          ))}
        </S.G>
        {k === 0 && inWin ? <S.Circle cx={r2(w * 0.5 - 1.5)} cy={r2(GY - 12 * K)} r={r2(10 * K)} fill="url(#thGw)" /> : null}
        {T.front.map((fl, i) => (
          <Flower key={i} S={S} fl={fl} />
        ))}
        <S.Path d={T.caps} fill={SH} transform="translate(.6 1.1)" />
        <S.Path d={T.caps} fill={SN} stroke={OUT} strokeWidth={0.7} />
        {T.ice ? (
          <>
            <S.Path d={T.ice} fill="url(#thIc)" stroke="#5f8fc0" strokeWidth={0.7} strokeLinejoin="round" />
            <S.Path d={T.shine} stroke="#ffffff" strokeWidth={0.6} strokeLinecap="round" />
          </>
        ) : null}
        {live ? null : T.drips.map((d, i) => <S.Path key={i} d={DRIP} transform={`translate(${d.x} ${d.y}) scale(${d.k})`} {...dripPaint} />)}
        <S.Path d={T.glints} fill={LT ? '#8fb3dc' : '#ffffff'} />
      </Layer>
      {live
        ? T.drips.map((d, i) => (
            <Particle key={i} clock={f.clock} item={d} fn={dripAt} w={w} h={h} size={6}>
              <S.Svg width={6} height={6} viewBox="-3 -1 6 6">
                <S.Path d={DRIP} {...dripPaint} />
              </S.Svg>
            </Particle>
          ))
        : null}
    </>
  )
}

export const FRAME_ART_2027_01_29 = {
  lace: { under: LaceUnder, animated: false },
  boats: { over: BoatsOver, animated: true },
  thaw: { over: ThawOver, animated: true },
}
