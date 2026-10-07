// Frames added 2026-10-07: seven coin frames, eight living gem frames that
// react to the night (tonight's answers, the swipe, the streak, the evening)
// and six specials. Same contract as art.jsx: each draws in card space and
// may reach PAD past the card; f.p carries the night, f.pull the swipe.
import { useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { rrLength, rrPath, rrPointAt } from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll } from './runtime.jsx'
import { BuddyArt } from '../BuddyArt.jsx'

const TAU = Math.PI * 2

function Layer({ f, children }) {
  return (
    <SvgLayer w={f.w} h={f.h}>
      {children}
    </SvgLayer>
  )
}

/** A rounded ring o px outside the card (negative o is inside). */
function ring(f, o) {
  return rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, Math.max(0, f.R + o))
}

/** The band between the card and o px out, for fills that must not cover the card. */
function band(f, o) {
  return `${rrPath(-o, -o, f.w + 2 * o, f.h + 2 * o, f.R + o)} ${rrPath(0, 0, f.w, f.h, f.R)}`
}

/** n points spread evenly round the ring o px out, starting at t0 (share of the loop). */
function spots(f, o, n, t0 = 0) {
  const W = f.w + 2 * o
  const H = f.h + 2 * o
  const L = rrLength(W, H, f.R + o)
  return Array.from({ length: n }, (_, i) => rrPointAt(-o, -o, W, H, f.R + o, ((t0 + i / n) % 1) * L))
}

/** A seeded random, so a frame looks the same every render. */
function seeded(seed) {
  let x = seed
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

/** Point d px along a rounded ring, for worklets (same path as rrPath). */
function edgeAt(d, X, Y, W, H, r) {
  'worklet'
  const sv = H - 2 * r
  const sh = W - 2 * r
  const arc = (Math.PI * r) / 2
  const L = 2 * sv + 2 * sh + 4 * arc
  let s = ((d % L) + L) % L
  if (s < sv) return { x: X, y: Y + H - r - s, a: -Math.PI / 2 }
  s -= sv
  if (s < arc) {
    const th = Math.PI + s / r
    return { x: X + r + r * Math.cos(th), y: Y + r + r * Math.sin(th), a: th + Math.PI / 2 }
  }
  s -= arc
  if (s < sh) return { x: X + r + s, y: Y, a: 0 }
  s -= sh
  if (s < arc) {
    const th = -Math.PI / 2 + s / r
    return { x: X + W - r + r * Math.cos(th), y: Y + r + r * Math.sin(th), a: th + Math.PI / 2 }
  }
  s -= arc
  if (s < sv) return { x: X + W, y: Y + r + s, a: Math.PI / 2 }
  s -= sv
  if (s < arc) {
    const th = s / r
    return { x: X + W - r + r * Math.cos(th), y: Y + H - r + r * Math.sin(th), a: th + Math.PI / 2 }
  }
  s -= arc
  if (s < sh) return { x: X + W - r - s, y: Y + H, a: Math.PI }
  s -= sh
  const th = Math.PI / 2 + Math.min(s, arc) / r
  return { x: X + r + r * Math.cos(th), y: Y + H - r + r * Math.sin(th), a: th + Math.PI / 2 }
}

function twinkleAt(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * it.sp + it.ph)) }
}

/** True for a moment after tonight's answered count goes up: a Did just landed. */
function useJustDid(answered, ms = 2200) {
  const last = useRef(answered)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (answered > last.current) {
      setOn(true)
      const id = setTimeout(() => setOn(false), ms)
      last.current = answered
      return () => clearTimeout(id)
    }
    last.current = answered
    return undefined
  }, [answered, ms])
  return on
}

function Star({ f, items }) {
  return items.map((it, i) => (
    <Particle key={i} clock={f.clock} item={it} fn={twinkleAt} w={f.w} h={f.h} size={it.r * 2 + 2}>
      <View style={{ width: it.r * 2, height: it.r * 2, borderRadius: it.r, backgroundColor: it.col || '#ffffff' }} />
    </Particle>
  ))
}

/* ---------- Coin frames (still) ---------- */

export function TicketOver({ f }) {
  const S = svgAll()
  const col = '#f0b44a'
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 7)} fill="none" stroke={col} strokeWidth={3} />
      <S.Path d={ring(f, 2.5)} fill="none" stroke={col} strokeOpacity={0.7} strokeWidth={1.4} strokeDasharray="4 4" />
      {[-7, f.w + 7].map((x) => (
        <S.Circle key={x} cx={x} cy={f.h / 2} r={6.5} fill={f.c.bg} stroke={col} strokeWidth={2.5} />
      ))}
    </Layer>
  )
}

export function NotebookOver({ f }) {
  const S = svgAll()
  const loops = []
  for (let y = f.R + 6; y < f.h - f.R - 2; y += 16) loops.push(y)
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 6)} fill="none" stroke="#7aa7e0" strokeWidth={2} />
      <S.Line x1={-13} y1={-6} x2={-13} y2={f.h + 6} stroke="#ef6a5b" strokeOpacity={0.6} strokeWidth={1.2} />
      {loops.map((y) => (
        <S.Ellipse key={y} cx={-6} cy={y} rx={6} ry={3.6} fill="none" stroke="#c7ced8" strokeWidth={1.8} />
      ))}
    </Layer>
  )
}

