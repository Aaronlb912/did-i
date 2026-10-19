// Frames from the 2026-11-06 drop (docs/ideas/frames-drop-2026-11-06.html):
// Full House (coin, still: every buddy crowds round the card), Orchard (gem,
// living: an apple for each question tonight, picked into the basket on a Did)
// and 100 Nights (earned with a 100 night streak: a gold tally of 100 marks).
// Same contract as art.jsx: each draws in card space and may reach PAD past
// the card; still tiles draw no particles and no moving views.
import { useMemo } from 'react'
import { rrLength, rrPath, rrPointAt, seeded } from './geometry.js'
import { Moving, Particle, SvgLayer, svgAll } from './runtime.jsx'

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

const HEX = /^#[0-9a-f]{6}$/i

function mix(c1, c2, t) {
  if (!HEX.test(c1) || !HEX.test(c2)) return c1
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const a = p(c1)
  const b = p(c2)
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join('')
}

function sparkD(x, y, s) {
  return `M${r2(x)} ${r2(y - s)}Q${r2(x)} ${r2(y)} ${r2(x + s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y + s)}Q${r2(x)} ${r2(y)} ${r2(x - s)} ${r2(y)}Q${r2(x)} ${r2(y)} ${r2(x)} ${r2(y - s)}Z`
}

const accentOf = (f) => (HEX.test(f.c.accent || '') ? f.c.accent : '#c9f24d')

function twinkle(time) {
  'worklet'
  return { opacity: 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 2.4)) }
}

function breathe(time) {
  'worklet'
  return { opacity: 0.72 + 0.28 * (0.5 - 0.5 * Math.cos((2 * Math.PI * time) / 4.2)) }
}

/* ---------- Full House: every buddy came to watch (coin, still) ---------- */

