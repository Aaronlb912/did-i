// Frames from the 2026-12-04 drop (docs/ideas/frames-drop-2026-12-04.html):
// Cable Knit (coin, still), Winter Window (gem, living: frost by the clock,
// a wipe per answer, lamplight when tonight is done) and Candlelight (earned
// at a 14-night streak: one candle per night of the current streak). Same
// contract as art.jsx: drawn in card space, reaching up to PAD past the card;
// still tiles draw no particles and no moving views.
import { useMemo } from 'react'
import { rrLength, rrPath, rrPointAt } from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll } from './runtime.jsx'

const r2 = (n) => Math.round(n * 100) / 100
const P2 = (a) => `${r2(a[0])} ${r2(a[1])}`
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

function seeded(s) {
  let x = s
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

function dotD(x, y, r) {
  return `M${r2(x - r)} ${r2(y)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`
}

function sparkD(x, y, s) {
  return `M${r2(x)} ${r2(y - s)}Q${r2(x)} ${r2(y)} ${r2(x + s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y + s)}Q${r2(x)} ${r2(y)} ${r2(x - s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y - s)}Z`
}

// Walks the card's own outline (0 is the bottom of the left edge, clockwise);
// a ring o px out is the same point pushed along the outward normal.
function edgeKit(f) {
  const { w, h, R } = f
  const L = rrLength(w, h, R)
  const sv = h - 2 * R
  const sh = w - 2 * R
  const arc = (Math.PI * R) / 2
  const E = (d) => rrPointAt(0, 0, w, h, R, d)
  const off = (p, o) => [p.x + p.nx * o, p.y + p.ny * o]
  const walk = (o, d0, d1, sp, cb) => {
    let prev = null
    let acc = sp / 2
    for (let d = d0; d <= d1 + 1e-6; d += 0.4) {
      const p = E(d)
      const q = off(p, o)
      if (prev) {
        acc += Math.hypot(q[0] - prev[0], q[1] - prev[1])
        if (acc >= sp) {
          acc -= sp
          cb(q, p, d)
        }
      }
      prev = q
    }
  }
  const line = (o, d0, d1, step = 2) => {
    let s = ''
    let i = 0
    for (let d = d0; d < d1; d += step, i++) s += (i ? 'L' : 'M') + P2(off(E(d), o))
    return s + 'L' + P2(off(E(d1), o))
  }
  return { L, sv, sh, arc, E, off, walk, line }
}

/* ---------- Cable Knit: a cream Aran sweater round the card (coin, still) ---------- */

const WOOL = { base1: '#e4d6b6', base2: '#9c845f', rib: '#faf4e6', ribEdge: '#a8916a', v: '#a08861', out: '#7d6646', purl: '#6f5a3c' }

function knitLayout(f) {
  const { w, h, R } = f
  const { L, sv, sh, arc, E, off, walk, line } = edgeKit(f)
  const tile = f.still && w <= 220
  const BW = 18
  const TW = 7.5
  const bwOf = (p) => BW - (BW - TW) * Math.pow(Math.max(0, -p.ny), 1.6)
  let outer = ''
  for (let d = 0, i = 0; d < L; d += 2, i++) outer += (i ? 'L' : 'M') + P2(off(E(d), bwOf(E(d))))
  outer += 'Z'
  const T0 = sv
  const T1 = sv + 2 * arc + sh
  const X = 16
  const U0 = T1 - X
  const U1 = L + T0 + X
  const fade = (d) => {
    const a = Math.max(0, Math.min(1, (d - T0) / X, (T1 - d) / X))
    return a * a * (3 - 2 * a)
  }
  const cin = []
  const cout = []
  for (let d = T0; d <= T1 + 1e-6; d += 1.2) {
    const p = E(d)
    cin.push(off(p, -0.2))
    cout.push(off(p, (bwOf(p) + 0.2) * fade(d)))
  }
  const collar = 'M' + cin.map(P2).join('L') + 'L' + cout.reverse().map(P2).join('L') + 'Z'
  const nR = Math.round((T1 - T0) / 4.5)
  const pitch = (T1 - T0) / nR
  const hw = 1.45
  let ribs = ''
  let ribV = ''
  let ribHi = ''
  for (let i = 0; i < nR; i++) {
    const d = T0 + (i + 0.5) * pitch
    const fd = fade(d)
    if (fd < 0.3) continue
    const pm = E(d)
    const bw = Math.max(2, (bwOf(pm) - 0.7) * fd)
    const pa = E(d - hw)
    const pb = E(d + hw)
    const i1 = off(pa, 0.5)
    const o1 = off(pa, bw)
    const o2 = off(pb, bw)
    const i2 = off(pb, 0.5)
    const om = off(pm, bw + 0.9)
    const im = off(pm, 0.1)
    ribs += `M${P2(i1)}L${P2(o1)}Q${P2(om)} ${P2(o2)}L${P2(i2)}Q${P2(im)} ${P2(i1)}Z`
    ribHi += `M${P2(off(E(d - hw + 0.55), 1.2))}L${P2(off(E(d - hw + 0.55), bw - 0.8))}`
    if (!tile)
      for (let o = 1.7; o < bw - 1; o += 2.45) {
        const c = off(pm, o)
        const tx = -pm.ny
        const ty = pm.nx
        const nx = pm.nx
        const ny = pm.ny
        ribV += `M${r2(c[0] - tx * 1.05 + nx * 0.95)} ${r2(c[1] - ty * 1.05 + ny * 0.95)}L${r2(c[0] - nx * 0.95)} ${r2(c[1] - ny * 0.95)}L${r2(c[0] + tx * 1.05 + nx * 0.95)} ${r2(c[1] + ty * 1.05 + ny * 0.95)}`
      }
  }
  const cols = line(2, U0, U1) + line(15.9, U0, U1)
  let colV = ''
  if (!tile)
    [2, 15.9].forEach((o) =>
      walk(o, U0, U1, 2.5, (q, p) => {
        let tx = -p.ny
        let ty = p.nx
        if (ty < -0.01 || (Math.abs(ty) <= 0.01 && tx < 0)) {
          tx = -tx
          ty = -ty
        }
        const nx = p.nx
        const ny = p.ny
        colV += `M${r2(q[0] - tx - nx)} ${r2(q[1] - ty - ny)}L${r2(q[0] + tx * 0.95)} ${r2(q[1] + ty * 0.95)}L${r2(q[0] - tx + nx)} ${r2(q[1] - ty + ny)}`
      }),
    )
  // Two strands round a centre line 9 px out; each bottom corner holds three half-twists.
  const cs = []
  walk(9, U0, U1, 0.6, (q, p, d) => cs.push({ x: q[0], y: q[1], nx: p.nx, ny: p.ny, d }))
  const sAt = (d) => {
    const i = cs.findIndex((c) => c.d >= d)
    return (i < 0 ? cs.length - 1 : i) * 0.6
  }
  const BR0 = T1 + sv
  const BR1 = BR0 + arc
  const BL0 = BR1 + sh
  const BL1 = BL0 + arc
  const hs = tile ? 9.4 : 8.6
  const Ulen = (cs.length - 1) * 0.6
  const kn = [0, sAt(BR0), sAt(BR1), sAt(BL0), sAt(BL1), Ulen]
  const ph = [0]
  ph[1] = Math.max(1, Math.round(kn[1] / hs - 0.5)) + 0.5
  ph[2] = ph[1] + 3
  ph[3] = ph[2] + Math.max(2, Math.round((kn[3] - kn[2]) / hs))
  ph[4] = ph[3] + 3
  ph[5] = ph[4] + Math.max(1, Math.round((kn[5] - kn[4]) / hs - 0.5)) + 0.5
  const phase = (s) => {
    for (let k = 1; k < kn.length; k++)
      if (s <= kn[k] || k === kn.length - 1) return ph[k - 1] + (ph[k] - ph[k - 1]) * Math.max(0, Math.min(1, (s - kn[k - 1]) / (kn[k] - kn[k - 1] || 1)))
    return ph[ph.length - 1]
  }
  const amp = tile ? 2.8 : 2.6
  const PH = cs.map((c, i) => phase(i * 0.6))
  const sp = (sg, i) => {
    const c = cs[i]
    const k = sg * amp * Math.sin(Math.PI * PH[i])
    return [c.x + c.nx * k, c.y + c.ny * k]
  }
  const LX = -0.6
  const LY = -0.8
  let under = ''
  let over = ''
  let overHi = ''
  let overLo = ''
  let underV = ''
  let overV = ''
  const groups = new Map()
  PH.forEach((p, i) => {
    const n = Math.round(p)
    if (!groups.has(n)) groups.set(n, [i, i])
    groups.get(n)[1] = i
  })
  groups.forEach(([a0, b0], n) => {
    const a = Math.max(0, a0 - 1)
    const b = Math.min(cs.length - 1, b0 + 1)
    if (b - a < 2) return
    const overSg = n % 2 === 0 ? -1 : 1
    ;[
      [-overSg, false],
      [overSg, true],
    ].forEach(([sg, isOver]) => {
      const pts = []
      for (let i = a; i <= b; i++) pts.push(sp(sg, i))
      const d = 'M' + pts.map(P2).join('L')
      if (isOver) {
        over += d
        let hi = ''
        let lo = ''
        pts.forEach((q, j) => {
          const A = pts[Math.max(0, j - 1)]
          const B = pts[Math.min(pts.length - 1, j + 1)]
          let tx = B[0] - A[0]
          let ty = B[1] - A[1]
          const l = Math.hypot(tx, ty) || 1
          tx /= l
          ty /= l
          let mx = -ty
          let my = tx
          if (mx * LX + my * LY < 0) {
            mx = -mx
            my = -my
          }
          hi += (j ? 'L' : 'M') + r2(q[0] + mx * 1.2) + ' ' + r2(q[1] + my * 1.2)
          lo += (j ? 'L' : 'M') + r2(q[0] - mx * 1.35) + ' ' + r2(q[1] - my * 1.35)
        })
        overHi += hi
        overLo += lo
      } else under += d
      if (!tile)
        for (let j = 2; j < pts.length - 2; j += 4) {
          const A = pts[j - 1]
          const B = pts[j + 1]
          const q = pts[j]
          let tx = B[0] - A[0]
          let ty = B[1] - A[1]
          const l = Math.hypot(tx, ty) || 1
          tx /= l
          ty /= l
          const mx = -ty
          const my = tx
          const v = `M${r2(q[0] + mx * 1.05 + tx * 0.8)} ${r2(q[1] + my * 1.05 + ty * 0.8)}L${r2(q[0] - tx * 0.8)} ${r2(q[1] - ty * 0.8)}L${r2(q[0] - mx * 1.05 + tx * 0.8)} ${r2(q[1] - my * 1.05 + ty * 0.8)}`
          if (isOver) overV += v
          else underV += v
        }
    })
  })
  let fuzz = ''
  {
    const rnd = seeded(41)
    const n = tile ? 20 : 75
    for (let i = 0; i < n; i++) {
      const p = E(rnd() * L)
      if (p.ny < -0.3) {
        rnd()
        rnd()
        continue
      }
      const b = off(p, bwOf(p) - 0.7)
      const a = Math.atan2(p.ny, p.nx) + (rnd() - 0.5) * 1.4
      const l = 0.7 + rnd() * 0.9
      fuzz += `M${P2(b)}Q${r2(b[0] + Math.cos(a + 0.5) * l * 0.6)} ${r2(b[1] + Math.sin(a + 0.5) * l * 0.6)} ${r2(b[0] + Math.cos(a) * l)} ${r2(b[1] + Math.sin(a) * l)}`
    }
  }
  return {
    band: `${outer} ${rrPath(0, 0, w, h, R)}`,
    outer,
    collar,
    ribs,
    ribV,
    ribHi,
    cols,
    colV,
    mid: line(9, U0, U1),
    dash: line(3.9, U0, U1) + line(14.1, U0, U1),
    under,
    underV,
    over,
    overV,
    overHi,
    overLo,
    fuzz,
    sw: tile ? 1.25 : 1,
  }
}

export function KnitOver({ f }) {
  const S = svgAll()
  const k = useMemo(() => knitLayout(f), [f.w, f.h, f.R, f.still]) // eslint-disable-line react-hooks/exhaustive-deps
  const LT = f.c.light
  const { w, h, R } = f
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="knB" x1="0" y1="-8" x2={w} y2={h + 18} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor={WOOL.base1} />
          <S.Stop offset="1" stopColor={WOOL.base2} />
        </S.LinearGradient>
        <S.LinearGradient id="knR" x1="0" y1="-8" x2="0" y2={R + 18} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor="#fffaf0" />
          <S.Stop offset="1" stopColor="#efe3c8" />
        </S.LinearGradient>
        <S.ClipPath id="knC">
          <S.Path d={k.band} clipRule="evenodd" />
        </S.ClipPath>
      </S.Defs>
      <S.Path d={k.band} fillRule="evenodd" fill="#000000" fillOpacity={LT ? 0.13 : 0.4} transform="translate(0.4 2.2)" />
      <S.Path d={k.band} fillRule="evenodd" fill="url(#knB)" />
      <S.G clipPath="url(#knC)">
        <S.Path d={k.mid} fill="none" stroke={WOOL.purl} strokeOpacity={0.75} strokeWidth={10.4} />
        <S.Path d={k.cols} fill="none" stroke={WOOL.ribEdge} strokeWidth={3.6} />
        <S.Path d={k.cols} fill="none" stroke={WOOL.rib} strokeWidth={2.8} />
        {k.colV ? <S.Path d={k.colV} fill="none" stroke={WOOL.v} strokeWidth={0.5} strokeLinejoin="round" /> : null}
        <S.Path d={k.dash} fill="none" stroke="#efe4cb" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="1 1.3" />
        <S.Path d={k.under} fill="none" stroke={WOOL.out} strokeWidth={5.7 * k.sw} strokeLinecap="round" />
        <S.Path d={k.under} fill="none" stroke="#eadfc6" strokeWidth={4.6 * k.sw} strokeLinecap="round" />
        {k.underV ? <S.Path d={k.underV} fill="none" stroke="#a48d64" strokeWidth={0.5} strokeLinejoin="round" /> : null}
        <S.Path d={k.over} fill="none" stroke="#000000" strokeOpacity={0.32} strokeWidth={6 * k.sw} strokeLinecap="round" transform="translate(0.5 0.9)" />
        <S.Path d={k.over} fill="none" stroke={WOOL.out} strokeWidth={5.9 * k.sw} strokeLinecap="round" />
        <S.Path d={k.over} fill="none" stroke="#fdf8ee" strokeWidth={4.8 * k.sw} strokeLinecap="round" />
        <S.Path d={k.overLo} fill="none" stroke="#d6c4a0" strokeWidth={1.3 * k.sw} strokeLinecap="round" />
        {k.overV ? <S.Path d={k.overV} fill="none" stroke="#b49f78" strokeWidth={0.5} strokeLinejoin="round" /> : null}
        <S.Path d={k.overHi} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={1.05 * k.sw} strokeLinecap="round" />
        <S.Path d={k.collar} fill="#000000" fillOpacity={0.2} transform="translate(0.3 0.8)" />
        <S.Path d={k.collar} fill="#b29a72" />
        <S.Path d={k.ribs} fill="#000000" fillOpacity={0.22} transform="translate(0.4 0.7)" />
        <S.Path d={k.ribs} fill="url(#knR)" stroke={WOOL.ribEdge} strokeWidth={0.5} />
        <S.Path d={k.ribHi} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.7} strokeLinecap="round" />
        {k.ribV ? <S.Path d={k.ribV} fill="none" stroke={WOOL.v} strokeWidth={0.5} strokeLinejoin="round" /> : null}
      </S.G>
      <S.Path d={k.outer} fill="none" stroke={WOOL.out} strokeWidth={0.9} />
      <S.Path d={k.fuzz} fill="none" stroke="#f3e4c4" strokeOpacity={0.85} strokeWidth={0.7} strokeLinecap="round" />
      <S.Path d={ring(f, -1.1)} fill="none" stroke="#000000" strokeOpacity={LT ? 0.1 : 0.28} strokeWidth={2.2} />
    </Layer>
  )
}