export function PostageOver({ f }) {
  const S = svgAll()
  const col = '#d9c6a3'
  const x = f.w - 26
  const y = -12
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 10)} fill="none" stroke={col} strokeWidth={5} strokeLinecap="round" strokeDasharray="0.1 8" />
      <S.Path d={ring(f, 4)} fill="none" stroke={col} strokeWidth={1.5} />
      <S.Circle cx={x + 6} cy={y + 4} r={11} fill="none" stroke={f.c.ink} strokeOpacity={0.45} strokeWidth={1.2} />
      {[0, 1, 2].map((i) => (
        <S.Path key={i} d={`M${x - 24} ${y + i * 5} q6 -4 12 0 t12 0 t12 0`} fill="none" stroke={f.c.ink} strokeOpacity={0.45} strokeWidth={1.2} />
      ))}
    </Layer>
  )
}

export function BambooOver({ f }) {
  const S = svgAll()
  const leaf = (x, y, a) => (
    <S.Path key={`${a}`} transform={`translate(${x} ${y}) rotate(${a})`} d="M0 0 q10 -8 24 0 q-12 8 -24 0z" fill="#5fb36a" />
  )
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="bmb" x1="0" y1="0" x2="1" y2="0">
          <S.Stop offset="0" stopColor="#9ccf6b" />
          <S.Stop offset="1" stopColor="#4f9a55" />
        </S.LinearGradient>
      </S.Defs>
      <S.Path d={ring(f, 7)} fill="none" stroke="url(#bmb)" strokeWidth={6} />
      <S.Path d={ring(f, 7)} fill="none" stroke="#2f6b39" strokeWidth={6} strokeDasharray="2 44" />
      {leaf(f.w - f.R * 0.4, -8, -30)}
      {leaf(f.w - f.R * 0.4, -8, 10)}
    </Layer>
  )
}

export function ChalkOver({ f }) {
  const S = svgAll()
  const c = 'rgba(240,240,232,0.82)'
  const sx = f.w + 4
  const sy = -8
  const k = 8
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 5)} fill="none" stroke={c} strokeWidth={2} strokeDasharray="70 5 22 4 40 3" strokeLinecap="round" />
      <S.Path d={ring(f, 9)} fill="none" stroke={c} strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="40 8 90 6" strokeLinecap="round" />
      <S.Path
        d={`M${sx} ${sy - k}L${sx + k * 0.3} ${sy - k * 0.3}L${sx + k} ${sy}L${sx + k * 0.3} ${sy + k * 0.3}L${sx} ${sy + k}L${sx - k * 0.3} ${sy + k * 0.3}L${sx - k} ${sy}L${sx - k * 0.3} ${sy - k * 0.3}Z`}
        fill="none"
        stroke={c}
        strokeWidth={1.6}
      />
      <S.Path d={`M-8 ${f.h + 8} c6 -6 14 -4 12 3 c-2 5 -9 4 -8 -1`} fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
    </Layer>
  )
}

const QUILT = ['#e9a07b', '#7fb2d6', '#f2d17a', '#a5c98b']
export function QuiltOver({ f }) {
  const S = svgAll()
  const k = 10
  const corners = [
    [-14, -14],
    [f.w + 14 - 2 * k, -14],
    [-14, f.h + 14 - 2 * k],
    [f.w + 14 - 2 * k, f.h + 14 - 2 * k],
  ]
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 6)} fill="none" stroke="#e8dcc7" strokeWidth={1.6} strokeDasharray="6 4" />
      {corners.map(([x, y], c) =>
        [0, 1, 2, 3].map((n) => (
          <S.Rect key={`${c}${n}`} x={x + (n % 2) * k} y={y + Math.floor(n / 2) * k} width={k} height={k} fill={QUILT[(n + c) % 4]} stroke={f.c.bg} strokeWidth={1} />
        )),
      )}
    </Layer>
  )
}

export function RopeOver({ f }) {
  const S = svgAll()
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 7)} fill="none" stroke="#c99b62" strokeWidth={7} />
      <S.Path d={ring(f, 7)} fill="none" stroke="#8a5f35" strokeWidth={7} strokeDasharray="6 6" />
      <S.Path d={ring(f, 7)} fill="none" stroke="#f0d3a6" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 6" strokeDashoffset={3} />
    </Layer>
  )
}

/* ---------- Living gem frames ---------- */

// Night Street: a window lights for each question answered tonight; all done
// and the street glows and the moon is up.
const HOUSES = [
  [26, 13, 'roof'],
  [20, 18, 'tall'],
  [30, 12, 'wide'],
  [22, 15, 'roof'],
  [24, 17, 'tower'],
]
export function StreetOver({ f }) {
  const S = svgAll()
  const total = Math.max(3, Math.min(8, f.p.total || 4))
  const lit = Math.min(total, f.p.answered || 0)
  const all = (f.p.total || 0) > 0 && (f.p.answered || 0) >= f.p.total
  const base = f.h + 22
  const step = f.w / total
  const stars = useMemo(() => {
    const r = seeded(3)
    return Array.from({ length: 10 }, () => ({ x: r() * f.w, y: -8 - r() * 12, r: 0.8 + r() * 0.9, sp: 1 + r() * 2, ph: r() * 6 }))
  }, [f.w])
  return (
    <>
      <Layer f={f}>
        <S.Path d={band(f, 22)} fillRule="evenodd" fill="#0f1424" stroke="#2e3650" strokeWidth={1.2} />
        {all ? <S.Path d={ring(f, 22)} fill="none" stroke="#ffd166" strokeOpacity={0.35} strokeWidth={6} /> : null}
        <S.Line x1={-18} y1={base} x2={f.w + 18} y2={base} stroke="#2e3650" strokeWidth={2} />
        {Array.from({ length: total }, (_, i) => {
          const [hw, hh, k] = HOUSES[i % 5]
          const cx = step * (i + 0.5)
          const top = base - hh
          const on = i < lit
          return (
            <S.G key={i}>
              {k === 'wide' ? <S.Rect x={cx + hw / 4} y={top - 6} width={5} height={6} fill="#2e3650" /> : null}
              {k === 'roof' ? <S.Path d={`M${cx - hw / 2 - 3} ${top} L${cx} ${top - 7} L${cx + hw / 2 + 3} ${top}Z`} fill="#2e3650" /> : null}
              {k === 'tower' ? <S.Path d={`M${cx - hw / 2} ${top} L${cx} ${top - 8} L${cx + hw / 2} ${top}Z`} fill="#2e3650" /> : null}
              {k === 'tall' || k === 'wide' ? <S.Rect x={cx - hw / 2 - 2} y={top - 4} width={hw + 4} height={5} fill="#2e3650" /> : null}
              <S.Rect x={cx - hw / 2} y={top} width={hw} height={hh} fill="#232a3d" />
              {on ? <S.Rect x={cx - 11} y={top} width={22} height={12} fill="#ffd166" opacity={0.14} /> : null}
              <S.Rect x={cx - 4} y={top + 3} width={8} height={6} rx={1.5} fill={on ? '#ffd166' : '#141826'} />
            </S.G>
          )
        })}
        {all ? (
          <S.G>
            <S.Circle cx={f.w + 6} cy={-10} r={11} fill="#fff4cf" />
            <S.Circle cx={f.w + 11} cy={-13} r={10} fill="#0f1424" />
          </S.G>
        ) : null}
      </Layer>
      <Star f={f} items={stars.map((s) => ({ ...s, col: all ? '#ffffff' : '#9aa6c6' }))} />
    </>
  )
}

// String Lights: two bulbs per question. Did lights them, Not yet flickers,
// all done twinkles every bulb.
const BULBS = ['#ffd166', '#ff6b9a', '#7bd3ff', '#9be36b', '#c79bff']
function bulbAt(time, it) {
  'worklet'
  if (it.mode === 2) return { x: it.x, y: it.y, o: 0.55 + 0.45 * Math.sin(time * 3 + it.ph), r: it.a }
  if (it.mode === 1) {
    const q = (time * 1.3 + it.ph) % 1
    return { x: it.x, y: it.y, o: q < 0.15 || (q > 0.3 && q < 0.4) ? 0.9 : 0.25, r: it.a }
  }
  return { x: it.x, y: it.y, o: 1, r: it.a }
}
export function LightsOver({ f }) {
  const S = svgAll()
  const q = Math.max(6, Math.min(8, f.p.total || 6))
  const n = q * 2
  const all = (f.p.total || 0) > 0 && (f.p.answered || 0) >= f.p.total
  // The wire follows the card's own curve, so it never cuts across a corner.
  const pins = spots(f, 7, n, 0.5 / n)
  const bulbs = pins.map((p, i) => {
    const k = Math.floor(i / 2)
    const on = k < (f.p.answered || 0)
    const sk = !on && k < (f.p.answered || 0) + (f.p.skipped || 0)
    return { x: p.x + p.nx * 7, y: p.y + p.ny * 7, a: p.ang, on, sk, col: BULBS[k % 5], mode: all ? 2 : sk ? 1 : 0, ph: i * 0.37 }
  })
  const wire = ring(f, 7)
  return (
    <>
      <Layer f={f}>
        <S.Path d={wire} fill="none" stroke="#3b3f2f" strokeWidth={1.6} />
        {bulbs.map((b, i) => (
          <S.G key={i}>
            <S.Line x1={pins[i].x} y1={pins[i].y} x2={b.x} y2={b.y} stroke="#3b3f2f" strokeWidth={1.4} />
            {f.still && (b.on || b.sk) ? (
              <S.G>
                <S.Circle cx={b.x} cy={b.y} r={12} fill={b.col} opacity={0.22} />
                <S.Ellipse cx={b.x} cy={b.y} rx={4.6} ry={6.4} transform={`rotate(${(b.a * 180) / Math.PI} ${b.x} ${b.y})`} fill={b.col} stroke="#ffffff" strokeWidth={0.8} />
              </S.G>
            ) : null}
            {!b.on && !b.sk ? (
              <S.Ellipse cx={b.x} cy={b.y} rx={4.6} ry={6.4} transform={`rotate(${(b.a * 180) / Math.PI} ${b.x} ${b.y})`} fill="#2a2e38" stroke="#4a4f5c" strokeWidth={0.8} />
            ) : null}
          </S.G>
        ))}
      </Layer>
      {bulbs
        .filter((b) => b.on || b.sk)
        .map((b, i) => (
          <Particle key={i} clock={f.clock} item={b} fn={bulbAt} w={f.w} h={f.h} size={26}>
            <S.Svg width={26} height={26} viewBox="-13 -13 26 26">
              <S.Circle r={12} fill={b.col} opacity={0.22} />
              <S.Ellipse rx={4.6} ry={6.4} fill={b.col} stroke="#ffffff" strokeWidth={0.8} />
            </S.Svg>
          </Particle>
        ))}
    </>
  )
}

// Buddy Train: a toy train circles the card with your buddy in the last car,
// and runs faster for a moment after a Did.
function carAt(time, it, w, h) {
  'worklet'
  const o = it.o
  const p = edgeAt(time * it.speed - it.gap, -o, -o, w + 2 * o, h + 2 * o, it.R + o)
  return { x: p.x, y: p.y, o: 1, r: p.a }
}
export function TrainOver({ f }) {
  const S = svgAll()
  const fast = useJustDid(f.p.answered || 0)
  const o = 12
  const ties = spots(f, o, 46)
  const speed = fast ? 70 : 26
  const cars = [
    { gap: 0, kind: 'engine' },
    { gap: 26, kind: 'blue' },
    { gap: 50, kind: 'buddy' },
  ].map((c) => ({ ...c, o, R: f.R, speed }))
  return (
    <>
      <Layer f={f}>
        {ties.map((t, i) => (
          <S.Rect key={i} x={t.x - 1.5} y={t.y - 6} width={3} height={12} rx={1} fill="#6b4a2e" transform={`rotate(${(t.ang * 180) / Math.PI} ${t.x} ${t.y})`} />
        ))}
        <S.Path d={ring(f, o + 3.5)} fill="none" stroke="#9aa3b5" strokeWidth={1.6} />
        <S.Path d={ring(f, o - 3.5)} fill="none" stroke="#9aa3b5" strokeWidth={1.6} />
      </Layer>
      {cars.map((c) => (
        <Particle key={c.kind} clock={f.clock} item={c} fn={carAt} w={f.w} h={f.h} size={30}>
          <S.Svg width={30} height={30} viewBox="-15 -15 30 30">
            {c.kind === 'engine' ? (
              <S.G>
                <S.Rect x={-11} y={-7} width={22} height={13} rx={3} fill="#ef6a5b" />
                <S.Rect x={2} y={-12} width={8} height={7} rx={1.5} fill="#c94a3c" />
                <S.Rect x={-9} y={-11} width={5} height={5} fill="#333" />
              </S.G>
            ) : (
              <S.Rect x={-9} y={-6} width={18} height={11} rx={2.5} fill={c.kind === 'blue' ? '#7bd3ff' : '#ffd166'} />
            )}
            <S.Circle cx={-5} cy={6} r={2.8} fill="#222" />
            <S.Circle cx={5} cy={6} r={2.8} fill="#222" />
          </S.Svg>
          {c.kind === 'buddy' && f.p.buddy ? (
            <View style={{ position: 'absolute', top: -4, left: 8 }}>
              <BuddyArt id={f.p.buddy} width={14} height={17} />
            </View>
          ) : null}
        </Particle>
      ))}
    </>
  )
}

// Paper Garden: a folded paper flower for each night of the streak, buds for
// the nights still to come; fourteen fills the garden.
const PETALS = ['#ff8fb1', '#ffd166', '#7bd3ff', '#c79bff', '#9be36b', '#ff9f43', '#f7f7f7']
export function GardenOver({ f }) {
  const S = svgAll()
  const grown = Math.min(14, Number(f.p.streak) || 0)
  const vine = spots(f, 8, 40)
  const flowers = spots(f, 8, 14, 0.62)
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 8)} fill="none" stroke="#3f7d46" strokeWidth={2} />
      {vine.map((p, i) => (
        <S.Ellipse key={i} cx={p.x} cy={p.y} rx={4} ry={1.8} fill={i % 3 ? '#4f9a55' : '#6fc07a'} transform={`rotate(${(p.ang * 180) / Math.PI + (i % 2 ? 35 : -35)} ${p.x} ${p.y})`} />
      ))}
      {flowers.map((p, i) => {
        const fx = p.x + p.nx * 9
        const fy = p.y + p.ny * 9
        const deg = (p.ang * 180) / Math.PI
        return (
          <S.G key={i}>
            <S.Line x1={p.x} y1={p.y} x2={fx} y2={fy} stroke="#4f9a55" strokeWidth={1.8} />
            {i < grown ? (
              <S.G transform={`translate(${fx} ${fy}) rotate(${deg})`}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <S.Path key={a} d="M0 0 L-6 -12 L0 -17 L6 -12Z" fill={PETALS[i % 7]} stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} transform={`rotate(${a})`} />
                ))}
                <S.Circle r={3.4} fill="#fff4cf" stroke="#e2b75a" strokeWidth={0.8} />
              </S.G>
            ) : (
              <S.G transform={`translate(${fx} ${fy}) rotate(${deg})`}>
                <S.Path d="M0 2 C-5 -3 -4 -9 0 -12 C4 -9 5 -3 0 2Z" fill="#d98aa6" stroke="#5fb36a" strokeWidth={1.2} />
              </S.G>
            )}
          </S.G>
        )
      })}
    </Layer>
  )
}

// Night Sky Clock: the border is the evening, sunset at the hills to deep
// night; the sun or moon sits at the hour and a bell at your reminder.
function skyColor(t) {
  const c = [
    [255, 179, 71],
    [255, 107, 138],
    [122, 79, 179],
    [34, 48, 107],
    [11, 18, 54],
  ]
  const k = Math.min(0.999, Math.max(0, t)) * 4
  const i = Math.floor(k)
  const q = k - i
  const a = c[i]
  const b = c[i + 1]
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * q)).join(',')})`
}
export function DuskOver({ f }) {
  const S = svgAll()
  const o = 11
  const T = Math.min(1, Math.max(0, Number(f.p.evening) || 0))
  const start = 0
  const at = (t) => {
    const W = f.w + 2 * o
    const H = f.h + 2 * o
    return rrPointAt(-o, -o, W, H, f.R + o, (((t + start) % 1) * rrLength(W, H, f.R + o)))
  }
  const N = 56
  const segs = Array.from({ length: N }, (_, i) => [at(i / N), at(Math.min(0.999, (i + 1.3) / N)), skyColor(i / N)])
  const sun = at(T)
  const bell = at(Math.min(1, Math.max(0, Number(f.p.remind) || 0.57)))
  // Hills over the bottom left corner, where night meets sunset.
  const hill = { x: -o + 10, y: f.h + o - 4 }
  const stars = useMemo(() => {
    const r = seeded(4)
    return Array.from({ length: 22 }, () => r()).filter((t) => t < T - 0.04).map((t) => {
      const p = at(t)
      return { x: p.x + (r() - 0.5) * 12, y: p.y + (r() - 0.5) * 12, r: 0.6 + r() * 0.8, sp: 1 + r() * 2, ph: r() * 6 }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T, f.w, f.h])
  return (
    <>
      <Layer f={f}>
        {segs.map(([a, b, c], i) => (
          <S.Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={18} />
        ))}
        <S.Path d={ring(f, o + 9)} fill="none" stroke="#ffffff" strokeOpacity={0.15} />
      </Layer>
      <Star f={f} items={stars} />
      <Layer f={f}>
        {T < 0.55 ? (
          <S.G>
            <S.Circle cx={sun.x} cy={sun.y} r={14} fill="#ffd166" opacity={0.25} />
            <S.Circle cx={sun.x} cy={sun.y} r={8} fill="#ffd166" />
          </S.G>
        ) : (
          <S.G>
            <S.Circle cx={sun.x} cy={sun.y} r={7.5} fill="#fff4cf" />
            <S.Circle cx={sun.x + 4} cy={sun.y - 3} r={6.5} fill={skyColor(T)} />
          </S.G>
        )}
        <S.Path
          d={`M${hill.x - 30} ${f.h + 20} Q${hill.x - 18} ${hill.y - 10} ${hill.x - 6} ${hill.y} Q${hill.x + 4} ${hill.y - 14} ${hill.x + 16} ${hill.y - 2} Q${hill.x + 26} ${hill.y - 8} ${hill.x + 36} ${f.h + 20}Z`}
          fill="#141a2e"
          stroke="#2a3352"
          strokeWidth={1}
        />
        <S.Rect x={hill.x + 4} y={hill.y - 6} width={6} height={5} fill="#ffd166" />
        <S.G transform={`translate(${bell.x} ${bell.y})`}>
          <S.Path d="M-5 3 Q-5 -6 0 -6 Q5 -6 5 3 Z" fill="#f2c45a" stroke="#7a5a12" strokeWidth={0.8} />
          <S.Circle cy={4.5} r={1.6} fill="#f2c45a" />
        </S.G>
      </Layer>
    </>
  )
}

// Snow Globe: snow drifts in the glass round the card; the swipe shakes it.
function snowFor(pull) {
  return (time, it, w, h) => {
    'worklet'
    const push = pull ? pull.value * 0.12 : 0
    const life = it.life
    const q = (((time + it.off) / life) % 1 + 1) % 1
    let x = it.x + Math.sin(time * 1.2 + it.ph) * 4 + push * it.k
    let y = -14 + q * (h + 26)
    if (x < -16) x = -16
    if (x > w + 16) x = w + 16
    // Keep the flakes in the glass, not on the card.
    if (x > 2 && x < w - 2 && y > 2 && y < h - 2) x = x < w / 2 ? -6 - it.k * 8 : w + 6 + it.k * 8
    return { x, y, o: 0.85 }
  }
}
export function GlobeOver({ f }) {
  const S = svgAll()
  const flakes = useMemo(() => {
    const r = seeded(12)
    return Array.from({ length: 22 }, () => ({ x: -14 + r() * (f.w + 28), off: r() * 8, life: 6 + r() * 5, ph: r() * 6, k: r(), s: 2 + r() * 2.4 }))
  }, [f.w])
  // A new function per pull value so the worklet captures it.
  const fn = useMemo(() => snowFor(f.pull), [f.pull])
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.RadialGradient id="glb" cx="0.3" cy="0.25" r="0.9">
            <S.Stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <S.Stop offset="0.6" stopColor="#9fd3ff" stopOpacity="0.04" />
            <S.Stop offset="1" stopColor="#9fd3ff" stopOpacity="0.14" />
          </S.RadialGradient>
        </S.Defs>
        <S.Path d={`${rrPath(-18, -18, f.w + 36, f.h + 26, f.R + 18)} ${rrPath(0, 0, f.w, f.h, f.R)}`} fillRule="evenodd" fill="url(#glb)" />
        <S.Path d={rrPath(-18, -18, f.w + 36, f.h + 26, f.R + 18)} fill="none" stroke="#cfe8ff" strokeOpacity={0.6} strokeWidth={1.5} />
        <S.Path d={`M${f.R * 0.4} -14 Q${f.w * 0.25} -20 ${f.w * 0.45} -17`} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" />
        <S.Path d={`M-22 ${f.h + 8} H${f.w + 22} L${f.w + 14} ${f.h + 22} H-14Z`} fill="#7a4a2a" stroke="#4a2a14" />
        <S.Rect x={-22} y={f.h + 6} width={f.w + 44} height={4} rx={2} fill="#a06a40" />
      </Layer>
      {flakes.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={fn} w={f.w} h={f.h} size={it.s}>
          <View style={{ width: it.s, height: it.s, borderRadius: it.s / 2, backgroundColor: '#ffffff' }} />
        </Particle>
      ))}
    </>
  )
}

// Doodle Margin: notebook paper round the card, and a doodle for each answer.
const DOODLES = [
  'M0 0 l5 6 l11 -14',
  'M8 -10 L10.4 -3 L18 -3 L12 1.6 L14.4 9 L8 4.6 L1.6 9 L4 1.6 L-2 -3 L5.6 -3Z',
  'M8 8 C-6 -2 2 -12 8 -4 C14 -12 22 -2 8 8Z',
  'M8 0 a2 2 0 1 1 4 0 a5 5 0 1 1 -10 0 a8 8 0 1 1 16 0',
  'M8 0 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M8 -10 v-4 M8 10 v4 M-2 0 h-4 M18 0 h4',
  'M0 0 q8 -14 16 0 q-8 14 -16 0 M4 4 q4 4 8 0',
]
const INKS = ['#9be36b', '#ffd166', '#ff8fb1', '#7bd3ff', '#ffb347', '#c79bff']
function wiggleAt(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 1, r: Math.sin(time * 2.4) * 0.12, s: 1 + Math.sin(time * 3) * 0.06 }
}
export function DoodleOver({ f }) {
  const S = svgAll()
  const n = Math.min(6, f.p.answered || 0)
  const where = [
    [-22, 18],
    [f.w - 2, -20],
    [-20, f.h - 22],
    [f.w + 2, f.h - 8],
    [f.w / 2 - 8, -20],
    [f.w / 2 + 40, f.h + 4],
  ]
  const lines = []
  for (let y = -16; y < f.h + 18; y += 9) lines.push(y)
  const newest = n > 0 ? { x: where[n - 1][0] + 8, y: where[n - 1][1] } : null
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.ClipPath id="ddc">
            <S.Path d={band(f, 22)} clipRule="evenodd" />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={band(f, 22)} fillRule="evenodd" fill="#f4f1e8" opacity={0.06} />
        <S.G clipPath="url(#ddc)">
          {lines.map((y) => (
            <S.Line key={y} x1={-24} y1={y} x2={f.w + 24} y2={y} stroke="#7aa7e0" strokeOpacity={0.16} strokeWidth={0.8} />
          ))}
        </S.G>
        <S.Line x1={-12} y1={-22} x2={-12} y2={f.h + 22} stroke="#ef6a5b" strokeOpacity={0.45} strokeWidth={1} />
        <S.Path d={`M10 -26 v22 a5 5 0 0 0 10 0 v-18 a3 3 0 0 0 -6 0 v16`} fill="none" stroke="#c9cfdb" strokeWidth={2} strokeLinecap="round" />
        <S.Circle cx={f.w + 8} cy={f.h + 8} r={13} fill="none" stroke="#8a5f35" strokeOpacity={0.45} strokeWidth={3} strokeDasharray="60 6 12 4" />
        {where.slice(0, Math.max(0, n - 1)).map(([x, y], i) => (
          <S.Path key={i} transform={`translate(${x} ${y})`} d={DOODLES[i]} fill="none" stroke={INKS[i]} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Layer>
      {newest ? (
        <Particle clock={f.clock} item={newest} fn={wiggleAt} w={f.w} h={f.h} size={40}>
          <S.Svg width={40} height={40} viewBox="-12 -20 40 40">
            <S.Path d={DOODLES[n - 1]} fill="none" stroke={INKS[n - 1]} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </S.Svg>
        </Particle>
      ) : null}
    </>
  )
}

// Swipe Glow: warms and leans toward Did as you drag right, cools toward Not
// yet as you drag left, and bursts when a Did lands.
export function SwipeOver({ f }) {
  const S = svgAll()
  const burst = useJustDid(f.p.answered || 0, 900)
  const pull = f.pull
  const warm = useMemo(
    () => (time) => {
      'worklet'
      // No swipe here (a preview): drift between the two so the idea shows.
      const v = pull ? pull.value : Math.sin(time * 1.1) * 110
      return { opacity: 0.2 + Math.min(1, Math.max(0, v / 110)) * 0.8 }
    },
    [pull],
  )
  const cool = useMemo(
    () => (time) => {
      'worklet'
      const v = pull ? pull.value : Math.sin(time * 1.1) * 110
      return { opacity: 0.2 + Math.min(1, Math.max(0, -v / 110)) * 0.8 }
    },
    [pull],
  )
  const side = (id, col, leftward) => (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id={id} x1={leftward ? '1' : '0'} y1="0" x2={leftward ? '0' : '1'} y2="0">
          <S.Stop offset="0.35" stopColor={col} stopOpacity="0" />
          <S.Stop offset="1" stopColor={col} stopOpacity="1" />
        </S.LinearGradient>
      </S.Defs>
      {[14, 10, 6].map((o, i) => (
        <S.Path key={o} d={ring(f, o)} fill="none" stroke={`url(#${id})`} strokeWidth={3 + i * 2} strokeOpacity={0.35 + i * 0.25} />
      ))}
      <S.Path d={ring(f, 4)} fill="none" stroke={`url(#${id})`} strokeWidth={2.5} />
    </Layer>
  )
  return (
    <>
      <Moving clock={f.clock} fn={cool} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {side('swc', '#9aa3b5', true)}
      </Moving>
      <Moving clock={f.clock} fn={warm} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {side('sww', f.c.accent || '#c9f24d', false)}
      </Moving>
      {burst ? (
        <Layer f={f}>
          <S.Path d={ring(f, 16)} fill="none" stroke={f.c.accent || '#c9f24d'} strokeWidth={5} strokeOpacity={0.6} />
        </Layer>
      ) : null}
    </>
  )
}

/* ---------- Specials ---------- */

function heartD(cx, cy, s) {
  return `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.7} ${cy - s * 1.3} ${cx} ${cy - s * 0.45} C${cx + s * 0.7} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`
}
function beatAt(time, it) {
  'worklet'
  const q = (time / 1.6 + it.ph) % 1
  const s = q < 0.15 ? 1 + q * 1.6 : q < 0.3 ? 1.24 - (q - 0.15) * 1.6 : q < 0.45 ? 1 + (q - 0.3) : 1.15 - (q - 0.45) * 0.27
  return { x: it.x, y: it.y, o: 1, s }
}
export function HeartsOver({ f }) {
  const S = svgAll()
  const items = [
    { x: -6, y: -6, k: 10, col: '#ff5d8f', ph: 0 },
    { x: 18, y: -10, k: 7, col: '#ffb3c9', ph: 0.2 },
    { x: f.w + 6, y: f.h + 6, k: 10, col: '#ff5d8f', ph: 0.5 },
    { x: f.w - 18, y: f.h + 10, k: 7, col: '#ffb3c9', ph: 0.7 },
  ]
  return (
    <>
      <Layer f={f}>
        <S.Path d={ring(f, 6)} fill="none" stroke="#ff8fb1" strokeWidth={3} />
      </Layer>
      {items.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={beatAt} w={f.w} h={f.h} size={it.k * 3.4}>
          <S.Svg width={it.k * 3.4} height={it.k * 3.4} viewBox={`${-it.k * 1.7} ${-it.k * 1.7} ${it.k * 3.4} ${it.k * 3.4}`}>
            <S.Path d={heartD(0, 0, it.k)} fill={it.col} />
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}

export function CloverOver({ f }) {
  const S = svgAll()
  const k = 10
  const clover = (x, y) => (
    <S.G key={`${x}${y}`} transform={`translate(${x} ${y})`}>
      {[0, 90, 180, 270].map((a) => (
        <S.Path key={a} d={heartD(0, -k * 0.9, k * 0.62)} fill="#3fa75a" transform={`rotate(${a})`} />
      ))}
      <S.Circle r={k * 0.18} fill="#2a7a40" />
    </S.G>
  )
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 6)} fill="none" stroke="#5cc176" strokeWidth={3} />
      {clover(-6, -6)}
      {clover(f.w + 6, -6)}
      {clover(-6, f.h + 6)}
      {clover(f.w + 6, f.h + 6)}
    </Layer>
  )
}