// The buddies' own heads (BuddyArt colors, 48x58 grid, head centered at
// 24,30), drawn small with an ink rim. The top row sits under the card so
// only ears show (8 px reach); the sides and the front row sit over the edge.
const INK = '#2d241c'
const HEADS = {
  cat: {
    top: 22,
    sil: [['Path', {d: 'M10 20L14 8L19.5 18Z'}], ['Path', {d: 'M28.5 18L34 8L38 20Z'}], ['Ellipse', {cx: 24, cy: 30, rx: 15, ry: 13.5}]],
    art: [['Path', {fill: '#f0a64a', d: 'M10 20L14 8L19.5 18Z'}], ['Path', {fill: '#f0a64a', d: 'M28.5 18L34 8L38 20Z'}], ['Path', {fill: '#ffd4a8', d: 'M11.6 18.5L14 11L17 18Z'}], ['Path', {fill: '#ffd4a8', d: 'M31 18L34 11L36.4 18.5Z'}], ['Ellipse', {cx: 24, cy: 30, rx: 15, ry: 13.5, fill: '#f0a64a'}], ['Ellipse', {cx: 24, cy: 34, rx: 9.5, ry: 6.6, fill: '#ffe8c8'}], ['Ellipse', {cx: 19, cy: 21.5, rx: 4, ry: 2, fill: '#fff', opacity: 0.22}], ['Ellipse', {cx: 18, cy: 28, rx: 2.1, ry: 2.6, fill: '#2d241c'}], ['Ellipse', {cx: 30, cy: 28, rx: 2.1, ry: 2.6, fill: '#2d241c'}], ['Ellipse', {cx: 18.8, cy: 27, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 30.8, cy: 27, rx: 0.8, ry: 1, fill: '#fff'}], ['Path', {d: 'M24 31.4 L22.2 33.6 L25.8 33.6Z', fill: '#e07a8a'}], ['Path', {d: 'M14 33 L7 31.5 M14 35 L7 36', stroke: '#5c4a3a', strokeWidth: 0.9, strokeLinecap: 'round'}], ['Path', {d: 'M34 33 L41 31.5 M34 35 L41 36', stroke: '#5c4a3a', strokeWidth: 0.9, strokeLinecap: 'round'}]],
  },
  dog: {
    top: 14,
    sil: [['Ellipse', {cx: 11, cy: 26, rx: 5.5, ry: 9, transform: 'rotate(-18 11 26)'}], ['Ellipse', {cx: 37, cy: 26, rx: 5.5, ry: 9, transform: 'rotate(18 37 26)'}], ['Ellipse', {cx: 24, cy: 30, rx: 15, ry: 14}]],
    art: [['Ellipse', {cx: 24, cy: 30, rx: 15, ry: 14, fill: '#c68b52'}], ['Ellipse', {cx: 11, cy: 26, rx: 5.5, ry: 9, fill: '#9a6538', transform: 'rotate(-18 11 26)'}], ['Ellipse', {cx: 37, cy: 26, rx: 5.5, ry: 9, fill: '#9a6538', transform: 'rotate(18 37 26)'}], ['Ellipse', {cx: 24, cy: 35, rx: 8.5, ry: 6.6, fill: '#f3ddc4'}], ['Ellipse', {cx: 19.5, cy: 20.5, rx: 4, ry: 2, fill: '#fff', opacity: 0.2}], ['Ellipse', {cx: 18, cy: 27.5, rx: 2.1, ry: 2.6, fill: '#2d241c'}], ['Ellipse', {cx: 30, cy: 27.5, rx: 2.1, ry: 2.6, fill: '#2d241c'}], ['Ellipse', {cx: 18.8, cy: 26.5, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 30.8, cy: 26.5, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 24, cy: 32.6, rx: 2.8, ry: 2, fill: '#2d241c'}], ['Path', {d: 'M22.2 37 Q24 41 25.8 37Z', fill: '#e07a8a'}]],
  },
  rabbit: {
    top: 29,
    sil: [['Ellipse', {cx: 17, cy: 13, rx: 4.2, ry: 11, transform: 'rotate(-8 17 13)'}], ['Ellipse', {cx: 31, cy: 13, rx: 4.2, ry: 11, transform: 'rotate(8 31 13)'}], ['Ellipse', {cx: 24, cy: 31, rx: 14, ry: 13}]],
    art: [['Ellipse', {cx: 17, cy: 13, rx: 4.2, ry: 11, fill: '#b8b8c8', transform: 'rotate(-8 17 13)'}], ['Ellipse', {cx: 31, cy: 13, rx: 4.2, ry: 11, fill: '#b8b8c8', transform: 'rotate(8 31 13)'}], ['Ellipse', {cx: 17, cy: 13, rx: 2.2, ry: 7.2, fill: '#f0b8c8', transform: 'rotate(-8 17 13)'}], ['Ellipse', {cx: 31, cy: 13, rx: 2.2, ry: 7.2, fill: '#f0b8c8', transform: 'rotate(8 31 13)'}], ['Ellipse', {cx: 24, cy: 31, rx: 14, ry: 13, fill: '#b8b8c8'}], ['Ellipse', {cx: 24, cy: 34.5, rx: 9, ry: 7.5, fill: '#e8e8f0'}], ['Ellipse', {cx: 18, cy: 29, rx: 2.1, ry: 2.6, fill: '#2d241c'}], ['Ellipse', {cx: 30, cy: 29, rx: 2.1, ry: 2.6, fill: '#2d241c'}], ['Ellipse', {cx: 18.8, cy: 28, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 30.8, cy: 28, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 24, cy: 33.4, rx: 2, ry: 1.5, fill: '#f0b8c8'}]],
  },
  owl: {
    top: 23,
    sil: [['Path', {d: 'M13.5 17L16 7L19.5 17Z'}], ['Path', {d: 'M28.5 17L32 7L34.5 17Z'}], ['Ellipse', {cx: 24, cy: 31, rx: 14, ry: 13}]],
    art: [['Path', {fill: '#6b5038', d: 'M13.5 17L16 7L19.5 17Z'}], ['Path', {fill: '#6b5038', d: 'M28.5 17L32 7L34.5 17Z'}], ['Ellipse', {cx: 24, cy: 31, rx: 14, ry: 13, fill: '#8b6b4a'}], ['Ellipse', {cx: 24, cy: 30, rx: 11.5, ry: 10.2, fill: '#d4c4a8'}], ['Ellipse', {cx: 18, cy: 28, rx: 4.2, ry: 4.6, fill: '#f0e080'}], ['Ellipse', {cx: 30, cy: 28, rx: 4.2, ry: 4.6, fill: '#f0e080'}], ['Circle', {cx: 18, cy: 28.4, r: 2.2, fill: '#2d241c'}], ['Circle', {cx: 30, cy: 28.4, r: 2.2, fill: '#2d241c'}], ['Circle', {cx: 18.8, cy: 27.5, r: 0.8, fill: '#fff'}], ['Circle', {cx: 30.8, cy: 27.5, r: 0.8, fill: '#fff'}], ['Path', {fill: '#d4a040', d: 'M24 31L22 34.2L26 34.2Z'}]],
  },
  ant: {
    top: 22,
    sil: [['Path', {d: 'M20 21 Q16 14 12.5 10.5 M28 21 Q32 14 35.5 10.5', fill: 'none', strokeWidth: 1.6}], ['Circle', {cx: 12.5, cy: 10, r: 2}], ['Circle', {cx: 35.5, cy: 10, r: 2}], ['Ellipse', {cx: 24, cy: 30, rx: 12, ry: 11}]],
    art: [['Path', {d: 'M20 21 Q16 14 12.5 10.5 M28 21 Q32 14 35.5 10.5', fill: 'none', stroke: '#7a3526', strokeWidth: 1.5, strokeLinecap: 'round'}], ['Circle', {cx: 12.5, cy: 10, r: 2, fill: '#b5533c'}], ['Circle', {cx: 35.5, cy: 10, r: 2, fill: '#b5533c'}], ['Ellipse', {cx: 24, cy: 30, rx: 12, ry: 11, fill: '#b5533c'}], ['Ellipse', {cx: 20, cy: 23.5, rx: 3.4, ry: 1.7, fill: '#fff', opacity: 0.25}], ['Ellipse', {cx: 19, cy: 29, rx: 1.9, ry: 2.4, fill: '#2d241c'}], ['Ellipse', {cx: 29, cy: 29, rx: 1.9, ry: 2.4, fill: '#2d241c'}], ['Ellipse', {cx: 19.8, cy: 28, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 29.8, cy: 28, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 22.2, cy: 37, rx: 1.4, ry: 1, fill: '#7a3526'}], ['Ellipse', {cx: 25.8, cy: 37, rx: 1.4, ry: 1, fill: '#7a3526'}]],
  },
  possum: {
    top: 17,
    sil: [['Ellipse', {cx: 12.5, cy: 20, rx: 5, ry: 5.5}], ['Ellipse', {cx: 35.5, cy: 20, rx: 5, ry: 5.5}], ['Ellipse', {cx: 24, cy: 31, rx: 15, ry: 13.5}]],
    art: [['Ellipse', {cx: 12.5, cy: 20, rx: 5, ry: 5.5, fill: '#3a3438'}], ['Ellipse', {cx: 35.5, cy: 20, rx: 5, ry: 5.5, fill: '#3a3438'}], ['Ellipse', {cx: 12.5, cy: 20.5, rx: 3, ry: 3.4, fill: '#f2a7b4'}], ['Ellipse', {cx: 35.5, cy: 20.5, rx: 3, ry: 3.4, fill: '#f2a7b4'}], ['Ellipse', {cx: 24, cy: 31, rx: 15, ry: 13.5, fill: '#9b98a3'}], ['Ellipse', {cx: 24, cy: 29, rx: 10.5, ry: 9, fill: '#f4f1ec'}], ['Ellipse', {cx: 24, cy: 35, rx: 5.8, ry: 4.4, fill: '#f4f1ec'}], ['Ellipse', {cx: 19, cy: 28, rx: 3.2, ry: 3.6, fill: '#5b5660'}], ['Ellipse', {cx: 29, cy: 28, rx: 3.2, ry: 3.6, fill: '#5b5660'}], ['Ellipse', {cx: 19, cy: 28, rx: 1.9, ry: 2.3, fill: '#1f1a1e'}], ['Ellipse', {cx: 29, cy: 28, rx: 1.9, ry: 2.3, fill: '#1f1a1e'}], ['Ellipse', {cx: 19.6, cy: 27.2, rx: 0.7, ry: 0.9, fill: '#fff'}], ['Ellipse', {cx: 29.6, cy: 27.2, rx: 0.7, ry: 0.9, fill: '#fff'}], ['Ellipse', {cx: 24, cy: 37.4, rx: 2, ry: 1.4, fill: '#e07a8a'}], ['Ellipse', {cx: 14.5, cy: 34, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}], ['Ellipse', {cx: 33.5, cy: 34, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}]],
  },
  frog: {
    top: 17,
    sil: [['Ellipse', {cx: 16, cy: 20, rx: 7, ry: 6.5}], ['Ellipse', {cx: 32, cy: 20, rx: 7, ry: 6.5}], ['Ellipse', {cx: 24, cy: 31, rx: 16, ry: 12.5}]],
    art: [['Ellipse', {cx: 16, cy: 20, rx: 7, ry: 6.5, fill: '#72c45e'}], ['Ellipse', {cx: 32, cy: 20, rx: 7, ry: 6.5, fill: '#72c45e'}], ['Ellipse', {cx: 24, cy: 31, rx: 16, ry: 12.5, fill: '#72c45e'}], ['Ellipse', {cx: 24, cy: 36.5, rx: 10, ry: 6.5, fill: '#e4f4c4'}], ['Circle', {cx: 16, cy: 19.5, r: 4.6, fill: '#fff'}], ['Circle', {cx: 32, cy: 19.5, r: 4.6, fill: '#fff'}], ['Ellipse', {cx: 16.5, cy: 20, rx: 2.2, ry: 2.6, fill: '#2d241c'}], ['Ellipse', {cx: 31.5, cy: 20, rx: 2.2, ry: 2.6, fill: '#2d241c'}], ['Circle', {cx: 17.3, cy: 19, r: 0.8, fill: '#fff'}], ['Circle', {cx: 32.3, cy: 19, r: 0.8, fill: '#fff'}], ['Path', {d: 'M17 29.5 Q24 35 31 29.5', fill: 'none', stroke: '#2f5a28', strokeWidth: 1.3, strokeLinecap: 'round'}], ['Ellipse', {cx: 12.5, cy: 30.5, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}], ['Ellipse', {cx: 35.5, cy: 30.5, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}]],
  },
  penguin: {
    top: 14,
    sil: [['Ellipse', {cx: 24, cy: 30, rx: 14.5, ry: 14}]],
    art: [['Ellipse', {cx: 24, cy: 30, rx: 14.5, ry: 14, fill: '#344157'}], ['Ellipse', {cx: 19.5, cy: 28, rx: 6.2, ry: 6.8, fill: '#f7f5f0'}], ['Ellipse', {cx: 28.5, cy: 28, rx: 6.2, ry: 6.8, fill: '#f7f5f0'}], ['Ellipse', {cx: 24, cy: 37, rx: 8.5, ry: 6.4, fill: '#f7f5f0'}], ['Ellipse', {cx: 20, cy: 19, rx: 3, ry: 1.5, fill: '#fff', opacity: 0.2}], ['Ellipse', {cx: 19.4, cy: 27, rx: 1.8, ry: 2.3, fill: '#2d241c'}], ['Ellipse', {cx: 28.6, cy: 27, rx: 1.8, ry: 2.3, fill: '#2d241c'}], ['Ellipse', {cx: 20.2, cy: 26, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 29.400000000000002, cy: 26, rx: 0.8, ry: 1, fill: '#fff'}], ['Path', {fill: '#f5a524', d: 'M21.4 31L26.6 31L24 34.6Z'}], ['Ellipse', {cx: 15, cy: 32, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}], ['Ellipse', {cx: 33, cy: 32, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}]],
  },
  fox: {
    top: 21,
    sil: [['Path', {d: 'M10.5 22L20.5 20L15.5 9Z'}], ['Path', {d: 'M27.5 20L37.5 22L32.5 9Z'}], ['Ellipse', {cx: 24, cy: 30.5, rx: 14.5, ry: 14}]],
    art: [['Path', {fill: '#e8743b', d: 'M10.5 22L20.5 20L15.5 9Z'}], ['Path', {fill: '#e8743b', d: 'M27.5 20L37.5 22L32.5 9Z'}], ['Path', {fill: '#3a2a22', d: 'M13.2 20.4L18.4 19.6L15.7 13Z'}], ['Path', {fill: '#3a2a22', d: 'M29.6 19.6L34.8 20.4L32.3 13Z'}], ['Ellipse', {cx: 24, cy: 30.5, rx: 14.5, ry: 14, fill: '#e8743b'}], ['Ellipse', {cx: 17, cy: 34.5, rx: 5.8, ry: 4.6, fill: '#fff6ea'}], ['Ellipse', {cx: 31, cy: 34.5, rx: 5.8, ry: 4.6, fill: '#fff6ea'}], ['Ellipse', {cx: 24, cy: 38, rx: 7.5, ry: 5.6, fill: '#fff6ea'}], ['Ellipse', {cx: 19.4, cy: 27.5, rx: 1.8, ry: 2.3, fill: '#2d241c'}], ['Ellipse', {cx: 28.6, cy: 27.5, rx: 1.8, ry: 2.3, fill: '#2d241c'}], ['Ellipse', {cx: 20.2, cy: 26.5, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 29.400000000000002, cy: 26.5, rx: 0.8, ry: 1, fill: '#fff'}], ['Ellipse', {cx: 24, cy: 33.4, rx: 1.9, ry: 1.4, fill: '#2d241c'}], ['Ellipse', {cx: 14.2, cy: 31.5, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}], ['Ellipse', {cx: 33.8, cy: 31.5, rx: 2.4, ry: 1.4, fill: '#f59aa8', opacity: 0.7}]],
  },
}

