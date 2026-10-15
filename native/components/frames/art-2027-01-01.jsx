// Frames from the 2027-01-01 drop (docs/ideas/frames-drop-2027-01-01.html):
// Mosaic (coin, still), Domino Run (gem, living: a run of dominoes falls for
// each answer and a star lights when tonight is done) and Fresh Page (season,
// Jan 1 to 7). Same contract as art.jsx: each draws in card space and may
// reach PAD past the card; still tiles draw no moving views.
import { useEffect, useMemo, useRef } from 'react'
import * as Reanimated from 'react-native-reanimated'
import { rrLength, rrPath, rrPointAt } from './geometry.js'
import { Animated, Moving, SvgLayer, svgAll } from './runtime.jsx'

const { useAnimatedStyle, useSharedValue, withTiming } = Reanimated

const r2 = (n) => Math.round(n * 100) / 100
const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }

function Layer({ f, children }) {
  return (
    <SvgLayer w={f.w} h={f.h}>
      {children}
    </SvgLayer>
  )
}

function ring(f, o) {
  return rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, Math.max(0, f.R + o))
}

function seeded(seed) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

function star5(cx, cy, R1, R2) {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? R2 : R1
    d += `${i ? 'L' : 'M'}${r2(cx + r * Math.cos(a))} ${r2(cy + r * Math.sin(a))}`
  }
  return d + 'Z'
}

function sparkD(x, y, s) {
  return `M${r2(x)} ${r2(y - s)}Q${r2(x)} ${r2(y)} ${r2(x + s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y + s)}Q${r2(x)} ${r2(y)} ${r2(x - s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y - s)}Z`
}

function circleD(x, y, r) {
  return `M${r2(x - r)} ${r2(y)}a${r} ${r} 0 1 0 ${r2(2 * r)} 0a${r} ${r} 0 1 0 ${r2(-2 * r)} 0`
}

// A point on the top piece of the ring o px out: from 8 px below the top-left
// corner, round the top, to 8 px below the top-right corner.
function topAt(f, o, u) {
  const r = f.R + o
  const arc = (Math.PI * r) / 2
  const sh = f.w - 2 * f.R
  const sv = f.h - 2 * f.R
  const e = 8
  const ref = [e, (Math.PI * (f.R + 12)) / 2, sh, (Math.PI * (f.R + 12)) / 2, e]
  const seg = [e, arc, sh, arc, e]
  const tot = ref.reduce((a, b) => a + b, 0)
  let k = u * tot
  let d = sv - e
  for (let i = 0; i < 5; i++) {
    if (k <= ref[i] || i === 4) {
      d += seg[i] * Math.min(1, k / ref[i])
      break
    }
    k -= ref[i]
    d += seg[i]
  }
  return rrPointAt(-o, -o, f.w + 2 * o, f.h + 2 * o, r, d)
}

function pulseFn(time) {
  'worklet'
  return { opacity: 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.85)) }
}
function twinkleFn(time) {
  'worklet'
  return { opacity: 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * 2.25)) }
}

/* ---------- Mosaic: hand-cut glazed tiles in grout (coin, still) ---------- */

const MOS = {
  cobalt: ['#1d4f9a', '#2459aa', '#2c67bd'],
  indigo: ['#2a3c86', '#324795'],
  teal: ['#1f8585', '#279a99', '#30ada7'],
  aqua: ['#78c9c1', '#8fd6cd'],
  cream: ['#e9e0cb', '#f3ecdc', '#ddd2b9'],
}

