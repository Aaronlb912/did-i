// Frames from the 2027-01-15 drop (docs/ideas/frames-drop-2027-01-15.html):
// Origami (coin, still), Aquarium (gem, living: a fish for each question,
// they dart toward the swipe and blow a bubble heart when tonight is done)
// and Bookshelf (earned at a 21-night streak: a book for each night of the
// streak, a plant that grows with it, and a lamp that comes on at 21).
// Same contract as art.jsx: each draws in card space and may reach PAD past
// the card; still tiles draw no particles and no moving views.
import { useMemo } from 'react'
import { View } from 'react-native'
import { rrPath } from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll } from './runtime.jsx'

const r2 = (n) => Math.round(n * 100) / 100
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

// The sketch's small random, so layouts match the approved drawings.
function lcg(seed) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

const hexRgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
function mix(a, b, t) {
  const k = Math.max(0, Math.min(1, t))
  const A = hexRgb(a)
  const B = hexRgb(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('')
}

/* ---------- A rounded box with its own reach per side ---------- */
// Pieces clockwise from the bottom of the left edge: 0 left edge up, 1 top-left arc,
// 2 top, 3 top-right arc, 4 right edge down, 5 bottom-right arc, 6 bottom, 7 bottom-left arc.
// boxAt(B, u) takes u in 0..8 (piece + fraction), so the same u lines up on boxes of different reach.
function box(f, l, t, r, b, rad) {
  return { x: -l, y: -t, W: f.w + l + r, H: f.h + t + b, r: rad }
}
const boxD = (B) => rrPath(r2(B.x), r2(B.y), r2(B.W), r2(B.H), r2(B.r))
function boxLens(B) {
  const sv = B.H - 2 * B.r
  const sh = B.W - 2 * B.r
  const a = (Math.PI * B.r) / 2
  return [sv, a, sh, a, sv, a, sh, a]
}
function boxAt(B, uu) {
  const u = ((uu % 8) + 8) % 8
  let k = Math.floor(u)
  let t = u - k
  if (k > 7) {
    k = 7
    t = 1
  }
  const { x, y, W, H, r } = B
  const q = Math.PI / 2
  const P = (px, py, nx, ny) => ({ x: px, y: py, nx, ny })
  const A = (cx, cy, th) => P(cx + r * Math.cos(th), cy + r * Math.sin(th), Math.cos(th), Math.sin(th))
  switch (k) {
    case 0:
      return P(x, y + H - r - t * (H - 2 * r), -1, 0)
    case 1:
      return A(x + r, y + r, Math.PI + t * q)
    case 2:
      return P(x + r + t * (W - 2 * r), y, 0, -1)
    case 3:
      return A(x + W - r, y + r, -q + t * q)
    case 4:
      return P(x + W, y + r + t * (H - 2 * r), 1, 0)
    case 5:
      return A(x + W - r, y + H - r, t * q)
    case 6:
      return P(x + W - r - t * (W - 2 * r), y + H, 0, 1)
    default:
      return A(x + r, y + H - r, q + t * q)
  }
}
const lerpBox = (A, B, s) => ({ x: A.x + (B.x - A.x) * s, y: A.y + (B.y - A.y) * s, W: A.W + (B.W - A.W) * s, H: A.H + (B.H - A.H) * s, r: A.r + (B.r - A.r) * s })
const pt = (p) => `${r2(p.x)} ${r2(p.y)}`

/* ---------- Origami: pleated indigo paper with three cranes (coin, still) ---------- */

const CRANE_PAL = {
  red: ['#ff9a83', '#e0503f', '#9e2d26'],
  gold: ['#ffe9a8', '#e6b445', '#9c6e18'],
  white: ['#ffffff', '#e4ddcd', '#aaa18e'],
}
const OG_LITE = '#8597e8'
const OG_MID = '#4256a6'
const OG_DEEP = '#1c2662'

function Crane({ S, x, y, s, flip, pal, sh }) {
  const [a, b, d] = CRANE_PAL[pal]
  return (
    <S.G transform={`translate(${r2(x)} ${r2(y)}) scale(${flip ? -s : s} ${s})`}>
      {sh > 0 ? <S.Ellipse cx={1} cy={7.4} rx={12} ry={2} fill="#000000" fillOpacity={sh} /> : null}
      <S.Path d="M-3.5 0L-8.4 -13.6L2.5 0Z" fill={d} />
      <S.Path d="M-6.5 .8L-12.5 -10L-3.4 -.2ZM6.5 .8L12 -10.5L3.4 -.2Z" fill={a} />
      <S.Path d="M-6.5 .8L-12.5 -10L-4.6 2ZM6.5 .8L12 -10.5L4.6 2Z" fill={b} />
      <S.Path d="M12 -10.5L15.2 -8.1L11 -8.6ZM0 -.2L7 .2L0 6.4Z" fill={d} />
      <S.Path d="M-7 .2L0 -.2L0 6.4Z" fill={b} />
      <S.Path d="M-6 .2L-1.4 -17.2L1.2 .2Z" fill={a} />
      <S.Path d="M1.2 .2L-1.4 -17.2L6.2 .2Z" fill={b} />
      <S.Path d="M1.2 .2L-1.4 -17.2M-6.5 .8L-12.5 -10M6.5 .8L12 -10.5" fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.45} />
      <S.Path d="M-7 .2L0 6.4L7 .2M-6 .2L-1.4 -17.2L6.2 .2" fill="none" stroke={d} strokeWidth={0.5} strokeLinejoin="round" />
    </S.G>
  )
}