function Parts({ S, list }) {
  return list.map(([tag, p], i) => {
    const C = S[tag]
    return <C key={i} {...p} />
  })
}

function Head({ S, o, k }) {
  const H = HEADS[o.sp]
  return (
    <S.G transform={`translate(${r2(o.x)} ${r2(o.y)}) rotate(${o.rot || 0}) scale(${k}) translate(-24 -30)`}>
      <S.G fill={INK} stroke={INK} strokeWidth={2.6} strokeLinejoin="round">
        <Parts S={S} list={H.sil} />
      </S.G>
      <Parts S={S} list={H.art} />
    </S.G>
  )
}

function houseLayout(f) {
  const { w, h } = f
  const mini = w <= 220
  const k = mini ? 0.74 : 0.8
  const top = [['rabbit', 0.22, -5], ['ant', 0.36, 4], ['owl', 0.5, -3], ['cat', 0.64, 5], ['fox', 0.78, -4]].map(([sp, u, rot]) => ({ sp, x: w * u, y: HEADS[sp].top * k - 7, rot }))
  const sy0 = f.R + 16
  const sy1 = h - 50
  const ys = [0, 1, 2, 3].map((i) => sy0 + ((sy1 - sy0) * i) / 3)
  const side = [
    ...['rabbit', 'fox', 'possum', 'ant'].map((sp, i) => ({ sp, x: -6.5, y: ys[i], rot: -14 })),
    ...['owl', 'dog', 'frog', 'penguin'].map((sp, i) => ({ sp, x: w + 6.5, y: ys[i], rot: 14 })),
  ]
  const row = mini ? ['cat', 'penguin', 'frog', 'dog', 'possum', 'fox'] : ['cat', 'penguin', 'frog', 'dog', 'owl', 'possum', 'rabbit', 'fox']
  const x0 = mini ? 16 : 15
  const span = w - 2 * x0
  const bot = row.map((sp, i) => ({ sp, x: x0 + span * (i / (row.length - 1)), y: h + 6.5, rot: 0 }))
  return { k, top, side, bot }
}