// One course all the way round (1 to 7.6 px out), a second on the sides and
// bottom (8.6 to 14.6) that tapers round the top corners, so nothing rises more
// than 8 px above the card. Batched: one path per glaze, light edge, dark edge,
// wet glint and gold.
function mosaicLayout(w, h, R) {
  const rnd = seeded(17)
  const TOP = 8
  const SIDE = 15
  const oMax = (n) => (n.ny < -0.001 ? 1 / Math.hypot(n.nx / (R + SIDE), n.ny / (R + TOP)) - R : SIDE)
  const at = (o, d) => rrPointAt(-o, -o, w + 2 * o, h + 2 * o, R + o, d)
  const jit = () => (rnd() - 0.5) * 0.8
  const fills = {}
  const hl = []
  const sh = []
  const gl = []
  const golds = []
  let goldD = ''
  const one = (a) => a[Math.floor(rnd() * a.length)]
  const pick = (d, c) => {
    const t = rnd()
    if (c === 0) return t < 0.07 ? one(MOS.cream) : t < 0.27 ? one(MOS.indigo) : one(MOS.cobalt)
    if (t < 0.22) return one(MOS.cream)
    return 0.5 + 0.5 * Math.sin(d / 42) > rnd() ? one(MOS.teal) : one(MOS.aqua)
  }
  const LX = -0.6
  const LY = -0.8
  const tile = (pts, col) => {
    const d = 'M' + pts.map((p) => r2(p[0]) + ' ' + r2(p[1])).join('L') + 'Z'
    if (col === 'gold') goldD += d
    else fills[col] = (fills[col] || '') + d
    // Edges facing the light get a bright glaze line, edges facing away a dark one.
    const cx = pts.reduce((a, p) => a + p[0], 0) / 4
    const cy = pts.reduce((a, p) => a + p[1], 0) / 4
    for (let i = 0; i < 4; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % 4]
      let nx = b[1] - a[1]
      let ny = a[0] - b[0]
      const m = Math.hypot(nx, ny) || 1
      nx /= m
      ny /= m
      const mx = (a[0] + b[0]) / 2
      const my = (a[1] + b[1]) / 2
      if ((mx - cx) * nx + (my - cy) * ny < 0) {
        nx = -nx
        ny = -ny
      }
      const k = nx * LX + ny * LY
      const ins = 0.6
      const s = `M${r2(a[0] - nx * ins + (cx - a[0]) * 0.14)} ${r2(a[1] - ny * ins + (cy - a[1]) * 0.14)}L${r2(b[0] - nx * ins + (cx - b[0]) * 0.14)} ${r2(b[1] - ny * ins + (cy - b[1]) * 0.14)}`
      if (k > 0.35) hl.push(s)
      else if (k < -0.35) sh.push(s)
    }
    if (col === 'gold') golds.push([cx, cy])
    else if (rnd() < 0.35) gl.push(`M${r2(cx - 1.6)} ${r2(cy - 1.1)}a.75 .55 0 1 0 1.5 0a.75 .55 0 1 0 -1.5 0`)
  }
  // Keystones: a bigger gold tile at each corner apex.
  const KEYS = [
    [R, R, -1, -1, 5.6, 4.6],
    [w - R, R, 1, -1, 5.6, 4.6],
    [w - R, h - R, 1, 1, 7.6, 6],
    [R, h - R, -1, 1, 7.6, 6],
  ].map(([cx, cy, sx, sy, o, s]) => {
    const k = Math.SQRT1_2
    return { x: cx + sx * (R + o) * k, y: cy + sy * (R + o) * k, s, a: Math.atan2(sy, sx) }
  })
  const course = (oIn, oOut, minH, c, beat) => {
    const om = (oIn + oOut) / 2
    const Lk = rrLength(w + 2 * om, h + 2 * om, R + om)
    let d = rnd() * 3
    let k = 0
    while (d < Lk - 2) {
      let sz = 6.4 + rnd() * 1.8
      if (Lk - d - sz < 4) sz = Lk - d
      const d0 = d + 0.65
      const d1 = d + sz - 0.65
      d += sz
      const p0 = at(om, d0)
      const p1 = at(om, d1)
      const top0 = Math.min(oOut, oMax(p0) - 0.9)
      const top1 = Math.min(oOut, oMax(p1) - 0.9)
      if (Math.min(top0, top1) - oIn < minH) continue
      const q = (p, o) => [p.x + p.nx * (o - om) + jit(), p.y + p.ny * (o - om) + jit()]
      const pts = [q(p0, oIn + 0.6), q(p1, oIn + 0.6), q(p1, top1 - 0.6), q(p0, top0 - 0.6)]
      const tc = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2]
      if (KEYS.some((K) => Math.hypot(K.x - tc[0], K.y - tc[1]) < K.s + 4.2)) continue
      k++
      tile(pts, k % beat === Math.floor(beat / 2) ? 'gold' : pick(d, c))
    }
  }
  const sq = (K, e) => {
    const c = Math.cos(K.a)
    const s = Math.sin(K.a)
    const pt = (u, v) => r2(K.x + u * c - v * s) + ' ' + r2(K.y + u * s + v * c)
    return `M${pt(-e, -e)}L${pt(e, -e)}L${pt(e, e)}L${pt(-e, e)}Z`
  }
  const keyD = KEYS.map((K) => sq(K, K.s)).join('')
  const keyIn = KEYS.map((K) => sq(K, K.s - 1.5)).join('')
  course(1, 7.6, 2, 0, 8)
  course(8.6, 14.6, 2.6, 1, 13)
  // Grout bed: inner edge on the card, outer edge as far as tiles may go.
  const NS = 260
  const L0 = rrLength(w, h, R)
  let bed = ''
  for (let i = 0; i < NS; i++) {
    const p = rrPointAt(0, 0, w, h, R, (i / NS) * L0)
    const o = Math.min(SIDE, oMax(p))
    bed += (i ? 'L' : 'M') + r2(p.x + p.nx * o) + ' ' + r2(p.y + p.ny * o)
  }
  bed += 'Z'
  const lit = golds.filter((_, i) => i % 2 === 0).concat(KEYS.map((K) => [K.x - K.s * 0.3, K.y - K.s * 0.3]))
  const spark = lit.map(([x, y]) => sparkD(x, y, 3)).join('')
  return { fills, goldD, keyD, keyIn, hl: hl.join(''), sh: sh.join(''), gl: gl.join(''), bed, lit, spark }
}

