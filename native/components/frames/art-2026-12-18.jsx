// Frames from the 2026-12-18 drop (docs/ideas/frames-drop-2026-12-18.html):
// Gingerbread (coin, still), Snowman (gem, living: built as tonight is
// answered) and Solstice (free Dec 20 to 22, the light follows the length of
// the day). Same contract as art.jsx: each draws in card space and may reach
// PAD past the card; still tiles draw no particles and no moving views.
import { useMemo } from 'react'
import { rrLength, rrPath, rrPointAt } from './geometry.js'
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

// A circle as a path, so many dots batch into one node.
const dotD = (x, y, r) => `M${r2(x - r)} ${r2(y)}a${r} ${r} 0 1 0 ${r2(2 * r)} 0a${r} ${r} 0 1 0 ${r2(-2 * r)} 0`

function sparkD(x, y, s) {
  return `M${r2(x)} ${r2(y - s)}Q${r2(x)} ${r2(y)} ${r2(x + s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y + s)}Q${r2(x)} ${r2(y)} ${r2(x - s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y - s)}Z`
}

function inRR(x, y, X, Y, W, H, r) {
  if (x < X || x > X + W || y < Y || y > Y + H) return false
  const cx = Math.min(Math.max(x, X + r), X + W - r)
  const cy = Math.min(Math.max(y, Y + r), Y + H - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function twinkleAt(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((2 * Math.PI * time) / 2.8 + it.ph)) }
}

function Twinkle({ S, f, x, y, s, ph, color }) {
  const size = Math.ceil(s * 2 + 2)
  return (
    <Particle clock={f.clock} item={{ x, y, ph }} fn={twinkleAt} w={f.w} h={f.h} size={size}>
      <S.Svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
        <S.Path d={sparkD(0, 0, s)} fill={color} />
      </S.Svg>
    </Particle>
  )
}

/* ---------- Gingerbread: a baked cookie border with piping and candy (coin, still) ---------- */

const GUM = [
  ['#ff6b5c', '#c8261c', '#7a1410'],
  ['#7fd46a', '#2f9a4a', '#145a28'],
  ['#ffe07a', '#e0a21c', '#8a5a08'],
]
const HEART = 'M0 6C-10 -1 -9.6 -9 -4.8 -9C-2.2 -9 -.7 -7.4 0 -6C.7 -7.4 2.2 -9 4.8 -9C9.6 -9 10 -1 0 6Z'

function Gumdrop({ S, x, y, s, k }) {
  const c = GUM[k % 3]
  return (
    <S.G transform={`translate(${r2(x)} ${r2(y)})`}>
      <S.Ellipse cy={r2(s * 0.8)} rx={r2(s * 1.15)} ry={r2(s * 0.38)} fill="#fffaf0" />
      <S.Path
        d={`M${-s} ${r2(s * 0.7)}C${-s} ${r2(-s * 0.35)} ${r2(-s * 0.55)} ${-s} 0 ${-s}C${r2(s * 0.55)} ${-s} ${s} ${r2(-s * 0.35)} ${s} ${r2(s * 0.7)}Q0 ${r2(s * 1.05)} ${-s} ${r2(s * 0.7)}Z`}
        fill={`url(#gnG${k % 3})`}
        stroke={c[2]}
        strokeWidth={0.55}
      />
      <S.Path d={`M${r2(-s * 0.62)} ${r2(-s * 0.1)}Q${r2(-s * 0.5)} ${r2(-s * 0.7)} ${r2(-s * 0.05)} ${r2(-s * 0.8)}`} fill="none" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={r2(s * 0.22)} strokeLinecap="round" />
    </S.G>
  )
}

function CandyDot({ S, x, y, r, k }) {
  return (
    <>
      <S.Circle cx={r2(x)} cy={r2(y + 0.4)} r={r2(r + 0.7)} fill="#fffaf0" />
      <S.Circle cx={r2(x)} cy={r2(y)} r={r} fill={`url(#gnG${k % 3})`} stroke={GUM[k % 3][2]} strokeWidth={0.45} />
      <S.Ellipse cx={r2(x - r * 0.35)} cy={r2(y - r * 0.4)} rx={r2(r * 0.38)} ry={r2(r * 0.24)} fill="#ffffff" opacity={0.8} />
    </>
  )
}

function peppermintSwirl(r) {
  let d = ''
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    const b = a + 0.62
    const c = a + 1.05
    d += `M0 0L${r2(r * Math.cos(a))} ${r2(r * Math.sin(a))}A${r} ${r} 0 0 1 ${r2(r * Math.cos(b))} ${r2(r * Math.sin(b))}Q${r2(r * 0.45 * Math.cos(c))} ${r2(r * 0.45 * Math.sin(c))} 0 0Z`
  }
  return d
}

function Peppermint({ S, x, y, r }) {
  return (
    <S.G transform={`translate(${r2(x)} ${r2(y)})`}>
      <S.Circle r={r2(r + 1.1)} fill="#fffaf0" />
      <S.Circle cy={0.5} r={r} fill="#000000" fillOpacity={0.25} />
      <S.Circle r={r} fill="url(#gnPm)" />
      <S.Path d={peppermintSwirl(r)} fill="#e0342a" />
      <S.Circle r={r2(r * 0.22)} fill="#ffffff" />
      <S.Circle r={r} fill="none" stroke="#a8221a" strokeWidth={0.55} />
      <S.Path d={`M${r2(-r * 0.7)} ${r2(-r * 0.25)}A${r2(r * 0.75)} ${r2(r * 0.75)} 0 0 1 ${r2(-r * 0.1)} ${r2(-r * 0.74)}`} fill="none" stroke="#ffffff" strokeWidth={r2(r * 0.2)} strokeLinecap="round" opacity={0.9} />
    </S.G>
  )
}