export function FullhouseUnder({ f }) {
  const S = svgAll()
  const L = useMemo(() => houseLayout(f), [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Layer f={f}>
      {L.top.map((o, i) => (
        <Head key={i} S={S} o={o} k={L.k} />
      ))}
    </Layer>
  )
}

export function FullhouseOver({ f }) {
  const S = svgAll()
  const L = useMemo(() => houseLayout(f), [f.w, f.h, f.R]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Layer f={f}>
      <S.Path d={ring(f, 1.2)} fill="none" stroke={accentOf(f)} strokeOpacity={0.6} strokeWidth={2} />
      {[...L.side, ...L.bot].map((o, i) => (
        <Head key={i} S={S} o={o} k={L.k} />
      ))}
    </Layer>
  )
}

/* ---------- Orchard: an apple bough round the card (gem, living) ---------- */

// A trunk in each bottom corner, up both sides, meeting over the top. One
// apple per question tonight hangs off the sides: green while unanswered, a Did
// picks it into the basket under the card, a Not yet stays gold with a blush.
// When every question has an answer the basket glows.
const appleD = (r) =>
  `M0 ${r2(-r * 0.62)}C${r2(r * 0.35)} ${r2(-r * 1.05)} ${r2(r * 1.08)} ${r2(-r * 0.95)} ${r2(r * 1.02)} ${r2(-r * 0.12)}C${r2(r * 0.98)} ${r2(r * 0.62)} ${r2(r * 0.5)} ${r2(r * 1.05)} ${r2(r * 0.12)} ${r2(r * 0.92)}Q0 ${r2(r * 0.86)} ${r2(-r * 0.12)} ${r2(r * 0.92)}C${r2(-r * 0.5)} ${r2(r * 1.05)} ${r2(-r * 0.98)} ${r2(r * 0.62)} ${r2(-r * 1.02)} ${r2(-r * 0.12)}C${r2(-r * 1.08)} ${r2(-r * 0.95)} ${r2(-r * 0.35)} ${r2(-r * 1.05)} 0 ${r2(-r * 0.62)}Z`
const leafD = (L, W) => `M0 0C${r2(L * 0.3)} ${r2(-W)} ${r2(L * 0.75)} ${r2(-W * 0.9)} ${r2(L)} 0C${r2(L * 0.75)} ${r2(W * 0.9)} ${r2(L * 0.3)} ${r2(W)} 0 0Z`

function OrchardDefs({ S, light }) {
  return (
    <S.Defs>
      <S.RadialGradient id="orar" cx="0.35" cy="0.3" r="0.8">
        <S.Stop offset="0" stopColor="#ff9a80" />
        <S.Stop offset="0.45" stopColor="#e5352b" />
        <S.Stop offset="1" stopColor="#9c1c1a" />
      </S.RadialGradient>
      <S.RadialGradient id="orag" cx="0.35" cy="0.3" r="0.8">
        <S.Stop offset="0" stopColor="#eefaa8" />
        <S.Stop offset="0.5" stopColor="#9fd04c" />
        <S.Stop offset="1" stopColor="#5a8c28" />
      </S.RadialGradient>
      <S.RadialGradient id="oray" cx="0.35" cy="0.3" r="0.8">
        <S.Stop offset="0" stopColor="#fff4b0" />
        <S.Stop offset="0.5" stopColor="#f1c43c" />
        <S.Stop offset="1" stopColor="#b9861a" />
      </S.RadialGradient>
      <S.LinearGradient id="orlf" x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor="#9ad86e" />
        <S.Stop offset="1" stopColor="#3f7f2e" />
      </S.LinearGradient>
      <S.LinearGradient id="orla" x1="0" y1="0" x2="1" y2="1">
        <S.Stop offset="0" stopColor="#ffc35a" />
        <S.Stop offset="1" stopColor="#d0601e" />
      </S.LinearGradient>
      <S.LinearGradient id="orbk" x1="0" y1="0" x2="0" y2="1">
        <S.Stop offset="0" stopColor="#c98a4b" />
        <S.Stop offset="1" stopColor="#7d4f25" />
      </S.LinearGradient>
      <S.LinearGradient id="orbr" x1="0" y1="0" x2="1" y2="0">
        <S.Stop offset="0" stopColor="#8a5a32" />
        <S.Stop offset="0.5" stopColor="#6b4423" />
        <S.Stop offset="1" stopColor="#4f311a" />
      </S.LinearGradient>
      <S.RadialGradient id="orgw" cx="0.5" cy="0.5" r="0.5">
        <S.Stop offset="0" stopColor="#ffd27a" stopOpacity={light ? 1 : 0.85} />
        <S.Stop offset="0.5" stopColor="#ffb347" stopOpacity={light ? 0.55 : 0.35} />
        <S.Stop offset="1" stopColor="#ffb347" stopOpacity="0" />
      </S.RadialGradient>
    </S.Defs>
  )
}

function Apple({ S, x, y, r, col }) {
  const g = col === 'red' ? 'ar' : col === 'gold' ? 'ay' : 'ag'
  const hx = r2(-r * 0.4)
  const hy = r2(-r * 0.28)
  return (
    <S.G transform={`translate(${r2(x)} ${r2(y)})`}>
      <S.Path d={appleD(r + 0.7)} fill="#3b2412" opacity={0.55} />
      <S.Path d={appleD(r)} fill={`url(#or${g})`} />
      {col === 'gold' ? <S.Ellipse cx={r2(r * 0.42)} cy={r2(r * 0.18)} rx={r2(r * 0.5)} ry={r2(r * 0.42)} fill="#ff6f4a" opacity={0.55} /> : null}
      <S.Ellipse cx={hx} cy={hy} rx={r2(r * 0.26)} ry={r2(r * 0.38)} fill="#ffffff" opacity={0.6} transform={`rotate(-25 ${hx} ${hy})`} />
      <S.Path d={`M0 ${r2(-r * 0.55)}Q${r2(r * 0.1)} ${r2(-r * 0.95)} ${r2(r * 0.32)} ${r2(-r * 1.2)}`} fill="none" stroke="#5a3a1c" strokeWidth={r2(r * 0.2)} strokeLinecap="round" />
      <S.Path d={leafD(r * 0.95, r * 0.36)} transform={`translate(${r2(r * 0.12)} ${r2(-r * 0.86)}) rotate(-28)`} fill="url(#orlf)" />
    </S.G>
  )
}

/** A hanging apple on its stem, from the twig tip (px, py). */
function Hang({ S, a }) {
  return (
    <>
      <S.Path d={`M${a.px} ${r2(a.py)}L${a.ax} ${r2(a.ay - 7.6)}`} stroke="#5a3a1c" strokeWidth={0.9} />
      <Apple S={S} x={a.ax} y={a.ay} r={8.2} col={a.col} />
    </>
  )
}

const mirrorT = (w) => `translate(${w} 0) scale(-1 1)`

function boughPts(f) {
  const { w, h, R } = f
  const o = 4.5
  const W = w + 2 * o
  const H = h + 2 * o
  const Ro = R + o
  const sv = H - 2 * Ro
  const arc = (Math.PI * Ro) / 2
  const sh = W - 2 * Ro
  const pts = [
    { x: -11, y: h + 18, ang: -Math.PI / 2 + 0.25 },
    { x: -8.5, y: h + 8, ang: -Math.PI / 2 + 0.1 },
  ]
  const end = sv + arc + sh / 2
  const N = 60
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * end
    const p = rrPointAt(-o, -o, W, H, Ro, s)
    const b = s < sv ? 1.4 * Math.sin(s / 38) : 0
    pts.push({ ...p, x: p.x + p.nx * b, y: p.y + p.ny * b })
  }
  return pts
}

function boughPath(pts, w0, w1) {
  const n = pts.length
  const L = []
  const Rr = []
  pts.forEach((p, i) => {
    const wd = lerp(w0, w1, Math.pow(i / (n - 1), 0.8)) / 2
    const nx = Math.sin(p.ang)
    const ny = -Math.cos(p.ang)
    L.push([p.x + nx * wd, p.y + ny * wd])
    Rr.push([p.x - nx * wd, p.y - ny * wd])
  })
  return 'M' + L.map(([a, b]) => `${r2(a)} ${r2(b)}`).join('L') + 'L' + Rr.reverse().map(([a, b]) => `${r2(a)} ${r2(b)}`).join('L') + 'Z'
}