export function MosaicOver({ f }) {
  const S = svgAll()
  const { w, h, R } = f
  const L = f.c.light
  const m = useMemo(() => mosaicLayout(w, h, R), [w, h, R])
  const inner = ring(f, 0.2)
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="msg" x1="0" y1="0" x2={w} y2={h} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor="#fff0bf" />
          <S.Stop offset="0.18" stopColor="#e2b75a" />
          <S.Stop offset="0.34" stopColor="#b9862c" />
          <S.Stop offset="0.5" stopColor="#f6d98a" />
          <S.Stop offset="0.68" stopColor="#c8963a" />
          <S.Stop offset="0.84" stopColor="#ffe9a8" />
          <S.Stop offset="1" stopColor="#a8781e" />
        </S.LinearGradient>
        <S.LinearGradient id="msk" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#fff3c8" />
          <S.Stop offset="0.45" stopColor="#e9c46a" />
          <S.Stop offset="1" stopColor="#a8761c" />
        </S.LinearGradient>
        <S.RadialGradient id="mss">
          <S.Stop offset="0" stopColor="#fffbe6" stopOpacity="0.85" />
          <S.Stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </S.RadialGradient>
      </S.Defs>
      <S.Path d={m.bed + inner} fillRule="evenodd" fill="#000" fillOpacity={L ? 0.1 : 0.35} translateX={0.6} translateY={1.8} />
      <S.Path d={m.bed + inner} fillRule="evenodd" fill={L ? '#d6cfbf' : '#57534b'} />
      <S.Path d={m.bed} fill="none" stroke={L ? '#bfb5a1' : '#3f3b35'} strokeWidth={1.1} />
      {Object.entries(m.fills).map(([c, d]) => (
        <S.Path key={c} d={d} fill={c} />
      ))}
      <S.Path d={m.goldD} fill="url(#msg)" />
      <S.Path d={m.keyD} fill="#000" fillOpacity={0.3} translateX={0.5} translateY={1} />
      <S.Path d={m.keyD} fill="url(#msk)" stroke="#8a5a14" strokeWidth={0.7} />
      <S.Path d={m.keyIn} fill="none" stroke="#fff3c4" strokeOpacity={0.7} strokeWidth={0.7} />
      <S.Path d={m.sh} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={0.85} strokeLinecap="round" />
      <S.Path d={m.hl} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.85} strokeLinecap="round" />
      <S.Path d={m.gl} fill="#ffffff" fillOpacity={0.6} />
      {m.lit.map(([x, y], i) => (
        <S.Circle key={i} cx={r2(x)} cy={r2(y)} r={5} fill="url(#mss)" />
      ))}
      <S.Path d={m.spark} fill="#fffbe6" />
      <S.Path d={ring(f, 0.5)} fill="none" stroke="#000" strokeOpacity={L ? 0.12 : 0.35} strokeWidth={1} />
    </Layer>
  )
}

/* ---------- Domino Run (gem, living) ---------- */

// Seen from above: dominoes stand on end down the left, along the bottom and up
// the right, one colored run per question. A marble waits at the start (top
// left), a star at the end (top right). The top edge stays clear.
const DCOL = ['#ff6b5c', '#ffb443', '#3fcf9e', '#4aa8ff', '#a37bff', '#ff6fae', '#b8e04a', '#36c6d8']
const PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [0, -1], [1, -1], [-1, 1], [0, 1], [1, 1]],
}
const HW = 6.2
const TH = 2.2
const FL = 17
const FACE0 = -TH
const FACE1 = FL - TH
const MIDX = (FACE0 + FACE1) / 2
const WX = 1.1
const WY = 2.1

function dominoGeo(w, h, R) {
  const o = 8.4
  const W = w + 2 * o
  const H = h + 2 * o
  const r = R + o
  const Lr = rrLength(W, H, r)
  const sv = H - 2 * r
  const arc = (Math.PI * r) / 2
  const shr = W - 2 * r
  const dS = sv + arc * 0.2
  const dE = sv + arc + shr + arc * 0.8
  const run = Lr - (dE - dS)
  const n = Math.round(run / 11) + 1
  const step = run / (n - 1)
  const rnd = seeded(31)
  const pipN = Array.from({ length: n }, () => 1 + Math.floor(rnd() * 6))
  const wp = (s, x, y) => {
    const p = rrPointAt(-o, -o, W, H, r, s - x)
    return [p.x - p.nx * y, p.y - p.ny * y]
  }
  const qd = (s, x0, x1, y0, y1, dx = 0, dy = 0) => {
    const a = [wp(s, x0, y0), wp(s, x1, y0), wp(s, x1, y1), wp(s, x0, y1)]
    return 'M' + a.map((p) => r2(p[0] + dx) + ' ' + r2(p[1] + dy)).join('L') + 'Z'
  }
  let mat = ''
  for (let t = 0; t <= run; t += 6) {
    const p = rrPointAt(-o, -o, W, H, r, dS - t)
    mat += (t ? 'L' : 'M') + r2(p.x) + ' ' + r2(p.y)
  }
  const mp = rrPointAt(-6, -6, w + 12, h + 12, R + 6, h - 2 * R + ((Math.PI * (R + 6)) / 2) * 0.62)
  const sp = rrPointAt(-6.2, -6.2, w + 12.4, h + 12.4, R + 6.2, h - 2 * R + (Math.PI * (R + 6.2)) / 2 + (w - 2 * R) + ((Math.PI * (R + 6.2)) / 2) * 0.4)
  return { n, sAt: (i) => dS - i * step, pipN, wp, qd, mat, mx: r2(mp.x + 1), my: r2(mp.y + 1.2), sx: r2(sp.x + 1.4), sy: r2(sp.y + 1.6) }
}

// Draw a set of dominoes into batched paths. kind per index: 'down', 'up' or null (skip).
function dominoBatch(g, kinds, N) {
  const secOf = (i) => Math.min(N - 1, Math.floor((i * N) / g.n))
  const out = { faces: '', edge: '', fronts: '', dividers: '', pips: '', fshadow: '', side: {}, tint: {}, caps: {}, walls: {}, cshadow: '', chl: '' }
  for (let i = g.n - 1; i >= 0; i--) {
    const kind = kinds(i)
    if (!kind) continue
    const s = g.sAt(i)
    const col = DCOL[secOf(i) % DCOL.length]
    if (kind === 'down') {
      out.fshadow += g.qd(s, FACE0, FACE1 + 0.4, -HW, HW + 0.6, 0.8, 1.6)
      out.edge += g.qd(s, FACE0, FACE1, -HW, HW, 0.5, 1)
      out.faces += g.qd(s, FACE0, FACE1, -HW, HW)
      out.side[col] = (out.side[col] || '') + g.qd(s, FACE0, FACE1, HW - 2.4, HW)
      out.tint[col] = (out.tint[col] || '') + g.qd(s, FACE0, FACE1, -HW, HW - 2.4)
      const a = g.wp(s, FACE1, -HW)
      const b = g.wp(s, FACE1, HW)
      out.fronts += `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`
      const c = g.wp(s, MIDX, -HW + 1.2)
      const e = g.wp(s, MIDX, HW - 2)
      out.dividers += `M${r2(c[0])} ${r2(c[1])}L${r2(e[0])} ${r2(e[1])}`
      out.pips += PIPS[g.pipN[i]]
        .map(([a2, b2]) => {
          const [x, y] = g.wp(s, (MIDX + FACE1) / 2 + a2 * 2.5, b2 * 3)
          return circleD(x, y, 1)
        })
        .join('')
    } else {
      out.cshadow += g.qd(s, -TH, TH, -HW, HW, 2.8, 4.6)
      out.walls[col] = (out.walls[col] || '') + g.qd(s, -TH, TH, -HW, HW, WX, WY)
      out.caps[col] = (out.caps[col] || '') + g.qd(s, -TH, TH, -HW, HW)
      out.chl += g.qd(s, -TH + 0.45, -TH + 1.35, -HW + 0.7, HW - 0.7)
    }
  }
  return out
}

function Batch({ S, b, L }) {
  return (
    <>
      {b.cshadow ? <S.Path d={b.cshadow} fill="#000" fillOpacity={L ? 0.13 : 0.32} /> : null}
      {b.faces ? (
        <>
          <S.Path d={b.fshadow} fill="#000" fillOpacity={L ? 0.14 : 0.3} />
          <S.Path d={b.edge} fill="#c9bfa6" />
          <S.Path d={b.faces} fill="url(#dmfc)" />
          {Object.entries(b.tint).map(([c, d]) => (
            <S.Path key={'t' + c} d={d} fill={c} fillOpacity={L ? 0.13 : 0.17} />
          ))}
          {Object.entries(b.side).map(([c, d]) => (
            <S.Path key={'s' + c} d={d} fill={c} />
          ))}
          <S.Path d={b.faces} fill="none" stroke="#2a2833" strokeOpacity={0.3} strokeWidth={0.5} />
          <S.Path d={b.fronts} stroke="#2a2833" strokeWidth={0.75} />
          <S.Path d={b.dividers} stroke="#2a2833" strokeOpacity={0.5} strokeWidth={0.6} />
          <S.Path d={b.pips} fill="#1d1c24" />
        </>
      ) : null}
      {Object.entries(b.walls).map(([c, d]) => (
        <S.Path key={'w' + c} d={d} fill={shade(c, 0.62)} />
      ))}
      {Object.entries(b.caps).map(([c, d]) => (
        <S.Path key={'c' + c} d={d} fill={c} />
      ))}
      {b.chl ? <S.Path d={b.chl} fill="#fff" fillOpacity={0.5} /> : null}
    </>
  )
}

// A domino tipped forward by `lean` px (Not yet, or the swipe pulling the next one).
function Tipped({ S, g, i, col, lean, L }) {
  const s = g.sAt(i)
  const x0 = -TH + lean
  const x1 = TH + lean
  const gl = g.wp(s, lean * 0.5, 0)
  return (
    <>
      <S.Circle cx={r2(gl[0])} cy={r2(gl[1])} r={16} fill="url(#dmwt)" />
      <S.Path d={g.qd(s, x0 - 1, x1 + 2.6, -HW + 1, HW + 1, 3, 5)} fill="#000" fillOpacity={L ? 0.16 : 0.34} />
      <S.Path d={g.qd(s, -TH, x0 + 0.6, -HW, HW)} fill="url(#dmfc)" stroke="#2a2833" strokeOpacity={0.5} strokeWidth={0.55} />
      <S.Path d={g.qd(s, -TH, x0 + 0.6, HW - 1.4, HW)} fill={col} />
      {lean > 5 ? (
        <S.Path
          d={PIPS[2]
            .map(([a, b]) => {
              const [x, y] = g.wp(s, x0 - 2.4 + a * 0.9, b * 3)
              return circleD(x, y, 0.85)
            })
            .join('')}
          fill="#1d1c24"
        />
      ) : null}
      <S.Path d={g.qd(s, x0, x1, -HW, HW, WX, WY)} fill={shade(col, 0.62)} />
      <S.Path d={g.qd(s, x0, x1, -HW, HW)} fill={col} stroke="#000" strokeOpacity={0.3} strokeWidth={0.5} />
      <S.Path d={g.qd(s, x0 + 0.4, x0 + 1.3, -HW + 0.7, HW - 0.7)} fill="#fff" fillOpacity={0.5} />
    </>
  )
}

function DomDefs({ S }) {
  return (
    <S.Defs>
      <S.LinearGradient id="dmfc" x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor="#fffdf6" />
        <S.Stop offset="1" stopColor="#e6decb" />
      </S.LinearGradient>
      <S.RadialGradient id="dmwt">
        <S.Stop offset="0" stopColor="#ffc94a" stopOpacity="0.9" />
        <S.Stop offset="0.45" stopColor="#ffb443" stopOpacity="0.45" />
        <S.Stop offset="1" stopColor="#ffb443" stopOpacity="0" />
      </S.RadialGradient>
      <S.RadialGradient id="dmgl">
        <S.Stop offset="0" stopColor="#ffe58a" stopOpacity="0.95" />
        <S.Stop offset="0.5" stopColor="#ffc94a" stopOpacity="0.35" />
        <S.Stop offset="1" stopColor="#ffc94a" stopOpacity="0" />
      </S.RadialGradient>
      <S.RadialGradient id="dmst" cx="0.38" cy="0.35" r="0.7">
        <S.Stop offset="0" stopColor="#fff6cc" />
        <S.Stop offset="0.55" stopColor="#ffd34d" />
        <S.Stop offset="1" stopColor="#d99a16" />
      </S.RadialGradient>
      <S.RadialGradient id="dmmb" cx="0.35" cy="0.3" r="0.8">
        <S.Stop offset="0" stopColor="#e6f6ff" />
        <S.Stop offset="0.5" stopColor="#7cc8f2" />
        <S.Stop offset="1" stopColor="#2a74b0" />
      </S.RadialGradient>
    </S.Defs>
  )
}

/** Goes 0 to 1 over ms each time answered rises while motion is on; 1 otherwise. */
function useFall(answered, live, ms = 1400) {
  const v = useSharedValue(1)
  const last = useRef(answered)
  useEffect(() => {
    if (live && answered > last.current) {
      v.value = 0
      v.value = withTiming(1, { duration: ms })
    } else v.value = 1
    last.current = answered
  }, [answered, live, ms, v])
  return v
}