/* ---------- Winter Window: a painted sash round a band of glass (gem, living) ---------- */
// Behind the glass: a snowy village, falling snow and a moon that climbs with the
// evening. On the glass: fog, and frost growing in from the corners as it gets late.
// Each answer wipes a clear patch; lamplight from the room warms the glass as you
// go, and all done adds a heart drawn in the fog.

const HEART = 'M0 7C-2.4 5 -8 1.2 -8 -3C-8 -6.4 -5.4 -8 -3 -8C-1.4 -8 0 -7 0 -5.4C0 -7 1.4 -8 3 -8C5.4 -8 8 -6.4 8 -3C8 1.2 2.4 5 0 7Z'

function windowLayout(f, ans, total, ev, done) {
  const { w, h, R } = f
  const { L, sv, sh, arc, E, off } = edgeKit(f)
  const GX = -17
  const GY = -3.5
  const GW = w + 34
  const GH = h + 19.5
  const GR = R + 13
  const SX = -22
  const SY = -8
  const SW = w + 44
  const SH = h + 27
  const SR = R + 18
  const glass = rrPath(GX, GY, GW, GH, GR)
  const sash = rrPath(SX, SY, SW, SH, SR)
  const card = rrPath(0, 0, w, h, R)
  // the far scene
  const r = seeded(23)
  let x = GX
  let roof = `M${GX} ${h + 17}L${GX} ${h + 9}`
  while (x < GX + GW) {
    const wd = 14 + r() * 16
    const ht = 4 + r() * 5
    const pk = r() < 0.5
    roof += pk ? `L${r2(x + wd * 0.15)} ${r2(h + 10 - ht)}L${r2(x + wd * 0.5)} ${r2(h + 7 - ht)}L${r2(x + wd * 0.85)} ${r2(h + 10 - ht)}` : `L${r2(x)} ${r2(h + 10 - ht)}L${r2(x + wd)} ${r2(h + 10 - ht)}`
    x += wd
  }
  roof += `L${GX + GW} ${h + 9}L${GX + GW} ${h + 17}Z`
  const ground = `M${GX} ${h + 14.5}Q${r2(w * 0.3)} ${h + 11.5} ${r2(w / 2)} ${h + 13.5}T${GX + GW} ${h + 13}V${h + 17}H${GX}Z`
  let lit = ''
  for (let i = 0; i < 9; i++) {
    const lx = GX + 8 + r() * (GW - 16)
    lit += `M${r2(lx)} ${r2(h + 9.5 + r() * 3)}h1.6v2h-1.6Z`
  }
  for (let i = 0; i < 10; i++) {
    const left = i % 2 === 0
    const yy = R + 20 + r() * (h - 2 * R - 40)
    const xx = left ? GX + 3 + r() * 10 : w + 4 + r() * 10
    lit += `M${r2(xx)} ${r2(yy)}h1.5v1.9h-1.5Z`
    r()
    if (r() < 0.6) lit += `M${r2(xx + 2.4)} ${r2(yy)}h1.5v1.9h-1.5Z`
    r()
  }
  let stars = ''
  for (let i = 0; i < 14; i++) {
    const q = off(E(r() * L), 2 + r() * 11)
    stars += dotD(q[0], q[1], 0.35 + r() * 0.45)
    r()
  }
  const moon = { x: w + 9, y: r2(h * 0.78 - ev * h * 0.55) }
  const flakes = []
  {
    const rf = seeded(31)
    for (let i = 0; i < 34; i++) {
      const p = E(rf() * L)
      const q = off(p, 1 + rf() * 14)
      const rr = 0.6 + rf() * 1.1
      flakes.push({ x: q[0], y: q[1], r: rr, side: Math.abs(p.nx) > 0.9, dur: 5 + rf() * 5, dl: rf() * 9 })
    }
  }
  // frost: soft scalloped masses from each corner, growing with the evening
  const Rf = 24 + 56 * ev
  const dC = [sv + arc / 2, sv + arc * 1.5 + sh, 2 * sv + arc * 2.5 + sh, 2 * sv + arc * 3.5 + 2 * sh]
  let frost = ''
  let frost2 = ''
  let edge = ''
  let facets = ''
  const glints = []
  dC.forEach((dc, ci) => {
    const maxD = ci < 2 ? 17 : 19
    const inner = []
    const outerP = []
    const inner2 = []
    let k = 0
    for (let s = -Rf; s <= Rf + 1e-6; s += 1.8, k++) {
      const p = E(dc + s)
      const t = Math.abs(s) / Rf
      const dep = maxD * Math.pow(1 - t, 0.75) * (0.72 + 0.28 * Math.abs(Math.sin(s * 0.55 + ci)))
      outerP.push(off(p, 24))
      inner.push(off(p, 24 - dep))
      inner2.push(off(p, 24 - dep * 0.62))
      if (k % 3 === 0 && dep > 4) facets += `M${P2(off(p, 24 - dep + 1))}L${P2(off(p, 24 - dep * 0.45))}`
    }
    frost += 'M' + outerP.map(P2).join('L') + 'L' + inner.slice().reverse().map(P2).join('L') + 'Z'
    frost2 += 'M' + outerP.map(P2).join('L') + 'L' + inner2.slice().reverse().map(P2).join('L') + 'Z'
    edge += 'M' + inner.map(P2).join('L')
    ;[-0.7, 0.7].forEach((t, j) => {
      const g = off(E(dc + t * Rf), 24 - maxD * Math.pow(0.3, 0.75) * 0.8)
      glints.push({ x: g[0], y: g[1], ph: ci * 1.3 + j * 2.1 })
    })
  })
  // wipes: one per answered question, down the left, along the bottom, up the right
  const Ulen = 2 * sv + 2 * arc + sh
  const nW = Math.max(1, Math.min(8, total || 4))
  const O = 8.4
  let wipes = ''
  let dripW = ''
    let beads = ''
  let beadHi = ''
  const ends = (s, hl) => Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(s / hl), 2.4)))
  for (let i = 0; i < ans && i < 8; i++) {
    const u = 0.07 + (0.86 * (i + 0.5)) / nW
    const dm = sv - u * Ulen
    const bend = i % 2 ? 1 : -1
    const a = []
    const b = []
    const pts = []
    for (let s = -11.5; s <= 11.5 + 1e-6; s += 1.2) {
      const p = E(dm + s)
      const k = ends(s, 11.5) * 6.6 * (1 + 0.05 * Math.sin(s * 1.9 + dm))
      const o = O + bend * Math.sin((s / 11.5) * Math.PI * 0.5)
      a.push(off(p, o + k))
      b.push(off(p, o - k))
      pts.push(off(p, o + 6 * ends(s, 11.5)))
    }
    wipes += 'M' + a.map(P2).join('L') + 'L' + b.reverse().map(P2).join('L') + 'Z'
    const low = pts.reduce((m, q) => (q[1] > m[1] ? q : m))
    const dx = low[0] + (i % 2 ? 1 : -1)
    const y0 = low[1] - 1.5
    const y1 = y0 + 4.5 + (i % 3)
    dripW += `M${r2(dx)} ${r2(y0)}V${r2(y1)}`
    beads += dotD(dx, y1 + 0.3, 1.5)
    beadHi += dotD(dx - 0.5, y1 - 0.2, 0.45)
  }
  const sy = h + 17.2
  let snow = `M-22 ${r2(sy + 3.6)}L-22 ${r2(sy - 2)}C-21 ${r2(sy - 7.5)} -15 ${r2(sy - 8)} -10 ${r2(sy - 4.5)}C-5 ${r2(sy - 1.5)} 8 ${r2(sy - 1.8)} 18 ${r2(sy - 0.6)}`
  {
    const rr = seeded(3)
    let sx = 18
    while (sx < w - 18) {
      const nx2 = Math.min(w - 18, sx + 16 + rr() * 14)
      snow += `Q${r2((sx + nx2) / 2)} ${r2(sy - 2.4 - rr() * 1.8)} ${r2(nx2)} ${r2(sy - 0.4 - rr() * 0.6)}`
      sx = nx2
    }
  }
  snow += `C${w - 8} ${r2(sy - 1.8)} ${w + 5} ${r2(sy - 1.5)} ${w + 10} ${r2(sy - 4.5)}C${w + 15} ${r2(sy - 8)} ${w + 21} ${r2(sy - 7.5)} ${w + 22} ${r2(sy - 2)}L${w + 22} ${r2(sy + 3.6)}Z`
  let icicles = ''
  ;[
    [-13, 3.4],
    [-5, 2.2],
    [34, 2.8],
    [w * 0.42, 2.2],
    [w * 0.58, 3],
    [w - 30, 2.4],
    [w + 7, 3.4],
    [w + 15, 2.2],
  ].forEach(([ix, l]) => {
    icicles += `M${r2(ix - 1.3)} ${r2(sy + 3.5)}L${r2(ix)} ${r2(sy + 3.5 + l)}L${r2(ix + 1.3)} ${r2(sy + 3.5)}Z`
  })
  const kk = 1 - Math.SQRT1_2
  const mit = [
    [SX, SY, GX, GY, 1, 1],
    [SX + SW, SY, GX + GW, GY, -1, 1],
    [SX + SW, SY + SH, GX + GW, GY + GH, -1, -1],
    [SX, SY + SH, GX, GY + GH, 1, -1],
  ]
    .map(([ax, ay, bx, by, sx, sy2]) => `M${P2([ax + sx * SR * kk, ay + sy2 * SR * kk])}L${P2([bx + sx * GR * kk, by + sy2 * GR * kk])}`)
    .join('')
  const my = Math.round(h / 2)
  const stubs = `M${GX - 1} ${my - 2.8}H-6.5Q-5 ${my - 2.8} -5 ${my - 1.3}V${my + 1.3}Q-5 ${my + 2.8} -6.5 ${my + 2.8}H${GX - 1}Z M${GX + GW + 1} ${my - 2.8}H${w + 6.5}Q${w + 5} ${my - 2.8} ${w + 5} ${my - 1.3}V${my + 1.3}Q${w + 5} ${my + 2.8} ${w + 6.5} ${my + 2.8}H${GX + GW + 1}Z M${r2(w / 2 - 2.8)} ${GY + GH + 1}V${h + 6.5}Q${r2(w / 2 - 2.8)} ${h + 5} ${r2(w / 2 - 1.3)} ${h + 5}H${r2(w / 2 + 1.3)}Q${r2(w / 2 + 2.8)} ${h + 5} ${r2(w / 2 + 2.8)} ${h + 6.5}V${GY + GH + 1}Z`
  const stubHi = `M${GX} ${my - 2.2}H-6.5M${GX + GW} ${my - 2.2}H${w + 6.5}M${r2(w / 2 - 2.2)} ${GY + GH}V${h + 6.5}`
  const warm = total ? ans / total : 0
  const pools = [
    [-8, h * 0.3],
    [w + 8, h * 0.62],
    [w * 0.3, h + 9],
    [w * 0.72, h + 9],
    [-8, h * 0.8],
  ].slice(0, done ? 5 : Math.round(warm * 4))
  return {
    glass,
    sash,
    card,
    clip: `${glass} ${card}`,
    sashBand: `${sash} ${glass}`,
    roof,
    ground,
    lit,
    stars,
    moon,
    flakes,
    frost,
    frost2,
    edge,
    facets,
    glints,
    wipes,
    dripW,
    dripB: dripW,
    beads,
    beadHi,
    snow,
    sy,
    icicles,
    mit,
    stubs,
    stubHi,
    my,
    pools,
    G: { GX, GY, GW, GH, GR, SX, SY, SW, SH, SR },
  }
}