function orchardLayout(f, P) {
  const { w, h, R } = f
  const mini = w <= 220
  const T = Math.max(0, Math.min(10, Number(P.total) || 0))
  const A = Math.min(T, Number(P.answered) || 0)
  const SK = Math.min(T - A, Number(P.skipped) || 0)
  const done = T > 0 && A + SK >= T
  const pts = boughPts(f)
  const bough = boughPath(pts, 11, 3.2)
  const shine = boughPath(pts.slice(0, -8), 1.2, 0.4)
  // Leaves along the bough, pointing out; a few turned for autumn.
  const rnd = seeded(31)
  const leaves = []
  let veinG = ''
  let veinA = ''
  for (let i = 3; i < pts.length - 1; i++) {
    const p = pts[i]
    const nx = Math.sin(p.ang)
    const ny = -Math.cos(p.ang)
    const top = ny < -0.7
    if (top && i % 2) continue
    if (!top && i % 10 > 6) continue
    const L = top ? 4.4 : 8.6 + rnd() * 2.4
    const Wd = top ? 1.9 : 3.3
    for (const sgn of [1, -1]) {
      if (top && sgn < 0) continue
      const a = (Math.atan2(ny, nx) * 180) / Math.PI + sgn * 38 + (rnd() - 0.5) * 18
      const au = rnd() < 0.09
      const x = p.x + nx * 0.8
      const y = p.y + ny * 0.8
      leaves.push({ d: leafD(L, Wd), t: `translate(${r2(x)} ${r2(y)}) rotate(${r2(a)})`, au })
      const v = `M${r2(x)} ${r2(y)}L${r2(x + Math.cos((a * Math.PI) / 180) * L * 0.8)} ${r2(y + Math.sin((a * Math.PI) / 180) * L * 0.8)}`
      if (au) veinA += v
      else veinG += v
    }
  }
  // A twig with two leaves off each top corner.
  const c = R * 0.29 - 4.5 * 0.7
  const corner = { twig: `M${r2(c)} ${r2(c)}Q${r2(c - 6)} ${r2(c - 2)} ${r2(c - 9)} ${r2(c + 5)}`, l1: `translate(${r2(c - 9)} ${r2(c + 5)}) rotate(120)`, l2: `translate(${r2(c - 6)} ${r2(c + 1)}) rotate(200)` }
  // Apple slots: 5 down each side, left and right taking turns.
  const y0 = R + 6
  const y1 = h - 34
  const apples = []
  for (let i = 0; i < T; i++) {
    const side = i % 2
    const ty = y0 + (y1 - y0) * (Math.floor(i / 2) / 4)
    const col = i < A ? 'picked' : i < A + SK ? 'gold' : 'green'
    apples.push({ i, side, ty, px: -10.8, py: ty + 1.6, ax: -11.2, ay: ty + 9.5, col })
  }
  const twig = (ty) => `M-5 ${r2(ty)}Q-8 ${r2(ty - 0.5)} -10.8 ${r2(ty + 1.6)}`
  const twigsL = apples.filter((a) => !a.side).map((a) => twig(a.ty)).join('')
  const twigsR = apples.filter((a) => a.side).map((a) => twig(a.ty)).join('')
  // The basket under the card, with the picked apples heaped over the rim.
  const bx = w / 2
  const bt = h + 3.2
  const bw = mini ? 92 : 108
  const bh = 15.5
  const BX = (u) => r2(bx + u)
  const body = `M${BX(-bw / 2)} ${r2(bt)}L${BX(bw / 2)} ${r2(bt)}L${BX(bw / 2 - 4)} ${r2(bt + bh - 2)}Q${BX(bw / 2 - 5)} ${r2(bt + bh)} ${BX(bw / 2 - 8)} ${r2(bt + bh)}L${BX(-bw / 2 + 8)} ${r2(bt + bh)}Q${BX(-bw / 2 + 5)} ${r2(bt + bh)} ${BX(-bw / 2 + 4)} ${r2(bt + bh - 2)}Z`
  let weave = ''
  for (let r = 0; r < 3; r++) {
    const yy = bt + 3 + r * 3.4
    const inset = ((r * 3.4 + 3) / bh) * 4
    for (let x = -bw / 2 + inset + 1; x < bw / 2 - inset - 2; x += 5) weave += `M${BX(x + (r % 2 ? 2.5 : 0))} ${r2(yy)}q2.2 -1.2 4.4 0`
  }
  let ribs = ''
  for (let x = -bw / 2 + 6; x < bw / 2 - 4; x += 6) ribs += `M${BX(x)} ${r2(bt + 1)}L${BX(x * 0.86)} ${r2(bt + bh - 0.6)}`
  const rim = `M${BX(-bw / 2 - 1.5)} ${r2(bt + 0.2)}Q${BX(-bw / 2 - 1.5)} ${r2(bt - 1.6)} ${BX(-bw / 2 + 0.5)} ${r2(bt - 1.6)}L${BX(bw / 2 - 0.5)} ${r2(bt - 1.6)}Q${BX(bw / 2 + 1.5)} ${r2(bt - 1.6)} ${BX(bw / 2 + 1.5)} ${r2(bt + 0.2)}Q${BX(bw / 2 + 1.5)} ${r2(bt + 2)} ${BX(bw / 2 - 0.5)} ${r2(bt + 2)}L${BX(-bw / 2 + 0.5)} ${r2(bt + 2)}Q${BX(-bw / 2 - 1.5)} ${r2(bt + 2)} ${BX(-bw / 2 - 1.5)} ${r2(bt + 0.2)}Z`
  const back = Math.min(A, Math.max(0, A - 6))
  const front = A - back
  const inB = []
  for (let i = 0; i < front; i++) inB.push([bx + (i - (front - 1) / 2) * 14.6, bt - 4.4, 7.6])
  for (let i = 0; i < back; i++) inB.push([bx + (i - (back - 1) / 2) * 14.6 + 7.3, bt - 10.6, 7.2])
  inB.reverse()
  // Grass along the bottom either side of the basket, a few fallen leaves.
  const gr = seeded(7)
  let grassA = ''
  let grassB = ''
  for (let x = -14; x < w + 14; x += 3.2) {
    if (Math.abs(x - bx) < bw / 2 - 2) continue
    const hh = 3 + gr() * 4.5
    const lean = (gr() - 0.5) * 3
    const d = `M${r2(x - 1.2)} ${h + 20}Q${r2(x + lean * 0.5)} ${r2(h + 20 - hh * 0.6)} ${r2(x + lean)} ${r2(h + 20 - hh)}Q${r2(x + lean * 0.3 + 0.4)} ${r2(h + 20 - hh * 0.5)} ${r2(x + 1.2)} ${h + 20}Z`
    if (gr() < 0.5) grassA += d
    else grassB += d
  }
  const fallen = [[22, h + 17.5, 20, 'la'], [w - 30, h + 18, -30, 'la'], [w * 0.3, h + 18.5, 160, 'lf'], [w * 0.7, h + 17.8, -150, 'la']]
  const sparks = done ? [[-bw / 2 - 8, bt - 2, 3.6], [bw / 2 + 7, bt - 1, 3.2], [bw / 2 + 14, bt + 8, 2.4], [-bw / 2 - 15, bt + 9, 2.2]].map(([dx, y, s]) => sparkD(bx + dx, y, s)).join('') : ''
  const fall = Math.max(60, Math.min(300, h - R - 30))
  return { T, A, done, bough, shine, leaves, veinG, veinA, corner, apples, twigsL, twigsR, bx, bt, bw, bh, body, weave, ribs, rim, inB, grassA, grassB, fallen, sparks, fall }
}

// Hanging apples sway on their twig and lean with the swipe.
function swayFor(pull) {
  return (time, it) => {
    'worklet'
    const v = pull ? Math.max(-1, Math.min(1, pull.value / 120)) : 0
    const k = Math.sin((2 * Math.PI * (time + it.ph)) / 3.8)
    return { x: it.x, y: it.y, o: 1, r: ((9 * v + 4 * k) * Math.PI) / 180 }
  }
}