function origamiLayout(f) {
  const I = box(f, 2.4, 2.4, 2.4, 2.4, f.R + 2.4)
  const O = box(f, 14, 7.5, 14, 15, f.R + 11)
  const M = lerpBox(I, O, 0.5)
  const In = lerpBox(I, O, 0.84)
  // Stations: whole pleats per piece, so corners always land on a crease. Even count so the notches pair up.
  const tile = f.still && f.w <= 220
  const cnt = boxLens(M).map((l) => Math.max(1, Math.round(l / (tile ? 17 : 12))))
  if (cnt.reduce((a, b) => a + b, 0) % 2) cnt[6]++
  const st = []
  cnt.forEach((n, k) => {
    for (let j = 0; j < n; j++) st.push(k + j / n)
  })
  const n = st.length
  const U = (i) => st[((i % n) + n) % n] + 8 * Math.floor(i / n)
  // Accordion: mountain folds (even) reach the outer edge, valley folds (odd) stop short.
  const V = (i) => (i % 2 ? U(i) + 0.16 * (U(i + 1) - U(i)) : U(i))
  const A = []
  const Ot = []
  for (let i = 0; i <= n; i++) {
    A.push(boxAt(I, V(i)))
    Ot.push(boxAt(i % 2 ? In : O, V(i)))
  }
  // Panels share a handful of shades (by which way they face the light), one path per shade.
  const shades = new Map()
  let hi = ''
  let lo = ''
  let fleck = ''
  for (let i = 0; i < n; i++) {
    const a0 = A[i]
    const a1 = A[i + 1]
    const o0 = Ot[i]
    const o1 = Ot[i + 1]
    const nm = boxAt(M, (U(i) + U(i + 1)) / 2)
    const lit = Math.round((0.5 + 0.5 * (nm.nx * -0.6 + nm.ny * -0.8)) * 6) / 6
    const col = i % 2 ? mix(OG_DEEP, OG_MID, 0.05 + 0.6 * lit) : mix(OG_MID, OG_LITE, 0.25 + 0.75 * lit)
    shades.set(col, (shades.get(col) || '') + `M${pt(a0)}L${pt(a1)}L${pt(o1)}L${pt(o0)}Z`)
    if (i % 2 === 0) hi += `M${pt(a0)}L${pt(o0)}`
    else lo += `M${pt(a0)}L${pt(o0)}`
    if (i % 6 === 2) fleck += `M${r2((a0.x + a1.x + o0.x + o1.x) / 4)} ${r2((a0.y + a1.y + o0.y + o1.y) / 4)}h.01`
  }
  const edge = 'M' + Ot.map(pt).join('L') + 'Z'
  const base = edge + ' M' + A.slice().reverse().map(pt).join('L') + 'Z'
  return { O: boxD(O), panels: [...shades.entries()], hi, lo, fleck, edge, base }
}

export function OrigamiOver({ f }) {
  const S = svgAll()
  const lay = useMemo(() => origamiLayout(f), [f.w, f.h, f.R, f.still]) // eslint-disable-line react-hooks/exhaustive-deps
  const L = f.c.light
  const sh = L ? 0.16 : 0.35
  return (
    <Layer f={f}>
      <S.Defs>
        <S.ClipPath id="ogEc">
          <S.Path d={lay.O} />
        </S.ClipPath>
        <S.LinearGradient id="ogEg" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#fffaf0" />
          <S.Stop offset="1" stopColor="#d9ccb0" />
        </S.LinearGradient>
      </S.Defs>
      <S.Path d={lay.O} fill="none" stroke="#000000" strokeOpacity={L ? 0.1 : 0.32} strokeWidth={4} transform="translate(.6 1.8)" />
      <S.Path d={`${ring(f, 3)} ${ring(f, 0.3)}`} fillRule="evenodd" fill="#f4ecdb" />
      <S.Path d={ring(f, 2.9)} fill="none" stroke="#b9ab8e" strokeWidth={0.6} />
      <S.Path d={ring(f, 0.9)} fill="none" stroke="#fffaf0" strokeWidth={0.7} />
      <S.Path d={lay.base} fillRule="evenodd" fill={OG_MID} />
      {lay.panels.map(([col, d]) => (
        <S.Path key={col} d={d} fill={col} />
      ))}
      <S.Path d={lay.hi} fill="none" stroke="#d9e0ff" strokeOpacity={0.75} strokeWidth={0.7} />
      <S.Path d={lay.lo} fill="none" stroke="#0e1440" strokeOpacity={0.55} strokeWidth={0.7} />
      <S.Path d={lay.fleck} fill="none" stroke="#f3d68a" strokeWidth={1.5} strokeLinecap="round" />
      <S.Path d={lay.edge} fill="none" stroke={OG_DEEP} strokeWidth={0.8} strokeLinejoin="round" />
      {/* Top-left: the paper corner folded back as a dog-ear, cream back and a crisp fold. */}
      <S.G clipPath="url(#ogEc)">
        <S.Path d="M-14 -7.5L16 -7.5L-14 18Z" fill={OG_DEEP} opacity={0.55} />
        <S.Path d="M16 -7.5L-14 18L-3.6 -.4Z" fill="#000000" fillOpacity={0.28} transform="translate(1.4 1.6)" />
        <S.Path d="M16 -7.5L-14 18L-3.6 -.4Z" fill="url(#ogEg)" stroke="#a8987a" strokeWidth={0.5} strokeLinejoin="round" />
        <S.Path d="M16 -7.5L-14 18" stroke="#ffffff" strokeWidth={0.8} />
        <S.Path d="M-3.6 -.4L4 -2.6M-3.6 -.4L-6 7" stroke="#b9ab8e" strokeOpacity={0.7} strokeWidth={0.45} />
      </S.G>
      <Crane S={S} x={-5} y={f.h + 8} s={1.2} flip={false} pal="red" sh={sh} />
      <Crane S={S} x={f.w + 5} y={f.h + 8} s={1.2} flip pal="white" sh={sh} />
      <Crane S={S} x={f.w + 5} y={2.4} s={0.6} flip pal="gold" sh={0} />
    </Layer>
  )
}

/* ---------- Aquarium: a fish tank round the card (gem, living) ---------- */

const SPEC = [
  { b1: '#ffb25e', b2: '#ef5f1c', fin: '#f07a2a', edge: '#5a2408', band: 'white' },
  { b1: '#fff27e', b2: '#ffc014', fin: '#f6ad00', edge: '#7a5600', band: null },
  { b1: '#7aa6ff', b2: '#2552d6', fin: '#ffd23f', edge: '#0d1a4e', band: '#0d1a4e' },
  { b1: '#ffb3d2', b2: '#ee4f8e', fin: '#d63f7c', edge: '#6a1636', band: null },
]
const FISH_TAIL = 'M-8.6 0L-14 -5Q-12.4 0 -14 5Z'
const FISH_FINS = 'M-3.4 -4.1Q.2 -8.4 4 -3.8ZM-2 3.9Q.4 7 2.6 3.8Z'
const FISH_BODY = 'M-9.4 0C-7 -5.6 2.8 -6.2 8.2 -1.1C8.9 -.4 8.9 .4 8.2 1.1C2.8 6.2 -7 5.6 -9.4 0Z'

const tank = (f) => box(f, 18, 7.5, 18, 20, f.R + 12)