function gingerLayout(f) {
  const { w, h, R } = f
  // Thin sides (6 px over the top, 7 at the sides) and a ledge under the card with a scalloped edge to 18.
  const X0 = -7
  const Y0 = -6
  const X1 = w + 7
  const Y1 = h + 13
  const r = R + 6
  const a0 = X1 - r
  const a1 = X0 + r
  const ns = Math.max(8, Math.round((a0 - a1) / 10))
  const s = (a0 - a1) / ns / 2
  let scal = ''
  let pipe = ''
  let pdots = ''
  for (let i = 0; i < ns; i++) {
    const xr = a0 - 2 * s * i
    const xl = xr - 2 * s
    const xc = xr - s
    scal += `A${r2(s)} ${r2(s)} 0 0 1 ${r2(xl)} ${Y1}`
    pipe += `M${r2(xc + s - 2.6)} ${Y1}A${r2(s - 2.6)} ${r2(s - 2.6)} 0 0 1 ${r2(xc - s + 2.6)} ${Y1}`
    if (i) pdots += dotD(xr, Y1 + 0.6, 1.25)
  }
  const outer = `M${X0} ${Y1 - r}L${X0} ${Y0 + r}A${r} ${r} 0 0 1 ${X0 + r} ${Y0}L${X1 - r} ${Y0}A${r} ${r} 0 0 1 ${X1} ${Y0 + r}L${X1} ${Y1 - r}A${r} ${r} 0 0 1 ${r2(a0)} ${Y1}${scal}A${r} ${r} 0 0 1 ${X0} ${Y1 - r}Z`
  // Baked speckle, batched into two paths.
  const rnd = seeded(31)
  let dk = ''
  let lt = ''
  for (let i = 0; i < 900 && dk.length + lt.length < 9000; i++) {
    const x = X0 + rnd() * (X1 - X0)
    const y = Y0 + rnd() * (Y1 + 4 - Y0)
    if (!inRR(x, y, X0, Y0, X1 - X0, Y1 - Y0 + 3, r) || inRR(x, y, -1.5, -1.5, w + 3, h + 3, R + 1.5)) continue
    const rr = r2(0.3 + rnd() * 0.45)
    if (i % 3) dk += dotD(x, y, rr)
    else lt += dotD(x, y, rr)
  }
  // Icing scallops along the card edge.
  const iAt = (o, d) => rrPointAt(-o, -o, w + 2 * o, h + 2 * o, R + o, d)
  const LS = rrLength(w + 3.2, h + 3.2, R + 1.6)
  const nsc = Math.round(LS / 10)
  let sc = ''
  let sd = ''
  for (let i = 0; i < nsc; i++) {
    const a = iAt(1.6, (i * LS) / nsc)
    const m = iAt(1.6, ((i + 0.5) * LS) / nsc)
    const b = iAt(1.6, ((i + 1) * LS) / nsc)
    sc += `${i ? '' : `M${r2(a.x)} ${r2(a.y)}`}Q${r2(m.x + m.nx * 4.6)} ${r2(m.y + m.ny * 4.6)} ${r2(b.x)} ${r2(b.y)}`
    sd += dotD(a.x + a.nx * 0.5, a.y + a.ny * 0.5, 1.15)
  }
  const gums = []
  for (let y = R + 30, i = 0; y < h - R - 6; y += 50, i++) {
    gums.push({ x: -3.8, y, s: 3.8, k: i })
    gums.push({ x: w + 3.8, y, s: 3.8, k: i + 1 })
  }
  const dots = []
  const nt = Math.max(3, Math.round((w - 2 * R) / 46))
  for (let i = 0; i < nt; i++) dots.push({ x: R + 8 + ((w - 2 * R - 16) * (i + 0.5)) / nt, k: i })
  let gi = 0
  for (let x = R + 6; x <= w - R - 6; x += 36) if (Math.abs(x - w / 2) > 36) gums.push({ x, y: h + 6.6, s: 4.6, k: gi++ + 2 })
  const cc = (o) => R - (R + o) * Math.SQRT1_2
  const mints = [
    { x: cc(3.2), y: cc(3.2), r: 4.6 },
    { x: w - cc(3.2), y: cc(3.2), r: 4.6 },
    { x: cc(7), y: h - cc(7) + 1, r: 6.4 },
    { x: w - cc(7), y: h - cc(7) + 1, r: 6.4 },
  ]
  return { X0, Y0, Y1, outer, pipe, pdots, dk, lt, sc, sd, gums, dots, mints }
}

export function GingerOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  const L = f.c.light
  const g = useMemo(() => gingerLayout(f), [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="gnCk" x1="0" y1={g.Y0} x2="0" y2={g.Y1 + 5} gradientUnits="userSpaceOnUse">
          <S.Stop offset="0" stopColor="#c97c3a" />
          <S.Stop offset="0.6" stopColor="#b56a2c" />
          <S.Stop offset="1" stopColor="#93501f" />
        </S.LinearGradient>
        <S.LinearGradient id="gnHl" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#ffd29a" stopOpacity={0.9} />
          <S.Stop offset="0.5" stopColor="#ffd29a" stopOpacity={0.25} />
          <S.Stop offset="1" stopColor="#ffd29a" stopOpacity={0} />
        </S.LinearGradient>
        <S.RadialGradient id="gnHc" cx="0.4" cy="0.3" r="0.8">
          <S.Stop offset="0" stopColor="#e0974e" />
          <S.Stop offset="0.7" stopColor="#b8682c" />
          <S.Stop offset="1" stopColor="#94501e" />
        </S.RadialGradient>
        <S.RadialGradient id="gnPm" cx="0.35" cy="0.3" r="0.8">
          <S.Stop offset="0" stopColor="#ffffff" />
          <S.Stop offset="1" stopColor="#e6e0d8" />
        </S.RadialGradient>
        {GUM.map((c, i) => (
          <S.RadialGradient key={i} id={`gnG${i}`} cx="0.35" cy="0.3" r="0.85">
            <S.Stop offset="0" stopColor={c[0]} />
            <S.Stop offset="1" stopColor={c[1]} />
          </S.RadialGradient>
        ))}
      </S.Defs>
      <S.Path d={`${g.outer} ${ring(f, 4)}`} fillRule="evenodd" transform="translate(0 2.2)" fill="#000000" fillOpacity={L ? 0.15 : 0.4} />
      <S.Path d={`${g.outer} ${ring(f, 1)}`} fillRule="evenodd" fill="url(#gnCk)" />
      <S.Path d={g.dk} fill="#5e2c0c" fillOpacity={0.38} />
      <S.Path d={g.lt} fill="#f6c58a" fillOpacity={0.4} />
      <S.Path d={g.outer} fill="none" stroke="url(#gnHl)" strokeWidth={1.2} transform="translate(.5 .7)" />
      <S.Path d={g.outer} fill="none" stroke="#6a3010" strokeWidth={1} />
      <S.Path d={ring(f, 1.3)} fill="none" stroke="#5e2a0c" strokeOpacity={0.7} strokeWidth={1} />
      <S.Path d={g.pipe} transform="translate(.3 .7)" fill="none" stroke="#4a1e06" strokeOpacity={0.45} strokeWidth={2.2} strokeLinecap="round" />
      <S.Path d={g.pipe} fill="none" stroke="#fffaf0" strokeWidth={1.8} strokeLinecap="round" />
      <S.Path d={g.pdots + g.sd} fill="#fffaf0" />
      <S.Path d={g.sc} transform="translate(.3 .7)" fill="none" stroke="#4a1e06" strokeOpacity={0.45} strokeWidth={2.2} />
      <S.Path d={g.sc} fill="none" stroke="#fffaf0" strokeWidth={1.8} strokeLinecap="round" />
      {g.dots.map((d, i) => (
        <CandyDot key={`d${i}`} S={S} x={d.x} y={-3.2} r={2.6} k={d.k} />
      ))}
      {g.gums.map((d, i) => (
        <Gumdrop key={`g${i}`} S={S} x={d.x} y={d.y} s={d.s} k={d.k} />
      ))}
      {g.mints.map((m, i) => (
        <Peppermint key={`m${i}`} S={S} x={m.x} y={m.y} r={m.r} />
      ))}
      {/* The heart cookie under the card, piped round, with a candy in the middle. */}
      <S.G transform={`translate(${w / 2} ${h + 5.6}) scale(2.4)`}>
        <S.Path d={HEART} transform="translate(.35 .9)" fill="#000000" fillOpacity={L ? 0.2 : 0.45} />
        <S.Path d={HEART} fill="url(#gnHc)" stroke="#5e2a0c" strokeWidth={0.45} />
        <S.Path d={HEART} transform="scale(.8) translate(0 -.7)" fill="none" stroke="#4a1e06" strokeOpacity={0.4} strokeWidth={0.95} />
        <S.Path d={HEART} transform="translate(0 -.95) scale(.8)" fill="none" stroke="#fffaf0" strokeWidth={0.85} strokeLinejoin="round" />
        <S.Path d={`${dotD(-4.6, -5.6, 0.42)}${dotD(4.6, -5.6, 0.42)}${dotD(-3.3, 0.2, 0.36)}${dotD(3.3, 0.2, 0.36)}${dotD(0, 3, 0.36)}`} fill="#fffaf0" />
        <S.Circle cy={-2} r={2.1} fill="url(#gnG0)" stroke="#7a1410" strokeWidth={0.25} />
        <S.Ellipse cx={-0.7} cy={-2.8} rx={0.75} ry={0.45} fill="#ffffff" opacity={0.9} />
        <S.Path d="M-7.6 -5.6Q-6.6 -8 -4.2 -8.2" fill="none" stroke="#f6c58a" strokeWidth={0.5} strokeLinecap="round" />
      </S.G>
    </Layer>
  )
}