// One autumn leaf drifts down past the right side, every 9 s.
function leafFall(time, it) {
  'worklet'
  const q = (time % 9) / 9
  const e = Math.pow(q, 1.6)
  const o = q < 0.1 ? q / 0.1 : q > 0.85 ? 1 - (q - 0.85) / 0.15 : 1
  return { x: it.x - 6 * e, y: it.y + it.fall * e, o, r: ((70 + 160 * e) * Math.PI) / 180 }
}

const APPLE_Z = 44

function AppleSprite({ S, a, w, light }) {
  const cx = a.side ? w - a.px : a.px
  return (
    <S.Svg width={APPLE_Z} height={APPLE_Z} viewBox={`${r2(cx - APPLE_Z / 2)} ${r2(a.py - APPLE_Z / 2)} ${APPLE_Z} ${APPLE_Z}`}>
      <OrchardDefs S={S} light={light} />
      {a.side ? (
        <S.G transform={mirrorT(w)}>
          <Hang S={S} a={a} />
        </S.G>
      ) : (
        <Hang S={S} a={a} />
      )}
    </S.Svg>
  )
}

export function OrchardOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  const LT = f.c.light
  const live = !f.still
  const P = f.still && w <= 220 ? { answered: 3, skipped: 1, total: 8 } : f.p
  const L = useMemo(() => orchardLayout(f, P), [f.w, f.h, f.R, f.still, P.total, P.answered, P.skipped]) // eslint-disable-line react-hooks/exhaustive-deps
  const sway = useMemo(() => swayFor(f.pull), [f.pull])
  const hanging = L.apples.filter((a) => a.col !== 'picked')
  const items = useMemo(() => hanging.map((a) => ({ x: a.side ? w - a.px : a.px, y: a.py, ph: -a.i * 0.7 })), [L, w]) // eslint-disable-line react-hooks/exhaustive-deps
  const leafItem = useMemo(() => ({ x: w + 11, y: f.R + 30, fall: L.fall }), [w, f.R, L.fall])
  const leafPaths = (
    <>
      {L.leaves.map((l, i) => (
        <S.Path key={i} d={l.d} transform={l.t} fill={l.au ? 'url(#orla)' : 'url(#orlf)'} stroke={l.au ? '#9a4a12' : '#2f6a24'} strokeWidth={0.35} />
      ))}
      <S.Path d={L.veinG} stroke="#d8f3b0" strokeWidth={0.35} opacity={0.8} />
      {L.veinA ? <S.Path d={L.veinA} stroke="#ffe0a0" strokeWidth={0.35} opacity={0.8} /> : null}
      <S.Path d={L.corner.twig} fill="none" stroke="#6b4423" strokeWidth={1.6} strokeLinecap="round" />
      <S.Path d={leafD(8, 3)} transform={L.corner.l1} fill="url(#orlf)" stroke="#2f6a24" strokeWidth={0.35} />
      <S.Path d={leafD(7, 2.8)} transform={L.corner.l2} fill="url(#orlf)" stroke="#2f6a24" strokeWidth={0.35} />
    </>
  )
  const boughPaths = (
    <>
      <S.Path d={L.bough} fill="#2a1a0e" opacity={0.5} transform="translate(0.6 0.9)" />
      <S.Path d={L.bough} fill="url(#orbr)" stroke="#3a2412" strokeWidth={0.5} />
    </>
  )
  const stub = (a) => (
    <S.G key={a.i}>
      <S.Path d={`M${a.px} ${r2(a.py)}l0.3 1.8`} stroke="#5a3a1c" strokeWidth={0.8} strokeLinecap="round" />
      <S.Path d={leafD(4.2, 1.6)} transform={`translate(${a.px + 0.2} ${r2(a.py + 0.2)}) rotate(110)`} fill="url(#orlf)" />
    </S.G>
  )
  const side = (s) => L.apples.filter((a) => a.side === s).map((a) => (a.col === 'picked' ? stub(a) : live ? null : <Hang key={a.i} S={S} a={a} />))
  const glow = L.done ? (
    <Layer f={f}>
      <OrchardDefs S={S} light={LT} />
      <S.Ellipse cx={L.bx} cy={r2(L.bt + 4)} rx={r2(L.bw * 0.85)} ry={19} fill="url(#orgw)" />
    </Layer>
  ) : null
  const sparks = L.sparks ? (
    <Layer f={f}>
      <S.Path d={L.sparks} fill={LT ? '#f2a900' : '#fff3c4'} />
    </Layer>
  ) : null
  return (
    <>
      {glow && live ? (
        <Moving clock={f.clock} fn={breathe} style={FILL}>
          {glow}
        </Moving>
      ) : (
        glow
      )}
      <Layer f={f}>
        <OrchardDefs S={S} light={LT} />
        <S.Path d={L.grassA} fill="#5fa53e" />
        <S.Path d={L.grassB} fill="#4a8a32" />
        {L.fallen.map(([x, y, a, g], i) => (
          <S.Path key={i} d={leafD(5.6, 2.2)} transform={`translate(${r2(x)} ${r2(y)}) rotate(${a})`} fill={`url(#or${g})`} stroke="#7a3a10" strokeWidth={0.3} opacity={0.95} />
        ))}
        {boughPaths}
        <S.G transform={mirrorT(w)}>{boughPaths}</S.G>
        <S.Path d={L.shine} fill="#b98656" opacity={0.55} transform="translate(-0.9 0)" />
        {leafPaths}
        <S.G transform={mirrorT(w)}>{leafPaths}</S.G>
        <S.Path d={L.twigsL} fill="none" stroke="#6b4423" strokeWidth={1.3} strokeLinecap="round" />
        <S.Path d={L.twigsR} fill="none" stroke="#6b4423" strokeWidth={1.3} strokeLinecap="round" transform={mirrorT(w)} />
        {side(0)}
        <S.G transform={mirrorT(w)}>{side(1)}</S.G>
        <S.Ellipse cx={L.bx} cy={r2(L.bt + L.bh + 0.6)} rx={L.bw / 2} ry={2} fill="#000000" opacity={0.25} />
        {L.inB.map(([x, y, r], i) => (
          <Apple key={i} S={S} x={x} y={y} r={r} col="red" />
        ))}
        <S.Path d={L.body} fill="url(#orbk)" stroke="#5a3616" strokeWidth={0.8} />
        <S.Path d={L.ribs} stroke="#7a4a20" strokeWidth={0.7} opacity={0.7} />
        <S.Path d={L.weave} fill="none" stroke="#f0c287" strokeWidth={0.9} strokeLinecap="round" opacity={0.75} />
        <S.Path d={L.rim} fill="#d9a062" stroke="#5a3616" strokeWidth={0.8} />
        <S.Path d={`M${r2(L.bx - L.bw / 2 + 1)} ${r2(L.bt - 0.7)}L${r2(L.bx + L.bw / 2 - 1)} ${r2(L.bt - 0.7)}`} stroke="#ffe2b0" strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
      </Layer>
      {sparks && live ? (
        <Moving clock={f.clock} fn={twinkle} style={FILL}>
          {sparks}
        </Moving>
      ) : (
        sparks
      )}
      {live
        ? hanging.map((a, i) => (
            <Particle key={a.i} clock={f.clock} item={items[i]} fn={sway} w={w} h={h} size={APPLE_Z}>
              <AppleSprite S={S} a={a} w={w} light={LT} />
            </Particle>
          ))
        : null}
      {live ? (
        <Particle clock={f.clock} item={leafItem} fn={leafFall} w={w} h={h} size={14}>
          <S.Svg width={14} height={14} viewBox="-7 -7 14 14">
            <OrchardDefs S={S} light={LT} />
            <S.Path d={leafD(5.4, 2.1)} transform="translate(-2.7 0)" fill="url(#orla)" stroke="#9a4a12" strokeWidth={0.35} />
          </S.Svg>
        </Particle>
      ) : null}
    </>
  )
}