/** A lit fish facing right, centred on its body, with its glow. */
function Fish({ S, k, face }) {
  const s = SPEC[k % 4]
  return (
    <>
      <S.Defs>
        <S.LinearGradient id={`aqF${k % 4}`} x1="0" y1="0" x2="0" y2="1">
          <S.Stop offset="0" stopColor={s.b1} />
          <S.Stop offset="1" stopColor={s.b2} />
        </S.LinearGradient>
        <S.RadialGradient id={`aqG${k % 4}`}>
          <S.Stop offset="0" stopColor={s.b1} stopOpacity="0.55" />
          <S.Stop offset="1" stopColor={s.b1} stopOpacity="0" />
        </S.RadialGradient>
      </S.Defs>
      <S.Circle r={15} fill={`url(#aqG${k % 4})`} />
      <S.G transform={`scale(${face} 1)`}>
        <S.Path d={FISH_TAIL} fill={s.fin} stroke={s.edge} strokeWidth={0.45} strokeLinejoin="round" />
        <S.Path d={FISH_FINS} fill={s.fin} stroke={s.edge} strokeWidth={0.4} />
        <S.Path d={FISH_BODY} fill={`url(#aqF${k % 4})`} stroke={s.edge} strokeWidth={0.5} />
        {s.band === 'white' ? (
          <>
            <S.Path d="M-1.4 -4.7Q.3 0 -1.4 4.7M3.6 -3.6Q5 0 3.6 3.6" fill="none" stroke="#ffffff" strokeWidth={1.6} />
            <S.Path d="M-1.4 -4.7Q.3 0 -1.4 4.7" fill="none" stroke={s.edge} strokeOpacity={0.5} strokeWidth={0.4} transform="translate(-1 0)" />
          </>
        ) : s.band ? (
          <S.Path d="M-5 -1.6Q-1 -3.4 4.6 -2.2Q0 -.4 -3.8 1.6Z" fill={s.band} opacity={0.85} />
        ) : null}
        <S.Path d="M-5.6 -2.6Q-1 -4.8 3.6 -3.4" fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.8} strokeLinecap="round" />
        <S.Path d="M.6 .6Q-1.8 2.2 -1 3.3Q1.4 2.6 .6 .6Z" fill={s.fin} opacity={0.85} />
        <S.Circle cx={4.9} cy={-1.1} r={1.55} fill="#ffffff" />
        <S.Circle cx={5.25} cy={-1.05} r={0.85} fill="#14181c" />
        <S.Circle cx={4.85} cy={-1.5} r={0.32} fill="#ffffff" />
      </S.G>
    </>
  )
}

/** The bubble heart blown when tonight is done. */
function Heart({ S }) {
  const dots = []
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2
    const x = 16 * Math.pow(Math.sin(t), 3)
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
    dots.push({ x: r2(x * 0.86), y: r2(y * 0.86 + 1.8), r: i % 4 === 0 ? 2.6 : 2 })
  }
  return (
    <>
      <S.Defs>
        <S.RadialGradient id="aqHg">
          <S.Stop offset="0" stopColor="#ffd6e6" stopOpacity="0.6" />
          <S.Stop offset="1" stopColor="#ffd6e6" stopOpacity="0" />
        </S.RadialGradient>
        <S.RadialGradient id="aqHp" cx="0.35" cy="0.3" r="0.8">
          <S.Stop offset="0" stopColor="#ffffff" />
          <S.Stop offset="0.5" stopColor="#ffc2d8" stopOpacity="0.75" />
          <S.Stop offset="1" stopColor="#ff7fae" stopOpacity="0.9" />
        </S.RadialGradient>
      </S.Defs>
      <S.Circle r={30} fill="url(#aqHg)" />
      {dots.map((d, i) => (
        <S.Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="url(#aqHp)" stroke="#d94f86" strokeWidth={0.6} />
      ))}
    </>
  )
}

function ribbonPath(x0, y0, len, wd, amp, ph) {
  const n = 14
  const Lp = []
  const Rp = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const y = y0 - len * t
    const x = x0 + Math.sin(t * 4.6 + ph) * amp * t
    const ww = (wd * (1 - t * 0.8)) / 2
    Lp.push([x - ww, y])
    Rp.push([x + ww, y])
  }
  const P = (p) => `${r2(p[0])} ${r2(p[1])}`
  return 'M' + Lp.map(P).join('L') + 'Q' + r2(x0 + Math.sin(4.6 + ph) * amp) + ' ' + r2(y0 - len - 3) + ' ' + Rp.reverse().map(P).join('L') + 'Z'
}
function ribbonMid(x0, y0, len, amp, ph) {
  let d = ''
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    d += `${i ? 'L' : 'M'}${r2(x0 + Math.sin(t * 4.6 + ph) * amp * t)} ${r2(y0 - len * t * 0.92)}`
  }
  return d
}

function breatheAt(time) {
  'worklet'
  return { opacity: 0.75 + 0.25 * (0.5 - 0.5 * Math.cos((time * Math.PI * 2) / 6)) }
}