/* ---------- Snowman: built in the corner as tonight is answered (gem, living) ---------- */

const smooth = (v) => {
  const t = Math.max(0, Math.min(1, v))
  return t * t * (3 - 2 * t)
}

function snowLayout(f) {
  const { w, h, R } = f
  // A point u (0 at the left tip, 1 at the right tip) on the ring o px out, round the bottom.
  const e = 16
  const ref = [e, (Math.PI * (R + 8)) / 2, w - 2 * R, (Math.PI * (R + 8)) / 2, e]
  const tot = ref.reduce((a, b) => a + b, 0)
  const bp = (u, o) => {
    let k = Math.max(0, Math.min(1, u)) * tot
    let i = 0
    while (i < 4 && k > ref[i]) {
      k -= ref[i]
      i++
    }
    const q = k / ref[i]
    const ro = R + o
    if (i === 0) return { x: -o, y: h - R - e + e * q }
    if (i === 1) {
      const t = Math.PI - (q * Math.PI) / 2
      return { x: R + ro * Math.cos(t), y: h - R + ro * Math.sin(t) }
    }
    if (i === 2) return { x: R + (w - 2 * R) * q, y: h + o }
    if (i === 3) {
      const t = Math.PI / 2 - (q * Math.PI) / 2
      return { x: w - R + ro * Math.cos(t), y: h - R + ro * Math.sin(t) }
    }
    return { x: w + o, y: h - R - e * q }
  }
  const bank = (extra, seed) => {
    const N = 90
    const U0 = 0.085
    const inn = []
    const out = []
    for (let i = 0; i <= N; i++) {
      const u = U0 + ((1 - U0) * i) / N
      const t = 5 + 12 * smooth((u - U0) / 0.08) * smooth((1 - u) / 0.15) + extra + 1.1 * Math.sin(u * 47 + seed) * smooth(u / 0.1) * smooth((1 - u) / 0.1)
      inn.push(bp(u, 1))
      out.push(bp(u, Math.min(18.6, t)))
    }
    const cap = (a, b) => `Q${r2((a.x + b.x) / 2)} ${r2(Math.min(a.y, b.y) - 4.5)} ${r2(b.x)} ${r2(b.y)}`
    const ro = out.slice().reverse()
    return `M${inn.map((p) => r2(p.x) + ' ' + r2(p.y)).join('L')}${cap(inn[N], out[N])}L${ro.map((p) => r2(p.x) + ' ' + r2(p.y)).join('L')}${cap(out[0], inn[0])}Z`
  }
  let rim = ''
  for (let i = 0; i <= 60; i++) {
    const p = bp(0.1 + (0.88 * i) / 60, 2.6)
    rim += (i ? 'L' : 'M') + r2(p.x) + ' ' + r2(p.y)
  }
  // Fir trees in the bottom-right corner: far, middle and near. One path per tone layer.
  const TONES = [
    ['#6f9f8e', '#4a7a6a', '#e6eef8', '#3a6a5a'],
    ['#4a8e6a', '#2c5e45', '#f0f5fc', '#1f4a37'],
    ['#3f8a64', '#1f4f39', '#f7faff', '#173a2a'],
  ]
  const trees = [
    [w + 15.5, h + 6, 0.72, 0],
    [w + 1.5, h + 12, 0.92, 1],
    [w + 9.5, h + 18, 1.24, 2],
  ].map(([tx, tb, k, tone]) => {
    let body = ''
    let shade = ''
    let snow = ''
    const tier = (y, hw, ht) => {
      body += `M${r2(tx)} ${r2(y - ht)}L${r2(tx + hw)} ${r2(y)}Q${r2(tx)} ${r2(y + 2 * k)} ${r2(tx - hw)} ${r2(y)}Z`
      shade += `M${r2(tx)} ${r2(y - ht)}L${r2(tx + hw)} ${r2(y)}Q${r2(tx + hw * 0.4)} ${r2(y + 1.4 * k)} ${r2(tx + hw * 0.1)} ${r2(y + 1.2 * k)}Z`
      snow += `M${r2(tx - hw * 0.95)} ${r2(y - 0.3)}Q${r2(tx - hw * 0.4)} ${r2(y - 2.8 * k)} ${r2(tx)} ${r2(y - 1.5 * k)}Q${r2(tx + hw * 0.5)} ${r2(y - 3 * k)} ${r2(tx + hw * 0.95)} ${r2(y - 0.3)}Q${r2(tx)} ${r2(y + 1.4 * k)} ${r2(tx - hw * 0.95)} ${r2(y - 0.3)}Z`
      snow += `M${r2(tx - hw * 0.2)} ${r2(y - ht * 0.72)}L${r2(tx)} ${r2(y - ht)}L${r2(tx + hw * 0.18)} ${r2(y - ht * 0.74)}Z`
    }
    tier(tb - 3 * k, 9.4 * k, 11 * k)
    tier(tb - 11 * k, 7.6 * k, 10 * k)
    tier(tb - 19 * k, 5.6 * k, 9.4 * k)
    return { trunk: { x: r2(tx - 1.6 * k), y: r2(tb - 4 * k), w: r2(3.2 * k), h: r2(6 * k) }, body, shade, snow, c: TONES[tone] }
  })
  const rnd = seeded(77)
  let dust = ''
  for (let i = 0; i < 16; i++) {
    const left = i % 2 === 0
    const x = left ? -17 + rnd() * 12 : w + 5 + rnd() * 12
    const y = R + 8 + rnd() * (h - R - 60)
    dust += dotD(x, y, r2(0.6 + rnd() * 1.1))
  }
  const flakes = []
  for (let i = 0; i < 10; i++) {
    const left = i % 2 === 0
    const x = left ? -17 + rnd() * 12 : w + 5 + rnd() * 12
    const r = 0.7 + rnd() * 1.2
    flakes.push({ x: r2(x), y: R, r: r2(r), o: r2(0.45 + r / 4), dur: 7 + rnd() * 5, dl: rnd() * 12 })
  }
  return { back: bank(1.4, 1.7), front: bank(0, 0), rim, trees, dust, flakes }
}