/* ---------- 100 Nights: a gold tally of 100 marks (earned, 100 night streak) ---------- */

// A night-blue band round the card with a gold mark for every night, in fives
// (four marks and a slash): down the left side, along the bottom and up the
// right. A medal with "100" at the bottom, a crescent moon at the top where
// the band is thin (8 px reach). The digits are paths: svg text is not used.
function bandOuter(f, o0, oTop) {
  const { w, h, R } = f
  const L = rrLength(w, h, R)
  const N = f.still ? 160 : 360
  let d = ''
  for (let i = 0; i < N; i++) {
    const p = rrPointAt(0, 0, w, h, R, (i / N) * L)
    const o = p.ny < 0 ? lerp(o0, oTop, -p.ny) : o0
    d += (i ? 'L' : 'M') + r2(p.x + p.nx * o) + ' ' + r2(p.y + p.ny * o)
  }
  return d + 'Z'
}

function hundredMarks(f) {
  const { w, h, R } = f
  const mini = w <= 220
  const sp = mini ? 2.7 : 3.1
  const len = mini ? 6.4 : 7.6
  const mid = 7.6
  const groups = []
  const side = (n, a, b) => Array.from({ length: n }, (_, i) => a + (b - a) * ((i + 0.5) / n))
  side(7, R + 2, h - R + 2).forEach((y) => groups.push({ e: 'L', c: y }))
  side(3, R + 2, w / 2 - (mini ? 19 : 23)).forEach((x) => groups.push({ e: 'B', c: x }))
  side(3, w / 2 + (mini ? 19 : 23), w - R - 2).forEach((x) => groups.push({ e: 'B', c: x }))
  side(7, R + 2, h - R + 2)
    .reverse()
    .forEach((y) => groups.push({ e: 'R', c: y }))
  const marks = []
  groups.forEach((g) => {
    const span = sp * 3
    for (let k = 0; k < 5; k++) {
      if (k < 4) {
        const t = g.c - span / 2 + k * sp
        if (g.e === 'L') marks.push({ x1: -mid - len / 2, y1: t, x2: -mid + len / 2, y2: t })
        else if (g.e === 'R') marks.push({ x1: w + mid - len / 2, y1: t, x2: w + mid + len / 2, y2: t })
        else marks.push({ x1: t, y1: h + mid - len / 2, x2: t, y2: h + mid + len / 2 })
      } else {
        const a = g.c - span / 2 - 1.6
        const b = g.c + span / 2 + 1.6
        if (g.e === 'L') marks.push({ slash: 1, x1: -mid - len / 2 - 0.6, y1: a, x2: -mid + len / 2 + 0.6, y2: b })
        else if (g.e === 'R') marks.push({ slash: 1, x1: w + mid + len / 2 + 0.6, y1: a, x2: w + mid - len / 2 - 0.6, y2: b })
        else marks.push({ slash: 1, x1: a, y1: h + mid + len / 2 + 0.6, x2: b, y2: h + mid - len / 2 - 0.6 })
      }
    }
  })
  return marks
}

function hundredLayout(f) {
  const { w, h, R } = f
  const mini = w <= 220
  const outer = bandOuter(f, 14, 8)
  const band = `${outer} ${ring(f, 1.4)}`
  const marks = hundredMarks(f)
  const seg = (m, dx, dy, x2, y2) => `M${r2(m.x1 + dx)} ${r2(m.y1 + dy)}L${r2(x2)} ${r2(y2)}`
  const shadow = marks.map((m) => seg(m, 0.5, 0.7, m.x2 + 0.5, m.y2 + 0.7)).join('')
  const ticks = marks.filter((m) => !m.slash).map((m) => seg(m, 0, 0, m.x2, m.y2)).join('')
  const slashes = marks.filter((m) => m.slash).map((m) => seg(m, 0, 0, m.x2, m.y2)).join('')
  const hi = marks.map((m) => seg(m, m.slash ? 0 : -0.35, -0.35, lerp(m.x1, m.x2, 0.55) - 0.35, lerp(m.y1, m.y2, 0.55) - 0.35)).join('')
  const stars = [0.18, 0.28, 0.38, 0.62, 0.72, 0.82].map((u, i) => ({ x: r2(w * u), r: i % 2 ? 0.55 : 0.75, o: i % 2 ? 0.7 : 1 }))
  const corners = [[R * 0.29 - 7, h - R * 0.29 + 7, 2.6], [w - R * 0.29 + 7, h - R * 0.29 + 7, 2.6], [R * 0.29 - 6, R * 0.29 - 5, 1.9], [w - R * 0.29 + 6, R * 0.29 - 5, 1.9]]
  const sparks = corners.map(([x, y, s]) => sparkD(x, y, s)).join('')
  // The medal: a pleated rosette in the look's color, a gold disc, "100".
  const cx = w / 2
  const cy = h + 1.2
  const RR = mini ? 17 : 18.6
  const RD = mini ? 12 : 13.2
  const n = 18
  let ros = ''
  let pleats = ''
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI
    const a2 = ((i + 0.5) / n) * 2 * Math.PI
    const a3 = ((i + 1) / n) * 2 * Math.PI
    ros += `${i ? 'L' : 'M'}${r2(cx + Math.cos(a) * (RR - 1.6))} ${r2(cy + Math.sin(a) * (RR - 1.6))}Q${r2(cx + Math.cos(a2) * (RR + 0.9))} ${r2(cy + Math.sin(a2) * (RR + 0.9))} ${r2(cx + Math.cos(a3) * (RR - 1.6))} ${r2(cy + Math.sin(a3) * (RR - 1.6))}`
    pleats += `M${r2(cx + Math.cos(a2) * (RD + 0.6))} ${r2(cy + Math.sin(a2) * (RD + 0.6))}L${r2(cx + Math.cos(a2) * (RR - 1))} ${r2(cy + Math.sin(a2) * (RR - 1))}`
  }
  ros += 'Z'
  const tails = [-1, 1].map((d) => `M${r2(cx + d * 3)} ${r2(cy)}L${r2(cx + d * 13)} ${r2(h + 19.5)}L${r2(cx + d * 8.6)} ${r2(h + 16.4)}L${r2(cx + d * 5.6)} ${r2(h + 20)}L${r2(cx - d * 3)} ${r2(cy + 4)}Z`)
  const k = RD / 8.8
  const one = (x, y) => `M${r2(x - 1.1 * k)} ${r2(y - 2.4 * k)}L${r2(x + 0.5 * k)} ${r2(y - 3.4 * k)}L${r2(x + 0.5 * k)} ${r2(y + 3.4 * k)}`
  const digits = (dx, dy) => ({ one: one(cx - 3.9 * k + dx, cy + dy), z1: [r2(cx + 0.2 * k + dx), r2(cy + dy)], z2: [r2(cx + 4.1 * k + dx), r2(cy + dy)], rx: r2(1.55 * k), ry: r2(3.1 * k), sw: r2(1.25 * k) })
  // The glint's path: down the middle of the band, kept inside it at the top.
  const L = rrLength(w, h, R)
  const glint = []
  for (let i = 0; i < 120; i++) {
    const p = rrPointAt(0, 0, w, h, R, (i / 120) * L)
    const top = p.ny < 0 ? -p.ny : 0
    const o = lerp(7, 4, top)
    glint.push([r2(p.x + p.nx * o), r2(p.y + p.ny * o), r2(lerp(1, 0.55, top))])
  }
  return { outer, band, shadow, ticks, slashes, hi, stars, sparks, cx, cy, RD, ros, pleats, tails, front: digits(0, 0), back: digits(0.35, 0.45), glint: { pts: glint } }
}

