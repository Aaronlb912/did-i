// Pie Crust (docs/ideas/thanksgiving-2026/pie-crust.html): a special frame,
// free Nov 23 to 26, 2026 and kept after. A fluted crust all round the card:
// a dough band from 1 to 8 px out, a scalloped edge to about 14 px, a pinch at
// every flute, and pastry leaves with dough berries on the top left and bottom
// right corners. It bakes from raw dough to golden as today's Dids come in
// (bake = Did / questions). When today is done, three curls of steam rise over
// the top edge. Under the card: a warm oven glow that grows with the bake.
// Same contract as art.jsx: draws in card space, reaches up to PAD past the
// card. Still tiles and cards behind the top one draw it all in two svg
// layers; only the top card gets the steam, the twinkles and the glow breath.
import { useMemo } from 'react'
import { rrLength, rrPath, rrPointAt, seeded } from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll } from './runtime.jsx'

const r2 = (n) => Math.round(n * 100) / 100
const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }

const RAW = { base: '#f6e6c2', deep: '#e3c690', edge: '#b8925a', lip: '#c9a774' }
const BAKED = { base: '#e9a650', deep: '#c9772a', edge: '#8a4512', lip: '#a95d1c' }
const OC = 9.5
const BUMP = 7.2

function mix(c1, c2, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const a = p(c1)
  const b = p(c2)
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

const ring = (f, o) => rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, Math.max(0, f.R + o))
const ringAt = (f, o, d) => rrPointAt(-o, -o, f.w + 2 * o, f.h + 2 * o, f.R + o, d)
const dotD = (x, y, r) => `M${r2(x - r)} ${r2(y)}a${r} ${r} 0 1 0 ${r2(2 * r)} 0a${r} ${r} 0 1 0 ${r2(-2 * r)} 0`
const sparkD = (x, y, s) =>
  `M${r2(x)} ${r2(y - s)}Q${r2(x)} ${r2(y)} ${r2(x + s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y + s)}Q${r2(x)} ${r2(y)} ${r2(x - s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y - s)}Z`

/* ---------- Shared state: how baked, is it done, is it the top card ---------- */

function usePie(f) {
  const P = f.p
  const T = Math.max(1, Math.min(12, P.total || 4))
  const A = Math.min(T, P.answered || 0)
  const SK = Math.min(T - A, P.skipped || 0)
  const done = f.still ? true : P.total > 0 && A + SK >= T
  const bake = f.still ? 1 : A / T
  const live = Boolean(f.active) && !f.still
  const col = useMemo(() => {
    const c = (k) => mix(RAW[k], BAKED[k], bake)
    return { base: c('base'), deep: c('deep'), edge: c('edge'), lip: c('lip') }
  }, [bake])
  return { done, bake, live, col }
}

// Geometry only: the flutes depend on the card size, never on the bake.
function flutesFor(f) {
  const W = f.w + 2 * OC
  const H = f.h + 2 * OC
  const L = rrLength(W, H, f.R + OC)
  const n = Math.max(14, Math.round(L / 15))
  const out = []
  for (let i = 0; i < n; i++) {
    const a = rrPointAt(-OC, -OC, W, H, f.R + OC, (i * L) / n)
    const m = rrPointAt(-OC, -OC, W, H, f.R + OC, ((i + 0.5) * L) / n)
    const b = rrPointAt(-OC, -OC, W, H, f.R + OC, ((i + 1) * L) / n)
    out.push({ a, m, b, i })
  }
  return out
}

function crustOuter(flutes) {
  const k = BUMP * 1.36
  let d = ''
  flutes.forEach(({ a, b }, i) => {
    if (!i) d += `M${r2(a.x)} ${r2(a.y)}`
    d += `C${r2(a.x + a.nx * k)} ${r2(a.y + a.ny * k)} ${r2(b.x + b.nx * k)} ${r2(b.y + b.ny * k)} ${r2(b.x)} ${r2(b.y)}`
  })
  return d + 'Z'
}