export function DominoOver({ f }) {
  const S = svgAll()
  const { w, h, R } = f
  const L = f.c.light
  const P = f.p
  const N = Math.max(1, Math.min(10, Number(P.total) || 4))
  const ans = Math.min(N, Number(P.answered) || 0)
  const sk = Math.min(N - ans, Number(P.skipped) || 0)
  const done = ans >= N
  const live = f.active && !f.still
  const g = useMemo(() => dominoGeo(w, h, R), [w, h, R])
  const secOf = (i) => Math.min(N - 1, Math.floor((i * N) / g.n))
  const first = (i) => secOf(i - 1) !== secOf(i)
  // The last answered run falls when a Did lands; it is drawn on its own so it can fade in.
  const fallSec = live && ans > 0 ? ans - 1 : -1
  const fall = useFall(ans, live)
  const pullable = !f.still && f.pull && ans + sk < N
  const kindOf = (i) => {
    const k = secOf(i)
    if (k < ans) return 'down'
    if (k < ans + sk && first(i)) return 'tip'
    if (k === ans + sk && pullable && first(i)) return 'lean'
    return 'up'
  }
  const main = useMemo(
    () => dominoBatch(g, (i) => (secOf(i) === fallSec ? null : { down: 'down', up: 'up' }[kindOf(i)] || null), N),
    [g, N, ans, sk, fallSec, pullable], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const fallDown = useMemo(() => (fallSec < 0 ? null : dominoBatch(g, (i) => (secOf(i) === fallSec ? 'down' : null), N)), [g, N, fallSec]) // eslint-disable-line react-hooks/exhaustive-deps
  const fallUp = useMemo(() => (fallSec < 0 ? null : dominoBatch(g, (i) => (secOf(i) === fallSec ? 'up' : null), N)), [g, N, fallSec]) // eslint-disable-line react-hooks/exhaustive-deps
  const tips = []
  let leanAt = -1
  for (let i = 0; i < g.n; i++) {
    const k = kindOf(i)
    if (k === 'tip') tips.push(i)
    else if (k === 'lean') leanAt = i
  }
  const pull = f.pull
  const fallIn = useAnimatedStyle(() => ({ opacity: fall.value }))
  const fallOut = useAnimatedStyle(() => ({ opacity: 1 - fall.value }))
  const leanOn = useAnimatedStyle(() => ({ opacity: pull ? Math.min(1, Math.abs(pull.value) / 110) : 0 }))
  const leanOff = useAnimatedStyle(() => ({ opacity: pull ? 1 - Math.min(1, Math.abs(pull.value) / 110) : 1 }))

  const { mx, my, sx, sy } = g
  // Burst round the star: sparkles and confetti dots, outside the card and no more than 8 px above it.
  const inCard = (x, y) => {
    if (x < 0 || x > w || y < 0 || y > h) return false
    const cx = Math.min(Math.max(x, R), w - R)
    const cy = Math.min(Math.max(y, R), h - R)
    return Math.hypot(x - cx, y - cy) <= R + 1.5
  }
  const spots = []
  for (let k = 0; k < 16; k++) {
    const a = ((-170 + k * 17) * Math.PI) / 180
    const d = k % 2 ? 15 : 11
    const x = sx + Math.cos(a) * d
    const y = sy + Math.sin(a) * d
    if (y >= -7 && x <= w + 19 && !inCard(x, y)) spots.push([x, y, k])
  }
  const rays = spots
    .filter(([, , k]) => k % 2 === 0)
    .map(([x, y]) => sparkD(x, y, 2.6))
    .join('')
  const bits = spots.filter(([, , k]) => k % 2 === 1)
  const nCol = DCOL[secOf(leanAt) % DCOL.length]

  const glow = (
    <Layer f={f}>
      <DomDefs S={S} />
      <S.Circle cx={sx} cy={sy} r={17} fill="url(#dmgl)" />
      <S.Path d={rays} fill="#fff3b0" />
      {bits.map(([x, y, k], i) => (
        <S.Circle key={i} cx={r2(x)} cy={r2(y)} r={i % 2 ? 1 : 1.3} fill={DCOL[k % DCOL.length]} />
      ))}
    </Layer>
  )

  return (
    <>
      <Layer f={f}>
        <DomDefs S={S} />
        <S.Path d={g.mat} fill="none" stroke={L ? '#1b2030' : '#000'} strokeOpacity={L ? 0.06 : 0.24} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
        <Batch S={S} b={main} L={L} />
        {tips.map((i) => (
          <Tipped key={i} S={S} g={g} i={i} col={DCOL[secOf(i) % DCOL.length]} lean={8} L={L} />
        ))}
        <S.Ellipse cx={r2(mx + 2)} cy={r2(my + 3.4)} rx={5} ry={3.2} fill="#000" fillOpacity={L ? 0.18 : 0.4} />
        <S.Circle cx={mx} cy={my} r={5.8} fill="url(#dmmb)" stroke="#16507a" strokeOpacity={0.6} strokeWidth={0.5} />
        <S.Path d={`M${r2(mx - 3.2)} ${r2(my + 1.6)}C${r2(mx - 1)} ${r2(my - 1.4)} ${r2(mx + 1.2)} ${r2(my + 3)} ${r2(mx + 3.6)} ${r2(my - 0.4)}`} fill="none" stroke="#ff6b5c" strokeWidth={1.3} strokeLinecap="round" />
        <S.Path d={`M${r2(mx - 2.6)} ${r2(my - 1.6)}C${r2(mx - 0.6)} ${r2(my - 3.2)} ${r2(mx + 1.4)} ${r2(my - 0.8)} ${r2(mx + 3)} ${r2(my - 2.6)}`} fill="none" stroke="#ffd34d" strokeWidth={0.9} strokeLinecap="round" />
        <S.Ellipse cx={r2(mx - 1.7)} cy={r2(my - 2.2)} rx={1.6} ry={1} fill="#fff" fillOpacity={0.9} rotation={-30} origin={`${r2(mx - 1.7)}, ${r2(my - 2.2)}`} />
      </Layer>
      {fallDown ? (
        <>
          <Animated.View pointerEvents="none" style={[FILL, fallOut]}>
            <Layer f={f}>
              <DomDefs S={S} />
              <Batch S={S} b={fallUp} L={L} />
            </Layer>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[FILL, fallIn]}>
            <Layer f={f}>
              <DomDefs S={S} />
              <Batch S={S} b={fallDown} L={L} />
            </Layer>
          </Animated.View>
        </>
      ) : null}
      {leanAt >= 0 ? (
        <>
          <Animated.View pointerEvents="none" style={[FILL, leanOff]}>
            <Layer f={f}>
              <Batch S={S} b={dominoBatch(g, (i) => (i === leanAt ? 'up' : null), N)} L={L} />
            </Layer>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[FILL, leanOn]}>
            <Layer f={f}>
              <DomDefs S={S} />
              <Tipped S={S} g={g} i={leanAt} col={nCol} lean={4} L={L} />
            </Layer>
          </Animated.View>
        </>
      ) : null}
      {done ? (
        live ? (
          <Moving clock={f.clock} fn={pulseFn} style={FILL}>
            {glow}
          </Moving>
        ) : (
          glow
        )
      ) : null}
      <Layer f={f}>
        <DomDefs S={S} />
        <S.Circle cx={sx} cy={r2(sy + 0.8)} r={7.6} fill="#000" fillOpacity={L ? 0.12 : 0.35} />
        <S.Path d={star5(sx, sy, 7.4, 3.2)} fill={done ? 'url(#dmst)' : L ? '#eef0f5' : '#3a3f4f'} stroke={done ? '#a8700c' : L ? '#9aa0b0' : '#6b7186'} strokeWidth={0.8} strokeLinejoin="round" />
        {done ? <S.Path d={`M${r2(sx - 2.4)} ${r2(sy - 1.6)}L${r2(sx - 1)} ${r2(sy - 3.6)}`} stroke="#fffbe6" strokeWidth={0.9} strokeLinecap="round" /> : null}
      </Layer>
    </>
  )
}

/* ---------- Fresh Page (season, Jan 1 to 7) ---------- */