// Plants sway a little round their roots. The moving view is card-sized, so the
// pivot is given relative to its centre.
function swayFor(dx, dy, period, phase) {
  return (time) => {
    'worklet'
    const a = Math.sin(((time + phase) * Math.PI * 2) / period) * 0.035
    return { transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${a}rad` }, { translateX: -dx }, { translateY: -dy }] }
  }
}

export function AquariumUnder({ f }) {
  const S = svgAll()
  const { w, h } = f
  const L = f.c.light
  const T = useMemo(() => boxD(tank(f)), [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  const backs = useMemo(() => [ribbonPath(-4, h + 17, h * 0.62, 7, 3, 1.2), ribbonPath(w + 5, h + 17, h * 0.48, 7, -3, 2.4)], [w, h])
  const deep = L ? '#2f7f72' : '#0a3a34'
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="aqW" x1="0" y1="-8" x2="0" y2={h + 20} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor={L ? '#b4ecf4' : '#3aa9c2'} />
            <S.Stop offset="0.45" stopColor={L ? '#5bbad0' : '#0f4f68'} />
            <S.Stop offset="1" stopColor={L ? '#3a9cb8' : '#0a3346'} />
          </S.LinearGradient>
          <S.ClipPath id="aqUc">
            <S.Path d={T} />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={T} fill="url(#aqW)" />
        <S.G clipPath="url(#aqUc)">
          <S.Path d={backs[0]} fill={deep} opacity={0.5} />
          <S.Path d={backs[1]} fill={deep} opacity={0.45} />
        </S.G>
      </Layer>
      <Moving clock={f.clock} fn={breatheAt} style={FILL}>
        <Layer f={f}>
          <S.Defs>
            <S.RadialGradient id="aqLg" cx="0.5" cy="0" r="1">
              <S.Stop offset="0" stopColor="#fff8e0" stopOpacity="0.9" />
              <S.Stop offset="0.45" stopColor="#d8f8ff" stopOpacity="0.3" />
              <S.Stop offset="1" stopColor="#bff3ff" stopOpacity="0" />
            </S.RadialGradient>
            <S.ClipPath id="aqUc2">
              <S.Path d={T} />
            </S.ClipPath>
          </S.Defs>
          <S.G clipPath="url(#aqUc2)">
            <S.Ellipse cx={w / 2} cy={-6} rx={r2(w * 0.7)} ry={64} fill="url(#aqLg)" />
          </S.G>
        </Layer>
      </Moving>
    </>
  )
}

function aquariumLayout(f) {
  const { w, h } = f
  const sandY = h + 16.4
  const top = []
  for (let x = -22; x <= w + 22; x += 8) {
    const e = Math.min(1, Math.max(0, Math.max(10 - x, x - (w - 10))) / 30)
    top.push(`${x} ${r2(sandY - e * 5 + Math.sin(x * 0.06) * 0.5)}`)
  }
  const sandTop = 'M' + top.join('L')
  const sand = `${sandTop}L${w + 24} ${h + 28}L-24 ${h + 28}Z`
  const rnd = lcg(7)
  let grain = ''
  for (let i = 0; i < 40; i++) grain += `M${r2(-16 + rnd() * (w + 32))} ${r2(sandY + 1.2 + rnd() * 2.6)}h.01`
  const PEB = ['#8d9cae', '#c78a62', '#6f9070', '#ece3d2', '#a8708a']
  const r2nd = lcg(19)
  const peb = []
  for (let i = 0; i < 9; i++) {
    const x = 6 + r2nd() * (w - 12)
    const y = sandY + 1.6 + r2nd() * 1.4
    const rx = 1.3 + r2nd() * 1.1
    peb.push({ x: r2(x), y: r2(y), rx: r2(rx), c: PEB[i % 5] })
  }
  const kelp = [
    [-9.5, h * 0.66, 9, 2.6, 0],
    [-5.5, h * 0.42, 7.6, -2.2, 1.7],
    [-13.6, h * 0.3, 6.4, 2, 3.1],
  ].map(([x, len, wd, amp, ph]) => ({ body: ribbonPath(x, h + 17, len, wd, amp, ph), mid: ribbonMid(x, h + 17, len, amp, ph) }))
  const kelpBody = kelp.map((k) => k.body).join(' ')
  const kelpMid = kelp.map((k) => k.mid).join(' ')
  let stem = ''
  const leaves = []
  const sx = w + 9.5
  const sl = h * 0.38
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const y = h + 12 - sl * t
    const x = sx + Math.sin(t * 4) * 2.2
    stem += `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`
    if (i > 0 && i < 10) {
      const sz = 3.6 - t * 1.4
      leaves.push({ cx: r2(x - sz * 0.9), cy: r2(y), rx: r2(sz), ry: r2(sz * 0.5), tf: `rotate(-24 ${r2(x)} ${r2(y)})`, c: '#8ad66a' })
      leaves.push({ cx: r2(x + sz * 0.9), cy: r2(y - 1.2), rx: r2(sz), ry: r2(sz * 0.5), tf: `rotate(24 ${r2(x)} ${r2(y - 1.2)})`, c: '#6cc052' })
    }
  }
  const swords = [
    [6, 22],
    [20, 24],
    [34, 16],
    [-4, 14],
  ].map(([a, len], i) => ({
    tf: `translate(${w + 6} ${h + 16}) rotate(${a})`,
    d: `M0 0C-3 ${r2(-len * 0.35)} -2.6 ${r2(-len * 0.75)} 0 ${-len}C2.6 ${r2(-len * 0.75)} 3 ${r2(-len * 0.35)} 0 0Z`,
    c: i % 2 ? '#58b04e' : '#7ccd5c',
  }))
  const ray = (x0, x1, x2, x3, y) => `M${r2(x0)} -4.5L${r2(x1)} -4.5L${r2(x2)} ${r2(y)}L${r2(x3)} ${r2(y)}Z`
  const rays = ray(-18, -7, -1, -17, h * 0.82) + ray(-6, -1, 0, -8, h * 0.55) + ray(w + 7, w + 18, w + 17, w + 1, h * 0.76) + ray(w + 1, w + 6, w + 8, w, h * 0.5)
  let surf = 'M-17 -4.4'
  for (let x = -17; x < w + 17; x += 10) surf += `Q${x + 2.5} -5.4 ${x + 5} -4.4T${x + 10} -4.4`
  const r3 = lcg(41)
  const bubbles = []
  for (let i = 0; i < 7; i++) {
    const r = 0.9 + r3() * 1.2
    const t = 4.2 + r3() * 2.2
    const x = -6 + (r3() - 0.5) * 2.4
    const dx = (r3() - 0.5) * 5
    bubbles.push({ x: r2(x), y: r2(sandY - 2), r: r2(r), t: r2(t), dx: r2(dx), dy: -(h + 18), off: r2((i * t) / 7), sy: r2(sandY - 2 - ((i + 0.5) / 7) * (h * 0.7)), sx: r2(x + (dx / 5) * 2) })
  }
  return { T: boxD(tank(f)), sandY, sand, sandTop, grain, peb, kelpBody, kelpMid, stem, leaves, swords, rays, surf, bubbles }
}

// Lit fish hover in their slot and dart toward the swipe.
function fishFor(pull, still) {
  return (time, it) => {
    'worklet'
    const p = still || !pull ? 0 : pull.value
    const dart = Math.sign(p) * Math.min(10, Math.abs(p) * 0.12)
    const q = Math.sin(((time + it.ph) * Math.PI * 2) / it.b)
    return { x: it.x + dart + q * it.bx, y: it.y - Math.abs(q) * 1.4, o: 1 }
  }
}
function bubbleAt(time, it) {
  'worklet'
  const q = (((time + it.off) / it.t) % 1 + 1) % 1
  const o = q < 0.12 ? (q / 0.12) * 0.95 : q > 0.85 ? 0.9 * (1 - (q - 0.85) / 0.15) : 0.92
  return { x: it.x + it.dx * q + Math.sin(time * 4.8 + it.off) * 0.9, y: it.y + it.dy * q, o }
}
// The heart is born at the bottom middle, swims to the right corner and rises up the side.
function heartAt(time, it) {
  'worklet'
  const q = (time % 8) / 8
  const ease = (v) => v * v * (3 - 2 * v)
  let x = it.x
  let y = it.y
  let o = 1
  let s = 1
  if (q < 0.1) {
    o = q / 0.1
    s = 0.4 + 0.6 * (q / 0.1)
  } else if (q < 0.38) {
    x = it.x + it.hx * ease((q - 0.1) / 0.28)
  } else {
    x = it.x + it.hx
    y = it.y + it.hy * ease((q - 0.38) / 0.62)
    if (q > 0.92) o = 1 - (q - 0.92) / 0.08
  }
  return { x, y, o, s }
}
function bowFor(pull, dir) {
  return (time) => {
    'worklet'
    const p = pull ? pull.value : 0
    const on = Math.min(1, Math.max(0, (dir * p) / 60))
    return { opacity: on * (0.6 + 0.4 * Math.sin(time * 5.2)) }
  }
}

export function AquariumOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  const L = f.c.light
  const P = f.p
  const lay = useMemo(() => aquariumLayout(f), [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  const live = !f.still
  const total = Math.max(1, Math.min(8, Number(P.total) || 4))
  const ans = f.still ? total : Math.min(total, Number(P.answered) || 0)
  const done = f.still || (Number(P.total) > 0 && ans >= total)
  const lane = h + 8.6
  const slotX = (i) => r2(16 + ((w - 32) * (i + 0.5)) / total)
  const lineCol = L ? '#0d3a4a' : '#dff6ff'
  const fishFn = useMemo(() => fishFor(done ? null : f.pull, !live), [f.pull, done, live])
  const swayL = useMemo(() => swayFor(-9.5 - w / 2, h + 17 - h / 2, 5.5, 0), [w, h])
  const swayR = useMemo(() => swayFor(w + 8 - w / 2, h + 16 - h / 2, 6.6, 2.4), [w, h])
  const bowL = useMemo(() => bowFor(done ? null : f.pull, -1), [f.pull, done])
  const bowR = useMemo(() => bowFor(done ? null : f.pull, 1), [f.pull, done])
  const fish = []
  for (let i = 0; i < total; i++) {
    const face = done ? (slotX(i) < w / 2 ? 1 : -1) : i % 2 ? -1 : 1
    fish.push({ i, lit: i < ans, face, x: slotX(i), y: lane, b: 2.8 + i * 0.35, bx: i % 2 ? -2 : 2, ph: i * 0.6 })
  }
  const bows = (dir) => {
    const xc = dir > 0 ? w + 7 : -7
    const y = h * 0.45
    const d = []
    for (let k = 0; k < 3; k++) {
      const x0 = xc + dir * (k * 3 - 3)
      d.push({ d: `M${r2(x0)} ${r2(y - 24 - k * 7)}Q${r2(x0 + dir * 6)} ${r2(y)} ${r2(x0)} ${r2(y + 24 + k * 7)}`, o: r2(0.85 - k * 0.22) })
    }
    return (
      <Layer f={f}>
        {d.map((b, k) => (
          <S.Path key={k} d={b.d} fill="none" stroke="#f2fdff" strokeOpacity={b.o} strokeWidth={1.2} strokeLinecap="round" />
        ))}
      </Layer>
    )
  }
  const clipT = (cid) => (
    <S.ClipPath id={cid}>
      <S.Path d={lay.T} />
    </S.ClipPath>
  )
  return (
    <>
      {/* Lamp rays down both side bands, breathing. */}
      <Moving clock={f.clock} fn={breatheAt} style={FILL}>
        <Layer f={f}>
          <S.Defs>
            <S.LinearGradient id="aqRy" x1="0" y1="0" x2="0" y2="1">
              <S.Stop offset="0" stopColor="#fff8e0" stopOpacity={L ? 0.95 : 0.9} />
              <S.Stop offset="1" stopColor="#f2fdff" stopOpacity="0" />
            </S.LinearGradient>
            {clipT('aqC1')}
          </S.Defs>
          <S.G clipPath="url(#aqC1)">
            <S.Path d={lay.rays} fill="url(#aqRy)" />
          </S.G>
        </Layer>
      </Moving>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="aqSd" x1="0" y1={h + 11} x2="0" y2={h + 21} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor={L ? '#f1dfae' : '#e0c68a'} />
            <S.Stop offset="1" stopColor={L ? '#cfa962' : '#9a7a44'} />
          </S.LinearGradient>
          {clipT('aqC2')}
        </S.Defs>
        <S.Path d={lay.T} fill="none" stroke="#000000" strokeOpacity={L ? 0.12 : 0.35} strokeWidth={4} transform="translate(0 2)" />
        <S.G clipPath="url(#aqC2)">
          <S.Path d={lay.sand} fill="url(#aqSd)" />
          <S.Path d={lay.grain} fill="none" stroke="#6e5328" strokeOpacity={0.5} strokeWidth={0.9} strokeLinecap="round" />
          <S.Path d={lay.sandTop} fill="none" stroke="#fff4d6" strokeOpacity={0.6} strokeWidth={0.7} />
          {lay.peb.map((p, i) => (
            <S.Ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={r2(p.rx * 0.6)} fill={p.c} stroke="#000000" strokeOpacity={0.25} strokeWidth={0.35} />
          ))}
        </S.G>
      </Layer>
      <Moving clock={f.clock} fn={swayL} style={FILL}>
        <Layer f={f}>
          <S.Defs>
            <S.LinearGradient id="aqKp" x1="0" y1={h + 14} x2="0" y2={r2(h * 0.3)} gradientUnits="userSpaceOnUse">
              <S.Stop offset="0" stopColor="#2f8a4a" />
              <S.Stop offset="1" stopColor="#7fe08a" />
            </S.LinearGradient>
            {clipT('aqC3')}
          </S.Defs>
          <S.G clipPath="url(#aqC3)">
            <S.Path d={lay.kelpBody} fill="url(#aqKp)" stroke="#1f5e34" strokeWidth={0.5} />
            <S.Path d={lay.kelpMid} fill="none" stroke="#1f6a38" strokeOpacity={0.7} strokeWidth={0.6} />
          </S.G>
        </Layer>
      </Moving>
      <Moving clock={f.clock} fn={swayR} style={FILL}>
        <Layer f={f}>
          <S.Defs>{clipT('aqC4')}</S.Defs>
          <S.G clipPath="url(#aqC4)">
            <S.Path d={lay.stem} fill="none" stroke="#3f7f2e" strokeWidth={1.1} />
            {lay.leaves.map((l, i) => (
              <S.Ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} transform={l.tf} fill={l.c} stroke="#3f7f2e" strokeWidth={0.4} />
            ))}
            {lay.swords.map((s, i) => (
              <S.Path key={i} transform={s.tf} d={s.d} fill={s.c} stroke="#2f6e2c" strokeWidth={0.45} />
            ))}
          </S.G>
        </Layer>
      </Moving>
      <Layer f={f}>
        <S.Defs>
          <S.RadialGradient id="aqBb" cx="0.35" cy="0.3" r="0.8">
            <S.Stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <S.Stop offset="0.45" stopColor="#e6fbff" stopOpacity="0.22" />
            <S.Stop offset="1" stopColor="#e6fbff" stopOpacity="0.55" />
          </S.RadialGradient>
          {clipT('aqC5')}
        </S.Defs>
        <S.G clipPath="url(#aqC5)">
          {/* Fish still waiting for their question: faint outlines. */}
          {fish.map((k) =>
            k.lit ? null : (
              <S.G key={k.i} transform={`translate(${k.x} ${lane}) scale(${k.face} 1)`} opacity={0.32}>
                <S.Path d={`${FISH_TAIL}M-3.4 -4.1Q.2 -8.4 4 -3.8${FISH_BODY}`} fill="none" stroke={lineCol} strokeWidth={1} strokeLinejoin="round" />
                <S.Circle cx={4.9} cy={-1.1} r={1.2} fill="none" stroke={lineCol} strokeWidth={0.8} />
              </S.G>
            ),
          )}
          {live
            ? null
            : fish.map((k) =>
                k.lit ? (
                  <S.G key={k.i} transform={`translate(${k.x} ${lane})`}>
                    <Fish S={S} k={k.i} face={k.face} />
                  </S.G>
                ) : null,
              )}
          <S.Ellipse cx={-6} cy={r2(lay.sandY - 0.6)} rx={3.4} ry={1.6} fill="#9aa7b0" stroke="#5b6870" strokeWidth={0.5} />
          {live
            ? null
            : lay.bubbles.map((b, i) => <S.Circle key={i} cx={b.sx} cy={b.sy} r={b.r} fill="url(#aqBb)" stroke="#eafcff" strokeOpacity={0.9} strokeWidth={0.5} />)}
          {done && !live ? (
            <S.G transform={`translate(${w + 2} ${r2(h * 0.48)})`}>
              <Heart S={S} />
            </S.G>
          ) : null}
          <S.Path d={lay.surf} fill="none" stroke="#effdff" strokeOpacity={0.85} strokeWidth={0.8} />
        </S.G>
      </Layer>
      {live
        ? fish.map((k) =>
            k.lit ? (
              <Particle key={k.i} clock={f.clock} item={k} fn={fishFn} w={w} h={h} size={36}>
                <S.Svg width={36} height={36} viewBox="-18 -18 36 36">
                  <Fish S={S} k={k.i} face={k.face} />
                </S.Svg>
              </Particle>
            ) : null,
          )
        : null}
      {live
        ? lay.bubbles.map((b, i) => (
            <Particle key={`b${i}`} clock={f.clock} item={b} fn={bubbleAt} w={w} h={h} size={b.r * 2 + 1}>
              <View style={{ width: b.r * 2, height: b.r * 2, borderRadius: b.r, borderWidth: 0.5, borderColor: 'rgba(234,252,255,0.9)', backgroundColor: 'rgba(230,251,255,0.3)' }}>
                <View style={{ position: 'absolute', left: b.r * 0.4, top: b.r * 0.3, width: b.r * 0.7, height: b.r * 0.7, borderRadius: b.r, backgroundColor: 'rgba(255,255,255,0.9)' }} />
              </View>
            </Particle>
          ))
        : null}
      {live && done ? (
        <Particle clock={f.clock} item={{ x: w / 2, y: lane - 5, hx: w / 2 + 2, hy: -h * 0.62 }} fn={heartAt} w={w} h={h} size={64}>
          <S.Svg width={64} height={64} viewBox="-32 -32 64 64">
            <Heart S={S} />
          </S.Svg>
        </Particle>
      ) : null}
      {live && !done ? (
        <>
          <Moving clock={f.clock} fn={bowL} style={FILL}>
            {bows(-1)}
          </Moving>
          <Moving clock={f.clock} fn={bowR} style={FILL}>
            {bows(1)}
          </Moving>
        </>
      ) : null}
      {/* Glass rim, reflections and the lid sit over everything. */}
      <Layer f={f}>
        <S.Path d={lay.T} fill="none" stroke={L ? '#3f5864' : '#1a2a33'} strokeWidth={2.2} />
        <S.Path d={boxD(lerpBox(tank(f), box(f, 0, 0, 0, 0, f.R), 0.07))} fill="none" stroke="#c9f4ff" strokeOpacity={0.55} strokeWidth={0.8} />
        <S.Path d={`M-15.2 ${r2(h * 0.12)}V${r2(h * 0.5)}M${w + 15.2} ${r2(h * 0.2)}v34`} fill="none" stroke="#ffffff" strokeOpacity={0.38} strokeWidth={1.3} strokeLinecap="round" />
        <S.Rect x={20} y={-8} width={w - 40} height={2.6} rx={1.3} fill={L ? '#4d5f69' : '#22313a'} />
        <S.Rect x={w / 2 - 46} y={-5.6} width={92} height={1.4} rx={0.7} fill="#fff6d8" />
        <S.Path d={`M24 -7.3H${w - 24}`} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.6} />
      </Layer>
    </>
  )
}

/* ---------- Bookshelf: a book for each night of the streak (earned at 21) ---------- */

const BOOK_C = [
  ['#d0603f', '#8e3324'],
  ['#3a7fa3', '#1c4459'],
  ['#e6b843', '#9c7314'],
  ['#4a8f5c', '#24502f'],
  ['#8a5bae', '#4f2f69'],
  ['#e4dcc6', '#a59c86'],
  ['#2b3d62', '#121c30'],
  ['#c14d68', '#7a2a3c'],
  ['#53a7ab', '#2d6569'],
]
const LEAF_AT = [
  [0, 1],
  [-5, 0.78],
  [5, 0.86],
  [-2.4, 0.94],
  [2.8, 0.66],
  [-6.4, 0.56],
  [6.6, 0.6],
]

// A box with rounded top corners and a square bottom at y = yb.
function arch(x, y, W, yb, r) {
  return `M${r2(x)} ${r2(yb)}V${r2(y + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + r)} ${r2(y)}H${r2(x + W - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + W)} ${r2(y + r)}V${r2(yb)}Z`
}

function booksLayout(f, n, grown) {
  const { w, h, R } = f
  const tile = f.still && f.w <= 220
  const top = h + 11
  const x0 = 6
  const pitch = (w - 36 - x0) / 21
  const rnd = lcg(5)
  const books = []
  for (let i = 0; i < 21; i++) {
    const vol = i % 7 === 6
    const bw = pitch * (vol ? 0.94 : 0.74 + rnd() * 0.16)
    const bh = vol ? 24 : 15 + rnd() * 6
    books.push({ x: r2(x0 + i * pitch + (pitch - bw) / 2), y: r2(top - bh), bw: r2(bw), bh: r2(bh), c: BOOK_C[(i * 4 + (i >> 2)) % 9], vol, band: rnd() })
  }
  let bands = ''
  let labels = ''
  let empty = ''
  let shade = ''
  let caps = ''
  books.forEach((b, i) => {
    if (i >= n) {
      empty += `M${r2(b.x + 0.4)} ${r2(b.y + 0.4)}h${r2(b.bw - 0.8)}v${r2(b.bh - 0.8)}h${r2(0.8 - b.bw)}Z`
      return
    }
    shade += `M${r2(b.x + 1)} ${r2(b.y + 1.2)}h${b.bw}v${r2(b.bh - 1.2)}h${-b.bw}Z`
    caps += `M${r2(b.x + 0.5)} ${r2(b.y + 0.6)}h${r2(b.bw - 1)}`
    if (b.vol || b.band > 0.45) bands += `M${b.x} ${r2(b.y + 2.4)}h${b.bw}v1h${-b.bw}ZM${b.x} ${r2(b.y + b.bh - 3.4)}h${b.bw}v1h${-b.bw}Z`
    if (b.vol || b.band < 0.3) labels += `M${r2(b.x + b.bw * 0.2)} ${r2(b.y + b.bh * 0.38)}h${r2(b.bw * 0.6)}v${r2(b.bh * 0.22)}h${r2(-b.bw * 0.6)}Z`
  })
  // The plant: a snake plant whose leaves get taller, and more of them, as the streak grows.
  const px = -8
  const pb = top - 11
  const leafN = 3 + Math.round(grown * 4)
  const leafH = 10 + grown * (h * (tile ? 0.24 : 0.19))
  const leaves = []
  let veins = ''
  for (let i = 0; i < leafN; i++) {
    const [dx, k] = LEAF_AT[i]
    const hh = leafH * k
    const bx = px + dx * 0.45
    const tx = px + dx * 1.15
    const ty = pb - hh
    const wd = 3.4
    leaves.push(
      `M${r2(bx - wd)} ${r2(pb + 1)}C${r2(bx - wd * 1.1)} ${r2(pb - hh * 0.5)} ${r2(tx - wd * 0.7)} ${r2(ty + hh * 0.22)} ${r2(tx)} ${r2(ty)}C${r2(tx + wd * 0.7)} ${r2(ty + hh * 0.22)} ${r2(bx + wd * 1.1)} ${r2(pb - hh * 0.5)} ${r2(bx + wd)} ${r2(pb + 1)}Z`,
    )
    veins += `M${r2(bx)} ${r2(pb)}Q${r2(bx + (tx - bx) * 0.3)} ${r2(pb - hh * 0.5)} ${r2(tx)} ${r2(ty + 2.5)}`
  }
  const cb = top + 1
  let grain = ''
  for (const x of [-13.5, -11.2, w + 11.2, w + 13.5]) grain += `M${r2(x)} ${R + 6}V${r2(cb - 2)}`
  grain += `M${R + 8} -4.6H${r2(w - R - 8)}`
  return {
    top,
    tile,
    books: books.slice(0, n),
    bands,
    labels,
    empty,
    shade,
    caps,
    leaves: leaves.join(''),
    veins,
    px,
    caseO: arch(-16, -7.5, w + 32, cb, R + 10),
    caseI: arch(-8.5, -1.6, w + 17, cb, R + 4.5),
    caseHi: arch(-15.2, -6.7, w + 30.4, cb, R + 9.2),
    card: rrPath(0, 0, w, h, R),
    grain,
  }
}

export function BooksOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  const L = f.c.light
  // Tiles show the full shelf.
  const streak = f.still ? 21 : Math.max(0, Number(f.p.streak) || 0)
  const n = Math.min(21, streak)
  const grown = Math.min(1, streak / 21)
  const lit = streak >= 21
  const lay = useMemo(() => booksLayout(f, n, grown), [f.w, f.h, f.R, f.still, n, grown]) // eslint-disable-line react-hooks/exhaustive-deps
  const { top, px } = lay
  const sh = L ? 0.18 : 0.45
  // The lamp stands on a stack of books at the right end and leans over the shelf.
  const lx = w - 19
  const ly = top - 13.8
  const ex = w + 7
  const ey = h - 20
  const sx = w + 1
  const sy = h - 40
  const arm = `M${lx} ${r2(ly - 1)}L${ex} ${ey}L${sx + 3} ${sy + 3}`
  const stack = [
    [w - 33, w - 5, '#2b3d62', '#121c30'],
    [w - 31, w - 8, '#d0603f', '#8e3324'],
    [w - 34, w - 9, '#e6b843', '#9c7314'],
  ]
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="bkSp" x1="0" y1="0" x2="1" y2="0">
          <S.Stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <S.Stop offset="0.3" stopColor="#ffffff" stopOpacity="0" />
          <S.Stop offset="0.7" stopColor="#000000" stopOpacity="0" />
          <S.Stop offset="1" stopColor="#000000" stopOpacity="0.38" />
        </S.LinearGradient>
        <S.LinearGradient id="bkCs" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#b07a48" />
          <S.Stop offset="0.5" stopColor="#8a5a32" />
          <S.Stop offset="1" stopColor="#5e3a1c" />
        </S.LinearGradient>
        <S.LinearGradient id="bkBp" x1="0" y1="-2" x2="0" y2={top} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor={L ? '#5a3a20' : '#1c120a'} />
          <S.Stop offset="0.25" stopColor={L ? '#7a5434' : '#2e1e10'} />
          <S.Stop offset="1" stopColor={L ? '#6a4628' : '#24170c'} />
        </S.LinearGradient>
        <S.LinearGradient id="bkSv" x1="0" y1="0" x2="0" y2="1">
          <S.Stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <S.Stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
          <S.Stop offset="1" stopColor="#000000" stopOpacity="0.3" />
        </S.LinearGradient>
        <S.LinearGradient id="bkWd" x1="0" y1={top} x2="0" y2={top + 6} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor="#c48a52" />
          <S.Stop offset="0.5" stopColor="#9a6436" />
          <S.Stop offset="1" stopColor="#6e4222" />
        </S.LinearGradient>
        <S.LinearGradient id="bkSd" x1="0" y1={top + 5} x2="0" y2={top + 9} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor="#000000" stopOpacity={sh} />
          <S.Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </S.LinearGradient>
        <S.LinearGradient id="bkLf" x1="0" y1="1" x2="0" y2="0">
          <S.Stop offset="0" stopColor="#2f7a3e" />
          <S.Stop offset="0.6" stopColor="#5cb85a" />
          <S.Stop offset="1" stopColor="#c9e86a" />
        </S.LinearGradient>
        <S.LinearGradient id="bkPt" x1="0" y1="0" x2="1" y2="0">
          <S.Stop offset="0" stopColor="#e0875a" />
          <S.Stop offset="1" stopColor="#a24d26" />
        </S.LinearGradient>
        <S.LinearGradient id="bkBr" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#fff0bf" />
          <S.Stop offset="0.5" stopColor="#d9a640" />
          <S.Stop offset="1" stopColor="#8a6420" />
        </S.LinearGradient>
        <S.LinearGradient id="bkSh" x1="0" y1="0" x2="1" y2="0">
          <S.Stop offset="0" stopColor="#5cae7c" />
          <S.Stop offset="0.45" stopColor="#2a7a50" />
          <S.Stop offset="1" stopColor="#14482f" />
        </S.LinearGradient>
        <S.RadialGradient id="bkGl">
          <S.Stop offset="0" stopColor="#ffd98a" stopOpacity={L ? 0.6 : 0.55} />
          <S.Stop offset="0.45" stopColor="#ffc75a" stopOpacity={L ? 0.22 : 0.2} />
          <S.Stop offset="1" stopColor="#ffc75a" stopOpacity="0" />
        </S.RadialGradient>
        <S.LinearGradient id="bkCn" x1="1" y1="0" x2="0" y2="1">
          <S.Stop offset="0" stopColor="#fff0c0" stopOpacity={L ? 0.35 : 0.28} />
          <S.Stop offset="1" stopColor="#fff0c0" stopOpacity="0" />
        </S.LinearGradient>
      </S.Defs>
      {/* The case: side and top boards round the card, with a dark back panel. */}
      <S.Path d={`${lay.caseI} ${lay.card}`} fillRule="evenodd" fill="url(#bkBp)" />
      <S.Path d={`${lay.caseO} ${lay.caseI}`} fillRule="evenodd" fill="#000000" fillOpacity={sh * 0.6} transform="translate(0 1.6)" />
      <S.Path d={`${lay.caseO} ${lay.caseI}`} fillRule="evenodd" fill="url(#bkCs)" />
      <S.Path d={lay.grain} fill="none" stroke="#3f2612" strokeOpacity={0.35} strokeWidth={0.6} />
      <S.Path d={lay.caseO} fill="none" stroke="#4e2f16" strokeWidth={0.7} />
      <S.Path d={lay.caseHi} fill="none" stroke="#ffe0b8" strokeOpacity={0.45} strokeWidth={0.7} />
      <S.Path d={lay.caseI} fill="none" stroke="#2a180a" strokeOpacity={0.8} strokeWidth={1} />
      {lit ? (
        <>
          <S.Path d={`M${sx - 11} ${sy + 4}L${sx + 5} ${sy + 11}L${w - 30} ${top}L${w - 120} ${top}Z`} fill="url(#bkCn)" />
          <S.Circle cx={sx + 2} cy={sy + 10} r={lay.tile ? 34 : 26} fill="url(#bkGl)" />
          <S.Ellipse cx={w - 66} cy={top - 4} rx={lay.tile ? 74 : 66} ry={16} fill="url(#bkGl)" />
        </>
      ) : null}
      {/* Books: one per night of the streak, dashed spots for the nights still to come. */}
      <S.Path d={lay.shade} fill="#000000" fillOpacity={sh * 0.7} />
      {lay.books.map((b, i) => (
        <S.Rect key={i} x={b.x} y={b.y} width={b.bw} height={b.bh} rx={0.7} fill={b.c[0]} stroke={b.c[1]} strokeWidth={0.5} />
      ))}
      {lay.books.map((b, i) => (
        <S.Rect key={`s${i}`} x={b.x} y={b.y} width={b.bw} height={b.bh} rx={0.7} fill="url(#bkSp)" />
      ))}
      {lay.bands ? <S.Path d={lay.bands} fill="#f0cf7a" fillOpacity={0.9} /> : null}
      {lay.labels ? <S.Path d={lay.labels} fill="#f6eedb" fillOpacity={0.85} /> : null}
      {lay.caps ? <S.Path d={lay.caps} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.6} /> : null}
      {lay.empty ? <S.Path d={lay.empty} fill="none" stroke={L ? '#8a826f' : '#8b93a3'} strokeOpacity={0.55} strokeWidth={0.7} strokeDasharray="1.4 1.2" /> : null}
      <S.Path d={lay.leaves} fill="url(#bkLf)" stroke="#d9df72" strokeWidth={0.7} />
      <S.Path d={lay.veins} fill="none" stroke="#e6f3a0" strokeOpacity={0.45} strokeWidth={0.5} />
      <S.Path d={`M${px - 8.5} ${top - 11}H${px + 8.5}L${px + 6.4} ${top}H${px - 6.4}Z`} fill="url(#bkPt)" stroke="#7a3a1e" strokeWidth={0.5} />
      <S.Rect x={px - 9.6} y={top - 12.8} width={19.2} height={3.2} rx={1.2} fill="#e08c62" stroke="#7a3a1e" strokeWidth={0.5} />
      <S.Path d={`M${px - 6.6} ${top - 8.4}L${px - 5.4} ${top - 1.4}`} stroke="#ffd2b8" strokeOpacity={0.65} strokeWidth={1} strokeLinecap="round" />
      {stack.map(([a, b, c, d], i) => {
        const y = r2(top - 4.6 * (i + 1))
        return (
          <S.G key={`k${i}`}>
            <S.Rect x={a} y={y} width={b - a} height={4.4} rx={1} fill={c} stroke={d} strokeWidth={0.5} />
            <S.Rect x={a} y={y} width={b - a} height={4.4} rx={1} fill="url(#bkSv)" />
            <S.Path d={`M${b - 2.6} ${r2(y + 0.8)}v2.8`} stroke="#f6eedb" strokeWidth={1.6} />
          </S.G>
        )
      })}
      <S.Path d={`M${lx - 8} ${r2(ly)}Q${lx - 8} ${r2(ly - 3)} ${lx} ${r2(ly - 3)}Q${lx + 8} ${r2(ly - 3)} ${lx + 8} ${r2(ly)}Z`} fill="url(#bkBr)" stroke="#6b4a14" strokeWidth={0.5} />
      <S.Path d={arm} fill="none" stroke="#6b4a14" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <S.Path d={arm} fill="none" stroke="url(#bkBr)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <S.Circle cx={ex} cy={ey} r={2} fill="url(#bkBr)" stroke="#6b4a14" strokeWidth={0.5} />
      <S.G transform={`translate(${sx} ${sy}) rotate(-34) scale(1.3)`}>
        <S.Path d="M-9 4.5Q0 7 9 4.5L5 -5Q0 -6.6 -5 -5Z" fill="url(#bkSh)" stroke="#123a28" strokeWidth={0.6} />
        <S.Ellipse cx={0} cy={5.4} rx={8.6} ry={1.9} fill={lit ? '#fff2c4' : '#3a3f45'} stroke="#123a28" strokeWidth={0.5} />
        <S.Path d="M-6 3Q-4.4 -2.6 -3.4 -4.4" fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={0.8} strokeLinecap="round" />
      </S.G>
      {/* The shelf. */}
      <S.Rect x={-18} y={top + 5.6} width={w + 36} height={4} fill="url(#bkSd)" />
      <S.Path d={`M-16 ${top + 5.5}h12l-6 3.4ZM${w + 4} ${top + 5.5}h12l-6 3.4Z`} fill="#6e4222" />
      <S.Rect x={-18} y={top} width={w + 36} height={5.6} rx={1.4} fill="url(#bkWd)" stroke="#4e2f16" strokeWidth={0.5} />
      <S.Path d={`M-17 ${top + 0.7}H${w + 17}`} stroke="#ffe0b8" strokeOpacity={0.55} strokeWidth={0.7} />
    </Layer>
  )
}

export const FRAME_ART_2027_01_15 = {
  origami: { over: OrigamiOver },
  aquarium: { under: AquariumUnder, over: AquariumOver, animated: true },
  books: { over: BooksOver },
}