// The right arm waves every 4.2 s at all clear: 62% still, then a short wave.
function waveAt(time, it) {
  'worklet'
  const q = (time % 4.2) / 4.2
  const K = [0.62, 0, 0.7, -16, 0.78, 4, 0.86, -12, 0.94, 0]
  let a = 0
  for (let i = 0; i < 8; i += 2) {
    if (q >= K[i] && q < K[i + 2]) {
      const u = (q - K[i]) / (K[i + 2] - K[i])
      a = K[i + 1] + (K[i + 3] - K[i + 1]) * u
    }
  }
  return { x: it.x, y: it.y, o: 1, r: (a * Math.PI) / 180 }
}

function flakeAt(time, it) {
  'worklet'
  const q = ((time + it.dl) / it.dur) % 1
  const o = q < 0.1 ? q / 0.1 : q > 0.9 ? (1 - q) / 0.1 : 1
  const x = q < 0.5 ? (q / 0.5) * 2 : 2 - ((q - 0.5) / 0.5) * 3
  return { x: it.x + x, y: it.y + 330 * q, o: o * it.o }
}

function bobFn(on) {
  return (time) => {
    'worklet'
    if (!on) return { transform: [{ translateY: 0 }] }
    return { transform: [{ translateY: -0.6 * (0.5 - 0.5 * Math.cos((2 * Math.PI * time) / 4.2)) }] }
  }
}

const COAL = '#1d2128'

function Ball({ S, b, edge }) {
  return (
    <>
      <S.Circle cx={r2(b.x)} cy={r2(b.y)} r={b.r} fill="url(#smSb)" stroke={edge} strokeWidth={0.8} />
      <S.Path d={`M${r2(b.x - b.r * 0.62)} ${r2(b.y - b.r * 0.38)}A${r2(b.r * 0.72)} ${r2(b.r * 0.72)} 0 0 1 ${r2(b.x - b.r * 0.05)} ${r2(b.y - b.r * 0.72)}`} fill="none" stroke="#ffffff" strokeWidth={r2(b.r * 0.16)} strokeLinecap="round" opacity={0.9} />
    </>
  )
}

