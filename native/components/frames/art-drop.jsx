// Frames from the 2026-11-20 drop (docs/ideas/frames-drop-2026-11-20.html):
// Linked (coin, still), Bedtime (gem, living: the buddy falls asleep as
// tonight is answered) and Countdown (December, seasonal). Same contract as
// art.jsx: each draws in card space and may reach PAD past the card; still
// tiles draw no particles and no moving views.
import { useMemo } from 'react'
import { View } from 'react-native'
import * as Reanimated from 'react-native-reanimated'
import { rrLength, rrPath, rrPointAt } from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll } from './runtime.jsx'
import { BuddyArt } from '../BuddyArt.jsx'
import { FREE_BUDDY } from '../../../src/lib/purse.js'

const r2 = (n) => Math.round(n * 100) / 100

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

/* ---------- Linked: a gold chain with a lime lobster clasp (coin, still) ---------- */

const AMB = '#8a5a14'
// Light from the top left, the same for every link.
const LIGHT = Math.atan2(-0.83, -0.55)
const RX = 6.8
const RY = 4.3
const CLASP_BODY = 'M-12 -1.7C-8 -2.3 -6 -7.8 .5 -7.8C6.6 -7.8 10.2 -4.2 10.2 0C10.2 4.2 6.6 7.8 .5 7.8C-6 7.8 -8 2.3 -12 1.7Z'
const CLASP_INSET = 'M-6.4 .2C-5.4 -3.4 -2.6 -4.9 .8 -4.9C4.3 -4.9 6.4 -2.6 6.4 .2C6.4 3 4.3 5 .8 5C-2.6 5 -5.4 3.6 -6.4 .2Z'

function linkLayout(f) {
  const o = 6
  const W = f.w + 2 * o
  const H = f.h + 2 * o
  const r = f.R + o
  const L = rrLength(W, H, r)
  // Tiles are scaled down hard, so the clasp is drawn bigger there to stay readable.
  const ck = f.still && f.w <= 220 ? 1.75 : 1.15
  // rrPath starts at the bottom of the left edge; this is the top middle.
  const top = H - 2 * r + (Math.PI * r) / 2 + (W - 2 * r) / 2
  const gap = 37 * ck
  const run = L - gap
  let n = Math.round(run / 10.6)
  if (n % 2 === 0) n++
  const pitch = run / n
  const links = []
  for (let i = 0; i < n; i++) {
    const p = rrPointAt(-o, -o, W, H, r, top + gap / 2 + (i + 0.5) * pitch)
    const deg = r2((p.ang * 180) / Math.PI)
    const face = i % 2 === 0
    const la = LIGHT - p.ang
    let hl = ''
    let gx = 0
    let gy = 0
    let side = 1
    if (face) {
      const t0 = Math.atan2(RX * Math.sin(la), RY * Math.cos(la))
      for (let k = 0; k <= 6; k++) {
        const t = t0 - 0.62 + k * 0.207
        hl += `${k ? 'L' : 'M'}${r2((RX + 0.5) * Math.cos(t))} ${r2((RY + 0.5) * Math.sin(t))}`
      }
      gx = r2((RX + 0.45) * Math.cos(t0))
      gy = r2((RY + 0.45) * Math.sin(t0))
    } else {
      side = -Math.sin(p.ang) * Math.cos(LIGHT) + Math.cos(p.ang) * Math.sin(LIGHT) < 0 ? -1 : 1
    }
    links.push({ x: r2(p.x), y: r2(p.y), deg, face, hl, gx, gy, side })
  }
  const cp = rrPointAt(-o, -o, W, H, r, top)
  return { links, pitch, ck, clasp: { x: r2(cp.x), y: r2(cp.y) } }
}

function Bar({ S, x0, w, side }) {
  return (
    <>
      <S.Rect x={x0} y={-1.9} width={w} height={3.8} rx={1.8} fill={AMB} />
      <S.Rect x={x0 + 0.35} y={-1.5} width={w - 0.7} height={3} rx={1.4} fill={side < 0 ? 'url(#lkU)' : 'url(#lkD)'} />
    </>
  )
}

function ClaspRing({ S, cx, rx, ry }) {
  return (
    <>
      <S.Ellipse cx={cx} rx={rx} ry={ry} fill="none" stroke={AMB} strokeWidth={2.7} />
      <S.Ellipse cx={cx} rx={rx} ry={ry} fill="none" stroke="url(#lkF)" strokeWidth={1.9} />
      <S.Path d={`M${r2(cx - rx * 0.8)} ${r2(-ry * 0.6)}A${rx} ${ry} 0 0 1 ${r2(cx + rx * 0.35)} ${r2(-ry * 0.95)}`} fill="none" stroke="#fff8dc" strokeWidth={0.7} strokeLinecap="round" />
    </>
  )
}