function snowAt(time, it) {
  'worklet'
  const k = ((time + it.dl) % it.dur) / it.dur
  const o = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1
  return { x: it.x, y: it.y - 10 + 20 * k, o: o * it.op }
}

function twinkleAt(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 0.15 + 0.85 * (0.5 + 0.5 * Math.sin((2 * Math.PI * time) / 3.2 + it.ph)) }
}

function lampFn(time) {
  'worklet'
  return { opacity: 0.8 + 0.2 * (0.5 - 0.5 * Math.cos((2 * Math.PI * time) / 5.5)) }
}

function WindowNight({ S, k, f }) {
  return (
    <>
      <S.Path d={k.clip} fillRule="evenodd" fill="url(#wnG)" />
      <S.Circle cx={k.moon.x} cy={k.moon.y} r={26} fill="url(#wnMg)" />
      <S.Circle cx={k.moon.x} cy={k.moon.y} r={6.4} fill="#fdf6dc" />
      <S.Circle cx={k.moon.x + 2.8} cy={k.moon.y - 1.6} r={5.4} fill="#1d3466" />
      <S.Path d={k.stars} fill="#dfe8ff" opacity={0.6} />
      <S.Path d={k.roof} fill="#0a1430" />
      <S.Path d={k.roof} fill="none" stroke="#dfe9f8" strokeOpacity={0.8} strokeWidth={1.3} transform="translate(0 0.5)" />
      <S.Path d={k.ground} fill="#b9cbe6" />
      <S.Path d={k.lit} fill="#ffcf6a" opacity={0.75} />
      {f.active ? (
        <S.Path d={k.flakes.filter((p) => !p.side).map((p) => dotD(p.x, p.y, p.r)).join('')} fill="#ffffff" opacity={0.75} />
      ) : (
        <S.Path d={k.flakes.map((p) => dotD(p.x, p.y, p.r)).join('')} fill="#ffffff" opacity={0.75} />
      )}
    </>
  )
}