export function SnowmanOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  const L = f.c.light
  const live = !f.still
  const lay = useMemo(() => snowLayout(f), [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = Number(f.p.total) || 0
  const ans = Math.min(total, Number(f.p.answered) || 0)
  const skip = Math.min(6, Number(f.p.skipped) || 0)
  // Tiles show the finished snowman.
  const done = f.still || (total > 0 && ans >= total)
  const st = done ? 4 : total ? Math.min(3, Math.ceil((3 * ans) / total)) : 0
  const EDGE = L ? '#9fb0c8' : '#8ea3c0'
  const bob = useMemo(() => bobFn(done && live), [done, live])

  const sx = -5
  const B = { x: sx, y: h + 5, r: 11 }
  const M = { x: sx + 0.6, y: h - 10.6, r: 8.2 }
  const Hd = { x: sx + 0.2, y: h - 23.6, r: 6.2 }
  const hx = Hd.x
  const hy = Hd.y
  // Tiles are scaled down hard, so the snowman is drawn bigger there.
  const big = f.still && w <= 220
  const grow = big ? `translate(${sx} ${h + 17}) scale(1.4) translate(${-sx} ${-h - 17})` : undefined
  const k = big ? 1.4 : 1
  const at = (x, y) => ({ x: sx + (x - sx) * k, y: h + 17 + (y - h - 17) * k })

  let coal = ''
  let coalHi = ''
  const lump = (x, y, r) => {
    coal += dotD(x, y, r)
    coalHi += dotD(x - r * 0.35, y - r * 0.35, r2(r * 0.32))
  }
  if (st >= 2) {
    lump(hx - 2.3, hy - 1.2, 1)
    lump(hx + 2.1, hy - 1.3, 1)
  }
  if (st >= 3) {
    for (const d of [-2.6, -1.3, 0, 1.3, 2.6]) coal += dotD(hx + d, hy + 3.5 - Math.abs(d) * 0.34, 0.52)
    for (const d of [-4.2, -0.4, 3.4]) lump(M.x, M.y + d, 1)
  }
  const armL = `M${r2(M.x - 6.6)} ${r2(M.y - 1.6)}L${r2(M.x - 18)} ${r2(M.y - 9.4)}M${r2(M.x - 14.4)} ${r2(M.y - 7)}L${r2(M.x - 16.2)} ${r2(M.y - 12.2)}M${r2(M.x - 16.6)} ${r2(M.y - 8.4)}L${r2(M.x - 21)} ${r2(M.y - 9)}`
  const armR = st >= 4 ? 'M0 0L9.6 -8.4M7 -6.1L7.8 -11M9.6 -8.4L13.6 -8.6' : 'M0 0L10.4 3.4M7 2.3L9.6 -1.2M10.4 3.4L13.4 6'
  const pivot = { x: M.x + 6.8, y: M.y - 1.8 }
  const waving = live && st >= 4
  const pv = at(pivot.x, pivot.y)

  const sparks = done
    ? [
        [sx - 15, h - 28, 2.2, 0],
        [sx + 16, h - 32, 1.7, 1.1],
        [w - 14, h + 3, 1.6, 2],
      ]
    : [[sx + 16, h + 1, 1.3, 0]]
  const sparkColor = L ? '#7d9cc8' : '#e8f2ff'

  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.RadialGradient id="smSb" cx="0.36" cy="0.3" r="0.8">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="0.55" stopColor="#eef3fa" />
            <S.Stop offset="1" stopColor="#c6d4e8" />
          </S.RadialGradient>
          <S.LinearGradient id="smDr" x1="0" y1={h - f.R} x2="0" y2={h + 19} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="0.55" stopColor="#eef3fa" />
            <S.Stop offset="1" stopColor="#cbd9ec" />
          </S.LinearGradient>
          <S.LinearGradient id="smBk" x1="0" y1={h - f.R} x2="0" y2={h + 20} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#dbe6f4" />
            <S.Stop offset="1" stopColor="#a9bcd8" />
          </S.LinearGradient>
          <S.RadialGradient id="smGl" cx="0.5" cy="0.5" r="0.5">
            <S.Stop offset="0" stopColor={done ? '#ffd98a' : '#cfe4ff'} stopOpacity={done ? (L ? 0.6 : 0.45) : L ? 0.55 : 0.35} />
            <S.Stop offset="0.5" stopColor={done ? '#ffc25a' : '#cfe4ff'} stopOpacity={done ? (L ? 0.22 : 0.16) : L ? 0.275 : 0.175} />
            <S.Stop offset="1" stopColor={done ? '#ffc25a' : '#cfe4ff'} stopOpacity={0} />
          </S.RadialGradient>
        </S.Defs>
        <S.Circle cx={sx + 2} cy={h - 4} r={done ? 42 : 30} fill="url(#smGl)" />
        <S.Path d={lay.dust} fill={L ? '#a9bcd8' : '#e8f0ff'} fillOpacity={L ? 0.9 : 0.75} />
        <S.Path d={lay.back} fill="url(#smBk)" stroke={EDGE} strokeWidth={0.6} />
        <S.Path d={lay.front} transform="translate(0 1.2)" fill="#5f7aa3" fillOpacity={L ? 0.2 : 0.35} />
        <S.Path d={lay.front} fill="url(#smDr)" stroke={EDGE} strokeWidth={0.8} />
        <S.Path d={lay.rim} fill="none" stroke="#b3c4dc" strokeWidth={1.4} strokeOpacity={0.8} />
        {/* Each Not yet leaves a pair of boot prints in the bank. */}
        {Array.from({ length: skip }, (_, i) => (
          <S.G key={`p${i}`} transform={`translate(${44 + i * 16} ${r2(h + (i % 2 ? 12.4 : 8.6))}) rotate(-5)`}>
            <S.Path d={`M-3.5 .7a3.5 1.9 0 1 0 7 0a3.5 1.9 0 1 0 -7 0M-6.9 .6a1.9 1.6 0 1 0 3.8 0a1.9 1.6 0 1 0 -3.8 0`} fill="#ffffff" opacity={0.9} />
            <S.Path d="M-3.3 0a3.3 1.75 0 1 0 6.6 0a3.3 1.75 0 1 0 -6.6 0M-6.75 0a1.75 1.5 0 1 0 3.5 0a1.75 1.5 0 1 0 -3.5 0" fill="#5b739a" />
            <S.Path d="M-2.1 -.5a2.4 .9 0 1 0 4.8 0a2.4 .9 0 1 0 -4.8 0M-6.2 -.45a1.2 .7 0 1 0 2.4 0a1.2 .7 0 1 0 -2.4 0" fill="#3f5478" opacity={0.7} />
          </S.G>
        ))}
        {st === 0 ? (
          <>
            <S.Path d={`M34 ${h + 11.4}Q24 ${h + 12.6} 12 ${h + 12}`} fill="none" stroke="#a9bbd6" strokeWidth={2.8} strokeLinecap="round" />
            <S.Circle cx={38} cy={h + 8.8} r={4.8} fill="url(#smSb)" stroke={EDGE} strokeWidth={0.7} />
            <S.Path d={`M35.4 ${h + 7}A3 3 0 0 1 37.8 ${h + 5.6}`} fill="none" stroke="#ffffff" strokeWidth={0.8} strokeLinecap="round" />
          </>
        ) : null}
        {lay.trees.map((t, i) => (
          <S.G key={`t${i}`}>
            <S.Rect x={t.trunk.x} y={t.trunk.y} width={t.trunk.w} height={t.trunk.h} fill="#6b4226" />
            <S.Path d={t.body} fill={t.c[0]} stroke={t.c[3]} strokeWidth={0.6} strokeLinejoin="round" />
            <S.Path d={t.shade} fill={t.c[1]} />
            <S.Path d={t.snow} fill={t.c[2]} />
          </S.G>
        ))}
        <S.Path d={`M${w + 9.5} ${r2(h + 18 - 28.4 * 1.24 - 2.6)}l1 2 2.2.3-1.6 1.55.4 2.2-2-1.05-2 1.05.4-2.2-1.6-1.55 2.2-.3z`} fill="#ffe08a" stroke="#c99a2a" strokeWidth={0.4} />
      </Layer>
      <Moving clock={f.clock} fn={bob} style={FILL}>
        <Layer f={f}>
          {/* Its own Svg, so it needs its own gradients: Android does not reach across. */}
          <S.Defs>
            <S.RadialGradient id="smSb" cx="0.36" cy="0.3" r="0.8">
              <S.Stop offset="0" stopColor="#ffffff" />
              <S.Stop offset="0.55" stopColor="#eef3fa" />
              <S.Stop offset="1" stopColor="#c6d4e8" />
            </S.RadialGradient>
            <S.LinearGradient id="smDr" x1="0" y1={h - f.R} x2="0" y2={h + 19} gradientUnits="userSpaceOnUse">
              <S.Stop offset="0" stopColor="#ffffff" />
              <S.Stop offset="0.55" stopColor="#eef3fa" />
              <S.Stop offset="1" stopColor="#cbd9ec" />
            </S.LinearGradient>
          </S.Defs>
          <S.G transform={grow}>
            {st >= 1 ? <Ball S={S} b={B} edge={EDGE} /> : null}
            {st >= 2 ? (
              <>
                <S.Ellipse cx={r2(M.x)} cy={r2(M.y + M.r - 1)} rx={r2(M.r * 0.86)} ry={2} fill="#9fb3d0" opacity={0.6} />
                <Ball S={S} b={M} edge={EDGE} />
                <S.Ellipse cx={r2(Hd.x)} cy={r2(Hd.y + Hd.r - 1)} rx={r2(Hd.r * 0.86)} ry={2} fill="#9fb3d0" opacity={0.6} />
                <Ball S={S} b={Hd} edge={EDGE} />
              </>
            ) : null}
            {st >= 3 ? <S.Path d={armL} fill="none" stroke="#5a3a20" strokeWidth={1.5} strokeLinecap="round" /> : null}
            {st >= 3 && !waving ? <S.Path d={armR} transform={`translate(${r2(pivot.x)} ${r2(pivot.y)})`} fill="none" stroke="#5a3a20" strokeWidth={1.5} strokeLinecap="round" /> : null}
            {coal ? <S.Path d={coal} fill={COAL} /> : null}
            {coalHi ? <S.Path d={coalHi} fill="#7b8290" /> : null}
            {st >= 4 ? (
              <>
                <S.Path d={`M${r2(hx + 0.4)} ${r2(hy - 0.2)}L${r2(hx + 7.6)} ${r2(hy + 1.6)}L${r2(hx + 0.5)} ${r2(hy + 1.7)}Z`} fill="#f47e2a" stroke="#a8480c" strokeWidth={0.45} strokeLinejoin="round" />
                <S.Path d={`M${r2(hx + 2.4)} ${r2(hy + 0.4)}l.3 .9M${r2(hx + 4.4)} ${r2(hy + 0.9)}l.25 .7`} stroke="#a8480c" strokeWidth={0.4} />
                <S.G transform={`rotate(-9 ${r2(hx)} ${r2(hy - 6)})`}>
                  <S.Ellipse cx={r2(hx)} cy={r2(hy - 5.6)} rx={7.6} ry={1.7} fill={COAL} />
                  <S.Rect x={r2(hx - 4.6)} y={r2(hy - 14.4)} width={9.2} height={8.8} rx={1.2} fill="#22262e" />
                  <S.Rect x={r2(hx - 4.6)} y={r2(hy - 8.4)} width={9.2} height={2} fill="#c8302a" />
                  <S.Path d={`M${r2(hx - 3.4)} ${r2(hy - 13.4)}V${r2(hy - 9)}`} stroke="#ffffff" strokeOpacity={0.28} strokeWidth={0.9} strokeLinecap="round" />
                  <S.Ellipse cx={r2(hx)} cy={r2(hy - 14.4)} rx={4.6} ry={0.9} fill="#3a3f4a" />
                  <S.Path d={`M${r2(hx + 2.6)} ${r2(hy - 7.4)}q2.6 -2.4 4.4 -.6q-2.2 1.6 -4.4 .6zM${r2(hx + 2.6)} ${r2(hy - 7.4)}q1.2 -3.4 3.6 -3.6q-.6 2.6 -3.6 3.6z`} fill="#2f8a4a" stroke="#174a28" strokeWidth={0.35} />
                  <S.Path d={`${dotD(hx + 2.4, hy - 7.2, 0.9)}${dotD(hx + 3.4, hy - 6.6, 0.8)}`} fill="#e0342a" />
                </S.G>
              </>
            ) : null}
            {st >= 1 ? <S.Path d={`M${sx - 17} ${h + 17.6}Q${sx - 12} ${h + 12.4} ${sx} ${h + 13.2}Q${sx + 12} ${h + 12.6} ${sx + 17} ${h + 17.6}Z`} fill="url(#smDr)" stroke={EDGE} strokeWidth={0.7} /> : null}
          </S.G>
        </Layer>
      </Moving>
      {waving ? (
        <Particle clock={f.clock} item={pv} fn={waveAt} w={w} h={h} size={32}>
          <S.Svg width={32} height={32} viewBox="-16 -16 32 32">
            <S.Path d={armR} fill="none" stroke="#5a3a20" strokeWidth={1.5} strokeLinecap="round" />
          </S.Svg>
        </Particle>
      ) : null}
      {live ? (
        sparks.map(([x, y, s, dl], i) => <Twinkle key={`s${i}`} S={S} f={f} x={x} y={y} s={s} ph={dl * 2.2} color={sparkColor} />)
      ) : (
        <Layer f={f}>
          <S.Path d={sparks.map(([x, y, s]) => sparkD(x, y, s)).join('')} fill={sparkColor} />
        </Layer>
      )}
      {live
        ? lay.flakes.map((fl, i) => (
            <Particle key={`f${i}`} clock={f.clock} item={fl} fn={flakeAt} w={w} h={h} size={6}>
              <S.Svg width={6} height={6} viewBox="-3 -3 6 6">
                <S.Circle r={fl.r} fill={f.c.snow || '#ffffff'} />
              </S.Svg>
            </Particle>
          ))
        : null}
    </>
  )
}