// The card is the top page of a new tear-off pad: a block of fresh pages under
// it, a red cloth binding over the top corners, a torn strip of last year's
// page with a corner that still shows 31, a ribbon and a little confetti.
const DIG = {
  1: 'M.4 1.1L1.8 0V5',
  3: 'M.2 .6C.5 .2 1 0 1.5 0C2.3 0 2.9 .5 2.9 1.2C2.9 2 2.2 2.4 1.3 2.4C2.3 2.4 3 2.9 3 3.7C3 4.5 2.3 5 1.5 5C.9 5 .4 4.8 .1 4.4',
}

export function FreshUnder({ f }) {
  const S = svgAll()
  const { w, h, R } = f
  const L = f.c.light
  const K = 9
  const DX = 0.75
  const DY = 1.45
  const sheets = []
  for (let i = K; i >= 1; i--) {
    const t = i / K
    sheets.push({ d: rrPath(i * DX, i * DY, w, h, R), c: L ? shade('#fbf8f0', 1 - t * 0.07) : shade('#f1ebdc', 1 - t * 0.1) })
  }
  const bx = Math.round(w * 0.16)
  const rb = `M${bx - 3.6} ${h - 6}H${bx + 3.6}V${h + 19}L${bx} ${h + 15.4}L${bx - 3.6} ${h + 19}Z`
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="fprb" x1="0" y1="0" x2="1" y2="0">
          <S.Stop offset="0" stopColor="#8f2620" />
          <S.Stop offset="0.45" stopColor="#d9493e" />
          <S.Stop offset="1" stopColor="#a42d25" />
        </S.LinearGradient>
      </S.Defs>
      <S.Path d={rrPath(K * DX + 1, K * DY + 2.4, w, h, R)} fill="#000" fillOpacity={L ? 0.12 : 0.42} />
      {sheets.map((s, i) => (
        <S.Path key={i} d={s.d} fill={s.c} stroke={L ? '#c9bb98' : '#a69676'} strokeWidth={0.45} />
      ))}
      <S.Path d={rb} fill="#000" fillOpacity={0.25} translateX={0.8} translateY={1} />
      <S.Path d={rb} fill="url(#fprb)" />
      <S.Path d={`M${bx - 1.4} ${h}V${h + 16}`} stroke="#ff9a8e" strokeOpacity={0.55} strokeWidth={0.7} />
    </Layer>
  )
}

function freshLayout(f) {
  const { w, h, R } = f
  const OUT = 7
  const IN = -2.6
  const NB = 70
  const P = (p) => r2(p.x) + ' ' + r2(p.y)
  const pts = (o) => Array.from({ length: NB + 1 }, (_, i) => topAt(f, o, i / NB))
  const po = pts(OUT)
  const pi = pts(IN)
  const back = pi.slice().reverse().map(P).join('L')
  const bind = 'M' + po.map(P).join('L') + 'L' + back + 'Z'
  let weave = ''
  for (let i = 1; i < NB * 2; i++) weave += `M${P(topAt(f, OUT - 1, i / (NB * 2)))}L${P(topAt(f, IN + 1, (i - 0.6) / (NB * 2)))}`
  const hi = 'M' + pts(OUT - 1).map(P).join('L')
  const stitch = 'M' + pts(IN + 1.3).map(P).join('L')
  const rnd = seeded(5)
  let rag = 'M' + P(pi[0])
  const NR = 120
  for (let i = 0; i <= NR; i++) rag += 'L' + P(topAt(f, IN - (i % 2 ? 1 + rnd() * 2.4 : 0.6 + rnd() * 1), i / NR))
  rag += 'L' + back + 'Z'
  const x0 = R + 2
  const fy = -IN
  const flap = `M${x0} ${fy - 0.6}L${x0 + 21} ${fy - 0.6}L${x0 + 17.5} ${fy + 5}L${x0 + 13.6} ${fy + 3.2}L${x0 + 10} ${fy + 8.6}L${x0 + 6.4} ${fy + 6}L${x0 + 2.4} ${fy + 10.6}L${x0 - 1.6} ${fy + 7.4}L${x0 - 2} ${fy - 0.6}Z`
  const grom = [topAt(f, 2.2, 0.3), topAt(f, 2.2, 0.7)]
  const on = (u, o) => {
    const p = topAt(f, o, u)
    return [p.x, p.y]
  }
  const CF = [
    ['#ffd34d', 'r', ...on(0.18, 3), 20],
    ['#ff5fa2', 'r', ...on(0.56, 4.2), -35],
    ['#3fcf9e', 'c', ...on(0.83, 2.6)],
    ['#ffd34d', 's', ...on(0.42, 3.2)],
    ['#6aa8ff', 'c', ...on(0.95, 3.4)],
    ['#3fcf9e', 'r', w * 0.38, h + 8.6, -15],
    ['#ffd34d', 's', w * 0.6, h + 9.4],
    ['#ff5fa2', 'r', w * 0.8, h + 8, 30],
    ['#6aa8ff', 'r', w + 5.6, h * 0.7, 75],
    ['#ffd34d', 'c', w + 5.4, h * 0.42],
  ].map(([c, k, x, y, a = 0], i) => ({ c, k, x: r2(x), y: r2(y), a, big: i % 3 === 0 ? 1.6 : 1 }))
  return { bind, weave, hi, stitch, rag, flap, x0, fy, grom, CF }
}