export function WindowOver({ f }) {
  const S = svgAll()
  const P = f.p
  const total = P.total || 0
  const ans = Math.min(total, P.answered || 0)
  const done = f.still || (total > 0 && ans >= total)
  const ev = f.still ? 0.8 : Math.round(Math.max(0, Math.min(1, P.evening || 0)) * 20) / 20
  const k = useMemo(() => windowLayout(f, f.still ? total : ans, total, ev, done), [f.w, f.h, f.R, f.still, ans, total, ev, done]) // eslint-disable-line react-hooks/exhaustive-deps
  const LT = f.c.light
  const live = f.active
  const { w, h } = f
  const { GX, GY, GW, GH, GR, SX, SY, SW, SH } = k.G
  const lx = w + 11
  const ly = k.my
  const sy = k.sy
  const pools = (
    <Layer f={f}>
      <S.Defs>
        <S.RadialGradient id="wnWl2">
          <S.Stop offset="0" stopColor="#ffc870" stopOpacity="0.8" />
          <S.Stop offset="0.5" stopColor="#ffb04a" stopOpacity="0.35" />
          <S.Stop offset="1" stopColor="#ffb04a" stopOpacity="0" />
        </S.RadialGradient>
        <S.ClipPath id="wnC2">
          <S.Path d={k.clip} clipRule="evenodd" />
        </S.ClipPath>
      </S.Defs>
      <S.G clipPath="url(#wnC2)">
        {k.pools.map(([x, y], i) => (
          <S.Ellipse key={i} cx={r2(x)} cy={r2(y)} rx={done ? 30 : 22} ry={done ? 52 : 38} fill="url(#wnWl2)" opacity={done ? 0.85 : 0.5} />
        ))}
      </S.G>
      {done ? (
        <>
          <S.Ellipse cx={w / 2} cy={sy - 1} rx={r2(w * 0.42)} ry={6} fill="url(#wnWl2)" />
          <S.Path d={`M${r2(w * 0.2)} ${r2(sy - 1.6)}Q${w / 2} ${r2(sy - 3.6)} ${r2(w * 0.8)} ${r2(sy - 1.6)}`} fill="none" stroke="#ffd690" strokeOpacity={0.75} strokeWidth={1.1} strokeLinecap="round" />
        </>
      ) : null}
    </Layer>
  )
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="wnG" x1="0" y1={GY} x2="0" y2={GY + GH} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#0b1834" />
            <S.Stop offset="0.6" stopColor="#152a55" />
            <S.Stop offset="1" stopColor="#22407a" />
          </S.LinearGradient>
          <S.RadialGradient id="wnMg">
            <S.Stop offset="0" stopColor="#fff4d0" stopOpacity="0.75" />
            <S.Stop offset="0.35" stopColor="#c9dcff" stopOpacity="0.28" />
            <S.Stop offset="1" stopColor="#c9dcff" stopOpacity="0" />
          </S.RadialGradient>
          <S.ClipPath id="wnC">
            <S.Path d={k.clip} clipRule="evenodd" />
          </S.ClipPath>
          <S.ClipPath id="wnW">
            <S.Path d={k.wipes || 'M0 0Z'} />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={`${k.sash} ${k.card}`} fillRule="evenodd" fill="#000000" fillOpacity={LT ? 0.14 : 0.4} transform="translate(0 2)" />
        <S.G clipPath="url(#wnC)">
          <WindowNight S={S} k={k} f={f} />
          <S.Path d={k.glass} fill="#e8f0ff" fillOpacity={LT ? 0.26 : 0.2} />
          <S.Path d={k.glass} fill="none" stroke="#e8f0ff" strokeOpacity={0.14} strokeWidth={12} />
          <S.Path d={k.frost} fill="#eef6ff" fillOpacity={0.5} />
          <S.Path d={k.frost2} fill="#f8fbff" fillOpacity={0.45} />
          <S.Path d={k.facets} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={0.6} strokeLinecap="round" />
          <S.Path d={k.edge} fill="none" stroke="#ffffff" strokeOpacity={0.9} strokeWidth={0.8} strokeLinejoin="round" />
          {k.wipes ? (
            <>
              <S.Path d={k.wipes} fill="none" stroke="#f4f8ff" strokeOpacity={0.18} strokeWidth={7} />
              <S.Path d={k.wipes} fill="none" stroke="#f4f8ff" strokeOpacity={0.3} strokeWidth={3.4} />
              <S.G clipPath="url(#wnW)">
                <WindowNight S={S} k={k} f={f} />
                <S.Path d={k.wipes} fill="#a9c4ee" fillOpacity={0.26} />
                <S.Path d={k.wipes} fill="none" stroke="#ffd9a0" strokeOpacity={0.35} strokeWidth={3} />
              </S.G>
              <S.Path d={k.dripW} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={2.6} strokeLinecap="round" />
              <S.Path d={k.dripB} stroke="#2a4a86" strokeWidth={1.2} strokeLinecap="round" />
              <S.Path d={k.beads} fill="#13244a" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.5} />
              <S.Path d={k.beadHi} fill="#ffffff" />
            </>
          ) : null}
          {done ? (
            <S.G transform={`translate(-8.5 ${Math.round(h * 0.4)})`}>
              <S.Path d={HEART} fill="none" stroke="#f4f8ff" strokeOpacity={0.45} strokeWidth={5} strokeLinejoin="round" />
              <S.Path d={HEART} fill="none" stroke="#ffd79a" strokeWidth={2.2} strokeLinejoin="round" />
              <S.Path d="M1.6 6V10.5" stroke="#13244a" strokeWidth={1.3} strokeLinecap="round" />
              <S.Circle cx={1.6} cy={10.8} r={1.3} fill="#13244a" />
            </S.G>
          ) : null}
          {live ? null : <S.Path d={k.glints.map((g) => sparkD(g.x, g.y, 2.4)).join('')} fill="#ffffff" opacity={0.7} />}
        </S.G>
      </Layer>
      {live && done ? (
        <Moving clock={f.clock} fn={lampFn} style={FILL}>
          {pools}
        </Moving>
      ) : (
        pools
      )}
      {live
        ? k.flakes
            .filter((p) => p.side)
            .map((p, i) => (
              <Particle key={`s${i}`} clock={f.clock} item={{ x: p.x, y: p.y, dur: p.dur, dl: p.dl, op: Math.min(1, 0.55 + p.r / 4) }} fn={snowAt} w={w} h={h} size={4}>
                <S.Svg width={4} height={4} viewBox="-2 -2 4 4">
                  <S.Circle r={p.r} fill="#ffffff" />
                </S.Svg>
              </Particle>
            ))
        : null}
      {live
        ? k.glints.map((g, i) => (
            <Particle key={`g${i}`} clock={f.clock} item={g} fn={twinkleAt} w={w} h={h} size={6}>
              <S.Svg width={6} height={6} viewBox="-3 -3 6 6">
                <S.Path d={sparkD(0, 0, 2.4)} fill="#ffffff" />
              </S.Svg>
            </Particle>
          ))
        : null}
      <Layer f={f}>
        <S.Path d={k.sashBand} fillRule="evenodd" fill="url(#wnS2)" />
        <S.Defs>
          <S.LinearGradient id="wnS2" x1={SX} y1={SY} x2={SX + SW} y2={SY + SH} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#3f7d67" />
            <S.Stop offset="0.55" stopColor="#2c5e4d" />
            <S.Stop offset="1" stopColor="#1f4639" />
          </S.LinearGradient>
          <S.LinearGradient id="wnBi2" x1={GX} y1={GY} x2={GX + GW} y2={GY + GH} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#11302a" />
            <S.Stop offset="0.5" stopColor="#24574a" />
            <S.Stop offset="1" stopColor="#7fc2a6" />
          </S.LinearGradient>
          <S.LinearGradient id="wnBo2" x1={SX} y1={SY} x2={SX + SW} y2={SY + SH} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#8fd0b5" />
            <S.Stop offset="0.5" stopColor="#3c7a64" />
            <S.Stop offset="1" stopColor="#143329" />
          </S.LinearGradient>
          <S.LinearGradient id="wnBr2" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#fff0bf" />
            <S.Stop offset="0.45" stopColor="#e2b75a" />
            <S.Stop offset="1" stopColor="#8a5a14" />
          </S.LinearGradient>
          <S.LinearGradient id="wnSn2" x1="0" y1={sy - 8} x2="0" y2={sy + 3.6} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="1" stopColor="#c9d8ec" />
          </S.LinearGradient>
          <S.LinearGradient id="wnIc2" x1="0" y1={sy + 3} x2="0" y2={sy + 7} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="1" stopColor="#bfe0f5" stopOpacity="0.6" />
          </S.LinearGradient>
        </S.Defs>
        <S.Path d={rrPath(GX - 1.6, GY - 1.6, GW + 3.2, GH + 3.2, GR + 1.6)} fill="none" stroke="url(#wnBi2)" strokeWidth={3.2} />
        <S.Path d={rrPath(SX + 1.3, SY + 1.3, SW - 2.6, SH - 2.6, k.G.SR - 1.3)} fill="none" stroke="url(#wnBo2)" strokeWidth={2.6} />
        <S.Path d={k.sash} fill="none" stroke="#10291f" strokeWidth={0.9} />
        <S.Path d={k.glass} fill="none" stroke="#10291f" strokeWidth={0.9} />
        <S.Path d={k.mit} stroke="#10291f" strokeOpacity={0.8} strokeWidth={0.8} />
        <S.Path d={k.mit} stroke="#9fd0bb" strokeOpacity={0.35} strokeWidth={0.6} transform="translate(0.7 0)" />
        <S.Path d={k.stubs} fill="#000000" fillOpacity={0.35} transform="translate(0.4 1.2)" />
        <S.Path d={k.stubs} fill="url(#wnS2)" stroke="#10291f" strokeWidth={0.8} />
        <S.Path d={k.stubHi} fill="none" stroke="#8fd0b5" strokeOpacity={0.7} strokeWidth={0.8} />
        <S.Rect x={lx - 3.6} y={ly - 7} width={7.2} height={14} rx={2.4} fill="#000000" fillOpacity={0.35} transform="translate(0.5 1)" />
        <S.Rect x={lx - 3.6} y={ly - 7} width={7.2} height={14} rx={2.4} fill="url(#wnBr2)" stroke="#6e4c12" strokeWidth={0.7} />
        <S.Path d={dotD(lx, ly - 3.6, 0.7) + dotD(lx, ly + 3.6, 0.7)} fill="#6e4c12" />
        <S.Path d={`M${lx} ${ly}L${lx - 5.5} ${ly - 1.6}`} stroke="#6e4c12" strokeWidth={2.6} strokeLinecap="round" />
        <S.Path d={`M${lx} ${ly}L${lx - 5.5} ${ly - 1.6}`} stroke="url(#wnBr2)" strokeWidth={1.6} strokeLinecap="round" />
        <S.Circle cx={lx} cy={ly} r={2.3} fill="url(#wnBr2)" stroke="#6e4c12" strokeWidth={0.6} />
        <S.Circle cx={lx - 0.7} cy={ly - 0.7} r={0.7} fill="#fff8e0" />
        <S.Path d={`M${lx - 2.4} ${ly - 5.6}V${ly + 5}`} stroke="#fff1c2" strokeOpacity={0.8} strokeWidth={0.7} strokeLinecap="round" />
        <S.Rect x={-23} y={sy} width={w + 46} height={4.6} rx={1.8} fill="url(#wnS2)" stroke="#10291f" strokeWidth={0.8} />
        <S.Path d={`M-22 ${r2(sy + 0.9)}H${w + 22}`} stroke="#9fd0bb" strokeOpacity={0.5} strokeWidth={0.7} />
        <S.Path d={k.icicles} fill="url(#wnIc2)" stroke="#a9c6dd" strokeOpacity={0.6} strokeWidth={0.4} />
        <S.Path d={k.snow} fill="#000000" fillOpacity={LT ? 0.08 : 0.2} transform="translate(0 1)" />
        <S.Path d={k.snow} fill="url(#wnSn2)" stroke={LT ? '#a9bad0' : '#dde7f4'} strokeOpacity={LT ? 0.9 : 0.5} strokeWidth={0.6} />
        <S.Path
          d={`M-19 ${r2(sy - 4.4)}C-15 ${r2(sy - 6.8)} -11 ${r2(sy - 6)} -8 ${r2(sy - 3.8)}M${w + 19} ${r2(sy - 4.4)}C${w + 15} ${r2(sy - 6.8)} ${w + 11} ${r2(sy - 6)} ${w + 8} ${r2(sy - 3.8)}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={0.9}
          strokeLinecap="round"
        />
      </Layer>
    </>
  )
}

/* ---------- Candlelight: brass sconces down both sides; a candle per streak night (earned at 14) ---------- */

function candlesLayout(f, streak) {
  const { w, h, R } = f
  const { sv, sh, arc, E, off } = edgeKit(f)
  const RO = 6
  const n = 7
  const top = R + 24
  const bot = h - 12
  const step = (bot - top) / (n - 1)
  const cx = -15
  const CW = 6.4
  const rr = seeded(19)
  let arms = ''
  let plates = ''
  let plateIn = ''
  let plateHi = ''
  let crystals = ''
  let crystalHi = ''
  let bowls = ''
  let rims = ''
  let rimHi = ''
  let shadows = ''
  const candles = []
  let dripsLit = ''
  let dripsOff = ''
  let wicks = ''
  let smoke = ''
  const flames = []
  for (let j = 0; j < 14; j++) {
    const side = j % 2
    const kk = Math.floor(j / 2)
    const y = bot - kk * step
    const lit = j < streak
    const hc = 12.5 + rr() * 8.5
    const m = (x) => r2(side ? w - x : x)
    const tt = y - hc
    const bx = cx - CW / 2
    const X0 = side ? w - bx - CW : bx
    arms += `M${m(-RO - 1.5)} ${r2(y + 8)}C${m(-RO - 4.5)} ${r2(y + 12)} ${m(cx + 0.5)} ${r2(y + 10.5)} ${m(cx)} ${r2(y + 2.6)}`
    plates += `M${m(-RO)} ${r2(y + 3.8)}a2.8 4.2 0 1 0 0.01 0Z`
    plateIn += `M${m(-RO)} ${r2(y + 6.1)}a1.1 1.9 0 1 0 0.01 0Z`
    plateHi += `M${m(-RO - 1.6)} ${r2(y + 5.6)}Q${m(-RO - 0.4)} ${r2(y + 4.4)} ${m(-RO + 0.8)} ${r2(y + 5.2)}`
    const qx = cx - 5.2
    const q0 = y + 1.9
    crystals += `M${m(qx)} ${r2(q0 + 1.2)}C${m(qx - 1.5)} ${r2(q0 + 3)} ${m(qx - 1.4)} ${r2(q0 + 5.4)} ${m(qx)} ${r2(q0 + 6.4)}C${m(qx + 1.4)} ${r2(q0 + 5.4)} ${m(qx + 1.5)} ${r2(q0 + 3)} ${m(qx)} ${r2(q0 + 1.2)}Z`
    crystalHi += `M${m(qx - 0.5)} ${r2(q0 + 2.6)}L${m(qx - 0.6)} ${r2(q0 + 4.4)}`
    bowls += `M${m(cx - 3.4)} ${r2(y + 1.4)}Q${m(cx)} ${r2(y + 5.4)} ${m(cx + 3.4)} ${r2(y + 1.4)}Z`
    rims += `M${m(cx - 6.2)} ${r2(y + 1.1)}a6.2 1.9 0 1 0 ${side ? -12.4 : 12.4} 0a6.2 1.9 0 1 0 ${side ? 12.4 : -12.4} 0Z`
    rimHi += `M${m(cx - 5)} ${r2(y + 0.6)}Q${m(cx - 1)} ${r2(y - 0.4)} ${m(cx + 2.4)} ${r2(y + 0.1)}`
    shadows += `M${r2(X0 + 0.9)} ${r2(tt + 1.2)}h${CW}v${r2(hc)}h${-CW}Z`
    candles.push({ x: r2(X0), y: r2(tt), h: r2(hc + 0.8), lit, side, top: r2(tt + 0.45), cx: m(cx) })
    const nd = Math.floor(rr() * 3.4)
    for (let q = 0; q < nd; q++) {
      const dx = bx + 0.6 + rr() * (CW - 1.6)
      const dl = 1.8 + rr() * 4.6
      const X = side ? w - dx : dx
      const d = `M${r2(X - 0.7)} ${r2(tt + 0.4)}V${r2(tt + dl)}A.75 .75 0 0 0 ${r2(X + 0.8)} ${r2(tt + dl)}V${r2(tt + 0.4)}Z`
      if (lit) dripsLit += d
      else dripsOff += d
    }
    wicks += `M${m(cx)} ${r2(tt + 0.3)}Q${m(cx + 0.15)} ${r2(tt - 1.4)} ${m(cx + (lit ? 0.25 : 1))} ${r2(tt - (lit ? 2.6 : 2.2))}`
    if (lit) flames.push({ x: side ? w - cx : cx, y: tt - 1.3, j, side, wy: y - 2, ph: (j * 0.29) % 1.9, dur: 1.6 + (j % 5) * 0.18 })
    else {
      const sx0 = side ? w - cx - 1 : cx + 1
      const s0 = tt - 2.4
      smoke += `M${r2(sx0)} ${r2(s0)}C${r2(sx0 + 2)} ${r2(s0 - 2.5)} ${r2(sx0 - 2)} ${r2(s0 - 5)} ${r2(sx0 + 0.5)} ${r2(s0 - 7.5)}C${r2(sx0 + 2.2)} ${r2(s0 - 9.2)} ${r2(sx0)} ${r2(s0 - 10.8)} ${r2(sx0 + 1.2)} ${r2(s0 - 12)}`
    }
  }
  const qx = w / 2
  const qy = h + RO
  const scroll = (s) =>
    `M${qx + s * 13} ${qy + 2}C${qx + s * 20} ${qy + 6} ${qx + s * 30} ${qy + 5} ${qx + s * 33} ${qy - 0.5}C${qx + s * 35} ${qy - 4.5} ${qx + s * 30.5} ${qy - 6.5} ${qx + s * 28.5} ${qy - 3.6}C${qx + s * 27.4} ${qy - 1.8} ${qx + s * 29.4} ${qy - 0.4} ${qx + s * 30.6} ${qy - 1.8}M${qx + s * 13} ${qy - 2}C${qx + s * 18} ${qy - 6} ${qx + s * 22} ${qy - 6.4} ${qx + s * 24} ${qy - 4.6}`
  const bosses = [sv + arc / 2, sv + arc * 1.5 + sh].map((d) => off(E(d), RO))
  return { RO, arms, plates, plateIn, plateHi, crystals, crystalHi, bowls, rims, rimHi, shadows, candles, dripsLit, dripsOff, wicks, smoke, flames, scrolls: scroll(-1) + scroll(1), qx, qy, bosses }
}

const FLAME_OUT = (x, y) =>
  `M${r2(x)} ${r2(y + 0.7)}C${r2(x - 3.2)} ${r2(y - 0.7)} ${r2(x - 2.7)} ${r2(y - 6)} ${r2(x + 0.25)} ${r2(y - 11.2)}C${r2(x + 2.7)} ${r2(y - 6)} ${r2(x + 3.2)} ${r2(y - 0.7)} ${r2(x)} ${r2(y + 0.7)}Z`
const FLAME_IN = (x, y) =>
  `M${r2(x)} ${r2(y + 0.2)}C${r2(x - 1.6)} ${r2(y - 0.7)} ${r2(x - 1.3)} ${r2(y - 3.8)} ${r2(x + 0.1)} ${r2(y - 6.6)}C${r2(x + 1.3)} ${r2(y - 3.8)} ${r2(x + 1.6)} ${r2(y - 0.7)} ${r2(x)} ${r2(y + 0.2)}Z`

function flickerAt(time, it) {
  'worklet'
  const a = (2 * Math.PI * (time + it.ph)) / it.dur
  return { x: it.x, y: it.y, o: 1, s: 1 + 0.04 * Math.sin(a) + 0.02 * Math.sin(a * 2.7), r: 0.04 * Math.sin(a * 1.3) }
}

function glowAt(time, it) {
  'worklet'
  const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * (time + it.ph)) / 2.6)
  return { x: it.x, y: it.y, o: 0.75 + 0.25 * k }
}

function Flame({ S, x, y, fl, LT }) {
  return (
    <>
      <S.Path d={FLAME_OUT(x, y)} fill={fl} stroke={LT ? '#e07a1a' : 'none'} strokeOpacity={0.5} strokeWidth={0.4} />
      <S.Path d={FLAME_IN(x, y)} fill="#fffbe8" />
      <S.Ellipse cx={r2(x)} cy={r2(y - 0.2)} rx={1.1} ry={0.8} fill="#6aa8ff" opacity={0.75} />
    </>
  )
}

function FlameGrad({ S, id }) {
  return (
    <S.LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
      <S.Stop offset="0" stopColor="#ff8a2a" />
      <S.Stop offset="0.35" stopColor="#ffb43c" />
      <S.Stop offset="0.75" stopColor="#ffe07a" />
      <S.Stop offset="1" stopColor="#fff2c0" />
    </S.LinearGradient>
  )
}

function GlowGrad({ S, id, LT }) {
  return (
    <S.RadialGradient id={id}>
      <S.Stop offset="0" stopColor={LT ? '#ff9426' : '#ffcf6a'} stopOpacity={LT ? 0.85 : 0.72} />
      <S.Stop offset="0.45" stopColor={LT ? '#ff8a1a' : '#ffb84a'} stopOpacity={LT ? 0.38 : 0.26} />
      <S.Stop offset="1" stopColor="#ffb84a" stopOpacity="0" />
    </S.RadialGradient>
  )
}

export function CandlesOver({ f }) {
  const S = svgAll()
  const streak = f.still ? 14 : Math.max(0, Math.min(14, f.p.streak || 0))
  const full = streak >= 14
  const k = useMemo(() => candlesLayout(f, streak), [f.w, f.h, f.R, streak]) // eslint-disable-line react-hooks/exhaustive-deps
  const LT = f.c.light
  const live = f.active
  const { w, h } = f
  const rail = ring(f, k.RO)
  const GR = full ? 18 : 15
  const qx = k.qx
  const qy = k.qy
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="cnB" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#fff0bf" />
            <S.Stop offset="0.45" stopColor="#d9a94a" />
            <S.Stop offset="1" stopColor="#8a5a14" />
          </S.LinearGradient>
          <S.LinearGradient id="cnRl" x1="-8" y1="-8" x2={w + 8} y2={h + 8} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#f6d98e" />
            <S.Stop offset="0.5" stopColor="#d4a248" />
            <S.Stop offset="1" stopColor="#a87628" />
          </S.LinearGradient>
          <S.LinearGradient id="cnPl" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#8a5a14" />
            <S.Stop offset="1" stopColor="#c9973a" />
          </S.LinearGradient>
          {[0, 1].map((s) => (
            <S.LinearGradient key={`w${s}`} id={`cnW${s}`} x1={s ? '1' : '0'} y1="0" x2={s ? '0' : '1'} y2="0">
              <S.Stop offset="0" stopColor="#fffaf0" />
              <S.Stop offset="0.55" stopColor="#f1e5c8" />
              <S.Stop offset="1" stopColor="#cdb88e" />
            </S.LinearGradient>
          ))}
          {[0, 1].map((s) => (
            <S.LinearGradient key={`u${s}`} id={`cnU${s}`} x1={s ? '1' : '0'} y1="0" x2={s ? '0' : '1'} y2="0">
              <S.Stop offset="0" stopColor={LT ? '#f4eedf' : '#d9d0bd'} />
              <S.Stop offset="0.55" stopColor={LT ? '#ddd3bc' : '#b3a78f'} />
              <S.Stop offset="1" stopColor={LT ? '#b5a688' : '#7e7360'} />
            </S.LinearGradient>
          ))}
          <S.LinearGradient id="cnCr" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <S.Stop offset="0.5" stopColor="#cfe3f5" stopOpacity="0.8" />
            <S.Stop offset="1" stopColor="#8fb0cf" stopOpacity="0.85" />
          </S.LinearGradient>
          <S.RadialGradient id="cnWg">
            <S.Stop offset="0" stopColor="#ffd57a" stopOpacity="0.85" />
            <S.Stop offset="1" stopColor="#ffd57a" stopOpacity="0" />
          </S.RadialGradient>
          <GlowGrad S={S} id="cnGl" LT={LT} />
          <FlameGrad S={S} id="cnFl" />
          <S.RadialGradient id="cnAm" cx="0.35" cy="0.35" r="0.7">
            <S.Stop offset="0" stopColor={full ? '#fff3c0' : '#e8b56a'} />
            <S.Stop offset="1" stopColor={full ? '#ff9a2a' : '#8a4a14'} />
          </S.RadialGradient>
        </S.Defs>
        {full ? <S.Path d={ring(f, 3)} fill="none" stroke={LT ? '#ff9426' : '#ffcf6a'} strokeOpacity={LT ? 0.22 : 0.12} strokeWidth={4} /> : null}
        {k.flames.map((fl) => (
          <S.Ellipse key={`sp${fl.j}`} cx={fl.side ? w : 0} cy={r2(fl.y - 3)} rx={16} ry={30} fill="url(#cnGl)" opacity={0.7} />
        ))}
        {live ? null : k.flames.map((fl) => <S.Circle key={`g${fl.j}`} cx={r2(fl.x)} cy={r2(fl.y - 4.5)} r={GR} fill="url(#cnGl)" />)}
        <S.Path d={rail} fill="none" stroke="#000000" strokeOpacity={LT ? 0.18 : 0.4} strokeWidth={5} transform="translate(0.4 1.6)" />
        <S.Path d={rail} fill="none" stroke="#5e3f0e" strokeWidth={5.4} />
        <S.Path d={rail} fill="none" stroke="url(#cnRl)" strokeWidth={4.2} />
        <S.Path d={rail} fill="none" stroke="#8a5a14" strokeOpacity={0.7} strokeWidth={4.2} strokeDasharray="1.5 2.7" />
        <S.Path d={rail} fill="none" stroke="#fff3c8" strokeOpacity={0.85} strokeWidth={1.1} strokeDasharray="2.4 1.8" transform="translate(-0.55 -0.55)" />
        {k.flames.map((fl) => (
          <S.Ellipse key={`wa${fl.j}`} cx={fl.side ? w + k.RO : -k.RO} cy={r2(fl.wy)} rx={9} ry={26} fill="url(#cnGl)" opacity={LT ? 0.8 : 0.75} />
        ))}
        <S.Path d={k.arms} fill="none" stroke="#000000" strokeOpacity={LT ? 0.14 : 0.32} strokeWidth={2.6} transform="translate(0.3 1.2)" />
        <S.Path d={k.arms} fill="none" stroke="#5e3f0e" strokeWidth={2.7} strokeLinecap="round" />
        <S.Path d={k.arms} fill="none" stroke="url(#cnRl)" strokeWidth={1.7} strokeLinecap="round" />
        <S.Path d={k.plates} fill="url(#cnRl)" stroke="#5e3f0e" strokeWidth={0.55} />
        <S.Path d={k.plateIn} fill="#8a5a14" opacity={0.6} />
        <S.Path d={k.plateHi} fill="none" stroke="#fff6d6" strokeWidth={0.6} strokeLinecap="round" />
        {k.bosses.map((q, i) => (
          <S.G key={`b${i}`}>
            <S.Circle cx={r2(q[0])} cy={r2(q[1])} r={3.1} fill="url(#cnB)" stroke="#5e3f0e" strokeWidth={0.6} />
            <S.Circle cx={r2(q[0] - 0.9)} cy={r2(q[1] - 0.9)} r={0.8} fill="#fff6d6" />
          </S.G>
        ))}
        <S.Path d={k.scrolls} fill="none" stroke="#5e3f0e" strokeWidth={3.2} strokeLinecap="round" />
        <S.Path d={k.scrolls} fill="none" stroke="url(#cnRl)" strokeWidth={2} strokeLinecap="round" />
        <S.Ellipse cx={qx + 0.5} cy={qy + 1.6} rx={15} ry={7.6} fill="#000000" fillOpacity={LT ? 0.15 : 0.35} />
        <S.Ellipse cx={qx} cy={qy} rx={15} ry={7.4} fill="url(#cnB)" stroke="#5e3f0e" strokeWidth={0.8} />
        <S.Ellipse cx={qx} cy={qy} rx={11.6} ry={4.9} fill="url(#cnPl)" stroke="#5e3f0e" strokeWidth={0.5} />
        <S.Path d={`M${qx - 13} ${qy - 2.6}Q${qx - 6} ${qy - 7.2} ${qx + 5} ${qy - 6.6}`} fill="none" stroke="#fff6d6" strokeWidth={0.8} strokeLinecap="round" />
        <S.Path d={[-8, -5.2, 5.2, 8].map((dx) => dotD(qx + dx, qy, 0.9)).join('')} fill="#e2b75a" stroke="#5e3f0e" strokeWidth={0.3} />
        {full ? <S.Circle cx={qx} cy={qy} r={11} fill="url(#cnGl)" /> : null}
        <S.Circle cx={qx} cy={qy} r={3.3} fill="url(#cnAm)" stroke="#5e3f0e" strokeWidth={0.55} />
        <S.Circle cx={qx - 1} cy={qy - 1} r={0.8} fill="#ffffff" />
        <S.Path d={k.shadows} fill="#000000" fillOpacity={LT ? 0.14 : 0.3} />
        <S.Path d={k.crystals} fill="url(#cnCr)" stroke={LT ? '#7f94a8' : '#b9cadb'} strokeWidth={0.4} />
        <S.Path d={k.crystalHi} fill="none" stroke="#ffffff" strokeWidth={0.5} strokeLinecap="round" />
        <S.Path d={k.bowls} fill="url(#cnRl)" stroke="#5e3f0e" strokeWidth={0.45} />
        <S.Path d={k.rims} fill="url(#cnRl)" stroke="#5e3f0e" strokeWidth={0.5} />
        <S.Path d={k.rimHi} fill="none" stroke="#fff1c2" strokeWidth={0.6} strokeLinecap="round" />
        {k.candles.map((c, i) => (
          <S.Rect key={`c${i}`} x={c.x} y={c.y} width={6.4} height={c.h} rx={1.3} fill={`url(#cn${c.lit ? 'W' : 'U'}${c.side})`} stroke={c.lit ? '#b9a37a' : '#8f826a'} strokeWidth={0.4} />
        ))}
        {k.dripsLit ? <S.Path d={k.dripsLit} fill="#fff8e8" /> : null}
        {k.dripsOff ? <S.Path d={k.dripsOff} fill={LT ? '#ece4d2' : '#c9bfa9'} /> : null}
        {k.candles.map((c, i) =>
          c.lit ? <S.Ellipse key={`wg${i}`} cx={c.cx} cy={r2(c.top + 1.55)} rx={2.6} ry={3.4} fill="url(#cnWg)" /> : null,
        )}
        {k.candles.map((c, i) => (
          <S.Ellipse key={`t${i}`} cx={c.cx} cy={c.top} rx={3.1} ry={0.9} fill={c.lit ? '#ffe9b8' : '#d9cfba'} stroke={c.lit ? '#c9b48a' : '#9a8e76'} strokeWidth={0.35} />
        ))}
        <S.Path d={k.wicks} fill="none" stroke="#2e2219" strokeWidth={0.8} strokeLinecap="round" />
        {k.smoke ? <S.Path d={k.smoke} fill="none" stroke={LT ? '#8d939c' : '#aab1bc'} strokeOpacity={0.5} strokeWidth={0.7} strokeLinecap="round" /> : null}
        {live ? null : k.flames.map((fl) => <Flame key={`f${fl.j}`} S={S} x={fl.x} y={fl.y} fl="url(#cnFl)" LT={LT} />)}
      </Layer>
      {live
        ? k.flames.map((fl) => (
            <Particle key={`lg${fl.j}`} clock={f.clock} item={{ x: fl.x, y: fl.y - 4.5, ph: fl.ph }} fn={glowAt} w={w} h={h} size={GR * 2 + 2}>
              <S.Svg width={GR * 2 + 2} height={GR * 2 + 2} viewBox={`${-GR - 1} ${-GR - 1} ${GR * 2 + 2} ${GR * 2 + 2}`}>
                <S.Defs>
                  <GlowGrad S={S} id="cnGl2" LT={LT} />
                </S.Defs>
                <S.Circle r={GR} fill="url(#cnGl2)" />
              </S.Svg>
            </Particle>
          ))
        : null}
      {live
        ? k.flames.map((fl) => (
            <Particle key={`lf${fl.j}`} clock={f.clock} item={{ x: fl.x, y: r2(fl.y - 5.7), ph: fl.ph, dur: fl.dur }} fn={flickerAt} w={w} h={h} size={14}>
              <S.Svg width={14} height={14} viewBox="-7 -2 14 14">
                <S.Defs>
                  <FlameGrad S={S} id="cnFl2" />
                </S.Defs>
                <Flame S={S} x={0} y={10.7} fl="url(#cnFl2)" LT={LT} />
              </S.Svg>
            </Particle>
          ))
        : null}
    </>
  )
}

export const FRAME_ART_2026_12_04 = {
  knit: { over: KnitOver, animated: false },
  window: { over: WindowOver, animated: true },
  candles: { over: CandlesOver, animated: true },
}
