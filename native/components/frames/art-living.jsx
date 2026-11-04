// Frames added 2026-10-07: seven coin frames, eight living gem frames that
// react to the night (tonight's answers, the swipe, the streak, the evening)
// and six specials. Same contract as art.jsx: each draws in card space and
// may reach PAD past the card; f.p carries the night, f.pull the swipe.
import { useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { rrLength, rrPath, rrPointAt, vineLayout } from './geometry.js'
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
  const pins = spots(f, 12, n, 0.5 / n)
  const bulbs = pins.map((p, i) => {
    const k = Math.floor(i / 2)
    const on = k < (f.p.answered || 0)
    const sk = !on && k < (f.p.answered || 0) + (f.p.skipped || 0)
    return { x: p.x + p.nx * 6, y: p.y + p.ny * 6, a: p.ang, on, sk, col: BULBS[k % 5], mode: all ? 2 : sk ? 1 : 0, ph: i * 0.37 }
  })
  return (
    <>
      <Layer f={f}>
        <S.Path d={ring(f, 12)} fill="none" stroke="#6b7060" strokeWidth={1.4} />
        {bulbs.map((b, i) => (
          <S.G key={i}>
            <S.Line x1={pins[i].x} y1={pins[i].y} x2={b.x} y2={b.y} stroke="#6b7060" strokeWidth={1.2} />
            <S.Rect x={pins[i].x + pins[i].nx * 3 - 2.2} y={pins[i].y + pins[i].ny * 3 - 2.2} width={4.4} height={4.4} rx={1} fill="#8a8f9c" transform={`rotate(${(b.a * 180) / Math.PI} ${pins[i].x + pins[i].nx * 3} ${pins[i].y + pins[i].ny * 3})`} />
            {f.still && (b.on || b.sk) ? (
              <S.G>
                <S.Circle cx={b.x} cy={b.y} r={9} fill={b.col} opacity={0.3} />
                <S.Ellipse cx={b.x} cy={b.y} rx={4.6} ry={6.4} transform={`rotate(${(b.a * 180) / Math.PI} ${b.x} ${b.y})`} fill={b.col} stroke="#ffffff" strokeWidth={0.8} />
              </S.G>
            ) : null}
            {!b.on && !b.sk ? (
              <S.Ellipse cx={b.x} cy={b.y} rx={4.6} ry={6.4} transform={`rotate(${(b.a * 180) / Math.PI} ${b.x} ${b.y})`} fill="#363b47" stroke="#5a606e" strokeWidth={0.8} />
            ) : null}
          </S.G>
        ))}
      </Layer>
      {bulbs
        .filter((b) => b.on || b.sk)
        .map((b, i) => (
          <Particle key={i} clock={f.clock} item={b} fn={bulbAt} w={f.w} h={f.h} size={26}>
            <S.Svg width={26} height={26} viewBox="-13 -13 26 26">
              <S.Circle r={9} fill={b.col} opacity={0.3} />
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
        const open = i < grown
        const fx = p.x + p.nx * (open ? 9 : 5)
        const fy = p.y + p.ny * (open ? 9 : 5)
        const deg = (p.ang * 180) / Math.PI
        return (
          <S.G key={i}>
            <S.Line x1={p.x} y1={p.y} x2={fx} y2={fy} stroke="#4f9a55" strokeWidth={1.8} />
            {open ? (
              <S.G transform={`translate(${fx} ${fy}) rotate(${deg})`}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <S.Path key={a} d="M0 0 L-6 -12 L0 -17 L6 -12Z" fill={PETALS[i % 7]} stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} transform={`rotate(${a})`} />
                ))}
                <S.Circle r={3.4} fill="#fff4cf" stroke="#e2b75a" strokeWidth={0.8} />
              </S.G>
            ) : (
              <S.G transform={`translate(${fx} ${fy}) rotate(${deg})`}>
                <S.Path d="M0 1 C-3.4 -1.5 -3 -6.5 0 -8.5 C3 -6.5 3.4 -1.5 0 1Z" fill="#e79ab4" />
                <S.Path d="M-3 0.5 Q0 -2.5 3 0.5" fill="none" stroke="#5fb36a" strokeWidth={1.4} strokeLinecap="round" />
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
// Night Sky Clock: one sky round the card that darkens as the evening goes,
// hour ticks like a dial, the sun easing into the moon at the hour, and a
// bell at your reminder. No line between day and night anywhere on the band.
const DUSK_TOP = [[70, 62, 128], [34, 38, 88], [14, 18, 48], [7, 10, 30]]
const DUSK_BOT = [[160, 98, 146], [70, 56, 118], [24, 30, 74], [11, 15, 42]]
function duskMix(stops, t) {
  const k = Math.min(0.999, Math.max(0, t)) * (stops.length - 1)
  const i = Math.floor(k)
  const q = k - i
  return `rgb(${stops[i].map((v, j) => Math.round(v + (stops[i + 1][j] - v) * q)).join(',')})`
}
const clamp01 = (v) => Math.min(1, Math.max(0, v))
export function DuskOver({ f }) {
  const S = svgAll()
  const o = 18
  const mid = o / 2
  const T = clamp01(Number(f.p.evening) || 0)
  // A fraction round a ring d px out, clockwise from top center.
  const at = (d, t) => {
    const W = f.w + 2 * d
    const H = f.h + 2 * d
    const r = Math.max(0, f.R + d)
    const L = rrLength(W, H, r)
    const top = (H - 2 * r) + (Math.PI * r) / 2 + (W - 2 * r) / 2
    return rrPointAt(-d, -d, W, H, r, ((((t % 1) + 1) % 1) * L + top) % L)
  }
  const top = duskMix(DUSK_TOP, T)
  const bot = duskMix(DUSK_BOT, T)
  // A soft glow trailing the moon, fading to nothing, instead of a filled arc.
  const glow = Array.from({ length: 40 }, (_, i) => {
    const k = 1 - i / 40
    return { p: at(mid, T - (i / 40) * Math.min(T, 0.45)), a: k * k * 0.06 }
  })
  const ticks = Array.from({ length: 12 }, (_, h) => ({ a: at(o, h / 12), b: at(o - 4, h / 12), big: h % 3 === 0 }))
  // Stars come in one at a time as the night goes on, a little sooner behind the moon.
  const stars = useMemo(() => {
    const r = seeded(51)
    const out = []
    for (let i = 0; i < 46; i++) {
      const t = r()
      const d = 3 + r() * 12
      const size = 0.5 + r() * 0.9
      const gate = r()
      const behind = (((T - t) % 1) + 1) % 1
      const show = clamp01((T * 1.4 - gate * 0.9) * 3 + (behind < T ? 0.4 : 0))
      if (show <= 0.05) continue
      const p = at(d, t)
      out.push({ x: p.x, y: p.y, r: size, sp: 1 + r() * 2, ph: r() * 6, col: `rgba(255,255,255,${show.toFixed(2)})` })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T, f.w, f.h])
  const now = at(mid, T)
  const bell = at(mid, clamp01(Number(f.p.remind) || 0.57))
  // Before dark the marker is a low sun that softens into the moon.
  const sun = clamp01((0.4 - T) / 0.2)
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor={top} />
            <S.Stop offset="1" stopColor={bot} />
          </S.LinearGradient>
        </S.Defs>
        <S.Path d={band(f, o)} fillRule="evenodd" fill="url(#duskSky)" />
        {glow.map((g, i) => (
          <S.Circle key={i} cx={g.p.x} cy={g.p.y} r={o * 0.7} fill="#b9a8ff" opacity={g.a} />
        ))}
        {ticks.map((k, i) => (
          <S.Line key={i} x1={k.a.x} y1={k.a.y} x2={k.b.x} y2={k.b.y} stroke="#ffffff" strokeOpacity={k.big ? 0.55 : 0.22} strokeWidth={k.big ? 1.5 : 1} strokeLinecap="round" />
        ))}
        <S.Path d={ring(f, o)} fill="none" stroke="#ffffff" strokeOpacity={0.14} strokeWidth={1} />
        <S.Path d={ring(f, 1.5)} fill="none" stroke="#e8c877" strokeOpacity={0.7} strokeWidth={1} />
      </Layer>
      <Star f={f} items={stars} />
      <Layer f={f}>
        <S.Circle cx={bell.x} cy={bell.y} r={8} fill={top} stroke="#f2c45a" strokeOpacity={0.8} strokeWidth={1} />
        <S.G transform={`translate(${bell.x} ${bell.y + 0.5}) scale(0.75)`}>
          <S.Path d="M-5 3 Q-5 -6 0 -6 Q5 -6 5 3 Z" fill="#f2c45a" stroke="#7a5a12" strokeWidth={0.8} />
          <S.Circle cy={4.5} r={1.6} fill="#f2c45a" />
        </S.G>
        <S.Circle cx={now.x} cy={now.y} r={13} fill="#ffd9a0" opacity={0.18 * sun + 0.1} />
        <S.G opacity={1 - sun}>
          <S.Circle cx={now.x} cy={now.y} r={11} fill="#fff4cf" opacity={0.12} />
          <S.Circle cx={now.x} cy={now.y} r={6} fill="#fff4cf" />
          <S.Circle cx={now.x + 3.3} cy={now.y - 2.4} r={5.2} fill={top} />
        </S.G>
        <S.Circle cx={now.x} cy={now.y} r={6.5} fill="#ffd166" opacity={sun} />
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
      <S.Path d={ring(f, 9)} fill="none" stroke={`url(#${id})`} strokeWidth={8} strokeOpacity={0.22} />
      <S.Path d={ring(f, 5)} fill="none" stroke={`url(#${id})`} strokeWidth={2.5} />
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

// Royal (100-day streak): a velvet band in a bevelled gold rim, a jeweled
// crown, gems at the corners, full laurels and a slow glint round the gold.
function gemTwinkle(time, it) {
  'worklet'
  const q = (((time - it.i) / 7) % 1 + 1) % 1
  if (q > 0.16) return { x: it.x, y: it.y, o: 0, s: 0 }
  const k = Math.sin((q / 0.16) * Math.PI)
  return { x: it.x, y: it.y, o: k, s: 0.5 + 1.1 * k, r: q * 3 }
}
function crownPulse(time, it) {
  'worklet'
  const k = 0.5 + 0.5 * Math.sin(time * 2.6)
  return { x: it.x, y: it.y, o: 0.25 + 0.5 * k, s: 0.9 + 0.7 * k }
}
function glintAt(time, it, w, h) {
  'worklet'
  const p = edgeAt(time * it.speed + it.start, -it.o, -it.o, w + 2 * it.o, h + 2 * it.o, it.R + it.o)
  return { x: p.x, y: p.y, o: 0.85 + 0.15 * Math.sin(time * 3), s: 1 }
}
export function RoyalOver({ f }) {
  const S = svgAll()
  const k = 15
  const cx = f.w / 2
  const y = -11
  const o = 10
  const loop = rrLength(f.w + 2 * o, f.h + 2 * o, f.R + o)
  const glint = { o, R: f.R, speed: loop / 6, start: 0 }
  const sparks = useMemo(() => {
    const r = seeded(33)
    return spots(f, o, 5, 0.1).map((p) => ({ x: p.x, y: p.y, r: 1.3, sp: 1.6 + r() * 1.6, ph: r() * 6, col: '#fff3c4' }))
  }, [f.w, f.h, f.R])
  const corners = [
    [f.R, f.R, -1, -1],
    [f.w - f.R, f.R, 1, -1],
    [f.w - f.R, f.h - f.R, 1, 1],
    [f.R, f.h - f.R, -1, 1],
  ].map(([x, yy, sx, sy], i) => ({ x: x + sx * (f.R + o) * 0.7071, y: yy + sy * (f.R + o) * 0.7071, col: i % 2 ? '#4aa3ff' : '#ff5a6e' }))
  const slots = [
    ...corners.map((c, i) => ({ x: c.x, y: c.y, i })),
    { x: cx - k * 0.6, y: y + k * 0.35, i: 4 },
    { x: cx, y: y + k * 0.3, i: 5 },
    { x: cx + k * 0.6, y: y + k * 0.35, i: 6 },
  ]
  const laurel = (x0, y0, dir) => {
    const R0 = 28
    const leaves = Array.from({ length: 8 }, (_, i) => {
      const t = i / 7
      const px = x0 + dir * R0 * Math.sin((Math.PI / 2) * t)
      const py = y0 + R0 * Math.cos((Math.PI / 2) * t)
      const rot = dir * (90 * t - 60)
      return (
        <S.G key={i}>
          <S.Ellipse cx={px} cy={py} rx={6} ry={2.8} fill="#e2b75a" stroke="#b98a2f" strokeWidth={0.5} transform={`rotate(${rot} ${px} ${py})`} />
          <S.Ellipse cx={px - dir * 3} cy={py - 3} rx={4.6} ry={2.2} fill="#f3d27c" transform={`rotate(${rot - dir * 50} ${px - dir * 3} ${py - 3})`} />
        </S.G>
      )
    })
    return (
      <S.G key={dir}>
        <S.Path d={`M${x0} ${y0 + R0} A${R0} ${R0} 0 0 ${dir > 0 ? 1 : 0} ${x0 + dir * R0} ${y0}`} fill="none" stroke="#b98a2f" strokeWidth={1.4} />
        {leaves}
      </S.G>
    )
  }
  const jewel = (x, yy, r, col) => (
    <S.G key={`${x}${yy}`}>
      <S.Circle cx={x} cy={yy} r={r} fill={col} stroke="#6b4d14" strokeWidth={0.8} />
      <S.Circle cx={x - r * 0.3} cy={yy - r * 0.3} r={r * 0.3} fill="#ffffff" opacity={0.8} />
    </S.G>
  )
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="royG" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#fff1c2" />
            <S.Stop offset="0.5" stopColor="#e2b75a" />
            <S.Stop offset="1" stopColor="#8a6420" />
          </S.LinearGradient>
          <S.LinearGradient id="royV" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#5a2a8a" />
            <S.Stop offset="0.5" stopColor="#3a1763" />
            <S.Stop offset="1" stopColor="#6a1f4a" />
          </S.LinearGradient>
        </S.Defs>
        <S.Path d={band(f, o)} fillRule="evenodd" fill="url(#royV)" />
        <S.Path d={ring(f, 1.5)} fill="none" stroke="#d9a8ff" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="1 4" />
        <S.Path d={ring(f, o)} fill="none" stroke="url(#royG)" strokeWidth={4} />
        <S.Path d={ring(f, o + 2.4)} fill="none" stroke="#6b4d14" strokeWidth={0.8} />
        <S.Path d={ring(f, o - 2.4)} fill="none" stroke="#fff1c2" strokeOpacity={0.8} strokeWidth={0.8} />
        {laurel(-7, -2, 1)}
        {laurel(f.w + 7, -2, -1)}
        {corners.map((c, i) => (
          <S.G key={i}>
            <S.Path d={`M${c.x} ${c.y - 6}L${c.x + 5} ${c.y}L${c.x} ${c.y + 6}L${c.x - 5} ${c.y}Z`} fill="url(#royG)" stroke="#6b4d14" strokeWidth={0.8} />
            {jewel(c.x, c.y, 2.8, c.col)}
          </S.G>
        ))}
        <S.Path
          d={`M${cx - k * 1.1} ${y + k * 0.6}L${cx - k * 1.2} ${y - k * 0.6}L${cx - k * 0.6} ${y - k * 0.1}L${cx - k * 0.3} ${y - k * 0.85}L${cx} ${y - k * 0.2}L${cx + k * 0.3} ${y - k * 0.85}L${cx + k * 0.6} ${y - k * 0.1}L${cx + k * 1.2} ${y - k * 0.6}L${cx + k * 1.1} ${y + k * 0.6}Z`}
          fill="url(#royG)"
          stroke="#6b4d14"
          strokeWidth={1.2}
        />
        <S.Rect x={cx - k * 1.1} y={y + k * 0.3} width={k * 2.2} height={k * 0.35} fill="#8a6420" opacity={0.55} />
        {[cx - k * 1.2, cx - k * 0.3, cx + k * 0.3, cx + k * 1.2].map((x, i) => jewel(x, i % 3 ? y - k * 0.85 : y - k * 0.6, 1.8, '#fff1c2'))}
        {jewel(cx - k * 0.6, y + k * 0.35, 2.4, '#4aa3ff')}
        {jewel(cx, y + k * 0.3, 3.2, '#ff5a6e')}
        {jewel(cx + k * 0.6, y + k * 0.35, 2.4, '#4ade9a')}
      </Layer>
      <Star f={f} items={sparks} />
      <Particle clock={f.clock} item={{ x: cx, y: y + k * 0.3 }} fn={crownPulse} w={f.w} h={f.h} size={24}>
        <View style={{ position: 'absolute', left: 2, top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ff5a6e' }} />
      </Particle>
      {slots.map((p, i) => (
        <Particle key={i} clock={f.clock} item={p} fn={gemTwinkle} w={f.w} h={f.h} size={22}>
          <S.Svg width={22} height={22} viewBox="-11 -11 22 22">
            <S.Path d={starD(0, 0, 10)} fill="#ffffff" />
          </S.Svg>
        </Particle>
      ))}
      <Particle clock={f.clock} item={glint} fn={glintAt} w={f.w} h={f.h} size={40}>
        <View style={{ position: 'absolute', left: 4, top: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff3c4', opacity: 0.4 }} />
        <View style={{ position: 'absolute', left: 0, top: 19, width: 40, height: 2, borderRadius: 1, backgroundColor: '#ffffff', opacity: 0.8 }} />
        <View style={{ position: 'absolute', left: 19, top: 0, width: 2, height: 40, borderRadius: 1, backgroundColor: '#ffffff', opacity: 0.8 }} />
        <View style={{ position: 'absolute', left: 14, top: 14, width: 12, height: 12, borderRadius: 6, backgroundColor: '#ffffff' }} />
      </Particle>
    </>
  )
}

// Wrapped (10 gifts sent): striped paper in the band, a gold ribbon across it,
// a full bow that sways, a gift tag, and a small sparkle puff now and then.
function bowSway(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 1, r: Math.sin(time * 2.2) * 0.16, s: 1 + 0.05 * Math.sin(time * 4.4) }
}
function tailSwing(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 1, r: -it.dir * 0.22 * Math.sin(time * 2.8 + it.ph) }
}
function puffAt(time, it) {
  'worklet'
  const q = (((time + it.off) / 4) % 1 + 1) % 1
  if (q > 0.45) return { x: it.x, y: it.y, o: 0, r: 0, s: 0 }
  const k = q / 0.45
  return { x: it.x + it.dx * k, y: it.y + it.dy * k + 26 * k * k, o: 1 - k * k, r: k * 5, s: 0.6 + 0.6 * k }
}
function BowArt({ S, col, dark, gold, part = 'all' }) {
  const k = 15
  return (
    <>
      {part === 'all' || part === 'left' ? <S.Path d={`M-2 2 L${-k * 0.9} ${k * 1.25} L${-k * 0.45} ${k * 1.1} L-1 ${k * 0.5}Z`} fill={gold} stroke={dark} strokeWidth={0.8} /> : null}
      {part === 'all' || part === 'right' ? <S.Path d={`M2 2 L${k * 0.9} ${k * 1.25} L${k * 0.45} ${k * 1.1} L1 ${k * 0.5}Z`} fill={gold} stroke={dark} strokeWidth={0.8} /> : null}
      {part === 'all' || part === 'loops' ? (
        <>
          <S.Path d={`M0 0 C${-k * 1.9} ${-k * 1.5} ${-k * 2.4} ${k * 0.9} 0 0Z`} fill={col} stroke={dark} strokeWidth={1} />
          <S.Path d={`M0 0 C${k * 1.9} ${-k * 1.5} ${k * 2.4} ${k * 0.9} 0 0Z`} fill={col} stroke={dark} strokeWidth={1} />
          <S.Path d={`M${-k * 0.4} ${-k * 0.2} C${-k * 1.1} ${-k * 0.7} ${-k * 1.3} ${-k * 0.1} ${-k * 0.5} ${-k * 0.05}`} fill="none" stroke="#ffd6cf" strokeWidth={1.2} strokeLinecap="round" />
          <S.Path d={`M${k * 0.4} ${-k * 0.2} C${k * 1.1} ${-k * 0.7} ${k * 1.3} ${-k * 0.1} ${k * 0.5} ${-k * 0.05}`} fill="none" stroke="#ffd6cf" strokeWidth={1.2} strokeLinecap="round" />
          <S.Circle r={k * 0.4} fill={gold} stroke={dark} strokeWidth={1} />
        </>
      ) : null}
    </>
  )
}
const CONFETTI = ['#f2c35c', '#fff3d6', '#ff9ab8', '#7bd3ff']
export function WrappedOver({ f }) {
  const S = svgAll()
  const cx = f.w / 2
  const col = '#ef6a5b'
  const dark = '#b8443a'
  const gold = '#f2c35c'
  const cream = '#fff3d6'
  const o = 10
  const y = -13
  const stripes = useMemo(() => {
    const n = Math.ceil((f.w + f.h + 40) / 13)
    return Array.from({ length: n }, (_, i) => -f.h - 20 + i * 13)
  }, [f.w, f.h])
  const puffs = useMemo(() => {
    const r = seeded(5)
    return [0, 1, 2, 3, 4, 5].map((i) => ({
      off: i * 0.67,
      x: f.w * (0.1 + 0.16 * i) + r() * 8,
      y: -16,
      dx: (r() - 0.5) * 44,
      dy: -18 - r() * 10,
    }))
  }, [f.w])
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.ClipPath id="wrpK">
            <S.Path d={band(f, o)} clipRule="evenodd" />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={band(f, o)} fillRule="evenodd" fill={col} />
        <S.G clipPath="url(#wrpK)">
          {stripes.map((x) => (
            <S.Line key={x} x1={x} y1={f.h + 20} x2={x + f.h + 40} y2={-20} stroke={cream} strokeOpacity={0.5} strokeWidth={4} />
          ))}
        </S.G>
        <S.Path d={ring(f, o)} fill="none" stroke={dark} strokeWidth={1.4} />
        <S.Path d={ring(f, 0.7)} fill="none" stroke={gold} strokeWidth={1.4} />
        <S.Rect x={cx - 7} y={f.h - 1} width={14} height={o + 2} fill={gold} stroke={dark} strokeWidth={0.8} />
        <S.Rect x={-o - 1} y={f.h * 0.55 - 6} width={o + 2} height={12} fill={gold} stroke={dark} strokeWidth={0.8} />
        <S.Rect x={f.w - 1} y={f.h * 0.55 - 6} width={o + 2} height={12} fill={gold} stroke={dark} strokeWidth={0.8} />
        <S.Line x1={f.w - 12} y1={f.h + o} x2={f.w - 24} y2={f.h + o + 8} stroke={dark} strokeWidth={1} />
        <S.G transform={`rotate(-14 ${f.w - 24} ${f.h + o + 8})`}>
          <S.Path d={`M${f.w - 38} ${f.h + o + 8}L${f.w - 33} ${f.h + o + 2}L${f.w - 14} ${f.h + o + 2}L${f.w - 14} ${f.h + o + 18}L${f.w - 33} ${f.h + o + 18}Z`} fill={cream} stroke={dark} strokeWidth={1} />
          <S.Circle cx={f.w - 33} cy={f.h + o + 8} r={1.4} fill={dark} />
          <S.Line x1={f.w - 29} y1={f.h + o + 8} x2={f.w - 18} y2={f.h + o + 8} stroke={col} strokeWidth={1.2} />
          <S.Line x1={f.w - 29} y1={f.h + o + 12} x2={f.w - 21} y2={f.h + o + 12} stroke={col} strokeWidth={1.2} />
        </S.G>
        {f.still ? (
          <S.G transform={`translate(${cx} ${y})`}>
            <BowArt S={S} col={col} dark={dark} gold={gold} />
          </S.G>
        ) : null}
      </Layer>
      {[
        ['left', 1, 0],
        ['right', -1, 1.3],
      ].map(([part, dir, ph]) => (
        <Particle key={part} clock={f.clock} item={{ x: cx, y, dir, ph }} fn={tailSwing} w={f.w} h={f.h} size={90}>
          <S.Svg width={90} height={90} viewBox="-45 -45 90 90">
            <BowArt S={S} col={col} dark={dark} gold={gold} part={part} />
          </S.Svg>
        </Particle>
      ))}
      <Particle clock={f.clock} item={{ x: cx, y }} fn={bowSway} w={f.w} h={f.h} size={90}>
        <S.Svg width={90} height={90} viewBox="-45 -45 90 90">
          <BowArt S={S} col={col} dark={dark} gold={gold} part="loops" />
        </S.Svg>
      </Particle>
      {puffs.map((p, i) => (
        <Particle key={i} clock={f.clock} item={p} fn={puffAt} w={f.w} h={f.h} size={16}>
          <S.Svg width={16} height={16} viewBox="-8 -8 16 16">
            {i % 2 ? (
              <S.Path d={starD(0, 0, 6)} fill={CONFETTI[i % 4]} stroke={dark} strokeWidth={0.5} />
            ) : (
              <S.Rect x={-3} y={-1.8} width={6} height={3.6} fill={CONFETTI[(i + 1) % 4]} stroke={dark} strokeWidth={0.5} />
            )}
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}

/* ---------- Gem frames from the bank (2026-10-07): Galaxy, Neon Heart, Storm Glass ---------- */

const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }

/** A body riding round the ring o px out, it.speed px a second. */
function orbitAt(time, it, w, h) {
  'worklet'
  const o = it.o
  const p = edgeAt(time * it.speed + it.start, -o, -o, w + 2 * o, h + 2 * o, it.R + o)
  return { x: p.x, y: p.y, o: 1 }
}

// Galaxy: deep space in the band, soft nebula clouds, twinkling stars, three
// planets circling at their own speeds and a shooting star now and then.
function shootAt(time, it) {
  'worklet'
  const q = (time % 7) / 7
  if (q > 0.1) return { x: it.x, y: it.y, o: 0, r: 0.24 }
  const k = q / 0.1
  return { x: it.x + k * 70, y: it.y + k * 16, o: Math.sin(k * Math.PI), r: 0.24 }
}
export function GalaxyOver({ f }) {
  const S = svgAll()
  const o = 22
  const dust = useMemo(() => {
    const r = seeded(9)
    return spots(f, 11, 46).map((p) => ({ x: p.x + (r() - 0.5) * 16, y: p.y + (r() - 0.5) * 16, r: 0.4 + r() * 0.9 }))
  }, [f.w, f.h, f.R])
  const twinkle = useMemo(() => {
    const r = seeded(21)
    return spots(f, 11, 12, 0.04).map((p) => ({ x: p.x + (r() - 0.5) * 12, y: p.y + (r() - 0.5) * 12, r: 1.1, sp: 1 + r() * 2, ph: r() * 6 }))
  }, [f.w, f.h, f.R])
  const planets = [
    { kind: 'ringed', speed: 14, start: 0 },
    { kind: 'moon', speed: 9, start: (f.w + f.h) * 0.9 },
    { kind: 'red', speed: 20, start: (f.w + f.h) * 1.5 },
  ].map((p) => ({ ...p, o: 11, R: f.R }))
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="gxb" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#2b1a5e" />
            <S.Stop offset="0.5" stopColor="#14123a" />
            <S.Stop offset="1" stopColor="#3a1550" />
          </S.LinearGradient>
          {[
            ['gxp', '#ff5fb8'],
            ['gxv', '#8a6cff'],
            ['gxc', '#5fb8ff'],
          ].map(([id, col]) => (
            <S.RadialGradient key={id} id={id} cx="0.5" cy="0.5" r="0.5">
              <S.Stop offset="0" stopColor={col} stopOpacity="0.55" />
              <S.Stop offset="1" stopColor={col} stopOpacity="0" />
            </S.RadialGradient>
          ))}
          <S.ClipPath id="gxk">
            <S.Path d={band(f, o)} clipRule="evenodd" />
          </S.ClipPath>
        </S.Defs>
        <S.Path d={ring(f, o + 3)} fill="none" stroke="#8a6cff" strokeOpacity={0.25} strokeWidth={6} />
        <S.Path d={band(f, o)} fillRule="evenodd" fill="url(#gxb)" />
        <S.G clipPath="url(#gxk)">
          <S.Circle cx={-6} cy={f.h * 0.3} r={34} fill="url(#gxp)" />
          <S.Circle cx={f.w + 6} cy={f.h * 0.72} r={38} fill="url(#gxv)" />
          <S.Circle cx={f.w * 0.62} cy={-10} r={30} fill="url(#gxc)" />
          {dust.map((d, i) => (
            <S.Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#ffffff" opacity={0.75} />
          ))}
        </S.G>
        <S.Path d={ring(f, o)} fill="none" stroke="#b9a6ff" strokeOpacity={0.5} strokeWidth={1} />
        {f.still ? (
          <S.G>
            <S.Circle cx={f.w * 0.3} cy={-11} r={5} fill="#ffd166" />
            <S.Circle cx={-11} cy={f.h * 0.6} r={4} fill="#6fc3ff" />
          </S.G>
        ) : null}
      </Layer>
      <Star f={f} items={twinkle} />
      <Particle clock={f.clock} item={{ x: f.w * 0.15, y: -16 }} fn={shootAt} w={f.w} h={f.h} size={26}>
        <View style={{ position: 'absolute', left: 0, top: 12, width: 24, height: 2, borderRadius: 1, backgroundColor: '#ffffff' }} />
      </Particle>
      {planets.map((p) => (
        <Particle key={p.kind} clock={f.clock} item={p} fn={orbitAt} w={f.w} h={f.h} size={28}>
          <S.Svg width={28} height={28} viewBox="-14 -14 28 28">
            {p.kind === 'ringed' ? (
              <S.G>
                <S.Circle r={6} fill="#ffd166" />
                <S.Ellipse rx={11} ry={2.8} fill="none" stroke="#ffe9a8" strokeWidth={1.4} transform="rotate(-20)" />
              </S.G>
            ) : p.kind === 'moon' ? (
              <S.G>
                <S.Circle r={4.5} fill="#6fc3ff" />
                <S.Circle cx={8} cy={-3} r={1.6} fill="#e6eefc" />
              </S.G>
            ) : (
              <S.G>
                <S.Circle r={3.5} fill="#ff7a5c" />
                <S.Circle cx={-1} cy={-1} r={1} fill="#ffb59e" />
              </S.G>
            )}
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}

// Neon Heart: a pink tube and a blue tube with a real glow, a heartbeat racing
// round the pink one, blinking neon stars and a heart sign that flickers on.
function heartSign(time) {
  'worklet'
  const q = time % 5
  // Off for a beat, a few stutters, then steady, like an old diner sign.
  if (q < 0.25) return { opacity: 0.15 }
  if (q < 0.35) return { opacity: 1 }
  if (q < 0.45) return { opacity: 0.25 }
  if (q < 0.55) return { opacity: 1 }
  if (q < 0.62) return { opacity: 0.4 }
  return { opacity: 1 }
}
function starBlink(ph) {
  return (time) => {
    'worklet'
    return { opacity: 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * 2.2 + ph)) }
  }
}
function starD(x, y, q) {
  return `M${x} ${y - q}L${x + q * 0.3} ${y - q * 0.3}L${x + q} ${y}L${x + q * 0.3} ${y + q * 0.3}L${x} ${y + q}L${x - q * 0.3} ${y + q * 0.3}L${x - q} ${y}L${x - q * 0.3} ${y - q * 0.3}Z`
}
export function NeonHeartOver({ f }) {
  const S = svgAll()
  const pulse = { o: 6, R: f.R, speed: (rrLength(f.w + 12, f.h + 12, f.R + 6) / 2.4), start: 0 }
  const stars = [
    [-14, f.h + 14, 6, 0],
    [f.w + 14, f.h + 14, 6, 2],
    [-14, -14, 4, 4],
  ]
  const blinks = useMemo(() => stars.map((s) => starBlink(s[3])), [])
  return (
    <>
      <Layer f={f}>
        <S.Path d={ring(f, 6)} fill="none" stroke="#ff3d7f" strokeOpacity={0.3} strokeWidth={10} />
        <S.Path d={ring(f, 6)} fill="none" stroke="#ff7aa8" strokeWidth={3.5} />
        <S.Path d={ring(f, 6)} fill="none" stroke="#ffe3ee" strokeWidth={1} />
        <S.Path d={ring(f, 15)} fill="none" stroke="#3dd9ff" strokeOpacity={0.3} strokeWidth={6} />
        <S.Path d={ring(f, 15)} fill="none" stroke="#7af0ff" strokeWidth={2} />
      </Layer>
      <Particle clock={f.clock} item={pulse} fn={orbitAt} w={f.w} h={f.h} size={16}>
        <View style={{ position: 'absolute', left: 2, top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff7aa8', opacity: 0.45 }} />
        <View style={{ position: 'absolute', left: 5, top: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' }} />
      </Particle>
      <Moving clock={f.clock} fn={heartSign} style={FILL}>
        <Layer f={f}>
          <S.Path d={heartD(f.w / 2, -7, 11)} fill="#ff3d7f" opacity={0.35} />
          <S.Path d={heartD(f.w / 2, -7, 8)} fill="#ff3d7f" />
          <S.Path d={heartD(f.w / 2, -7, 4.6)} fill="#ffe3ee" />
        </Layer>
      </Moving>
      {stars.map(([x, y, q], i) => (
        <Moving key={i} clock={f.clock} fn={blinks[i]} style={FILL}>
          <Layer f={f}>
            <S.Path d={starD(x, y, q)} fill="none" stroke="#7af0ff" strokeWidth={1.4} />
          </Layer>
        </Moving>
      ))}
    </>
  )
}

// Storm Glass: frosted blue glass with rain streaking down inside, storm
// clouds on the top corners, and every few seconds a lightning flash.
function rainAt(time, it, w, h) {
  'worklet'
  const q = (((time + it.off) / it.life) % 1 + 1) % 1
  const x = it.x + q * 3
  const y = -20 + q * (h + 40)
  // Rain stays in the glass, never over the card.
  const onCard = x > -2 && x < w + 2 && y > -2 && y < h + 2
  return { x, y, o: onCard ? 0 : 0.8, r: 0.18 }
}
function flash(time) {
  'worklet'
  const q = (time % 6) / 6
  let o = 0
  if (q >= 0.78 && q < 0.8) o = (q - 0.78) / 0.02
  else if (q >= 0.8 && q < 0.83) o = 1 - (q - 0.8) / 0.03
  else if (q >= 0.83 && q < 0.85) o = ((q - 0.83) / 0.02) * 0.6
  else if (q >= 0.85 && q < 0.88) o = 0.6 * (1 - (q - 0.85) / 0.03)
  return { opacity: o }
}
function Cloud({ S, x, y, k, col }) {
  return (
    <S.G>
      <S.Circle cx={x} cy={y} r={k} fill={col} />
      <S.Circle cx={x + k * 0.9} cy={y - k * 0.5} r={k * 1.1} fill={col} />
      <S.Circle cx={x + k * 2} cy={y} r={k * 0.9} fill={col} />
      <S.Rect x={x} y={y - k * 0.2} width={k * 2} height={k * 1.1} rx={k * 0.5} fill={col} />
    </S.G>
  )
}
export function StormOver({ f }) {
  const S = svgAll()
  const o = 20
  const drops = useMemo(() => {
    const r = seeded(17)
    return Array.from({ length: 26 }, () => {
      // Drops fall in the side bands, plus a few that cross the top and bottom.
      const side = r()
      const x = side < 0.4 ? -18 + r() * 16 : side < 0.8 ? f.w + 2 + r() * 16 : r() * f.w
      return { x, off: r() * 6, life: 1 + r() * 0.8 }
    })
  }, [f.w])
  const k = 8
  const bolt = `M${f.w - 8} -14 l${-k * 0.6} ${k * 1.4} l${k * 0.55} 0 l${-k * 0.8} ${k * 1.7}`
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="stg" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#6fb7ff" stopOpacity="0.55" />
            <S.Stop offset="1" stopColor="#1d4f8f" stopOpacity="0.8" />
          </S.LinearGradient>
        </S.Defs>
        <S.Path d={ring(f, o + 3)} fill="none" stroke="#5aa9e6" strokeOpacity={0.3} strokeWidth={6} />
        <S.Path d={band(f, o)} fillRule="evenodd" fill="url(#stg)" />
      </Layer>
      {drops.map((d, i) => (
        <Particle key={i} clock={f.clock} item={d} fn={rainAt} w={f.w} h={f.h} size={12}>
          <View style={{ position: 'absolute', left: 5.4, top: 1, width: 1.3, height: 10, borderRadius: 1, backgroundColor: '#d6efff' }} />
        </Particle>
      ))}
      <Moving clock={f.clock} fn={flash} style={FILL}>
        <Layer f={f}>
          <S.Path d={band(f, o)} fillRule="evenodd" fill="#ffffff" opacity={0.7} />
        </Layer>
      </Moving>
      <Layer f={f}>
        <S.Path d={ring(f, o)} fill="none" stroke="#bfe2ff" strokeOpacity={0.7} strokeWidth={1} />
        <S.Path d={ring(f, 1)} fill="none" stroke="#bfe2ff" strokeOpacity={0.5} strokeWidth={1} />
        <Cloud S={S} x={-18} y={-8} k={k} col="#5d6f8f" />
        <Cloud S={S} x={-10} y={-14} k={k * 0.8} col="#8193b3" />
        <Cloud S={S} x={f.w - 22} y={-8} k={k} col="#5d6f8f" />
        <Cloud S={S} x={f.w - 16} y={-14} k={k * 0.8} col="#8193b3" />
      </Layer>
      <Moving clock={f.clock} fn={flash} style={FILL}>
        <Layer f={f}>
          <S.Path d={bolt} fill="none" stroke="#fff6a8" strokeWidth={2.4} strokeLinejoin="round" />
        </Layer>
      </Moving>
    </>
  )
}

/* ---------- Earned frames, trophy pass (2026-11-03): Vine, Ember, Week stars ---------- */

// Vine (3-day streak): the first reward, so it stays simple. Stem and flowers
// hold still, the leaves sway in two groups that swing against each other, and
// one or two buds slowly swell.
function swayA(time) {
  'worklet'
  return { transform: [{ rotate: `${Math.sin(time * 1.1) * 0.014}rad` }] }
}
function swayB(time) {
  'worklet'
  return { transform: [{ rotate: `${Math.sin(time * 1.1 + 2.4) * 0.014}rad` }] }
}
function budAt(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 1, s: 1 + 0.16 * Math.sin(time * 1.5 + it.ph), r: it.deg * 0.01745 }
}
function BudArt({ S }) {
  return (
    <>
      <S.Ellipse cx={0} cy={-2.2} rx={2.3} ry={3.6} fill="#f7b3cc" stroke="#e57aa3" strokeWidth={0.6} />
      <S.Path d="M-3 0.6 Q0 -1.4 3 0.6 Q0 3 -3 0.6Z" fill="#4f9a45" />
    </>
  )
}
function VineLeaves({ S, id, leaves }) {
  return (
    <>
      <S.Defs>
        <S.LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#a6e889" />
          <S.Stop offset="1" stopColor="#3c8636" />
        </S.LinearGradient>
      </S.Defs>
      {leaves.map((l, i) => (
        <S.Ellipse key={i} cx={l.x} cy={l.y} rx={8} ry={3.8} fill={`url(#${id})`} transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
      ))}
    </>
  )
}
export function VineOver({ f }) {
  const S = svgAll()
  const streak = Number(f.p.streak) || 0
  const v = useMemo(() => vineLayout(streak, f.w, f.h, f.R), [streak, f.w, f.h, f.R])
  const evens = v.leaves.filter((_, i) => i % 2 === 0)
  const odds = v.leaves.filter((_, i) => i % 2 === 1)
  const n = v.leaves.length
  const buds = useMemo(() => {
    if (n < 3) return []
    const at = n < 6 ? [Math.floor(n / 2)] : [Math.floor(n * 0.3), Math.floor(n * 0.72)]
    return at.map((i, j) => ({ x: v.leaves[i].x, y: v.leaves[i].y, ph: j * 2.1, deg: v.leaves[i].rot }))
  }, [v, n])
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.RadialGradient id="vnPt">
            <S.Stop offset="0" stopColor="#fff2f7" />
            <S.Stop offset="0.6" stopColor="#f7b3cc" />
            <S.Stop offset="1" stopColor="#e57aa3" />
          </S.RadialGradient>
        </S.Defs>
        <S.Path d={rrPath(0, 0, f.w, f.h, f.R)} fill="none" stroke="#3f7a35" strokeWidth={3.2} strokeLinecap="round" strokeDasharray={`${v.usable} ${v.length}`} />
        {v.flowers.map((fl, i) => (
          <S.G key={`f${i}`} transform={`translate(${fl.x} ${fl.y}) rotate(${fl.rot})`}>
            {[0, 72, 144, 216, 288].map((r) => (
              <S.Ellipse key={r} rx={fl.sz} ry={fl.sz * 0.62} cx={fl.sz * 0.82} fill="url(#vnPt)" transform={`rotate(${r})`} />
            ))}
            <S.Circle r={fl.sz * 0.42} fill="#ffd86b" />
          </S.G>
        ))}
        <S.Circle cx={v.tip.x} cy={v.tip.y} r={3.4} fill="#a6e889" />
      </Layer>
      <Moving clock={f.clock} fn={swayA} style={FILL}>
        <Layer f={f}>
          <VineLeaves S={S} id="vnLfA" leaves={evens} />
        </Layer>
      </Moving>
      <Moving clock={f.clock} fn={swayB} style={FILL}>
        <Layer f={f}>
          <VineLeaves S={S} id="vnLfB" leaves={odds} />
        </Layer>
      </Moving>
      {f.still ? (
        <Layer f={f}>
          {buds.map((b, i) => (
            <S.G key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.deg})`}>
              <BudArt S={S} />
            </S.G>
          ))}
        </Layer>
      ) : null}
      {buds.map((b, i) => (
        <Particle key={i} clock={f.clock} item={b} fn={budAt} w={f.w} h={f.h} size={14}>
          <S.Svg width={14} height={14} viewBox="-7 -7 14 14">
            <BudArt S={S} />
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}

// Ember (30-day streak): a charcoal band with glowing coals, two coal groups
// that flicker out of step, a warm glow along the bottom and a few sparks that
// drift up the sides, clear of the card's text.
function coalA(time) {
  'worklet'
  return { opacity: 0.6 + 0.4 * Math.sin(time * 4.6) * Math.sin(time * 1.3 + 0.5) }
}
function coalB(time) {
  'worklet'
  return { opacity: 0.6 + 0.4 * Math.sin(time * 5.4 + 2) * Math.sin(time * 1.7) }
}
function glowFlicker(time) {
  'worklet'
  return { opacity: 0.72 + 0.28 * Math.sin(time * 6) * Math.sin(time * 2.3 + 1) }
}
function sparkUp(time, it, w, h) {
  'worklet'
  const p = (((time + it.off) / it.life) % 1 + 1) % 1
  const age = p * it.life
  return { x: it.x + Math.sin(time * 2 + it.off * 5) * 4 + it.vx * age, y: h + 4 - it.vy * age, o: Math.sin(Math.min(1, p * 5) * Math.PI * 0.5) * (1 - p) }
}
export function EmberOver({ f }) {
  const S = svgAll()
  const o = 9
  const coals = useMemo(() => {
    const r = seeded(30)
    return spots(f, o / 2, 26, 0.02).map((p, i) => ({ x: p.x, y: p.y, r: 2.1 + r() * 1.1, grp: i % 2, hot: p.y > f.h * 0.5 }))
  }, [f.w, f.h, f.R])
  const sparks = useMemo(() => {
    const r = seeded(31)
    return Array.from({ length: 8 }, (_, i) => ({
      x: i % 2 ? f.w + 2 + r() * 6 : -2 - r() * 6,
      vx: (i % 2 ? 1 : -1) * (2 + r() * 4),
      vy: 20 + r() * 22,
      life: 2.6 + r() * 1.6,
      off: i * 0.55 + r(),
      r: 1 + r() * 1.3,
      warm: i % 3 !== 0,
    }))
  }, [f.w, f.h])
  const cores = (grp) =>
    coals
      .filter((c) => c.grp === grp)
      .map((c, i) => (
        <S.G key={i}>
          <S.Circle cx={c.x} cy={c.y} r={c.r + 1.4} fill="#ff5a1e" opacity={0.3} />
          <S.Circle cx={c.x} cy={c.y} r={c.r} fill={c.hot ? '#ff8a2a' : '#e8561c'} />
          <S.Circle cx={c.x} cy={c.y} r={c.r * 0.45} fill="#ffe08a" />
        </S.G>
      ))
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="emvB" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#2a1512" />
            <S.Stop offset="1" stopColor="#4a1c0a" />
          </S.LinearGradient>
          <S.LinearGradient id="emvR" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#8a3a1a" />
            <S.Stop offset="1" stopColor="#ff8a2a" />
          </S.LinearGradient>
        </S.Defs>
        <S.Path d={band(f, o)} fillRule="evenodd" fill="url(#emvB)" />
        <S.Path d={ring(f, o)} fill="none" stroke="url(#emvR)" strokeWidth={2.4} />
        <S.Path d={ring(f, 0.8)} fill="none" stroke="#ff9a4a" strokeOpacity={0.55} strokeWidth={1} />
        {coals.map((c, i) => (
          <S.Circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#6a2a10" />
        ))}
      </Layer>
      <Moving clock={f.clock} fn={coalA} style={FILL}>
        <Layer f={f}>{cores(0)}</Layer>
      </Moving>
      <Moving clock={f.clock} fn={coalB} style={FILL}>
        <Layer f={f}>{cores(1)}</Layer>
      </Moving>
      <Moving clock={f.clock} fn={glowFlicker} style={FILL}>
        <Layer f={f}>
          <S.Defs>
            <S.LinearGradient id="emvG" x1="0" y1="0" x2="0" y2="1">
              <S.Stop offset="0" stopColor="#ff7828" stopOpacity="0" />
              <S.Stop offset="1" stopColor="#ff6e28" stopOpacity="0.35" />
            </S.LinearGradient>
            <S.ClipPath id="emvC">
              <S.Path d={rrPath(0, 0, f.w, f.h, f.R)} />
            </S.ClipPath>
          </S.Defs>
          <S.G clipPath="url(#emvC)">
            <S.Rect x={0} y={f.h - 44} width={f.w} height={44} fill="url(#emvG)" />
          </S.G>
          <S.Path d={ring(f, o + 3)} fill="none" stroke="#ff6a1e" strokeOpacity={0.22} strokeWidth={5} />
        </Layer>
      </Moving>
      {sparks.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={sparkUp} w={f.w} h={f.h} size={it.r * 2}>
          <View style={{ width: it.r * 2, height: it.r * 2, borderRadius: it.r, backgroundColor: it.warm ? '#ffd27a' : '#ff7a2a' }} />
        </Particle>
      ))}
    </>
  )
}

// Week stars: a deep midnight band set with faceted gems and seven faceted
// gold stars along the bottom (a finished day lights one). A slow shimmer
// travels the rim and the lit stars flash now and then.
function starFacets(cx, cy, R, r, light, dark) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const q = i % 2 ? r : R
    return [(cx + q * Math.cos(a)).toFixed(2), (cy + q * Math.sin(a)).toFixed(2)]
  })
  return {
    facets: pts.map((p, i) => {
      const n = pts[(i + 1) % 10]
      return { d: `M${cx} ${cy}L${p[0]} ${p[1]}L${n[0]} ${n[1]}Z`, fill: i % 2 ? dark : light }
    }),
    outline: `M${pts.map((p) => p.join(' ')).join('L')}Z`,
  }
}
function gemShimmer(time, it, w, h) {
  'worklet'
  const p = edgeAt(time * it.speed + it.start, -it.o, -it.o, w + 2 * it.o, h + 2 * it.o, it.R + it.o)
  return { x: p.x, y: p.y, o: 0.5 + 0.4 * Math.sin(time * 1.6), s: 1 }
}
function starFlash(time, it) {
  'worklet'
  const q = (((time + it.ph) / 3.4) % 1 + 1) % 1
  if (q > 0.25) return { x: it.x, y: it.y, o: 0, s: 0 }
  const k = Math.sin((q / 0.25) * Math.PI)
  return { x: it.x, y: it.y, o: k, s: 0.4 + k, r: q * 2 }
}
const GEM_TONES = [
  ['#7cc4ff', '#2f6fd0'],
  ['#d9a8ff', '#7b3fc4'],
  ['#7cf0c8', '#1f9a78'],
  ['#ff9ab8', '#c43f6a'],
]
export function GemsOver({ f }) {
  const S = svgAll()
  const lit = Array.isArray(f.p.weekLit) ? f.p.weekLit : []
  const o = 16
  const sy = f.h + o / 2
  const xs = Array.from({ length: 7 }, (_, i) => f.w * (0.12 + i * 0.127))
  const gems = useMemo(
    () => spots(f, o / 2, 18, 0.01).filter((p) => !(p.y > f.h - 2 && p.x > f.w * 0.04 && p.x < f.w * 0.96)).map((p, i) => ({ ...p, tone: GEM_TONES[i % 4] })),
    [f.w, f.h, f.R],
  )
  const twinkle = useMemo(() => {
    const r = seeded(14)
    return gems.slice(0, 6).map((g) => ({ x: g.x, y: g.y, r: 1, sp: 0.6 + r() * 0.8, ph: r() * 6, col: '#e8f4ff' }))
  }, [gems])
  const loop = rrLength(f.w + 2 * o, f.h + 2 * o, f.R + o)
  const shimmer = { o, R: f.R, speed: loop / 14, start: 0 }
  const flashes = xs.map((x, i) => ({ x, y: sy, ph: i * 0.9 })).filter((_, i) => lit[i])
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="gmsB" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#10243f" />
            <S.Stop offset="0.5" stopColor="#1a1450" />
            <S.Stop offset="1" stopColor="#0c2f3a" />
          </S.LinearGradient>
          <S.LinearGradient id="gmsR" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#fff1c2" />
            <S.Stop offset="0.5" stopColor="#e2b75a" />
            <S.Stop offset="1" stopColor="#8a6420" />
          </S.LinearGradient>
        </S.Defs>
        <S.Path d={band(f, o)} fillRule="evenodd" fill="url(#gmsB)" />
        <S.Path d={ring(f, o)} fill="none" stroke="url(#gmsR)" strokeWidth={2.6} />
        <S.Path d={ring(f, 1)} fill="none" stroke="#e2b75a" strokeOpacity={0.6} strokeWidth={1} />
        {gems.map((g, i) => (
          <S.G key={i}>
            <S.Path d={`M${g.x} ${g.y - 4.2}L${g.x + 3.4} ${g.y}L${g.x} ${g.y + 4.2}L${g.x - 3.4} ${g.y}Z`} fill={g.tone[1]} stroke="#0a1220" strokeWidth={0.6} />
            <S.Path d={`M${g.x} ${g.y - 4.2}L${g.x + 3.4} ${g.y}L${g.x} ${g.y}L${g.x - 3.4} ${g.y}Z`} fill={g.tone[0]} />
            <S.Path d={`M${g.x} ${g.y - 4.2}L${g.x - 3.4} ${g.y}L${g.x} ${g.y}Z`} fill="#ffffff" opacity={0.45} />
          </S.G>
        ))}
        {xs.map((x, i) => {
          const on = Boolean(lit[i])
          const st = starFacets(x, sy, 9.4, 4, on ? '#fff3c0' : '#3a4a68', on ? '#e8a91e' : '#27334c')
          return (
            <S.G key={i}>
              {on ? <S.Circle cx={x} cy={sy} r={12} fill="#ffd25e" opacity={0.2} /> : null}
              {st.facets.map((s, j) => (
                <S.Path key={j} d={s.d} fill={s.fill} />
              ))}
              <S.Path d={st.outline} fill="none" stroke={on ? '#8a6420' : '#16203a'} strokeWidth={0.7} strokeLinejoin="round" />
            </S.G>
          )
        })}
      </Layer>
      <Star f={f} items={twinkle} />
      <Particle clock={f.clock} item={shimmer} fn={gemShimmer} w={f.w} h={f.h} size={30}>
        <View style={{ position: 'absolute', left: 5, top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#bfe3ff', opacity: 0.3 }} />
        <View style={{ position: 'absolute', left: 11, top: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' }} />
      </Particle>
      {flashes.map((it, i) => (
        <Particle key={i} clock={f.clock} item={it} fn={starFlash} w={f.w} h={f.h} size={18}>
          <S.Svg width={18} height={18} viewBox="-9 -9 18 18">
            <S.Path d={starD(0, 0, 8)} fill="#fff8d8" />
          </S.Svg>
        </Particle>
      ))}
    </>
  )
}