function Confetti({ S, cf, gold }) {
  return cf
    .filter((p) => (p.c === '#ffd34d') === gold)
    .map((p, i) => {
      const { c, k, x, y, a, big } = p
      if (k === 'r')
        return (
          <S.G key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${big})`}>
            <S.Rect x={-2.5} y={-1.2} width={5} height={2.4} rx={0.5} fill="#000" fillOpacity={0.25} translateX={0.4} translateY={0.7} />
            <S.Rect x={-2.5} y={-1.2} width={5} height={2.4} rx={0.5} fill={c} />
            <S.Rect x={-2.1} y={-0.95} width={2.2} height={0.65} fill="#fff" fillOpacity={0.55} />
          </S.G>
        )
      if (k === 'c')
        return (
          <S.G key={i}>
            <S.Circle cx={r2(x + 0.4)} cy={r2(y + 0.7)} r={1.6 * big} fill="#000" fillOpacity={0.25} />
            <S.Circle cx={x} cy={y} r={1.6 * big} fill={c} />
            <S.Circle cx={r2(x - 0.5)} cy={r2(y - 0.5)} r={0.5} fill="#fff" fillOpacity={0.75} />
          </S.G>
        )
      return (
        <S.G key={i}>
          <S.Path d={star5(x + 0.4, y + 0.7, 2.7 * big, 1.15 * big)} fill="#000" fillOpacity={0.25} />
          <S.Path d={star5(x, y, 2.7 * big, 1.15 * big)} fill={c} stroke="#b07d10" strokeWidth={0.35} />
        </S.G>
      )
    })
}

export function FreshOver({ f }) {
  const S = svgAll()
  const { w, h, R } = f
  const L = f.c.light
  const m = useMemo(() => freshLayout(f), [w, h, R]) // eslint-disable-line react-hooks/exhaustive-deps
  const live = f.active && !f.still
  const k = 0.78
  const dx0 = m.x0 + 7.4 - (7.3 * k) / 2
  const dy0 = m.fy + 3.2 - 2.5 * k
  const gold = (
    <Layer f={f}>
      <Confetti S={S} cf={m.CF} gold />
    </Layer>
  )
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="fpb" x1="0" y1="-7" x2="0" y2="2.6" gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#e65a4e" />
            <S.Stop offset="0.55" stopColor="#c23b31" />
            <S.Stop offset="1" stopColor="#8f2620" />
          </S.LinearGradient>
          <S.RadialGradient id="fpm" cx="0.35" cy="0.3" r="0.8">
            <S.Stop offset="0" stopColor="#fff4cc" />
            <S.Stop offset="0.45" stopColor="#ddb04e" />
            <S.Stop offset="1" stopColor="#8a5a14" />
          </S.RadialGradient>
        </S.Defs>
        <S.Path d={m.rag} fill="#000" fillOpacity={0.22} translateX={0.4} translateY={0.9} />
        <S.Path d={m.rag} fill="#f3ecdb" stroke="#c8b994" strokeWidth={0.4} />
        <S.Path d={m.flap} fill="#000" fillOpacity={0.22} translateX={0.6} translateY={1.1} />
        <S.Path d={m.flap} fill="#f7f1e3" stroke="#c8b994" strokeWidth={0.45} />
        {['3', '1'].map((c, i) => (
          <S.Path key={i} d={DIG[c]} transform={`translate(${r2(dx0 + i * 4.3 * k)} ${r2(dy0)}) scale(${k})`} fill="none" stroke="#c8352c" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <S.Path d={m.bind} fill="#000" fillOpacity={L ? 0.16 : 0.38} translateX={0.3} translateY={1.5} />
        <S.Path d={m.bind} fill="url(#fpb)" stroke="#6e1a15" strokeWidth={0.6} />
        <S.Path d={m.weave} stroke="#fff" strokeOpacity={0.08} strokeWidth={0.7} />
        <S.Path d={m.hi} fill="none" stroke="#ffb3a8" strokeOpacity={0.75} strokeWidth={0.9} strokeLinecap="round" />
        <S.Path d={m.stitch} fill="none" stroke="#ffd98a" strokeOpacity={0.8} strokeWidth={0.6} strokeDasharray="1.6 1.2" />
        {m.grom.map((p, i) => (
          <S.G key={i}>
            <S.Circle cx={r2(p.x)} cy={r2(p.y)} r={2.7} fill="url(#fpm)" stroke="#6b4510" strokeWidth={0.6} />
            <S.Circle cx={r2(p.x)} cy={r2(p.y)} r={1.6} fill="none" stroke="#7a4f12" strokeWidth={0.75} />
            <S.Circle cx={r2(p.x)} cy={r2(p.y)} r={1.05} fill="#3a120e" />
            <S.Path d={`M${r2(p.x - 1.7)} ${r2(p.y - 1)}A2 2 0 0 1 ${r2(p.x + 0.4)} ${r2(p.y - 2)}`} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={0.6} strokeLinecap="round" />
          </S.G>
        ))}
        <Confetti S={S} cf={m.CF} gold={false} />
      </Layer>
      {live ? (
        <Moving clock={f.clock} fn={twinkleFn} style={FILL}>
          {gold}
        </Moving>
      ) : (
        gold
      )}
    </>
  )
}

export const FRAME_ART_2027_01_01 = {
  mosaic: { over: MosaicOver },
  domino: { over: DominoOver, animated: true },
  fresh: { under: FreshUnder, over: FreshOver, animated: true },
}