// Per flute: a hollow where the thumb pressed, a pinch line and its highlight,
// a lit top, a browned tip.
function fluteParts(flutes) {
  const holes = []
  const lits = []
  let pin = ''
  let pinHi = ''
  let tip = ''
  flutes.forEach(({ a, m, b, i }) => {
    const p = (q, k) => ({ x: q.x + q.nx * k, y: q.y + q.ny * k })
    const ang = (Math.atan2(m.ny, m.nx) * 180) / Math.PI + 90
    const hc = p(m, 2.2)
    holes.push({ i, x: r2(hc.x), y: r2(hc.y), ang: r2(ang) })
    const p0 = p(a, -1.2)
    const p1 = p(a, 3.2)
    pin += `M${r2(p0.x)} ${r2(p0.y)}L${r2(p1.x)} ${r2(p1.y)}`
    const tx = b.x - a.x
    const ty = b.y - a.y
    const tl = Math.hypot(tx, ty) || 1
    const ux = tx / tl
    const uy = ty / tl
    pinHi += `M${r2(p0.x + ux * 1.1)} ${r2(p0.y + uy * 1.1)}L${r2(p1.x + ux * 1.1)} ${r2(p1.y + uy * 1.1)}`
    const lc = p(m, BUMP * 0.6)
    lits.push({ i, x: r2(lc.x - ux * 0.8), y: r2(lc.y - uy * 0.8), ang: r2(ang) })
    const t0 = p(a, 1.9)
    const t1 = p(m, BUMP * 1.02 + 0.2)
    const t2 = p(b, 1.9)
    tip += `M${r2(t0.x + ux * 2)} ${r2(t0.y + uy * 2)}Q${r2(t1.x)} ${r2(t1.y)} ${r2(t2.x - ux * 2)} ${r2(t2.y - uy * 2)}`
  })
  return { holes, lits, pin, pinHi, tip }
}

// Sugar and twinkles scattered on the dough band; the same spots every time.
function sugarFor(f) {
  const rnd = seeded(19)
  const Ls = rrLength(f.w + 12, f.h + 12, f.R + 6)
  const n = Math.round(Ls / 18)
  let sugar = ''
  const twinkles = []
  for (let i = 0; i < n; i++) {
    const q = ringAt(f, 3.6 + rnd() * 6.5, ((i + rnd() * 0.6) * Ls) / n)
    if (rnd() < 0.32) twinkles.push({ x: q.x, y: q.y, ph: rnd() * 2.8 })
    else sugar += dotD(q.x, q.y, 0.42)
  }
  return { sugar, twinkles }
}

// A scored pastry leaf on a 0..len axis, pointing +x.
function pastryLeaf(len, wd) {
  const s = r2
  return `M0 0C${s(len * 0.18)} ${s(-wd * 0.9)} ${s(len * 0.48)} ${s(-wd * 1.05)} ${s(len * 0.62)} ${s(-wd * 0.7)}L${s(len * 0.66)} ${s(-wd * 0.86)}C${s(len * 0.8)} ${s(-wd * 0.62)} ${s(len * 0.94)} ${s(-wd * 0.28)} ${s(len)} 0C${s(len * 0.94)} ${s(wd * 0.28)} ${s(len * 0.8)} ${s(wd * 0.62)} ${s(len * 0.66)} ${s(wd * 0.86)}L${s(len * 0.62)} ${s(wd * 0.7)}C${s(len * 0.48)} ${s(wd * 1.05)} ${s(len * 0.18)} ${s(wd * 0.9)} 0 0Z`
}

function leafVeins(len, wd) {
  const s = r2
  let d = `M${s(len * 0.06)} 0L${s(len * 0.9)} 0`
  for (const t of [0.3, 0.5, 0.7]) {
    d += `M${s(len * t)} 0L${s(len * (t + 0.13))} ${s(-wd * 0.62 * (1 - t * 0.4))}M${s(len * t)} 0L${s(len * (t + 0.13))} ${s(wd * 0.62 * (1 - t * 0.4))}`
  }
  return d
}

const LEAVES = [
  [22, 8.4, -8, -2, 0],
  [17, 6.4, -62, -1, 1],
  [16, 6, 44, 0, 0],
]
const BERRIES = [
  [2.4, -1.4, 3],
  [-2.8, 2.6, 2.6],
  [3.6, 4.2, 2.3],
]