export function LinkedOver({ f }) {
  const S = svgAll()
  const { links, pitch, ck, clasp } = useMemo(() => linkLayout(f), [f.w, f.h, f.R, f.still]) // eslint-disable-line react-hooks/exhaustive-deps
  const sh = f.c.light ? 0.2 : 0.5
  const tf = (l, dx = 0, dy = 0) => `translate(${r2(l.x + dx)} ${r2(l.y + dy)}) rotate(${l.deg})`
  return (
    <Layer f={f}>
      <S.Defs>
        <S.LinearGradient id="lkF" x1="0" y1="0" x2="0" y2="1">
          <S.Stop offset="0" stopColor="#fff1c2" />
          <S.Stop offset="0.3" stopColor="#f3d27a" />
          <S.Stop offset="0.62" stopColor="#c9973a" />
          <S.Stop offset="1" stopColor={AMB} />
        </S.LinearGradient>
        <S.LinearGradient id="lkB" x1="0" y1="0" x2="1" y2="1">
          <S.Stop offset="0" stopColor="#fff0bf" />
          <S.Stop offset="0.4" stopColor="#e9c46a" />
          <S.Stop offset="0.75" stopColor="#c8963a" />
          <S.Stop offset="1" stopColor="#9a6a1c" />
        </S.LinearGradient>
        <S.LinearGradient id="lkU" x1="0" y1="0" x2="0" y2="1">
          <S.Stop offset="0" stopColor="#fff0bf" />
          <S.Stop offset="0.45" stopColor="#e2b75a" />
          <S.Stop offset="1" stopColor="#9a6a1c" />
        </S.LinearGradient>
        <S.LinearGradient id="lkD" x1="0" y1="1" x2="0" y2="0">
          <S.Stop offset="0" stopColor="#fff0bf" />
          <S.Stop offset="0.45" stopColor="#e2b75a" />
          <S.Stop offset="1" stopColor="#9a6a1c" />
        </S.LinearGradient>
        <S.LinearGradient id="lkC" x1="0" y1="0" x2="0" y2="1">
          <S.Stop offset="0" stopColor="#eaff9a" />
          <S.Stop offset="0.45" stopColor="#c9f24d" />
          <S.Stop offset="1" stopColor="#8fb21c" />
        </S.LinearGradient>
      </S.Defs>
      <S.Path d={ring(f, 6)} fill="none" stroke="#000000" strokeOpacity={f.c.light ? 0.045 : 0.25} strokeWidth={10} transform="translate(0 1.5)" />
      {/* Shadows, then edge-on links, then face-on links, then the edge-on ends that pass over. */}
      {links.map((l, i) =>
        l.face ? (
          <S.Ellipse key={`s${i}`} transform={tf(l, 0.7, 1.7)} rx={RX} ry={RY} fill="none" stroke="#000000" strokeOpacity={sh} strokeWidth={3.2} />
        ) : (
          <S.Rect key={`s${i}`} transform={tf(l, 0.7, 1.7)} x={-8.1} y={-2.1} width={16.2} height={4.2} rx={2.1} fill="#000000" fillOpacity={sh} />
        ),
      )}
      {links.map((l, i) =>
        l.face ? null : (
          <S.G key={`e${i}`} transform={tf(l)}>
            <Bar S={S} x0={-8} w={16} side={l.side} />
            <S.Line x1={-5} y1={0.8 * l.side} x2={4.8} y2={0.8 * l.side} stroke="#fff6d2" strokeWidth={0.75} strokeLinecap="round" />
          </S.G>
        ),
      )}
      {links.map((l, i) =>
        l.face ? (
          <S.G key={`f${i}`} transform={tf(l)}>
            <S.Ellipse rx={RX} ry={RY} fill="none" stroke={AMB} strokeWidth={2.8} />
            <S.Ellipse rx={RX} ry={RY} fill="none" stroke="url(#lkF)" strokeWidth={2.15} />
            <S.Ellipse rx={RX - 1.3} ry={RY - 1.3} fill="none" stroke="#7a4f12" strokeOpacity={0.5} strokeWidth={0.5} />
            <S.Path d={l.hl} fill="none" stroke="#fff8dc" strokeWidth={0.85} strokeLinecap="round" />
            <S.Circle cx={l.gx} cy={l.gy} r={0.75} fill="#ffffff" />
          </S.G>
        ) : null,
      )}
      {links.map((l, i) =>
        l.face ? null : (
          <S.G key={`o${i}`} transform={tf(l)}>
            <Bar S={S} x0={r2(RX - pitch - 1.7)} w={3.4} side={l.side} />
          </S.G>
        ),
      )}
      {/* Lobster clasp: gold body, spring gate, ridged trigger, lime enamel inset in a gold bezel. */}
      <S.G transform={`translate(${clasp.x} ${clasp.y}) scale(${ck})`}>
        <S.Path d={CLASP_BODY} transform="translate(0.8 1.9)" fill="#000000" fillOpacity={sh * 0.8} />
        <ClaspRing S={S} cx={-16.4} rx={3} ry={3} />
        <ClaspRing S={S} cx={14} rx={4.2} ry={3.2} />
        <S.Rect x={-4.8} y={-9.9} width={4.6} height={2.8} rx={1} fill="url(#lkF)" stroke={AMB} strokeWidth={0.7} />
        <S.Path d="M-3.3 -9.6V-7.4M-1.8 -9.6V-7.4" stroke={AMB} strokeWidth={0.45} />
        <S.Path d={CLASP_BODY} fill="url(#lkB)" stroke={AMB} strokeWidth={0.8} />
        <S.Circle cx={-11.4} cy={0} r={1.15} fill="#3a2608" />
        <S.Path d="M3 -7.7C6.6 -6.6 9 -4.3 9.6 -1" fill="none" stroke="#6a4310" strokeWidth={0.8} strokeLinecap="round" />
        <S.Path d="M3.4 -6.8C6.2 -5.8 8 -4 8.6 -1.4" fill="none" stroke="#fff3c8" strokeOpacity={0.8} strokeWidth={0.55} strokeLinecap="round" />
        <S.Path d={CLASP_INSET} fill="url(#lkC)" stroke="#b8862a" strokeWidth={0.9} />
        <S.Path d="M-4.2 -1.6C-3.2 -3.4 -1.2 -4 1.2 -4" fill="none" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={0.9} strokeLinecap="round" />
        <S.Circle cx={3.4} cy={-3} r={0.55} fill="#ffffff" />
        <S.Path d="M-9.4 -2.6C-7.8 -5.6 -4.4 -7 -.6 -7" fill="none" stroke="#fff8dc" strokeWidth={0.9} strokeLinecap="round" />
      </S.G>
    </Layer>
  )
}

/* ---------- Countdown: 24 doors round the card, one more open each December day ---------- */

// Rounded numerals in a 3 by 5 box, one stroked path each.
const DIG = {
  0: 'M1.5 0C.5 0 0 1.1 0 2.5C0 3.9 .5 5 1.5 5C2.5 5 3 3.9 3 2.5C3 1.1 2.5 0 1.5 0Z',
  1: 'M.4 1.1L1.8 0V5',
  2: 'M.1 1.1C.3 .4 .8 0 1.5 0C2.4 0 3 .6 3 1.4C3 2.7 0 3.5 0 5H3',
  3: 'M.2 .6C.5 .2 1 0 1.5 0C2.3 0 2.9 .5 2.9 1.2C2.9 2 2.2 2.4 1.3 2.4C2.3 2.4 3 2.9 3 3.7C3 4.5 2.3 5 1.5 5C.9 5 .4 4.8 .1 4.4',
  4: 'M2.2 5V0L0 3.4H3',
  5: 'M2.8 0H.5L.3 2.2C.7 1.9 1.1 1.8 1.6 1.8C2.4 1.8 3 2.4 3 3.4C3 4.4 2.3 5 1.5 5C.9 5 .4 4.8 .1 4.4',
  6: 'M2.6 .3C2.3 .1 1.9 0 1.6 0C.6 0 0 1.2 0 3C0 4.3 .6 5 1.5 5C2.4 5 3 4.4 3 3.4C3 2.5 2.4 1.9 1.6 1.9C.9 1.9 .3 2.3 0 3',
  7: 'M0 0H3L1.2 5',
  8: 'M1.5 2.4C.7 2.4 .2 1.9 .2 1.2C.2 .5 .8 0 1.5 0C2.2 0 2.8 .5 2.8 1.2C2.8 1.9 2.3 2.4 1.5 2.4ZM1.5 2.4C.6 2.4 0 3 0 3.7C0 4.5 .6 5 1.5 5C2.4 5 3 4.5 3 3.7C3 3 2.4 2.4 1.5 2.4Z',
  9: 'M3 2C2.7 2.7 2.1 3.1 1.4 3.1C.6 3.1 0 2.5 0 1.6C0 .6 .6 0 1.5 0C2.4 0 3 .7 3 2C3 3.8 2.4 5 1.4 5C1 5 .6 4.9 .4 4.7',
}

function Digits({ S, n, cx, cy, color, k = 0.95 }) {
  const s = String(n)
  const wd = s.length * 3 + (s.length - 1) * 1.3
  const x0 = cx - (wd * k) / 2
  const y0 = cy - 2.5 * k
  return s.split('').map((c, i) => (
    <S.Path key={i} transform={`translate(${r2(x0 + i * 4.3 * k)} ${r2(y0)}) scale(${k})`} d={DIG[c]} fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
  ))
}