function popAt(time, it) {
  'worklet'
  const q = ((time + it.d) / 2.4) % 1
  return { x: it.x, y: it.y, o: q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8, s: 0.25 + q * 0.95 }
}
export function FireworksOver({ f }) {
  const S = svgAll()
  const bursts = [
    { x: 6, y: -10, col: '#ffd166', k: 18, d: 0 },
    { x: f.w - 8, y: -8, col: '#ff6b9a', k: 15, d: 1.1 },
    { x: f.w / 2, y: -18, col: '#8ad1ff', k: 11, d: 1.8 },
  ]
  return (
    <>
      <Layer f={f}>
        <S.Path d={ring(f, 6)} fill="none" stroke="#f2c45a" strokeWidth={3} />
      </Layer>
      {bursts.map((b, i) => (
        <Particle key={i} clock={f.clock} item={b} fn={popAt} w={f.w} h={f.h} size={b.k * 2.4}>
          <S.Svg width={b.k * 2.4} height={b.k * 2.4} viewBox={`${-b.k * 1.2} ${-b.k * 1.2} ${b.k * 2.4} ${b.k * 2.4}`}>
            {Array.from({ length: 10 }, (_, j) => {
              const a = (j / 10) * TAU
              return <S.Line key={j} x1={Math.cos(a) * b.k * 0.35} y1={Math.sin(a) * b.k * 0.35} x2={Math.cos(a) * b.k} y2={Math.sin(a) * b.k} stroke={b.col} strokeWidth={1.6} strokeLinecap="round" />
            })}
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}

export function SunnyOver({ f }) {
  const S = svgAll()
  const k = 14
  const cx = f.w / 2
  const spin = (time) => {
    'worklet'
    return { transform: [{ rotate: `${((time / 14) % 1) * 360}deg` }] }
  }
  const size = k * 4
  return (
    <>
      <Layer f={f}>
        <S.Path d={ring(f, 6)} fill="none" stroke="#ffb84d" strokeWidth={3} />
      </Layer>
      <Moving clock={f.clock} fn={spin} style={{ position: 'absolute', left: cx - size / 2, top: -8 - size / 2, width: size, height: size }}>
        <S.Svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * TAU
            return <S.Line key={i} x1={Math.cos(a) * k * 1.25} y1={Math.sin(a) * k * 1.25} x2={Math.cos(a) * k * 1.75} y2={Math.sin(a) * k * 1.75} stroke="#ffc94d" strokeWidth={2} strokeLinecap="round" />
          })}
        </S.Svg>
      </Moving>
      <Layer f={f}>
        <S.Circle cx={cx} cy={-8} r={k} fill="#ffd166" stroke="#f29b30" strokeWidth={1.6} />
      </Layer>
    </>
  )
}

export function RoyalOver({ f }) {
  const S = svgAll()
  const k = 12
  const cx = f.w / 2
  const y = -8
  const laurel = (x0, y0, dir) => {
    const R0 = 22
    const leaves = Array.from({ length: 5 }, (_, i) => {
      const t = i / 4
      const px = x0 + dir * R0 * Math.sin((Math.PI / 2) * t)
      const py = y0 + R0 * Math.cos((Math.PI / 2) * t)
      return <S.Ellipse key={i} cx={px} cy={py} rx={5.5} ry={2.6} fill="#e2b75a" transform={`rotate(${dir * (90 * t - 60)} ${px} ${py})`} />
    })
    return (
      <S.G key={dir}>
        <S.Path d={`M${x0} ${y0 + R0} A${R0} ${R0} 0 0 ${dir > 0 ? 1 : 0} ${x0 + dir * R0} ${y0}`} fill="none" stroke="#b98a2f" strokeWidth={1.4} />
        {leaves}
      </S.G>
    )
  }
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="ryl" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#fff1c2" />
          <S.Stop offset="0.5" stopColor="#e2b75a" />
          <S.Stop offset="1" stopColor="#8a6420" />
        </S.LinearGradient>
      </S.Defs>
      <S.Path d={ring(f, 7)} fill="none" stroke="url(#ryl)" strokeWidth={4} />
      {laurel(-7, -7, 1)}
      {laurel(f.w + 7, -7, -1)}
      <S.Path
        d={`M${cx - k} ${y + k * 0.5}L${cx - k} ${y - k * 0.4}L${cx - k * 0.5} ${y}L${cx} ${y - k * 0.7}L${cx + k * 0.5} ${y}L${cx + k} ${y - k * 0.4}L${cx + k} ${y + k * 0.5}Z`}
        fill="url(#ryl)"
        stroke="#6b4d14"
        strokeWidth={1.2}
      />
      <S.Circle cx={cx} cy={y - k * 0.7} r={k * 0.15} fill="#ef6a5b" />
    </Layer>
  )
}

export function WrappedOver({ f }) {
  const S = svgAll()
  const cx = f.w / 2
  const k = 14
  const col = '#ef6a5b'
  const dark = '#b8443a'
  const y = -7
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 7)} fill="none" stroke={col} strokeWidth={3} />
      <S.Line x1={cx} y1={f.h + 1} x2={cx} y2={f.h + 8} stroke={col} strokeWidth={6} />
      <S.Path d={`M${cx} ${y} C${cx - k * 2} ${y - k * 1.4} ${cx - k * 2.2} ${y + k * 0.8} ${cx} ${y}Z`} fill={col} stroke={dark} strokeWidth={1} />
      <S.Path d={`M${cx} ${y} C${cx + k * 2} ${y - k * 1.4} ${cx + k * 2.2} ${y + k * 0.8} ${cx} ${y}Z`} fill={col} stroke={dark} strokeWidth={1} />
      <S.Path d={`M${cx} ${y} l${-k * 0.8} ${k * 1.4} M${cx} ${y} l${k * 0.8} ${k * 1.4}`} stroke={col} strokeWidth={3} strokeLinecap="round" />
      <S.Circle cx={cx} cy={y} r={k * 0.42} fill={dark} />
    </Layer>
  )
}