/* ---------- Solstice: the sun rises through the stones (free Dec 20 to 22) ---------- */

/** 0 on December 21, 1 on June 21: how long the day is. */
export function solsticeLight(date) {
  let m
  let d
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    m = date.getMonth() + 1
    d = date.getDate()
  } else {
    const hit = /^\d{4}-(\d{2})-(\d{2})/.exec(String(date || ''))
    const now = new Date()
    m = hit ? Number(hit[1]) : now.getMonth() + 1
    d = hit ? Number(hit[2]) : now.getDate()
  }
  const days = (Date.UTC(2026, m - 1, d) - Date.UTC(2026, 11, 21)) / 864e5
  return (1 - Math.cos((2 * Math.PI * (((days % 365) + 365) % 365)) / 365)) / 2
}

function mixHex(a, b, t) {
  return '#' + [0, 2, 4].map((i) => Math.round(parseInt(a.substr(1 + i, 2), 16) * (1 - t) + parseInt(b.substr(1 + i, 2), 16) * t).toString(16).padStart(2, '0')).join('')
}

const LEFT_STONES = [
  [33, 7, 17, -0.03],
  [49, 6.2, 19, 0.02],
  [66, 15, 0, 0],
  [83, 7, 14, 0.12],
  [104, 5.6, 11, 0],
  [124, 6.4, 9, -0.14],
  [143, 4.6, 7, 0.06],
]
const RIGHT_STONES = [
  [33, 7, 16.6, 0.03],
  [50, 7.4, 18, 0],
  [67, 5.6, 14.5, -0.1],
  [88, 13, 0, 0],
  [106, 6, 11, 0.06],
  [126, 5.4, 8.6, 0],
  [144, 4.6, 6.6, -0.1],
]

function solsticeLayout(f, light) {
  const { w, h, R } = f
  const T = 2
  const SD = 12
  const B = 20
  const OW = w + 2 * SD
  const outer = rrPath(-SD, -T, OW, h + T + B, R + 8)
  const cx = w / 2
  const gY = (x) => {
    const u = Math.max(-1, Math.min(1, (x - cx) / (w / 2 + 14)))
    return h + 17.6 - 6.5 * u * u + 0.8 * Math.sin(u * 13) * u * u
  }
  let hill = `M${-SD - 2} ${h + B + 2}`
  for (let i = 0; i <= 48; i++) {
    const x = -SD - 2 + ((OW + 4) * i) / 48
    hill += `L${r2(x)} ${r2(gY(x))}`
  }
  hill += `L${w + SD + 2} ${h + B + 2}Z`
  let rim = ''
  for (let i = 0; i <= 40; i++) {
    const x = cx - 150 + (300 * i) / 40
    rim += (i ? 'L' : 'M') + r2(x) + ' ' + r2(gY(x) - 0.2)
  }
  const rnd = seeded(9)
  let stars = ''
  const tw = []
  for (let i = 0; i < 40; i++) {
    const left = i % 2 === 0
    const x = left ? -SD + 2 + rnd() * (SD - 3) : w + 1 + rnd() * (SD - 3)
    const y = h * 0.5 + rnd() * (h * 0.5 - 30)
    const r = r2(0.35 + rnd() * 0.55)
    if (i % 7 === 3) tw.push({ x: r2(x), y: r2(y), s: 1.5 + rnd(), ph: rnd() * 6.3 })
    else stars += dotD(x, y, r)
  }
  // Stones: one fill path, one path of lit edges per brightness so they batch.
  const stones = []
  const stone = (x, wd, ht, lean) => {
    const g = gY(x) + 1
    const a = x - wd / 2
    const b = x + wd / 2
    const side = x < cx ? 1 : -1
    const op = Math.max(0.2, 1 - Math.abs(x - cx) / (w / 2))
    if (!ht) {
      stones.push({
        body: `M${r2(a)} ${r2(g + 0.4)}L${r2(a + 0.8)} ${r2(g - 4)}Q${r2(x)} ${r2(g - 5.2)} ${r2(b - 0.8)} ${r2(g - 3.8)}L${r2(b)} ${r2(g + 0.4)}Z`,
        edge: `M${r2(a + 1.2)} ${r2(g - 4.1)}Q${r2(x)} ${r2(g - 5.2)} ${r2(b - 1.2)} ${r2(g - 3.9)}`,
        eo: r2(op * 0.7),
        ew: 0.7,
      })
      return
    }
    stones.push({
      tf: `rotate(${r2(lean * 57.3)} ${r2(x)} ${r2(g)})`,
      body: `M${r2(a)} ${r2(g)}L${r2(a + 0.4)} ${r2(g - ht + 2)}Q${r2(a + 0.8)} ${r2(g - ht)} ${r2(x)} ${r2(g - ht - 0.4)}Q${r2(b - 0.6)} ${r2(g - ht)} ${r2(b - 0.3)} ${r2(g - ht + 1.8)}L${r2(b)} ${r2(g)}Z`,
      edge: `M${r2(side > 0 ? b - 0.7 : a + 0.7)} ${r2(g - 0.8)}L${r2(side > 0 ? b - 0.8 : a + 0.8)} ${r2(g - ht + 2)}`,
      eo: r2(op * 0.95),
      ew: 1,
    })
  }
  LEFT_STONES.forEach(([d, wd, ht, ln]) => {
    if (d < w / 2 + 2) stone(cx - d, wd, ht, ln)
  })
  RIGHT_STONES.forEach(([d, wd, ht, ln]) => {
    if (d < w / 2 + 2) stone(cx + d, wd, ht, ln)
  })
  // The trilithon: the sun sits in its gap.
  const gC = gY(cx) + 1
  const uL = cx - 12.6
  const uR = cx + 12.6
  const uw = 7.6
  const top = h - 6.4
  const upr = (x) => `M${r2(x - uw / 2 - 0.3)} ${r2(gC)}L${r2(x - uw / 2)} ${r2(top)}H${r2(x + uw / 2)}L${r2(x + uw / 2 + 0.3)} ${r2(gC)}Z`
  const tri = `${upr(uL)}${upr(uR)}M${r2(cx - 21)} ${r2(top + 0.4)}L${r2(cx - 20.2)} ${r2(top - 4.6)}Q${cx} ${r2(top - 5.6)} ${r2(cx + 20.2)} ${r2(top - 4.6)}L${r2(cx + 21)} ${r2(top + 0.4)}Z`
  const triEdge = `M${r2(uL + uw / 2 - 0.5)} ${r2(gC - 0.8)}V${r2(top + 1)}M${r2(uR - uw / 2 + 0.5)} ${r2(gC - 0.8)}V${r2(top + 1)}`
  const triBeam = `M${r2(uL + uw / 2)} ${r2(top + 0.8)}H${r2(uR - uw / 2)}`
  let arch = `M${r2(cx - 30)} ${h - 30}L${r2(cx + 30)} ${h - 30}`
  for (let i = 0; i <= 6; i++) {
    const x = cx + 30 - 10 * i
    arch += `L${r2(x)} ${r2(gY(x))}`
  }
  arch += 'Z'
  return { outer, cx, gC, hill, rim, stars, tw, stones, tri, triEdge, triBeam, arch, sy: gC - 2.2 - 11.5 * light }
}

function glowFn(on) {
  return (time) => {
    'worklet'
    if (!on) return { opacity: 1 }
    return { opacity: 0.78 + 0.22 * (0.5 - 0.5 * Math.cos((2 * Math.PI * time) / 6)) }
  }
}