// Eight small treats, drawn round (0,0) about 8 px across.
function Treat({ S, i }) {
  switch (i % 8) {
    case 0:
      return <S.Path d={star5(0, 0, 3.8, 1.6)} fill="#ffd34d" stroke="#b07d10" strokeWidth={0.45} />
    case 1:
      return (
        <>
          <S.Path d="M-1.2 3.6V-1A1.9 1.9 0 0 1 2.6 -1" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" />
          <S.Path d="M-1.2 3.6V-1A1.9 1.9 0 0 1 2.6 -1" fill="none" stroke="#e0453a" strokeWidth={1.8} strokeDasharray="1 1.1" />
        </>
      )
    case 2:
      return (
        <>
          <S.Path d="M-3 2.2C-3 -1 -2.4 -3.3 0 -3.3C2.4 -3.3 3 -1 3 2.2L3.7 2.9H-3.7Z" fill="#ffd34d" stroke="#a87a1a" strokeWidth={0.45} />
          <S.Circle cy={3.6} r={0.95} fill="#a87a1a" />
          <S.Path d="M-1.6 -1.6Q-1.4 -2.6 -.4 -2.8" fill="none" stroke="#fff6cc" strokeWidth={0.6} strokeLinecap="round" />
        </>
      )
    case 3:
      return <S.Path d="M0 -3.8V3.8M-3.3 -1.9L3.3 1.9M-3.3 1.9L3.3 -1.9M-1 -3.2L0 -2.2L1 -3.2M-1 3.2L0 2.2L1 3.2" fill="none" stroke="#eaf4ff" strokeWidth={0.85} strokeLinecap="round" />
    case 4:
      return (
        <>
          <S.Circle cy={0.7} r={3.1} fill="#e0453a" stroke="#8f2018" strokeWidth={0.45} />
          <S.Rect x={-1.1} y={-3.4} width={2.2} height={1.4} rx={0.4} fill="#ffd34d" />
          <S.Circle cx={-1.1} cy={-0.2} r={0.85} fill="#ffffff" opacity={0.75} />
        </>
      )
    case 5:
      return (
        <>
          <S.Path d="M0 -3.9L3.3 2.3H-3.3Z" fill="#3fa56b" stroke="#1f6a40" strokeWidth={0.45} />
          <S.Rect x={-0.7} y={2.3} width={1.4} height={1.5} fill="#8a5a2e" />
          <S.Circle cy={-3.9} r={0.9} fill="#ffd34d" />
          <S.Circle cx={-1} cy={0.6} r={0.5} fill="#e0453a" />
          <S.Circle cx={1.1} cy={1.4} r={0.5} fill="#ffd34d" />
        </>
      )
    case 6:
      return (
        <>
          <S.Path d="M-2.6 2.2V-1.4C-2.6 -3.4 1.6 -3.6 1.8 -1.6L1.9 -.6L3 -1.4C3.8 -1 3.6 .4 2.6 1L2.4 2.2Z" fill="#e0453a" stroke="#8f2018" strokeWidth={0.45} />
          <S.Rect x={-2.9} y={2} width={5.6} height={1.8} rx={0.6} fill="#ffffff" />
        </>
      )
    default:
      return (
        <>
          <S.Path d="M-2.8 .2H2.8M0 0V2M0 2L-1.8 3.8M0 2L1.8 3.8" stroke="#c27a3e" strokeWidth={1.9} strokeLinecap="round" />
          <S.Circle cy={-2.2} r={1.7} fill="#c27a3e" />
          <S.Circle cx={-0.6} cy={-2.4} r={0.3} fill="#ffffff" />
          <S.Circle cx={0.6} cy={-2.4} r={0.3} fill="#ffffff" />
          <S.Circle cy={0.9} r={0.3} fill="#ffffff" />
        </>
      )
  }
}

// [top, bottom, number ink, inside face of the door]
const DOORS = [
  ['#d0473d', '#9c2b23', '#fbecc8', '#f0b8a8'],
  ['#2f8a60', '#1d5c40', '#fbecc8', '#9fd4b9'],
  ['#f3e6c6', '#d9c393', '#8a2a22', '#fff6e2'],
]
const DOOR_W = 12.4
const DOOR_H = 14.6

/** Month and day from f.p.date: a Date, or 'YYYY-MM-DD'. Falls back to today. */
export function countdownDay(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) return { m: date.getMonth() + 1, d: date.getDate() }
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(date || ''))
  if (m) return { m: Number(m[1]), d: Number(m[2]) }
  const now = new Date()
  return { m: now.getMonth() + 1, d: now.getDate() }
}

/** How many doors are open and which one is today's. Outside December every door is open. */
export function countdownState(date) {
  const { m, d } = countdownDay(date)
  if (m !== 12) return { open: 24, today: 0 }
  return { open: Math.min(24, d), today: d <= 24 ? d : 0 }
}

function countdownLayout(f) {
  const m = 11
  const W = f.w + 2 * m
  const H = f.h + 2 * m
  const r = f.R + m
  const L = rrLength(W, H, r)
  const top = H - 2 * r + (Math.PI * r) / 2 + (W - 2 * r) / 2
  // Door 1 sits just right of the top middle and they run clockwise; door 24 lands back on top.
  const at = (k) => rrPointAt(-m, -m, W, H, r, top + ((k + 1) * L) / 24)
  const doors = []
  for (let i = 0; i < 24; i++) {
    const p = at(i)
    // Upright on the straight edges, turned with the curve on the corners (at most 45 degrees).
    let rot = (Math.atan2(p.nx, -p.ny) * 180) / Math.PI
    rot = (((rot % 90) + 135) % 90) - 45
    const rr = (rot * Math.PI) / 180
    const inX = -p.nx * Math.cos(rr) - p.ny * Math.sin(rr)
    // Where the door's width runs across the band, the leaf hinges on the edge nearest the card.
    const across = Math.abs(inX) > 0.5
    doors.push({ x: r2(p.x), y: r2(p.y), rot: r2(rot), across, mirror: across && inX > 0 })
  }
  const sparks = []
  for (let i = 0; i < 23; i++) {
    const p = at(i + 0.5)
    sparks.push({ x: r2(p.x), y: r2(p.y), nx: p.nx, ny: p.ny, s: i % 3 === 0 ? 2.2 : 1.5, tw: i % 4 === 1, ph: i * 0.9 })
  }
  return { doors, sparks }
}

/** An open door's leaf swung out on its hinge (left edge at x0), inside face showing, with a shadow. */
function Leaf({ S, x0, y0, dw, dh, face, edge, pw = dw * 0.5 }) {
  const k = dh * 0.13
  return (
    <>
      <S.Path d={`M${x0} ${r2(y0 + 1)}L${r2(x0 - pw - 1.4)} ${r2(y0 + k + 1.6)}L${r2(x0 - pw - 1.4)} ${r2(y0 + dh - k + 2.4)}L${x0} ${r2(y0 + dh + 1.2)}Z`} fill="#000000" fillOpacity={0.38} />
      <S.Path d={`M${x0} ${y0}L${r2(x0 - pw)} ${r2(y0 + k)}L${r2(x0 - pw)} ${r2(y0 + dh - k)}L${x0} ${r2(y0 + dh)}Z`} fill={face} stroke="#e9c46a" strokeWidth={0.8} strokeLinejoin="round" />
      <S.Path d={`M${r2(x0 - 1.3)} ${r2(y0 + k * 0.5 + 1.6)}L${r2(x0 - pw + 1.1)} ${r2(y0 + k + 1.4)}L${r2(x0 - pw + 1.1)} ${r2(y0 + dh - k - 1.4)}L${r2(x0 - 1.3)} ${r2(y0 + dh - k * 0.5 - 1.6)}Z`} fill="none" stroke={edge} strokeOpacity={0.7} strokeWidth={0.6} />
      <S.Line x1={r2(x0 - pw)} y1={r2(y0 + k)} x2={r2(x0 - pw)} y2={r2(y0 + dh - k)} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.7} />
      <S.Circle cx={r2(x0 - pw + 1.2)} cy={r2(y0 + dh / 2)} r={0.7} fill="#ffd56b" />
      <S.Circle cx={x0} cy={r2(y0 + 2.4)} r={0.7} fill="#b8862a" />
      <S.Circle cx={x0} cy={r2(y0 + dh - 2.4)} r={0.7} fill="#b8862a" />
    </>
  )
}

function Bow({ S, y }) {
  return (
    <S.G transform={`translate(0 ${r2(y)})`}>
      <S.Path d="M0 0C-2.4 -4.6 -7.6 -4.4 -7 -1C-6.6 1.2 -2.6 1 0 0ZM0 0C2.4 -4.6 7.6 -4.4 7 -1C6.6 1.2 2.6 1 0 0Z" fill="url(#cdRb)" stroke="#7a1a14" strokeWidth={0.6} />
      <S.Path d="M-.8 .6L-2.8 3.6L-1.7 3.3L-1.3 4.3ZM.8 .6L2.8 3.6L1.7 3.3L1.3 4.3Z" fill="#c8352c" stroke="#7a1a14" strokeWidth={0.5} />
      <S.Ellipse rx={1.9} ry={1.6} fill="#e0453a" stroke="#7a1a14" strokeWidth={0.55} />
      <S.Path d="M-5.4 -2.2C-4.4 -3.2 -3 -3.2 -2 -2" fill="none" stroke="#ff9f8f" strokeWidth={0.6} strokeLinecap="round" />
    </S.G>
  )
}