function glintAt(time, it) {
  'worklet'
  const n = it.pts.length
  const q = (((time / 9) % 1) + 1) % 1
  const u = q * n
  const i = Math.floor(u)
  const a = it.pts[i % n]
  const b = it.pts[(i + 1) % n]
  const t = u - i
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, o: 0.55, s: a[2] + (b[2] - a[2]) * t }
}

function Digits({ S, d, col }) {
  return (
    <S.G stroke={col} strokeWidth={d.sw} fill="none" strokeLinejoin="round" strokeLinecap="round">
      <S.Path d={d.one} />
      <S.Ellipse cx={d.z1[0]} cy={d.z1[1]} rx={d.rx} ry={d.ry} />
      <S.Ellipse cx={d.z2[0]} cy={d.z2[1]} rx={d.rx} ry={d.ry} />
    </S.G>
  )
}

export function HundredOver({ f }) {
  const S = svgAll()
  const { w, h } = f
  const LT = f.c.light
  const live = !f.still
  const acc = accentOf(f)
  const dark = mix(acc, '#000000', 0.4)
  const L = useMemo(() => hundredLayout(f), [f.w, f.h, f.R, f.still]) // eslint-disable-line react-hooks/exhaustive-deps
  const mx = w / 2
  const my = -2.6
  const shine = (
    <Layer f={f}>
      <S.Path d={L.sparks} fill="#fff1c2" />
      <S.Ellipse cx={r2(L.cx - L.RD * 0.38)} cy={r2(L.cy - L.RD * 0.48)} rx={r2(L.RD * 0.32)} ry={r2(L.RD * 0.16)} fill="#ffffff" opacity={0.45} transform={`rotate(-30 ${r2(L.cx - L.RD * 0.38)} ${r2(L.cy - L.RD * 0.48)})`} />
    </Layer>
  )
  return (
    <>
      <Layer f={f}>
        <S.Defs>
          <S.LinearGradient id="hnbd" x1="0" y1="0" x2="0" y2="1">
            <S.Stop offset="0" stopColor="#262d47" />
            <S.Stop offset="1" stopColor="#11152a" />
          </S.LinearGradient>
          <S.RadialGradient id="hnmd" cx="0.35" cy="0.3" r="0.8">
            <S.Stop offset="0" stopColor="#fffaf0" />
            <S.Stop offset="0.55" stopColor="#f5d98a" />
            <S.Stop offset="1" stopColor="#c99a35" />
          </S.RadialGradient>
          <S.RadialGradient id="hnmg" cx="0.38" cy="0.32" r="0.75">
            <S.Stop offset="0" stopColor="#fff6d2" />
            <S.Stop offset="0.45" stopColor="#f1c65a" />
            <S.Stop offset="0.85" stopColor="#b9862a" />
            <S.Stop offset="1" stopColor="#8a6420" />
          </S.RadialGradient>
        </S.Defs>
        <S.Path d={L.outer} fill="none" stroke="#000000" strokeOpacity={LT ? 0.16 : 0.4} strokeWidth={6} transform="translate(0 2)" />
        <S.Path d={L.outer} fill="none" stroke="#000000" strokeOpacity={LT ? 0.14 : 0.3} strokeWidth={2.4} transform="translate(0 1)" />
        <S.Path d={L.band} fill="url(#hnbd)" fillRule="evenodd" />
        <S.Path d={L.band} fill="none" stroke="#e2b75a" strokeWidth={1} />
        <S.Path d={ring(f, 3)} fill="none" stroke="#e2b75a" strokeOpacity={0.35} strokeWidth={0.6} />
        <S.Path d={L.outer} fill="none" stroke="#fff1c2" strokeOpacity={0.35} strokeWidth={0.5} transform="translate(0 -0.5)" />
        {L.stars.map((s, i) => (
          <S.Circle key={i} cx={s.x} cy={-3.6} r={s.r} fill="#f6dc8e" opacity={s.o} />
        ))}
        <S.Circle cx={mx} cy={my} r={9} fill="#ffe9a8" opacity={0.14} />
        <S.Circle cx={mx} cy={my} r={5.4} fill="url(#hnmd)" stroke="#a87a22" strokeWidth={0.5} />
        <S.Circle cx={mx + 2.4} cy={my - 1.4} r={4.5} fill="#1a2038" />
        <S.Path d={L.shadow} stroke="#05070f" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />
        <S.Path d={L.ticks} stroke="#e2b14a" strokeWidth={1.7} strokeLinecap="round" />
        <S.Path d={L.slashes} stroke="#fff2c4" strokeWidth={1.3} strokeLinecap="round" />
        <S.Path d={L.hi} stroke="#fffbe8" strokeOpacity={0.75} strokeWidth={0.55} strokeLinecap="round" />
        {L.tails.map((d, i) => (
          <S.Path key={i} d={d} fill={acc} stroke={dark} strokeWidth={0.7} />
        ))}
        <S.Path d={L.ros} fill={mix(acc, '#000000', 0.45)} transform="translate(0 0.9)" opacity={0.7} />
        <S.Path d={L.ros} fill={acc} stroke={dark} strokeWidth={0.7} />
        <S.Path d={L.pleats} stroke={mix(acc, '#000000', 0.35)} strokeWidth={0.6} opacity={0.7} />
        <S.Circle cx={L.cx} cy={r2(L.cy + 0.6)} r={L.RD} fill="#5a3f0c" opacity={0.5} />
        <S.Circle cx={L.cx} cy={L.cy} r={L.RD} fill="url(#hnmg)" stroke="#6e4f16" strokeWidth={0.8} />
        <S.Circle cx={L.cx} cy={L.cy} r={r2(L.RD - 1.5)} fill="none" stroke="#fff1c2" strokeOpacity={0.55} strokeWidth={0.5} />
        <Digits S={S} d={L.back} col="#fff6d2" />
        <Digits S={S} d={L.front} col="#6b4a10" />
      </Layer>
      {live ? (
        <Particle clock={f.clock} item={L.glint} fn={glintAt} w={w} h={h} size={14}>
          <S.Svg width={14} height={14} viewBox="-7 -7 14 14">
            <S.Defs>
              <S.RadialGradient id="hngl" cx="0.5" cy="0.5" r="0.5">
                <S.Stop offset="0" stopColor="#ffd463" stopOpacity="0.8" />
                <S.Stop offset="1" stopColor="#ffd463" stopOpacity="0" />
              </S.RadialGradient>
            </S.Defs>
            <S.Circle r={7} fill="url(#hngl)" />
          </S.Svg>
        </Particle>
      ) : null}
      {live ? (
        <Moving clock={f.clock} fn={twinkle} style={FILL}>
          {shine}
        </Moving>
      ) : (
        shine
      )}
    </>
  )
}