export function SolsticeOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  const L = f.c.light
  const live = !f.still
  const light = solsticeLight(f.p.date)
  const lightKey = Math.round(light * 100)
  const lay = useMemo(() => solsticeLayout(f, light), [f.w, f.h, f.R, lightKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const glow = useMemo(() => glowFn(live), [live])
  const { cx, gC, sy } = lay
  const rw = 70 + 130 * light
  const warm = mixHex('#9a4a5c', '#f0a455', light)
  const mid = mixHex('#3a2a60', '#7a4a72', light)
  const band = `${lay.outer} ${ring(f, 1)}`

  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="soSk" x1="0" y1={-2} x2="0" y2={h + 20} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#0f1740" stopOpacity={0} />
            <S.Stop offset="0.42" stopColor="#0f1740" stopOpacity={0} />
            <S.Stop offset="0.7" stopColor="#121a48" stopOpacity={0.85} />
            <S.Stop offset="0.86" stopColor="#1b2152" />
            <S.Stop offset="0.94" stopColor={mid} />
            <S.Stop offset="1" stopColor={warm} />
          </S.LinearGradient>
          <S.LinearGradient id="soIn" x1="0" y1="0" x2="0" y2={h} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor={L ? '#1b2456' : '#3a4690'} />
            <S.Stop offset="0.6" stopColor="#7a6ab0" />
            <S.Stop offset="1" stopColor="#ffcf7a" />
          </S.LinearGradient>
          <S.ClipPath id="soCp">
            <S.Path d={band} clipRule="evenodd" />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={band} fillRule="evenodd" fill="url(#soSk)" />
        <S.Path d={ring(f, 1.4)} fill="none" stroke="url(#soIn)" strokeWidth={1.8} />
        <S.G clipPath="url(#soCp)">
          <S.Path d={lay.stars} fill="#e8ecff" fillOpacity={0.85} />
        </S.G>
      </Layer>
      {/* The sun's glow and the horizon streak breathe on 6 s. */}
      <Moving clock={f.clock} fn={glow} style={FILL}>
        <Layer f={f}>
          <S.Defs>
            <S.RadialGradient id="soSg" cx="0.5" cy="0.5" r="0.5">
              <S.Stop offset="0" stopColor="#ffd98a" stopOpacity={0.95} />
              <S.Stop offset="0.3" stopColor="#ff9e5a" stopOpacity={0.45} />
              <S.Stop offset="0.65" stopColor="#c0507a" stopOpacity={0.14} />
              <S.Stop offset="1" stopColor="#c0507a" stopOpacity={0} />
            </S.RadialGradient>
            <S.LinearGradient id="soHz" x1="0" y1="0" x2="1" y2="0">
              <S.Stop offset="0" stopColor="#ff9a5a" stopOpacity={0} />
              <S.Stop offset="0.3" stopColor="#ffb46a" stopOpacity={0.55} />
              <S.Stop offset="0.5" stopColor="#ffe2a0" stopOpacity={0.95} />
              <S.Stop offset="0.7" stopColor="#ffb46a" stopOpacity={0.55} />
              <S.Stop offset="1" stopColor="#ff9a5a" stopOpacity={0} />
            </S.LinearGradient>
            <S.ClipPath id="soCg">
              <S.Path d={band} clipRule="evenodd" />
            </S.ClipPath>
          </S.Defs>
          <S.G clipPath="url(#soCg)">
            <S.Ellipse cx={cx} cy={r2(sy)} rx={r2(60 + 120 * light)} ry={r2(24 + 14 * light)} fill="url(#soSg)" />
            <S.Circle cx={cx} cy={r2(sy)} r={r2(16 + 6 * light)} fill="url(#soSg)" />
            <S.Ellipse cx={cx} cy={r2(gC - 3.4)} rx={r2(34 + 120 * light)} ry={2.4} fill="url(#soHz)" />
          </S.G>
        </Layer>
      </Moving>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="soSt" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#262a4a" />
            <S.Stop offset="1" stopColor="#090b1a" />
          </S.LinearGradient>
          <S.LinearGradient id="soGr" x1="0" y1={h + 8} x2="0" y2={h + 20} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#151834" />
            <S.Stop offset="1" stopColor="#05060f" />
          </S.LinearGradient>
          <S.LinearGradient id="soRm" x1={r2(cx - rw)} y1="0" x2={r2(cx + rw)} y2="0" gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#ffc46a" stopOpacity={0} />
            <S.Stop offset="0.5" stopColor="#ffd98a" stopOpacity={0.95} />
            <S.Stop offset="1" stopColor="#ffc46a" stopOpacity={0} />
          </S.LinearGradient>
          <S.RadialGradient id="soSn" cx="0.45" cy="0.4" r="0.7">
            <S.Stop offset="0" stopColor="#fffbe8" />
            <S.Stop offset="0.55" stopColor="#ffdc8a" />
            <S.Stop offset="1" stopColor="#ff9a4a" />
          </S.RadialGradient>
          <S.ClipPath id="soCh">
            <S.Path d={band} clipRule="evenodd" />
          </S.ClipPath>
          <S.ClipPath id="soAb">
            <S.Path d={lay.arch} />
          </S.ClipPath>
        </S.Defs>
        <S.G clipPath="url(#soAb)">
          <S.Circle cx={cx} cy={r2(sy)} r={7.2} fill="url(#soSn)" />
          <S.Circle cx={r2(cx - 2.2)} cy={r2(sy - 2.2)} r={2} fill="#ffffff" opacity={0.55} />
        </S.G>
        <S.G clipPath="url(#soCh)">
          <S.Path d={lay.hill} fill="url(#soGr)" />
          <S.Path d={lay.rim} fill="none" stroke="url(#soRm)" strokeWidth={1} />
        </S.G>
        {lay.stones.map((s, i) => (
          <S.G key={i} transform={s.tf}>
            <S.Path d={s.body} fill="url(#soSt)" />
            <S.Path d={s.edge} fill="none" stroke="#ffc46a" strokeOpacity={s.eo} strokeWidth={s.ew} strokeLinecap="round" />
          </S.G>
        ))}
        <S.Path d={lay.tri} fill="url(#soSt)" />
        <S.Path d={lay.triEdge} stroke="#ffd98a" strokeWidth={1.1} strokeLinecap="round" />
        <S.Path d={lay.triBeam} stroke="#ffb46a" strokeOpacity={r2(0.35 + 0.5 * light)} strokeWidth={0.9} />
        {live ? null : <S.Path d={lay.tw.map((t) => sparkD(t.x, t.y, t.s)).join('')} fill="#fff6dc" />}
      </Layer>
      {live ? lay.tw.map((t, i) => <Twinkle key={i} S={S} f={f} x={t.x} y={t.y} s={t.s} ph={t.ph} color="#fff6dc" />) : null}
    </>
  )
}

export const FRAME_ART_2026_12_18 = {
  ginger: { over: GingerOver, animated: false },
  snowman: { over: SnowmanOver, animated: true },
  solstice: { over: SolsticeOver, animated: true },
}