function Door({ S, i, d, open, today }) {
  const n = i + 1
  const big = n === 24
  const DW = big ? 17 : DOOR_W
  const DH = big ? 19 : DOOR_H
  const x0 = r2(-DW / 2)
  const y0 = r2(-DH / 2)
  const [, c2, ink, back] = DOORS[i % 3]
  const isOpen = n <= open
  const isToday = n === today
  const leaf = (face, edge) => {
    const el = <Leaf S={S} x0={x0} y0={y0} dw={DW} dh={DH} face={face} edge={edge} pw={d.across ? 3.6 : undefined} />
    return d.mirror ? <S.G transform="scale(-1 1)">{el}</S.G> : el
  }
  const todayRing = isToday ? <S.Rect x={r2(x0 - 1.8)} y={r2(y0 - 1.8)} width={DW + 3.6} height={DH + 3.6} rx={big ? 3.8 : 3.4} fill="none" stroke="#ffe6a0" strokeWidth={1.1} /> : null
  let body
  if (big && !isOpen) {
    body = (
      <>
        <S.Rect x={x0 + 0.5} y={y0 + 1.2} width={DW} height={DH} rx={2.6} fill="#000000" fillOpacity={0.38} />
        <S.Rect x={x0} y={y0} width={DW} height={DH} rx={2.6} fill="url(#cdGd)" stroke="#fff1c2" strokeWidth={0.9} />
        <S.Rect x={-1.7} y={y0} width={3.4} height={DH} fill="url(#cdRv)" />
        <S.Rect x={x0} y={3} width={DW} height={3.4} fill="url(#cdRh)" />
        <S.Line x1={x0 + 1.8} y1={y0 + 1.4} x2={r2(x0 + DW - 1.8)} y2={y0 + 1.4} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.8} strokeLinecap="round" />
        <S.Rect x={-5.6} y={-6.4} width={11.2} height={7.4} rx={1.8} fill="#fbf1d8" stroke="#b8862a" strokeWidth={0.6} />
        <Digits S={S} n={24} cx={0} cy={-2.7} color="#9c2b23" k={0.92} />
      </>
    )
  } else if (big) {
    body = (
      <>
        <S.Rect x={x0} y={y0} width={DW} height={DH} rx={2.6} fill={isToday ? 'url(#cdRt)' : 'url(#cdRc)'} stroke="#fff1c2" strokeWidth={0.9} />
        <S.Rect x={x0 + 0.7} y={y0 + 0.7} width={DW - 1.4} height={2.6} rx={1.2} fill="#000000" fillOpacity={0.3} />
        <S.Circle cx={0} cy={1} r={6.5} fill="url(#cdGl)" />
        <S.Path d={star5(0, 1, 5.6, 2.4)} fill="#ffd34d" stroke="#b07d10" strokeWidth={0.5} />
        <S.Path d="M-1.6 -1.2L-.4 -2.6" stroke="#fff8d0" strokeWidth={0.7} strokeLinecap="round" />
        {leaf('url(#cdGd)', '#9c2b23')}
        <S.Line x1={r2(x0 - DW * 0.25)} y1={r2(y0 + DH * 0.065)} x2={r2(x0 - DW * 0.25)} y2={r2(y0 + DH * 0.935)} stroke="#c8352c" strokeWidth={2.4} />
      </>
    )
  } else if (!isOpen) {
    body = (
      <>
        <S.Rect x={x0 + 0.4} y={y0 + 1} width={DW} height={DH} rx={2.2} fill="#000000" fillOpacity={0.35} />
        <S.Rect x={x0} y={y0} width={DW} height={DH} rx={2.2} fill={`url(#cdD${i % 3})`} stroke="#e9c46a" strokeWidth={0.9} />
        <S.Line x1={x0 + 1.6} y1={y0 + 1.3} x2={r2(x0 + DW - 1.6)} y2={y0 + 1.3} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={0.7} strokeLinecap="round" />
        <Digits S={S} n={n} cx={-0.6} cy={-0.4} color={ink} />
        <S.Circle cx={r2(x0 + DW - 1.9)} cy={4.4} r={0.8} fill="#ffd56b" />
      </>
    )
  } else {
    body = (
      <>
        <S.Rect x={x0} y={y0} width={DW} height={DH} rx={2.2} fill={isToday ? 'url(#cdRt)' : 'url(#cdRc)'} stroke="#e9c46a" strokeWidth={0.9} />
        <S.Rect x={x0 + 0.6} y={y0 + 0.6} width={DW - 1.2} height={2.2} rx={1} fill="#000000" fillOpacity={0.3} />
        <S.G transform={`translate(0.3 0.6) scale(${isToday ? 1.08 : 1})`}>
          <Treat S={S} i={i + 1} />
        </S.G>
        {leaf(back, c2)}
      </>
    )
  }
  return (
    <S.G transform={`translate(${d.x} ${d.y}) rotate(${d.rot})`}>
      {body}
      {big ? <Bow S={S} y={y0 - 2.2} /> : null}
      {todayRing}
    </S.G>
  )
}

function glowAt(time, it) {
  'worklet'
  const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * time) / 3.4)
  return { x: it.x, y: it.y, o: 0.55 + 0.45 * k, s: 0.92 + 0.14 * k }
}

function sparkAt(time, it) {
  'worklet'
  return { x: it.x, y: it.y, o: 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((2 * Math.PI * time) / 2.8 + it.ph)) }
}