function LeafCluster({ S, x, y, rot, col, bake, light }) {
  const ink = mix(col.edge, '#3a1a06', 0.3)
  const shade = light ? 0.18 : 0.4
  return (
    <S.G transform={`translate(${r2(x)} ${r2(y)}) rotate(${rot}) scale(1.35)`}>
      {LEAVES.map(([len, wd, a, dx, dy], i) => {
        const leaf = pastryLeaf(len, wd)
        const veins = leafVeins(len, wd)
        return (
          <S.G key={`l${i}`} transform={`translate(${dx} ${dy}) rotate(${a})`}>
            <S.Path d={leaf} transform="translate(.5 1.3)" fill="#2a1406" fillOpacity={shade} />
            <S.Path d={leaf} fill="url(#pieLf)" stroke={ink} strokeWidth={0.8} strokeLinejoin="round" />
            <S.Path d={veins} fill="none" stroke={ink} strokeWidth={0.9} strokeLinecap="round" strokeOpacity={0.85} />
            <S.Path d={veins} transform="translate(-.3 -.55)" fill="none" stroke="#fff8e4" strokeWidth={0.5} strokeLinecap="round" strokeOpacity={r2(0.55 - bake * 0.25)} />
            <S.Path
              d={`M${r2(len * 0.12)} ${r2(-wd * 0.55)}C${r2(len * 0.3)} ${r2(-wd * 0.95)} ${r2(len * 0.5)} ${r2(-wd * 0.9)} ${r2(len * 0.58)} ${r2(-wd * 0.62)}`}
              fill="none"
              stroke="#fffaf0"
              strokeOpacity={0.6}
              strokeWidth={0.8}
              strokeLinecap="round"
            />
          </S.G>
        )
      })}
      {BERRIES.map(([bx, by, r], i) => (
        <S.G key={`b${i}`}>
          <S.Circle cx={r2(bx + 0.4)} cy={r2(by + 1)} r={r} fill="#2a1406" fillOpacity={shade} />
          <S.Circle cx={bx} cy={by} r={r} fill="url(#pieBr)" stroke={ink} strokeWidth={0.7} />
          <S.Ellipse
            cx={r2(bx - r * 0.35)}
            cy={r2(by - r * 0.38)}
            rx={r2(r * 0.38)}
            ry={r2(r * 0.26)}
            fill="#fffaf0"
            opacity={0.75}
            transform={`rotate(-30 ${r2(bx - r * 0.35)} ${r2(by - r * 0.38)})`}
          />
        </S.G>
      ))}
    </S.G>
  )
}

function PieDefs({ S, col }) {
  return (
    <S.Defs>
      <S.LinearGradient id="pieCr" x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor={mix(col.base, '#ffffff', 0.18)} />
        <S.Stop offset="0.45" stopColor={col.base} />
        <S.Stop offset="1" stopColor={col.deep} />
      </S.LinearGradient>
      <S.LinearGradient id="pieLf" x1="0" y1="0" x2="0" y2="1">
        <S.Stop offset="0" stopColor={mix(col.base, '#ffffff', 0.22)} />
        <S.Stop offset="1" stopColor={col.deep} />
      </S.LinearGradient>
      <S.RadialGradient id="pieBr" cx="0.35" cy="0.3" r="0.8">
        <S.Stop offset="0" stopColor={mix(col.base, '#ffffff', 0.3)} />
        <S.Stop offset="1" stopColor={col.deep} />
      </S.RadialGradient>
      <S.RadialGradient id="pieHi" cx="0.5" cy="0.5" r="0.5">
        <S.Stop offset="0" stopColor="#fffbe9" stopOpacity="0.85" />
        <S.Stop offset="1" stopColor="#fffbe9" stopOpacity="0" />
      </S.RadialGradient>
    </S.Defs>
  )
}

/* ---------- Steam ---------- */

const STEAM_BOX = 64

function steamCurls(f) {
  const m = f.w * 0.5
  return [
    [m - 22, -12, 1, 0, 26],
    [m, -13, -1, 1.2, 32],
    [m + 22, -12, 1, 2.4, 28],
  ].map(([x, y, s, dl, hh]) => {
    const k = hh / 30
    const d = `M${r2(x)} ${r2(y)}C${r2(x + 6 * s)} ${r2(y - 7 * k)} ${r2(x - 6 * s)} ${r2(y - 12 * k)} ${r2(x)} ${r2(y - 18 * k)}C${r2(x + 5 * s)} ${r2(y - 22 * k)} ${r2(x - 3 * s)} ${r2(y - 26 * k)} ${r2(x + 1.5 * s)} ${r2(y - 30 * k)}`
    return { d, x, y: y - 15 * k, dl }
  })
}

function SteamDefs({ S, light }) {
  const sc = light ? '#b9a48c' : '#fff8ea'
  const so = light ? 0.85 : 0.8
  return (
    <S.Defs>
      <S.LinearGradient id="pieSt" x1="0" y1="-12" x2="0" y2="-46" gradientUnits="userSpaceOnUse">
        <S.Stop offset="0" stopColor={sc} stopOpacity={so} />
        <S.Stop offset="0.55" stopColor={sc} stopOpacity={r2(so * 0.6)} />
        <S.Stop offset="1" stopColor={sc} stopOpacity="0" />
      </S.LinearGradient>
    </S.Defs>
  )
}

function SteamCurl({ S, d }) {
  return (
    <>
      <S.Path d={d} fill="none" stroke="url(#pieSt)" strokeOpacity={0.45} strokeWidth={7} strokeLinecap="round" />
      <S.Path d={d} fill="none" stroke="url(#pieSt)" strokeWidth={3.4} strokeLinecap="round" />
    </>
  )
}

// Rises 22 px over 3.6 s, in by a quarter, then fades.
function steamAt(t, it) {
  'worklet'
  const u0 = (t + it.dl) / 3.6
  const u = u0 - Math.floor(u0)
  const o = u < 0.25 ? (u / 0.25) * 0.95 : 0.95 * (1 - (u - 0.25) / 0.75)
  return { x: it.x, y: it.y + 6 - 22 * u, o, s: 0.9 + 0.2 * u }
}

const TWINKLES_MOVING = 10

function twinkleAt(t, it) {
  'worklet'
  const c = 0.5 - 0.5 * Math.cos(((t + it.ph) / 2.8) * 6.2832)
  return { x: it.x, y: it.y, o: 0.15 + 0.85 * c, s: 0.6 + 0.4 * c }
}

function warmAt(t) {
  'worklet'
  return { opacity: 0.89 - 0.11 * Math.cos((t / 5) * 6.2832) }
}

/* ---------- Under: the oven glow ---------- */

export function PieUnder({ f }) {
  const S = svgAll()
  const { done, bake, live } = usePie(f)
  const light = f.c.light
  const rings = useMemo(() => {
    if (!S || (bake <= 0 && !done)) return null
    const steps = f.still ? 8 : 26
    const amt = (light ? 0.07 : 0.1) * (0.35 + 0.65 * bake) * (done ? 1.25 : 1)
    const stroke = light ? '#ff9a2e' : '#ffb35c'
    const out = []
    for (let i = 0; i < steps; i++) {
      const k = -14 - i
      out.push(<S.Path key={i} d={rrPath(k, k, f.w - 2 * k, f.h - 2 * k, f.R - k)} fill="none" stroke={stroke} strokeWidth={3} strokeOpacity={r2(amt * Math.pow(1 - i / steps, 1.5))} />)
    }
    return out
  }, [S, f.w, f.h, f.R, f.still, bake, done, light])
  if (!rings) return null
  const layer = (
    <SvgLayer w={f.w} h={f.h}>
      {rings}
    </SvgLayer>
  )
  if (!live) return layer
  return (
    <Moving clock={f.clock} fn={warmAt} style={FILL}>
      {layer}
    </Moving>
  )
}

/* ---------- Over: crust, leaves, sugar, then steam ---------- */

export function PieOver({ f }) {
  const S = svgAll()
  const { done, bake, live, col } = usePie(f)
  const light = f.c.light
  const geo = useMemo(() => {
    const flutes = flutesFor(f)
    return { outer: crustOuter(flutes), parts: fluteParts(flutes), sugar: sugarFor(f), steam: steamCurls(f) }
  }, [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  // On the top card, once done, the first few twinkles move; the rest are drawn still.
  const moving = live && done
  const twinkles = useMemo(() => geo.sugar.twinkles.map((q, i) => ({ ...q, i })), [geo])
  const still = moving ? twinkles.slice(TWINKLES_MOVING) : twinkles
  if (!S) return null
  const { outer, parts } = geo
  const cc = (off) => f.R - (f.R + off) * Math.SQRT1_2
  return (
    <>
      <SvgLayer w={f.w} h={f.h}>
        <PieDefs S={S} col={col} />
        <S.Path d={`${outer} ${ring(f, 3)}`} fillRule="evenodd" transform="translate(0 2)" fill="#1e0d03" fillOpacity={light ? 0.16 : 0.42} />
        <S.Path d={`${outer} ${ring(f, 1)}`} fillRule="evenodd" fill="url(#pieCr)" />
        <S.G fill={col.deep} fillOpacity={0.55}>
          {parts.holes.map((q) => (
            <S.Ellipse key={q.i} cx={q.x} cy={q.y} rx={4.4} ry={2.3} transform={`rotate(${q.ang} ${q.x} ${q.y})`} />
          ))}
        </S.G>
        <S.Path d={parts.tip} fill="none" stroke={col.edge} strokeWidth={2.2} strokeLinecap="round" strokeOpacity={r2(0.18 + bake * 0.5)} />
        <S.Path d={parts.pin} fill="none" stroke={col.edge} strokeWidth={1.6} strokeLinecap="round" strokeOpacity={0.95} />
        <S.Path d={parts.pinHi} fill="none" stroke="#fff6dc" strokeWidth={0.7} strokeLinecap="round" strokeOpacity={r2(0.6 - bake * 0.2)} />
        <S.G fill="url(#pieHi)">
          {parts.lits.map((q) => (
            <S.Ellipse key={q.i} cx={q.x} cy={q.y} rx={3.8} ry={1.5} transform={`rotate(${q.ang} ${q.x} ${q.y})`} />
          ))}
        </S.G>
        <S.Path d={outer} fill="none" stroke={col.edge} strokeWidth={light ? 1.25 : 0.9} strokeOpacity={0.95} />
        <S.Path d={ring(f, 1.4)} fill="none" stroke={col.lip} strokeWidth={1.5} />
        <S.Path d={ring(f, 4.6)} fill="none" stroke={col.deep} strokeWidth={3.4} strokeOpacity={0.35} />
        <S.Path d={ring(f, 3.4)} fill="none" stroke="#fff6dc" strokeWidth={1.1} strokeOpacity={r2(0.6 - bake * 0.2)} />
        <S.Path d={ring(f, 7.6)} fill="none" stroke={col.edge} strokeWidth={0.7} strokeOpacity={0.55} />
        {bake > 0 ? (
          <>
            <S.Path d={geo.sugar.sugar} fill="#fffaf0" fillOpacity={r2(0.25 + bake * 0.6)} />
            {still.length ? <S.Path d={still.map((q) => sparkD(q.x, q.y, 1.5)).join('')} fill="#fffaf0" fillOpacity={r2(bake)} /> : null}
          </>
        ) : null}
        <LeafCluster S={S} x={cc(11)} y={cc(11)} rot={0} col={col} bake={bake} light={light} />
        <LeafCluster S={S} x={f.w - cc(11)} y={f.h - cc(11)} rot={180} col={col} bake={bake} light={light} />
        {done && !live ? (
          <>
            <SteamDefs S={S} light={light} />
            {geo.steam.map((c, i) => (
              <SteamCurl key={i} S={S} d={c.d} />
            ))}
          </>
        ) : null}
      </SvgLayer>
      {moving
        ? twinkles.slice(0, TWINKLES_MOVING).map((it) => (
            <Particle key={`t${it.i}`} clock={f.clock} item={it} fn={twinkleAt} w={f.w} h={f.h} size={4}>
              <S.Svg width={4} height={4} viewBox="-2 -2 4 4">
                <S.Path d={sparkD(0, 0, 1.5)} fill="#fffaf0" fillOpacity={r2(bake)} />
              </S.Svg>
            </Particle>
          ))
        : null}
      {done && live
        ? geo.steam.map((c, i) => (
            <Particle key={`s${i}`} clock={f.clock} item={c} fn={steamAt} w={f.w} h={f.h} size={STEAM_BOX}>
              <S.Svg width={STEAM_BOX} height={STEAM_BOX} viewBox={`${r2(c.x - STEAM_BOX / 2)} ${r2(c.y - STEAM_BOX / 2)} ${STEAM_BOX} ${STEAM_BOX}`}>
                <SteamDefs S={S} light={light} />
                <SteamCurl S={S} d={c.d} />
              </S.Svg>
            </Particle>
          ))
        : null}
    </>
  )
}

export const FRAME_ART_2026_11_23 = {
  pie: { under: PieUnder, over: PieOver, animated: true },
}