export function CountdownOver({ f }) {
  const S = svgAll()
  const { doors, sparks } = useMemo(() => countdownLayout(f), [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  const { open, today } = countdownState(f.p.date)
  const live = !f.still
  const todayDoor = today ? doors[today - 1] : null
  const glowR = today === 24 ? 22 : 17
  const sparkPath = (s) => sparkD(s.x, s.y, s.s)
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="cdGd" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#fff1c2" />
            <S.Stop offset="0.45" stopColor="#e9c46a" />
            <S.Stop offset="1" stopColor="#b8862a" />
          </S.LinearGradient>
          <S.LinearGradient id="cdRv" x1="0" y1="0" x2="1" y2="0">
            <S.Stop offset="0" stopColor="#9c2b23" />
            <S.Stop offset="0.5" stopColor="#e0453a" />
            <S.Stop offset="1" stopColor="#9c2b23" />
          </S.LinearGradient>
          <S.LinearGradient id="cdRh" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#9c2b23" />
            <S.Stop offset="0.5" stopColor="#e0453a" />
            <S.Stop offset="1" stopColor="#9c2b23" />
          </S.LinearGradient>
          <S.LinearGradient id="cdRb" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#ff6b5c" />
            <S.Stop offset="1" stopColor="#b8261e" />
          </S.LinearGradient>
          <S.LinearGradient id="cdBd" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#22306a" />
            <S.Stop offset="0.55" stopColor="#16214c" />
            <S.Stop offset="1" stopColor="#0e1636" />
          </S.LinearGradient>
          <S.LinearGradient id="cdSh" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
            <S.Stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
            <S.Stop offset="1" stopColor="#000000" stopOpacity="0.18" />
          </S.LinearGradient>
          <S.LinearGradient id="cdGt" x1="0" y1="0" x2="1" y2="1">
            <S.Stop offset="0" stopColor="#fff1c2" />
            <S.Stop offset="0.35" stopColor="#e2b75a" />
            <S.Stop offset="0.7" stopColor="#f6d98a" />
            <S.Stop offset="1" stopColor="#9a6e22" />
          </S.LinearGradient>
          {DOORS.map((d, i) => (
            <S.LinearGradient key={i} id={`cdD${i}`} x1="0" y1="0" x2="0" y2="1">
              <S.Stop offset="0" stopColor={d[0]} />
              <S.Stop offset="1" stopColor={d[1]} />
            </S.LinearGradient>
          ))}
          <S.RadialGradient id="cdRc" cx="0.5" cy="0.55" r="0.7">
            <S.Stop offset="0" stopColor="#7a4020" />
            <S.Stop offset="1" stopColor="#2a120a" />
          </S.RadialGradient>
          <S.RadialGradient id="cdRt" cx="0.5" cy="0.55" r="0.7">
            <S.Stop offset="0" stopColor="#ffcf7a" />
            <S.Stop offset="0.55" stopColor="#b8662a" />
            <S.Stop offset="1" stopColor="#3a180c" />
          </S.RadialGradient>
          <S.RadialGradient id="cdGl">
            <S.Stop offset="0" stopColor="#ffd98a" stopOpacity="0.95" />
            <S.Stop offset="0.45" stopColor="#ffc25a" stopOpacity="0.4" />
            <S.Stop offset="1" stopColor="#ffc25a" stopOpacity="0" />
          </S.RadialGradient>
        </S.Defs>
        <S.Path d={ring(f, 21)} transform="translate(0 2)" fill="none" stroke="#000000" strokeOpacity={f.c.light ? 0.1 : 0.3} strokeWidth={3} />
        <S.Path d={`${ring(f, 21)} ${ring(f, 1)}`} fillRule="evenodd" fill="url(#cdBd)" />
        <S.Path d={`${ring(f, 21)} ${ring(f, 1)}`} fillRule="evenodd" fill="url(#cdSh)" />
        <S.Path d={ring(f, 1.6)} fill="none" stroke="url(#cdGt)" strokeWidth={1.3} />
        <S.Path d={ring(f, 20.4)} fill="none" stroke="url(#cdGt)" strokeWidth={1.3} />
        <S.Path d={ring(f, 18.2)} fill="none" stroke="#e9c46a" strokeOpacity={0.35} strokeWidth={0.6} />
        <S.Path d={ring(f, 3.8)} fill="none" stroke="#e9c46a" strokeOpacity={0.35} strokeWidth={0.6} />
        <S.Path d={ring(f, 0.4)} fill="none" stroke="#000000" strokeOpacity={f.c.light ? 0.12 : 0.35} strokeWidth={1} />
        {sparks.map((s, i) => (
          <S.G key={i}>
            {live && s.tw ? null : <S.Path d={sparkPath(s)} fill="#ffe3a0" opacity={0.85} />}
            <S.Circle cx={r2(s.x + s.nx * 6)} cy={r2(s.y + s.ny * 6)} r={0.55} fill="#e9c46a" opacity={0.6} />
            <S.Circle cx={r2(s.x - s.nx * 6)} cy={r2(s.y - s.ny * 6)} r={0.55} fill="#e9c46a" opacity={0.6} />
          </S.G>
        ))}
        {todayDoor && !live ? <S.Circle cx={todayDoor.x} cy={todayDoor.y} r={glowR} fill="url(#cdGl)" /> : null}
      </Layer>
      {todayDoor && live ? (
        <Particle clock={f.clock} item={todayDoor} fn={glowAt} w={f.w} h={f.h} size={glowR * 2 + 2}>
          <S.Svg width={glowR * 2 + 2} height={glowR * 2 + 2} viewBox={`${-glowR - 1} ${-glowR - 1} ${glowR * 2 + 2} ${glowR * 2 + 2}`}>
            <S.Defs>
              <S.RadialGradient id="cdGl2">
                <S.Stop offset="0" stopColor="#ffd98a" stopOpacity="0.95" />
                <S.Stop offset="0.45" stopColor="#ffc25a" stopOpacity="0.4" />
                <S.Stop offset="1" stopColor="#ffc25a" stopOpacity="0" />
              </S.RadialGradient>
            </S.Defs>
            <S.Circle r={glowR} fill="url(#cdGl2)" />
          </S.Svg>
        </Particle>
      ) : null}
      {live
        ? sparks
            .filter((s) => s.tw)
            .map((s, i) => (
              <Particle key={i} clock={f.clock} item={s} fn={sparkAt} w={f.w} h={f.h} size={6}>
                <S.Svg width={6} height={6} viewBox="-3 -3 6 6">
                  <S.Path d={sparkD(0, 0, s.s)} fill="#ffe3a0" />
                </S.Svg>
              </Particle>
            ))
        : null}
      <Layer f={f}>
        {doors.map((d, i) => (
          <Door key={i} S={S} i={i} d={d} open={open} today={today} />
        ))}
      </Layer>
    </>
  )
}

/* ---------- Bedtime: a canopy bed round the card; the buddy falls asleep when tonight is done ---------- */

const CREAM = '#efe3c4'
const INK = '#1d255a'
const HEAD_K = 0.86
// The canopy's top band, px outside the card. Cards sit about 8 px below what
// is above them on Home, so the band stays inside that gap.
const V_OUT = 8
const V_IN = 2

/** A point on the top piece of the ring o px out: from 8 px below the top-left corner, round the top, to 8 px below the top-right one. */
function topAt(f, o, u) {
  const r = f.R + o
  const arc = (Math.PI * r) / 2
  const sh = f.w - 2 * f.R
  const sv = f.h - 2 * f.R
  const e = 8
  const refArc = (Math.PI * (f.R + 12)) / 2
  const ref = [e, refArc, sh, refArc, e]
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

function crescentD(cx, cy, r, dx, dy, rc) {
  const d = Math.hypot(dx, dy)
  const a = (r * r - rc * rc + d * d) / (2 * d)
  const hh = Math.sqrt(Math.max(0, r * r - a * a))
  const ux = dx / d
  const uy = dy / d
  const mx = cx + a * ux
  const my = cy + a * uy
  const p1 = [mx - hh * uy, my + hh * ux]
  const p2 = [mx + hh * uy, my - hh * ux]
  return `M${r2(p1[0])} ${r2(p1[1])}A${r} ${r} 0 1 1 ${r2(p2[0])} ${r2(p2[1])}A${rc} ${rc} 0 0 0 ${r2(p1[0])} ${r2(p1[1])}Z`
}

// Everything that depends only on the card size: canopy, curtains, posts, boards.
function bedLayout(f) {
  const { w, h, R } = f
  const N = 56
  const SC = 28
  const outer = []
  const inner = []
  for (let i = 0; i <= N; i++) {
    outer.push(topAt(f, V_OUT, i / N))
    inner.push(topAt(f, V_IN, i / N))
  }
  const valance = `M${outer.map((p) => `${r2(p.x)} ${r2(p.y)}`).join('L')}L${inner
    .slice()
    .reverse()
    .map((p) => `${r2(p.x)} ${r2(p.y)}`)
    .join('L')}Z`
  const piping = `M${outer.map((p) => `${r2(p.x - p.nx * 1)} ${r2(p.y - p.ny * 1)}`).join('L')}`
  const scallops = []
  for (let i = 0; i < SC; i++) {
    const p = topAt(f, V_IN - 0.4, (i + 0.5) / SC)
    scallops.push({ x: r2(p.x), y: r2(p.y), ix: r2(p.x + p.nx * 0.4), iy: r2(p.y + p.ny * 0.4) })
  }
  let pleatDark = ''
  let pleatLight = ''
  for (let i = 1; i < SC; i++) {
    const a = topAt(f, V_IN + 0.8, i / SC)
    const b = topAt(f, V_OUT - 1.2, i / SC)
    pleatDark += `M${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}`
    const c = topAt(f, V_IN + 0.8, (i + 0.18) / SC)
    const d = topAt(f, V_OUT - 1.2, (i + 0.18) / SC)
    pleatLight += `M${r2(c.x)} ${r2(c.y)}L${r2(d.x)} ${r2(d.y)}`
  }
  let vStars = ''
  for (let i = 0; i < SC; i += 2) {
    const p = topAt(f, (V_IN + V_OUT) / 2, (i + 1) / SC)
    vStars += sparkD(p.x, p.y, 1.3)
  }
  const vL = topAt(f, (V_IN + V_OUT) / 2, 0)
  const vR = topAt(f, (V_IN + V_OUT) / 2, 1)
  const tY = R + Math.round(h * 0.3)
  const curtain = (m) => {
    const X = (x) => r2(m ? w - x : x)
    const top = R + 6
    return {
      body: `M${X(-2.4)} ${top}L${X(-13.6)} ${top}C${X(-13.6)} ${tY - 22} ${X(-11)} ${tY - 5} ${X(-10.2)} ${tY}C${X(-11)} ${tY + 11} ${X(-15)} ${tY + 22} ${X(-13.4)} ${tY + 34}Q${X(-9.4)} ${tY + 38.5} ${X(-5)} ${tY + 33}C${X(-5.4)} ${tY + 20} ${X(-6.2)} ${tY + 8} ${X(-6)} ${tY}C${X(-4.8)} ${tY - 6} ${X(-2.4)} ${tY - 24} ${X(-2.4)} ${top}Z`,
      folds: `M${X(-5.2)} ${top}Q${X(-5.6)} ${tY - 14} ${X(-7.2)} ${tY - 1}M${X(-8.4)} ${top}Q${X(-8.4)} ${tY - 14} ${X(-8.2)} ${tY - 1}M${X(-11.4)} ${top}Q${X(-11)} ${tY - 14} ${X(-9.2)} ${tY - 1}M${X(-8)} ${tY + 3}Q${X(-8.6)} ${tY + 18} ${X(-9.6)} ${tY + 34}M${X(-10.4)} ${tY + 3}Q${X(-12)} ${tY + 18} ${X(-12.2)} ${tY + 33}`,
      shine: `M${X(-3.4)} ${top + 2}Q${X(-3.8)} ${tY - 16} ${X(-6.4)} ${tY - 2}`,
      tie: `M${X(-11.4)} ${tY - 1.6}Q${X(-8.1)} ${tY - 3} ${X(-4.8)} ${tY - 1.6}L${X(-4.8)} ${tY + 1.6}Q${X(-8.1)} ${tY + 0.2} ${X(-11.4)} ${tY + 1.6}Z`,
      bow: [X(-6.2), X(-5.6)],
      tilt: m ? 25 : -25,
    }
  }
  return { valance, piping, scallops, pleatDark, pleatLight, vStars, vL, vR, tY, curtains: [curtain(false), curtain(true)] }
}

function zAt(time, it) {
  'worklet'
  const q = ((time + it.dl) / 4.8) % 1
  const o = q < 0.15 ? (q / 0.15) * 0.95 : 0.95 * (1 - (q - 0.15) / 0.85)
  return { x: it.x - 4 * q + 2 * Math.sin(q * Math.PI), y: it.y - 20 * q, o, s: 0.7 + 0.4 * q }
}

function breatheFn(on) {
  return (time) => {
    'worklet'
    if (!on) return { transform: [{ translateY: 0 }] }
    return { transform: [{ translateY: -1.1 * (0.5 - 0.5 * Math.cos((2 * Math.PI * time) / 4.8)) }] }
  }
}

function Post({ S, x, f, tY }) {
  const { h } = f
  const c = x + 3.8
  const top = tY + 8
  const knobs = [top + 26, (top + h) / 2 + 10, h - 40]
  return (
    <>
      <S.Rect x={x} y={top} width={7.6} height={r2(h + 21 - top)} rx={3.2} fill="url(#btWd)" stroke="#5a3a1e" strokeWidth={0.7} />
      <S.Line x1={x + 1.8} y1={top + 4} x2={x + 1.8} y2={h + 16} stroke="#f3c48e" strokeOpacity={0.6} strokeWidth={1.1} strokeLinecap="round" />
      {knobs.map((y, i) => (
        <S.G key={i}>
          <S.Ellipse cx={c} cy={r2(y)} rx={5.4} ry={2.6} fill="url(#btWd)" stroke="#5a3a1e" strokeWidth={0.6} />
          <S.Path d={`M${r2(c - 3.8)} ${r2(y - 1)}Q${r2(c - 1)} ${r2(y - 2.4)} ${r2(c + 1.6)} ${r2(y - 1.8)}`} fill="none" stroke="#f6cf9c" strokeOpacity={0.8} strokeWidth={0.8} strokeLinecap="round" />
        </S.G>
      ))}
      <S.Ellipse cx={c} cy={top} rx={4.6} ry={1.8} fill="#7a4e2c" />
      <S.Circle cx={c} cy={top - 4.4} r={4.6} fill="url(#btKn)" stroke="#5a3a1e" strokeWidth={0.7} />
      <S.Circle cx={c - 1.6} cy={top - 6} r={1.3} fill="#ffe2b8" opacity={0.85} />
      <S.Rect x={x - 0.6} y={h + 19} width={8.8} height={5} rx={1.4} fill="#6e4526" />
    </>
  )
}

function Board({ S, x0, x1, top, h, light, moon }) {
  const m = (x0 + x1) / 2
  const d = `M${x0} ${h + 18}V${top + 7}Q${x0} ${top} ${m} ${top}Q${x1} ${top} ${x1} ${top + 7}V${h + 18}Z`
  return (
    <>
      <S.Path d={d} fill="#000000" fillOpacity={light ? 0.12 : 0.32} transform="translate(1.2 1.6)" />
      <S.Path d={d} fill="url(#btWd)" stroke="#5a3a1e" strokeWidth={0.8} />
      <S.Path d={`M${x0 + 2.4} ${h + 4}V${top + 8}Q${x0 + 2.4} ${top + 2.6} ${m} ${top + 2.6}Q${x1 - 2.4} ${top + 2.6} ${x1 - 2.4} ${top + 8}V${h + 4}`} fill="none" stroke="#5a3a1e" strokeOpacity={0.55} strokeWidth={0.8} />
      <S.Path d={`M${x0 + 1.1} ${top + 8}Q${x0 + 1.3} ${top + 1.1} ${m - 1} ${top + 0.9}`} fill="none" stroke="#f6cf9c" strokeOpacity={0.85} strokeWidth={1} strokeLinecap="round" />
      {moon ? <S.Path d={crescentD(m, top + 11, 3.4, 1.9, -1.2, 2.8)} fill="#5a3a1e" opacity={0.8} /> : null}
    </>
  )
}

function Tassel({ S, x, y }) {
  return (
    <>
      <S.Line x1={x} y1={y} x2={x} y2={y + 4} stroke="#d9b45a" strokeWidth={0.8} />
      <S.Circle cx={x} cy={y + 4.8} r={1.6} fill="#e9c46a" stroke="#9a7420" strokeWidth={0.5} />
      <S.Path d={`M${x - 1.8} ${y + 6}L${x - 2.2} ${y + 11}H${x + 2.2}L${x + 1.8} ${y + 6}Z`} fill="#e9c46a" stroke="#9a7420" strokeWidth={0.5} />
      <S.Path d={`M${x - 0.8} ${y + 7}V${y + 10.6}M${x + 0.8} ${y + 7}V${y + 10.6}`} stroke="#9a7420" strokeWidth={0.4} />
    </>
  )
}

function zD(s) {
  return `M0 0h${s}l${-s} ${r2(s * 1.1)}h${s}`
}

export function BedtimeOver({ f }) {
  const S = svgAll()
  const { w, h, R } = f
  const L = f.c.light
  const live = !f.still
  const lay = useMemo(() => bedLayout(f), [w, h, R]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = Number(f.p.total) || 0
  const ans = Math.min(total, Number(f.p.answered) || 0)
  // Tiles show the asleep scene.
  const asleep = f.still || (total > 0 && ans >= total)
  const r = asleep ? 1 : total ? ans / total : 0
  const lift = asleep ? 1 : r * 0.85
  const evening = Number(f.p.evening) || 0
  const buddy = f.p.buddy || FREE_BUDDY

  // Blinks while awake, heavy lids once answers come in, shut when asleep.
  const base = asleep ? 1 : r > 0 ? Math.min(0.6, 0.4 + 0.15 * r + 0.1 * evening) : 0
  const clock = f.clock
  const blink = Reanimated.useDerivedValue(() => {
    if (base >= 1) return 1
    const q = ((clock.value || 0) % (base > 0 ? 6.8 : 4.6)) / (base > 0 ? 6.8 : 4.6)
    const shut = q > 0.93 && q < 0.99 ? 1 - Math.abs(q - 0.96) / 0.03 : 0
    return Math.max(base, shut)
  }, [base])

  // The blanket is tucked under the buddy's chin at the right end.
  const yb = h - 2
  const yChin = h + 8 - 2 * lift
  const yHump = h - 4 - 7 * lift
  const BR = w + 18
  const topEdge = `M-4 ${yb}L${w - 96} ${yb}C${w - 80} ${yb} ${w - 66} ${r2(yHump)} ${w - 48} ${r2(yHump)}C${w - 32} ${r2(yHump)} ${w - 20} ${r2(yChin)} ${w - 6} ${r2(yChin)}C${w + 1} ${r2(yChin)} ${w + 6} ${r2(yChin + 0.5)} ${BR} ${r2(yChin + 0.5)}`
  const steps = Math.round((BR + 4) / 22)
  const step = (BR + 4) / steps
  let hem = ''
  for (let i = 0; i < steps; i++) {
    const x = BR - i * step
    const x2 = Math.max(-4, x - step)
    hem += `Q${r2((x + x2) / 2)} ${h + 15} ${r2(x2)} ${h + 12}`
  }
  const blanket = `${topEdge}Q${BR + 3} ${r2((yChin + h + 12) / 2)} ${BR} ${h + 12}${hem}Z`
  let quilt = ''
  for (let x = -80; x < w + 40; x += 10) quilt += `M${x} ${h - 16}l32 32M${x + 32} ${h - 16}l-32 32`
  const n = Math.min(10, Math.max(1, total || 4))
  const sx0 = 16
  const sx1 = w - 118
  const stars = Array.from({ length: n }, (_, i) => ({ x: r2(n === 1 ? (sx0 + sx1) / 2 : sx0 + ((sx1 - sx0) * i) / (n - 1)), on: asleep || i < ans }))
  const folds = [
    [w - 140, 5],
    [w - 196, -4],
    [70, 4],
    [26, -3],
  ]

  // Moon night-light on the footboard: off while questions are left, warm when all are in.
  const lx = -10
  const ly = h - 37
  const glowA = asleep ? 1 : 0.2 * r

  // Small Zs drift up and left from above the headboard, between the card and the post.
  const zIn = L ? '#34418f' : '#fff3d2'
  const zOut = L ? '#ffffff' : INK
  const zs = asleep
    ? [
        { x: w + 8.2, y: h - 56, s: 3.2, dl: 0 },
        { x: w + 4.6, y: h - 69, s: 3.8, dl: 1.6 },
        { x: w + 8.8, y: h - 83, s: 4.4, dl: 3.2 },
      ]
    : []

  const hx = w + 5
  const hy = h + 1
  const bw = 48 * HEAD_K
  const bh = 58 * HEAD_K
  const clipTop = hy - 31 * HEAD_K - 8
  const breathe = useMemo(() => breatheFn(asleep && live), [asleep, live])

  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="btFb" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#6170c4" />
            <S.Stop offset="1" stopColor="#3b4690" />
          </S.LinearGradient>
          <S.LinearGradient id="btVl" x1="0" y1={-V_OUT} x2="0" y2={R + 4} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#6d7bd0" />
            <S.Stop offset="1" stopColor="#36418a" />
          </S.LinearGradient>
          <S.LinearGradient id="btCt" x1="0" y1={R} x2="0" y2={lay.tY + 40} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#5a68bd" />
            <S.Stop offset="1" stopColor="#3a4590" />
          </S.LinearGradient>
          <S.LinearGradient id="btMt" x1="0" y1={h + 6} x2="0" y2={h + 18} gradientUnits="userSpaceOnUse">
            <S.Stop offset="0" stopColor="#fbf7ec" />
            <S.Stop offset="1" stopColor="#e2d7bd" />
          </S.LinearGradient>
          <S.LinearGradient id="btPl" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#ffffff" />
            <S.Stop offset="1" stopColor="#d6deef" />
          </S.LinearGradient>
          <S.LinearGradient id="btWd" x1="0" y1="0" x2="1" y2="0">
            <S.Stop offset="0" stopColor="#c58a54" />
            <S.Stop offset="0.5" stopColor="#a06a3c" />
            <S.Stop offset="1" stopColor="#6e4526" />
          </S.LinearGradient>
          <S.RadialGradient id="btKn" cx="0.35" cy="0.3" r="0.75">
            <S.Stop offset="0" stopColor="#e3a86e" />
            <S.Stop offset="1" stopColor="#7a4e2c" />
          </S.RadialGradient>
        </S.Defs>
        <Post S={S} x={-22} f={f} tY={lay.tY} />
        <Post S={S} x={w + 14.4} f={f} tY={lay.tY} />
        {lay.curtains.map((c, i) => (
          <S.G key={i}>
            <S.Path d={c.body} fill="url(#btCt)" stroke={INK} strokeOpacity={0.6} strokeWidth={0.7} />
            <S.Path d={c.folds} fill="none" stroke={INK} strokeOpacity={0.45} strokeWidth={0.8} />
            <S.Path d={c.shine} fill="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={1} />
            <S.Path d={c.tie} fill={CREAM} stroke="#b9a57c" strokeWidth={0.5} />
            <S.Ellipse cx={c.bow[0]} cy={lay.tY - 2} rx={2.2} ry={1.4} fill={CREAM} stroke="#b9a57c" strokeWidth={0.5} transform={`rotate(${c.tilt} ${c.bow[0]} ${lay.tY - 2})`} />
            <S.Ellipse cx={c.bow[0]} cy={lay.tY + 2.2} rx={2.2} ry={1.4} fill={CREAM} stroke="#b9a57c" strokeWidth={0.5} transform={`rotate(${-c.tilt} ${c.bow[0]} ${lay.tY + 2.2})`} />
            <S.Circle cx={c.bow[1]} cy={lay.tY} r={1.1} fill="#e2d2a8" />
          </S.G>
        ))}
        <S.Path d={lay.valance} fill="#000000" fillOpacity={L ? 0.1 : 0.3} transform="translate(0 1.8)" />
        {lay.scallops.map((p, i) => (
          <S.Circle key={`c${i}`} cx={p.x} cy={p.y} r={2.7} fill={CREAM} />
        ))}
        {lay.scallops.map((p, i) => (
          <S.Circle key={`f${i}`} cx={p.ix} cy={p.iy} r={2.4} fill="url(#btFb)" />
        ))}
        <S.Path d={lay.valance} fill="url(#btVl)" />
        <S.Path d={lay.pleatDark} stroke={INK} strokeOpacity={0.35} strokeWidth={1.1} />
        <S.Path d={lay.pleatLight} stroke="#ffffff" strokeOpacity={0.13} strokeWidth={1} />
        <S.Path d={lay.vStars} fill="#ffd77a" opacity={0.8} />
        <S.Path d={lay.piping} fill="none" stroke={CREAM} strokeWidth={1.8} />
        <S.Path d={lay.valance} fill="none" stroke={INK} strokeOpacity={0.6} strokeWidth={0.7} />
        <Tassel S={S} x={r2(lay.vL.x)} y={r2(lay.vL.y + 4)} />
        <Tassel S={S} x={r2(lay.vR.x)} y={r2(lay.vR.y + 4)} />
        <Board S={S} x0={-20.5} x1={-3.5} top={h - 32} h={h} light={L} moon={false} />
        <Board S={S} x0={w + 3} x1={w + 20.5} top={h - 48} h={h} light={L} moon />
        <S.Rect x={-4} y={h + 6} width={BR + 4} height={12} rx={4} fill="url(#btMt)" stroke="#b9ab88" strokeWidth={0.7} />
        <S.Line x1={-1} y1={h + 15.6} x2={BR - 3} y2={h + 15.6} stroke="#cdbf9c" strokeWidth={0.7} strokeDasharray="2.4 1.8" />
        <S.Rect x={-17} y={h + 17.6} width={w + 34} height={3.8} rx={1.6} fill="url(#btWd)" stroke="#5a3a1e" strokeWidth={0.6} />
        <S.G transform={`translate(${w + 8} ${h - 5}) rotate(-12)`}>
          <S.Rect x={-17} y={-10} width={34} height={20} rx={9} fill="#000000" fillOpacity={L ? 0.1 : 0.3} transform="translate(1 2)" />
          <S.Rect x={-17} y={-10} width={34} height={20} rx={9} fill="url(#btPl)" stroke="#aab5d0" strokeWidth={0.8} />
          <S.Path d="M-12 -2.6Q0 .4 12 -2.6" fill="none" stroke="#c3cce2" strokeWidth={0.9} />
          <S.Path d="M-13 -6.6Q-6 -8.8 1 -8.6" fill="none" stroke="#ffffff" strokeWidth={1.3} strokeLinecap="round" />
        </S.G>
      </Layer>
      {/* The buddy on the pillow, cut off below the chin so nothing shows under the blanket. */}
      <Moving clock={f.clock} fn={breathe} style={FILL}>
        <View pointerEvents="none" style={{ position: 'absolute', left: hx - 24 * HEAD_K - 6, top: clipTop, width: bw + 12, height: h + 10 - clipTop, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 6, top: 8, width: bw, height: bh, transform: [{ rotate: '-8deg' }] }}>
            <BuddyArt id={buddy} width={bw} height={bh} blink={blink} />
          </View>
        </View>
      </Moving>
      <Moving clock={f.clock} fn={breathe} style={FILL}>
        <Layer f={f}>
          <S.Defs>
            <S.LinearGradient id="btBl" x1="0" y1={h - 12} x2="0" y2={h + 15} gradientUnits="userSpaceOnUse">
              <S.Stop offset="0" stopColor="#6170c4" />
              <S.Stop offset="1" stopColor="#2f3a7a" />
            </S.LinearGradient>
            <S.RadialGradient id="btLg">
              <S.Stop offset="0" stopColor="#ffd27a" stopOpacity="0.75" />
              <S.Stop offset="0.4" stopColor="#ffc25a" stopOpacity="0.28" />
              <S.Stop offset="1" stopColor="#ffc25a" stopOpacity="0" />
            </S.RadialGradient>
            <S.RadialGradient id="btSg">
              <S.Stop offset="0" stopColor="#ffd77a" stopOpacity="0.55" />
              <S.Stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
            </S.RadialGradient>
            <S.ClipPath id="btCp">
              <S.Path d={blanket} />
            </S.ClipPath>
          </S.Defs>
          <S.Path d={blanket} transform="translate(0 1.6)" fill="#000000" fillOpacity={L ? 0.12 : 0.3} />
          <S.Path d={blanket} fill="url(#btBl)" />
          <S.G clipPath="url(#btCp)">
            <S.Path d={quilt} stroke="#d9dfff" strokeOpacity={0.2} strokeWidth={0.7} strokeDasharray="1.6 1.2" />
            {glowA > 0 ? <S.Circle cx={lx + 8} cy={h + 4} r={40} fill="url(#btLg)" opacity={r2(glowA * 0.75)} /> : null}
            {folds.map(([x, b], i) => (
              <S.G key={i}>
                <S.Path d={`M${x} ${h}q${b} 6 ${-b * 0.4} 12`} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
                <S.Path d={`M${x + 2} ${h + 1}q${b} 6 ${-b * 0.4} 11`} fill="none" stroke="#ffffff" strokeOpacity={0.1} strokeWidth={1} />
              </S.G>
            ))}
            {stars.map((s, i) =>
              s.on ? (
                <S.G key={i}>
                  <S.Circle cx={s.x} cy={h + 6} r={5.5} fill="url(#btSg)" />
                  <S.Path d={star5(s.x, h + 6, 3.3, 1.4)} fill="#ffd77a" stroke="#c98e1c" strokeWidth={0.5} />
                </S.G>
              ) : (
                <S.Path key={i} d={star5(s.x, h + 6, 3.1, 1.35)} fill="none" stroke="#e9e3ff" strokeOpacity={0.55} strokeWidth={0.8} strokeDasharray="1.2 .9" />
              ),
            )}
            <S.Path d={topEdge} fill="none" stroke="#f6f1e4" strokeWidth={9} />
            <S.Path d={topEdge} transform="translate(0 5)" fill="none" stroke="#141a46" strokeOpacity={0.35} strokeWidth={1.6} />
            <S.Path d={topEdge} transform="translate(0 2.3)" fill="none" stroke="#b9ad92" strokeWidth={0.6} strokeDasharray="2 2" />
            <S.Path d={`M${BR} ${h + 12}${hem}`} transform="translate(0 -1.6)" fill="none" stroke={CREAM} strokeOpacity={0.7} strokeWidth={0.7} strokeDasharray="2 2" />
          </S.G>
          <S.Path d={blanket} fill="none" stroke="#232c66" strokeWidth={0.9} />
        </Layer>
      </Moving>
      <Layer f={f}>
        <S.Defs>
          <S.RadialGradient id="btLg2">
            <S.Stop offset="0" stopColor="#ffd27a" stopOpacity="0.75" />
            <S.Stop offset="0.4" stopColor="#ffc25a" stopOpacity="0.28" />
            <S.Stop offset="1" stopColor="#ffc25a" stopOpacity="0" />
          </S.RadialGradient>
          <S.RadialGradient id="btMn" cx="0.3" cy="0.4" r="0.8">
            <S.Stop offset="0" stopColor="#fff6d6" />
            <S.Stop offset="1" stopColor="#ffc85a" />
          </S.RadialGradient>
        </S.Defs>
        {glowA > 0 ? <S.Circle cx={lx} cy={ly} r={24} fill="url(#btLg2)" opacity={r2(glowA)} /> : null}
        <S.Rect x={lx - 2.6} y={ly + 5} width={5.2} height={3.4} rx={1.2} fill="#d9dde8" stroke="#8d95ab" strokeWidth={0.6} />
        <S.Path d={crescentD(lx, ly, 5.6, 3, -2, 4.7)} fill={asleep ? 'url(#btMn)' : '#e6e2d2'} stroke={asleep ? '#e0a83a' : '#a9a28a'} strokeWidth={0.7} />
        {asleep ? <S.Circle cx={lx - 3} cy={ly + 0.6} r={0.9} fill="#fff8e0" /> : null}
        {live
          ? null
          : zs.map((z, i) => (
              <S.G key={i} transform={`translate(${z.x} ${z.y})`} opacity={0.95 - i * 0.2}>
                <S.Path d={zD(z.s)} fill="none" stroke={zOut} strokeOpacity={0.75} strokeWidth={2.6 + i * 0.2} strokeLinecap="round" strokeLinejoin="round" />
                <S.Path d={zD(z.s)} fill="none" stroke={zIn} strokeWidth={1.3 + i * 0.2} strokeLinecap="round" strokeLinejoin="round" />
              </S.G>
            ))}
      </Layer>
      {live
        ? zs.map((z, i) => (
            <Particle key={i} clock={f.clock} item={{ x: z.x + z.s / 2, y: z.y + z.s / 2, dl: z.dl }} fn={zAt} w={w} h={h} size={12}>
              <S.Svg width={12} height={12} viewBox={`${-6 + z.s / 2} ${-6 + z.s / 2} 12 12`}>
                <S.Path d={zD(z.s)} fill="none" stroke={zOut} strokeOpacity={0.75} strokeWidth={2.6 + i * 0.2} strokeLinecap="round" strokeLinejoin="round" />
                <S.Path d={zD(z.s)} fill="none" stroke={zIn} strokeWidth={1.3 + i * 0.2} strokeLinecap="round" strokeLinejoin="round" />
              </S.Svg>
            </Particle>
          ))
        : null}
    </>
  )
}

const FILL = { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }
