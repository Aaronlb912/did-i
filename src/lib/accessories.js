// Buddy accessories: one item per slot, bought with coins, worn by whichever
// buddy is on. Drawings are on the buddy's 48x58 grid and go through `h`, so
// the website (React.createElement) and the phone (react-native-svg) share
// them. Rules for new ones live in docs/shop-drops.md: a rim on everything,
// no neck items, nothing that only reads at a large size.

export const ACCESSORY_SLOTS = ['head', 'eyes', 'back', 'held', 'around']

// Price by how much drawing is in it. A full night pays up to 6 coins.
export const ACCESSORY_TIERS = { common: 15, standard: 25, rare: 40, seasonal: 30 }

// Where things sit on each buddy: eye centres, eye size, top of head, neck,
// half width, and the side of the body. `hat` moves head items for a buddy
// whose head is shaped differently; `back` moves wings.
const AT = {
  cat: { ex: [18, 30], ey: 28, er: 3.6, crown: 17, neck: 37, side: 13 },
  dog: { ex: [18, 30], ey: 27, er: 3.7, crown: 17, neck: 39.5, side: 14 },
  rabbit: { ex: [18, 30], ey: 29, er: 3.4, crown: 20, neck: 37.5, side: 12.5 },
  owl: { ex: [18, 30], ey: 28, er: 5, crown: 20, neck: 37, side: 13 },
  ant: { ex: [19.6, 28.4], ey: 19.8, er: 3.5, crown: 13.5, neck: 28.5, side: 8.5, back: 33 },
  possum: { ex: [19, 29], ey: 28, er: 4.2, crown: 19.5, neck: 40, side: 13 },
  // The frog's eyes are on top of its head, so head items sit higher and wider.
  frog: { ex: [16, 32], ey: 19, er: 5.4, crown: 16, neck: 38, side: 15, hat: { y: 13.2, scale: 1.3 } },
  penguin: { ex: [19.8, 28.2], ey: 26.5, er: 3.5, crown: 17, neck: 36.8, side: 14 },
  fox: { ex: [19.8, 28.2], ey: 27.5, er: 3.5, crown: 18, neck: 37, side: 14 },
}

const INK = '#2d241c'
const CREAM = '#f7f5f0'
const GOLD = '#f5c542'

function shade(hex, f = 0.72) {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16)
  if (!Number.isFinite(n)) return hex
  const c = (v) => Math.max(0, Math.round(v * f))
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`
}

function onHead(h, a, y0, draw) {
  const y = a.hat?.y ?? y0
  const k = a.hat?.scale ?? 1
  return [h('g', { transform: `translate(24 ${y}) scale(${k}) translate(-24 ${-y})` }, ...draw(y))]
}

function star(cx, cy, r) {
  const p = []
  for (let i = 0; i < 10; i += 1) {
    const ang = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    p.push(`${(cx + Math.cos(ang) * rr).toFixed(2)},${(cy + Math.sin(ang) * rr).toFixed(2)}`)
  }
  return p.join(' ')
}

// Middle of the body (back items) and the spot a hand would be (held items).
const mid = (a) => a.back ?? (a.ey + a.neck) / 2
const hand = (a) => [24 + a.side + 2.5, a.neck + 1]
const heart = (cx, cy, s) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.4} ${cx} ${cy - s * 0.4} C${cx + s * 0.6} ${cy - s * 1.4} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9} Z`
// A rect with round corners as a path, since the phone's svg set has no Rect.
const box = (x, y, w, hgt, r = 0) => {
  const q = Math.min(r, w / 2, hgt / 2)
  return `M${x + q} ${y} H${x + w - q} Q${x + w} ${y} ${x + w} ${y + q} V${y + hgt - q} Q${x + w} ${y + hgt} ${x + w - q} ${y + hgt} H${x + q} Q${x} ${y + hgt} ${x} ${y + hgt - q} V${y + q} Q${x} ${y} ${x + q} ${y} Z`
}

const DRAW = {
  // ---- head
  beanie: (h, a, t) => onHead(h, a, a.crown + 1, (y) => [
    h('path', { d: `M15 ${y} C15 ${y - 8} 33 ${y - 8} 33 ${y} Z`, fill: t }),
    h('path', { d: box(14, y - 1.5, 20, 4, 2), fill: shade(t) }),
    h('circle', { cx: 24, cy: y - 6.6, r: 2.6, fill: CREAM }),
  ]),
  party: (h, a, t) => onHead(h, a, a.crown + 1.5, (y) => [
    h('path', { d: `M18.5 ${y} L24 ${y - 13} L29.5 ${y} Z`, fill: t }),
    h('path', { d: `M20.4 ${y - 4.5} L26.6 ${y - 1.6} M22.2 ${y - 8.6} L25.5 ${y - 6.8}`, stroke: CREAM, strokeWidth: 1.1, strokeLinecap: 'round', fill: 'none' }),
    h('circle', { cx: 24, cy: y - 13.5, r: 1.9, fill: CREAM }),
  ]),
  crown: (h, a) => onHead(h, a, a.crown + 1, (y) => [
    h('path', { d: `M16.5 ${y} L16.5 ${y - 6} L20 ${y - 3} L24 ${y - 8} L28 ${y - 3} L31.5 ${y - 6} L31.5 ${y} Z`, fill: GOLD }),
    h('path', { d: box(16.5, y - 1.6, 15, 1.6), fill: shade(GOLD) }),
    h('circle', { cx: 24, cy: y - 3.4, r: 1.2, fill: '#e2463c' }),
    h('circle', { cx: 19.4, cy: y - 2.4, r: 0.8, fill: '#4aa8ff' }),
    h('circle', { cx: 28.6, cy: y - 2.4, r: 0.8, fill: '#4aa8ff' }),
  ]),
  tophat: (h, a, t) => onHead(h, a, a.crown + 1, (y) => [
    h('path', { d: box(15, y - 2, 18, 2.6, 1.3), fill: '#24262c' }),
    h('path', { d: box(18.5, y - 12, 11, 10.5, 1), fill: '#24262c' }),
    h('path', { d: box(18.5, y - 4.6, 11, 2.2), fill: t }),
  ]),
  beret: (h, a, t) => onHead(h, a, a.crown + 1, (y) => [
    h('ellipse', { cx: 22.5, cy: y - 2.5, rx: 10, ry: 4, fill: t, transform: `rotate(-10 22.5 ${y - 2.5})` }),
    h('path', { d: box(22, y - 8, 1.4, 2.6, 0.7), fill: shade(t) }),
  ]),
  cap: (h, a, t) => onHead(h, a, a.crown + 1, (y) => [
    h('ellipse', { cx: 33, cy: y - 0.2, rx: 6.5, ry: 1.8, fill: shade(t) }),
    h('path', { d: `M16 ${y} C16 ${y - 9} 32 ${y - 9} 32 ${y} Z`, fill: t }),
    h('circle', { cx: 24, cy: y - 6.6, r: 1, fill: shade(t) }),
  ]),
  bucket: (h, a, t) => onHead(h, a, a.crown + 1, (y) => [
    h('ellipse', { cx: 24, cy: y - 0.5, rx: 12, ry: 2.6, fill: shade(t) }),
    h('path', { d: `M17 ${y - 1} L18.5 ${y - 8} L29.5 ${y - 8} L31 ${y - 1} Z`, fill: t }),
    h('path', { d: box(17.6, y - 3.6, 12.8, 1.4), fill: shade(t, 0.55) }),
  ]),
  flower: (h, a, t) => onHead(h, a, a.crown + 2, (y) => [
    ...[0, 72, 144, 216, 288].map((d) =>
      h('circle', { cx: 16.5 + Math.cos(((d - 90) * Math.PI) / 180) * 3, cy: y - 1.5 + Math.sin(((d - 90) * Math.PI) / 180) * 3, r: 2.5, fill: t }),
    ),
    h('circle', { cx: 16.5, cy: y - 1.5, r: 1.9, fill: GOLD }),
  ]),
  hairbow: (h, a, t) => onHead(h, a, a.crown + 2, (y) => [
    h('path', { d: `M30.5 ${y - 1.5} L24.8 ${y - 6} L24.8 ${y + 3} Z`, fill: t }),
    h('path', { d: `M30.5 ${y - 1.5} L36.2 ${y - 6} L36.2 ${y + 3} Z`, fill: t }),
    h('circle', { cx: 30.5, cy: y - 1.5, r: 1.8, fill: shade(t) }),
  ]),
  headphones: (h, a, t) => [
    h('path', { d: `M${24 - a.side} ${a.ey - 1} C${24 - a.side} ${a.crown - 9} ${24 + a.side} ${a.crown - 9} ${24 + a.side} ${a.ey - 1}`, fill: 'none', stroke: '#3a3f4b', strokeWidth: 3 }),
    h('path', { d: box(24 - a.side - 2.4, a.ey - 4, 4.8, 7, 2.2), fill: t }),
    h('path', { d: box(24 + a.side - 2.4, a.ey - 4, 4.8, 7, 2.2), fill: t }),
  ],
  halo: (h, a) => onHead(h, a, a.crown - 3, (y) => [
    h('ellipse', { cx: 24, cy: y - 2, rx: 8, ry: 2.5, fill: 'none', stroke: GOLD, strokeWidth: 2.4 }),
  ]),
  santa: (h, a) => onHead(h, a, a.crown + 1, (y) => [
    h('path', { d: `M15.5 ${y} C17 ${y - 10} 28 ${y - 13} 34 ${y - 8} L31.5 ${y} Z`, fill: '#e2463c' }),
    h('path', { d: box(14.5, y - 1.8, 19, 4, 2), fill: CREAM }),
    h('circle', { cx: 34.2, cy: y - 7.8, r: 2.3, fill: CREAM }),
  ]),
  witch: (h, a, t) => onHead(h, a, a.crown + 1, (y) => [
    h('ellipse', { cx: 24, cy: y - 0.6, rx: 12.5, ry: 2.4, fill: '#2a2440' }),
    h('path', { d: `M18 ${y - 1} L25 ${y - 15} L27 ${y - 12} L30 ${y - 1} Z`, fill: '#2a2440' }),
    h('path', { d: box(18.6, y - 4, 11, 2), fill: t }),
  ]),
  antlers: (h, a) => onHead(h, a, a.crown + 1, (y) => [
    h('path', { d: `M19 ${y} L16 ${y - 7} M16.8 ${y - 4.8} L13 ${y - 6.5} M16 ${y - 7} L14.5 ${y - 10} M16 ${y - 7} L18.5 ${y - 10} M29 ${y} L32 ${y - 7} M31.2 ${y - 4.8} L35 ${y - 6.5} M32 ${y - 7} L33.5 ${y - 10} M32 ${y - 7} L29.5 ${y - 10}`, stroke: '#9a6538', strokeWidth: 2.4, strokeLinecap: 'round', fill: 'none' }),
  ]),
  // ---- eyes
  glasses: (h, a) => {
    const [l, r] = a.ex
    return [
      h('circle', { cx: l, cy: a.ey, r: a.er, fill: 'none', stroke: INK, strokeWidth: 1.2 }),
      h('circle', { cx: r, cy: a.ey, r: a.er, fill: 'none', stroke: INK, strokeWidth: 1.2 }),
      h('path', { d: `M${l + a.er} ${a.ey - 0.6} Q24 ${a.ey - 2.4} ${r - a.er} ${a.ey - 0.6}`, fill: 'none', stroke: INK, strokeWidth: 1.2 }),
    ]
  },
  shades: (h, a) => {
    const [l, r] = a.ex
    const s = a.er + 0.6
    return [
      h('path', { d: box(l - s, a.ey - s * 0.75, s * 2, s * 1.5, s * 0.6), fill: '#1b1d22' }),
      h('path', { d: box(r - s, a.ey - s * 0.75, s * 2, s * 1.5, s * 0.6), fill: '#1b1d22' }),
      h('path', { d: `M${l + s} ${a.ey - 0.6} L${r - s} ${a.ey - 0.6}`, stroke: '#1b1d22', strokeWidth: 1.2, fill: 'none' }),
      h('path', { d: box(l - s * 0.6, a.ey - s * 0.5, s * 0.7, 0.8, 0.4), fill: '#ffffff', opacity: 0.5 }),
    ]
  },
  heartglasses: (h, a, t) => {
    const [l, r] = a.ex
    const s = a.er * 0.95
    return [
      h('path', { d: heart(l, a.ey, s), fill: t, stroke: shade(t), strokeWidth: 0.8 }),
      h('path', { d: heart(r, a.ey, s), fill: t, stroke: shade(t), strokeWidth: 0.8 }),
      h('path', { d: `M${l + s} ${a.ey - 0.4} L${r - s} ${a.ey - 0.4}`, stroke: shade(t), strokeWidth: 1, fill: 'none' }),
    ]
  },
  starglasses: (h, a) => {
    const [l, r] = a.ex
    const s = a.er * 1.35
    return [
      h('polygon', { points: star(l, a.ey, s), fill: GOLD, stroke: shade(GOLD), strokeWidth: 0.6 }),
      h('polygon', { points: star(r, a.ey, s), fill: GOLD, stroke: shade(GOLD), strokeWidth: 0.6 }),
    ]
  },
  monocle: (h, a) => {
    const r = a.ex[1]
    return [
      h('circle', { cx: r, cy: a.ey, r: a.er + 0.3, fill: 'none', stroke: GOLD, strokeWidth: 1.8 }),
      h('path', { d: `M${r + a.er * 0.75} ${a.ey + a.er * 0.75} Q${r + 4.5} ${a.ey + 8} ${r + 1.2} ${a.ey + 12}`, fill: 'none', stroke: GOLD, strokeWidth: 1.1 }),
    ]
  },
  // ---- back: drawn behind the buddy, so only what sticks out shows
  angelwings: (h, a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].map((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return h('g', null,
        h('path', { fill: '#ffffff', d: `M${X(0)} ${y - 3} C${X(4)} ${y - 13} ${X(13)} ${y - 13} ${X(15)} ${y - 6} Q${X(14.5)} ${y - 1} ${X(12.5)} ${y + 0.5} Q${X(11.5)} ${y + 3.5} ${X(8.5)} ${y + 3} Q${X(7)} ${y + 6} ${X(4)} ${y + 4.5} Q${X(2)} ${y + 6} ${X(0)} ${y + 3} Z` }),
        h('path', { fill: 'none', stroke: '#c9cfdb', strokeWidth: 0.7, strokeLinecap: 'round', d: `M${X(3)} ${y - 2} Q${X(8)} ${y - 4} ${X(12.5)} ${y - 2} M${X(3)} ${y + 1.5} Q${X(6)} ${y} ${X(9)} ${y + 1}` }),
      )
    })
  },
  butterfly: (h, a, t) => {
    const y = mid(a) - 1
    const x0 = a.side - 3
    const top = a.hat?.y ?? a.crown
    return [
      ...[-1, 1].map((d) => {
        const X = (v) => 24 + d * (x0 + v)
        return h('g', null,
          h('path', { fill: t, stroke: INK, strokeWidth: 1.1, d: `M${X(0)} ${y - 2} C${X(3)} ${y - 13} ${X(14)} ${y - 14} ${X(14)} ${y - 6} C${X(14)} ${y - 2} ${X(8)} ${y - 0.5} ${X(0)} ${y} Z` }),
          h('path', { fill: shade(t), stroke: INK, strokeWidth: 1.1, d: `M${X(0)} ${y + 0.5} C${X(7)} ${y + 0.5} ${X(11)} ${y + 3} ${X(9.5)} ${y + 7} C${X(8)} ${y + 9.5} ${X(3)} ${y + 7} ${X(0)} ${y + 3} Z` }),
          h('circle', { cx: X(9), cy: y - 7, r: 2, fill: '#ffffff' }),
          h('circle', { cx: X(5.5), cy: y - 4.5, r: 1.1, fill: INK }),
          h('circle', { cx: X(6), cy: y + 4, r: 1.2, fill: '#ffffff', opacity: 0.85 }),
        )
      }),
      // Antennae on the head say "butterfly" straight away.
      h('path', { fill: 'none', stroke: INK, strokeWidth: 0.9, strokeLinecap: 'round', d: `M21.5 ${top + 1} Q20 ${top - 4} 17.5 ${top - 6} M26.5 ${top + 1} Q28 ${top - 4} 30.5 ${top - 6}` }),
      h('circle', { cx: 17.5, cy: top - 6, r: 1.1, fill: INK }),
      h('circle', { cx: 30.5, cy: top - 6, r: 1.1, fill: INK }),
    ]
  },
  fairy: (h, a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].map((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return h('g', null,
        h('path', { fill: '#d9f0ff', fillOpacity: 0.85, stroke: '#9fd3f5', strokeWidth: 0.6, d: `M${X(0)} ${y - 1} C${X(2)} ${y - 14} ${X(13)} ${y - 16} ${X(13)} ${y - 9} C${X(13)} ${y - 4} ${X(6)} ${y - 1} ${X(0)} ${y} Z` }),
        h('path', { fill: '#f1d9ff', fillOpacity: 0.85, stroke: '#cfa8f0', strokeWidth: 0.6, d: `M${X(0)} ${y + 0.5} C${X(6)} ${y + 0.5} ${X(10)} ${y + 4} ${X(8)} ${y + 7.5} C${X(6.5)} ${y + 10} ${X(2)} ${y + 6} ${X(0)} ${y + 2.5} Z` }),
        h('path', { fill: 'none', stroke: '#ffffff', strokeWidth: 0.55, strokeLinecap: 'round', d: `M${X(0.5)} ${y - 1} Q${X(6)} ${y - 7} ${X(11)} ${y - 11} M${X(0.5)} ${y - 0.5} Q${X(6)} ${y - 3} ${X(10.5)} ${y - 6} M${X(0.5)} ${y + 1.5} Q${X(4.5)} ${y + 3.5} ${X(7)} ${y + 6.5}` }),
        h('path', { fill: '#ffffff', d: `M${X(9)} ${y - 13.5} l0.5 1.3 l1.3 0.5 l-1.3 0.5 l-0.5 1.3 l-0.5 -1.3 l-1.3 -0.5 l1.3 -0.5 Z` }),
      )
    })
  },
  dragon: (h, a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].map((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return h('g', null,
        h('path', { fill: '#3f9e6a', d: `M${X(0)} ${y - 3} L${X(2.5)} ${y - 6} L${X(3.5)} ${y - 5} L${X(5.5)} ${y - 9} L${X(6.5)} ${y - 7.8} L${X(9)} ${y - 11.5} L${X(10)} ${y - 10} L${X(13)} ${y - 13} L${X(17.5)} ${y - 9} L${X(16)} ${y + 3} Q${X(14.5)} ${y - 1} ${X(12)} ${y + 4} Q${X(10)} ${y} ${X(7.5)} ${y + 4.5} Q${X(5)} ${y + 1} ${X(0)} ${y + 3} Z` }),
        h('path', { fill: 'none', stroke: '#1f5e3c', strokeWidth: 0.9, strokeLinecap: 'round', d: `M${X(0.5)} ${y - 2.5} L${X(13)} ${y - 12.5} M${X(0.5)} ${y - 2.5} L${X(16)} ${y + 2.5} M${X(0.5)} ${y - 2.5} L${X(12)} ${y + 3.5} M${X(0.5)} ${y - 2.5} L${X(7.5)} ${y + 4}` }),
        h('path', { fill: GOLD, d: `M${X(13)} ${y - 13} l${d * 0.6} -2.8 l${d * 1.2} 2.4 Z` }),
      )
    })
  },
  bee: (h, a) => {
    const y = mid(a) - 4
    const x0 = a.side - 4
    const top = a.hat?.y ?? a.crown
    return [
      // Little striped stinger peeking out below the body.
      h('path', { fill: GOLD, d: `M${24 + a.side - 5} ${a.neck + 3} q5 1 7 5 q-5 1 -8 -2 Z` }),
      h('path', { fill: 'none', stroke: INK, strokeWidth: 1.1, d: `M${24 + a.side - 2.6} ${a.neck + 3.6} l-1.2 2.4 M${24 + a.side - 0.2} ${a.neck + 4.8} l-1 2.2` }),
      ...[-1, 1].map((d) => {
        const X = (v) => 24 + d * (x0 + v)
        return h('g', null,
          h('ellipse', { cx: X(6), cy: y - 5, rx: 6, ry: 4, fill: '#eef6ff', fillOpacity: 0.9, stroke: INK, strokeWidth: 0.7, transform: `rotate(${d * -35} ${X(6)} ${y - 5})` }),
          h('ellipse', { cx: X(5.5), cy: y + 0.5, rx: 4.3, ry: 2.8, fill: '#eef6ff', fillOpacity: 0.9, stroke: INK, strokeWidth: 0.7, transform: `rotate(${d * -15} ${X(5.5)} ${y + 0.5})` }),
          h('path', { fill: 'none', stroke: INK, strokeWidth: 0.45, d: `M${X(1)} ${y - 2} L${X(9.5)} ${y - 8.5} M${X(4)} ${y - 4} L${X(5.5)} ${y - 8}` }),
        )
      }),
      h('path', { fill: 'none', stroke: INK, strokeWidth: 0.9, strokeLinecap: 'round', d: `M21.5 ${top + 1} Q20.5 ${top - 4} 18.5 ${top - 6.5} M26.5 ${top + 1} Q27.5 ${top - 4} 29.5 ${top - 6.5}` }),
      h('circle', { cx: 18.5, cy: top - 6.5, r: 1.3, fill: GOLD, stroke: INK, strokeWidth: 0.5 }),
      h('circle', { cx: 29.5, cy: top - 6.5, r: 1.3, fill: GOLD, stroke: INK, strokeWidth: 0.5 }),
    ]
  },
  batwings: (h, a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].map((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return h('g', null,
        h('path', { fill: '#5b4b8a', d: `M${X(0)} ${y - 3} Q${X(5)} ${y - 14} ${X(17)} ${y - 7} L${X(16.5)} ${y + 4} Q${X(14.5)} ${y - 2} ${X(11.5)} ${y + 4.5} Q${X(9)} ${y - 1.5} ${X(6.5)} ${y + 4.5} Q${X(4)} ${y} ${X(0)} ${y + 3} Z` }),
        h('path', { fill: 'none', stroke: '#2f2550', strokeWidth: 0.8, strokeLinecap: 'round', d: `M${X(0.5)} ${y - 2.5} L${X(16.5)} ${y + 3.5} M${X(0.5)} ${y - 2.5} L${X(11.5)} ${y + 4} M${X(0.5)} ${y - 2.5} L${X(6.5)} ${y + 4}` }),
        h('path', { fill: '#2f2550', d: `M${X(5.5)} ${y - 9.6} l${d * -0.4} -2.4 l${d * 1.8} 1.6 Z` }),
      )
    })
  },
  // ---- held: beside the buddy, as if holding it
  balloon: (h, a, t) => {
    const [x, y] = hand(a)
    return [
      h('path', { d: `M${x} ${y} Q${x + 3} ${y - 8} ${x + 1} ${y - 15}`, fill: 'none', stroke: '#d8d2c4', strokeWidth: 0.6 }),
      h('ellipse', { cx: x + 1, cy: y - 20, rx: 4.6, ry: 5.4, fill: t }),
      h('path', { d: `M${x - 0.2} ${y - 14.4} L${x + 2.2} ${y - 14.4} L${x + 1} ${y - 15.6} Z`, fill: shade(t) }),
      h('ellipse', { cx: x - 0.6, cy: y - 22, rx: 1.2, ry: 1.8, fill: '#ffffff', opacity: 0.55 }),
    ]
  },
  flag: (h, a, t) => {
    const [x, y] = hand(a)
    return [
      h('path', { d: box(x - 0.5, y - 14, 1.1, 16, 0.5), fill: '#9a6538' }),
      h('path', { d: `M${x + 0.6} ${y - 14} L${x + 9} ${y - 11} L${x + 0.6} ${y - 8} Z`, fill: t }),
    ]
  },
  umbrella: (h, a, t) => {
    const [x, y] = hand(a)
    return [
      h('path', { d: `M${x - 9} ${y - 14} Q${x} ${y - 25} ${x + 9} ${y - 14} Q${x + 6} ${y - 16} ${x + 3} ${y - 14} Q${x} ${y - 16} ${x - 3} ${y - 14} Q${x - 6} ${y - 16} ${x - 9} ${y - 14} Z`, fill: t }),
      h('path', { d: `M${x} ${y - 15} L${x} ${y + 1} q0 2 -2 2`, fill: 'none', stroke: '#3a3f4b', strokeWidth: 1.1, strokeLinecap: 'round' }),
    ]
  },
  cocoa: (h, a, t) => {
    const [x, y] = hand(a)
    return [
      h('path', { d: `M${x + 3.6} ${y - 4} q3 0 3 2.6 q0 2.6 -3 2.6`, fill: 'none', stroke: t, strokeWidth: 1.3 }),
      h('path', { d: box(x - 3, y - 6, 7, 8, 1.6), fill: t }),
      h('path', { d: box(x - 2.4, y - 5.6, 5.8, 1.4, 0.7), fill: '#6b4a32' }),
      h('path', { d: `M${x - 0.8} ${y - 8} q-1 -2 0 -4 M${x + 1.8} ${y - 8} q1 -2 0 -4`, fill: 'none', stroke: '#ffffff', strokeWidth: 0.8, opacity: 0.8, strokeLinecap: 'round' }),
    ]
  },
  sparkler: (h, a) => {
    const [x, y] = hand(a)
    return [
      h('path', { d: `M${x} ${y + 1} L${x + 3} ${y - 12}`, stroke: '#8a8f99', strokeWidth: 1, strokeLinecap: 'round', fill: 'none' }),
      h('polygon', { points: star(x + 3.2, y - 13, 4.6), fill: GOLD }),
      h('polygon', { points: star(x + 3.2, y - 13, 2), fill: '#ffffff' }),
    ]
  },
  // ---- around: floats near the buddy, touches nothing
  snow: (h, a) => [[-20, -11], [-19, 2], [19, -13], [20, 0], [-18, 13], [18, 11], [9, -20], [-7, -21]].map(([dx, dy], i) =>
    h('circle', { cx: 24 + dx, cy: a.ey + dy, r: i % 3 ? 1.3 : 1.8, fill: '#ffffff' })),
  hearts: (h, a, t) => [[-19, -5, 2.6], [19, -11, 3.2], [18, 5, 2.2]].map(([dx, dy, k]) =>
    h('path', { d: heart(24 + dx, a.ey + dy, k), fill: t })),
  sparkles: (h, a) => [[-19, -7, 3.6], [19, -1, 3], [-17, 9, 2.4], [16, -15, 2.4]].map(([dx, dy, r]) => {
    const x = 24 + dx
    const y = a.ey + dy
    return h('path', { fill: GOLD, d: `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z` })
  }),
  raincloud: (h, a) => {
    const y = (a.hat?.y ?? a.crown) - 9
    return [
      h('ellipse', { cx: 20, cy: y, rx: 4.5, ry: 3.4, fill: '#c7ccd6' }),
      h('ellipse', { cx: 25.5, cy: y - 1.6, rx: 5.2, ry: 4.2, fill: '#d6dae2' }),
      h('ellipse', { cx: 30, cy: y + 0.6, rx: 3.8, ry: 2.9, fill: '#c7ccd6' }),
      ...[19, 24, 29].map((x) => h('path', { d: `M${x} ${y + 4} l-0.8 2.4`, stroke: '#4aa8ff', strokeWidth: 1.1, strokeLinecap: 'round', fill: 'none' })),
    ]
  },
  notes: (h, a, t) => [[-20, -6, 1.3], [19, -12, 1.1], [19, 4, 0.95]].map(([dx, dy, k]) =>
    h('g', { transform: `translate(${24 + dx} ${a.ey + dy}) scale(${k})` },
      h('ellipse', { cx: 0, cy: 3, rx: 2, ry: 1.5, fill: t, transform: 'rotate(-20 0 3)' }),
      h('path', { d: box(1.4, -4, 0.9, 7), fill: t }),
      h('path', { d: 'M2.3 -4 q2.6 1 2 3.6', fill: 'none', stroke: t, strokeWidth: 0.9 }),
    )),
}

// `from` holds an item back until its drop day, like the rest of the shop.
const ALL_ACCESSORIES = [
  { id: 'beanie', slot: 'head', tier: 'common' },
  { id: 'party', slot: 'head', tier: 'common' },
  { id: 'flower', slot: 'head', tier: 'common' },
  { id: 'hairbow', slot: 'head', tier: 'common' },
  { id: 'beret', slot: 'head', tier: 'standard' },
  { id: 'cap', slot: 'head', tier: 'standard' },
  { id: 'bucket', slot: 'head', tier: 'standard' },
  { id: 'crown', slot: 'head', tier: 'rare' },
  { id: 'tophat', slot: 'head', tier: 'rare' },
  { id: 'headphones', slot: 'head', tier: 'rare' },
  { id: 'halo', slot: 'head', tier: 'rare' },
  { id: 'glasses', slot: 'eyes', tier: 'common' },
  { id: 'shades', slot: 'eyes', tier: 'standard' },
  { id: 'heartglasses', slot: 'eyes', tier: 'standard' },
  { id: 'starglasses', slot: 'eyes', tier: 'rare' },
  { id: 'monocle', slot: 'eyes', tier: 'rare' },
  { id: 'butterfly', slot: 'back', tier: 'standard' },
  { id: 'bee', slot: 'back', tier: 'standard' },
  { id: 'angelwings', slot: 'back', tier: 'rare' },
  { id: 'fairy', slot: 'back', tier: 'rare' },
  { id: 'dragon', slot: 'back', tier: 'rare' },
  { id: 'balloon', slot: 'held', tier: 'common' },
  { id: 'flag', slot: 'held', tier: 'common' },
  { id: 'umbrella', slot: 'held', tier: 'standard' },
  { id: 'raincloud', slot: 'around', tier: 'common' },
  { id: 'notes', slot: 'around', tier: 'common' },
  { id: 'hearts', slot: 'around', tier: 'standard' },
  { id: 'sparkles', slot: 'around', tier: 'rare' },
  // Seasonal: on sale from `from` until the day before `until`. Anyone who
  // bought one keeps it after.
  { id: 'witch', slot: 'head', tier: 'seasonal', from: '2026-10-01', until: '2026-11-01' },
  { id: 'batwings', slot: 'back', tier: 'seasonal', from: '2026-10-01', until: '2026-11-01' },
  { id: 'santa', slot: 'head', tier: 'seasonal', from: '2026-12-01', until: '2027-01-01' },
  { id: 'antlers', slot: 'head', tier: 'seasonal', from: '2026-12-01', until: '2027-01-01' },
  { id: 'cocoa', slot: 'held', tier: 'seasonal', from: '2026-12-01', until: '2027-01-01' },
  { id: 'snow', slot: 'around', tier: 'seasonal', from: '2026-12-01', until: '2027-01-01' },
  { id: 'sparkler', slot: 'held', tier: 'seasonal', from: '2026-12-26', until: '2027-01-06' },
].map((item) => ({ ...item, coins: ACCESSORY_TIERS[item.tier] }))

export const ACCESSORIES = ALL_ACCESSORIES
export const ACCESSORY_IDS = new Set(ALL_ACCESSORIES.map((item) => item.id))

// What the shop sells today. Same rule as purse.js isLive, plus an end date.
export function accessoryOnSale(item, today) {
  if (!item) return false
  return (!item.from || item.from <= today) && (!item.until || today < item.until)
}

export function accessoriesForSale(today) {
  return ALL_ACCESSORIES.filter((item) => accessoryOnSale(item, today))
}

// Where the eyes sit on a buddy (48x58 grid), so a tile can zoom in on them.
export function eyeLine(buddyId) {
  return AT[buddyId]?.ey ?? 28
}

export function accessoryById(id) {
  return ALL_ACCESSORIES.find((item) => item.id === id) || null
}

// What the buddy has on: one id per slot, only ones you own.
export function normalizeWorn(raw, owned = []) {
  const bag = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (const slot of ACCESSORY_SLOTS) {
    const id = String(bag[slot] || '')
    const item = accessoryById(id)
    if (item && item.slot === slot && owned.includes(id)) out[slot] = id
  }
  return out
}

// Items over the background (wings, held, around) get a light rim; items on
// the fur a dark one. Each shape is drawn once fat in the rim colour, then
// again on top, which works the same in a browser and on the phone.
const LIGHT_RIM = new Set(['back', 'held', 'around'])

function rimmed(h, color, grow) {
  return (tag, props, ...children) => {
    if (tag === 'g') return h('g', props?.transform ? { transform: props.transform } : null, ...children)
    const fill = props?.fill === 'none' ? 'none' : color
    const { fillOpacity, opacity, stroke, strokeWidth, ...rest } = props || {}
    return h(tag, {
      ...rest,
      fill,
      stroke: color,
      strokeWidth: (Number(strokeWidth) || 0) + grow,
      strokeLinejoin: 'round',
      strokeLinecap: 'round',
    }, ...children)
  }
}

export function accessoryNodes(h, id, buddyId, tone = '#c9f24d') {
  const item = accessoryById(id)
  const anchor = AT[buddyId]
  const draw = DRAW[id]
  if (!item || !anchor || !draw) return []
  const light = LIGHT_RIM.has(item.slot)
  const rim = rimmed(h, light ? '#f4f6fa' : '#1f1a16', light ? 1.4 : 1.2)
  return [
    h('g', { opacity: light ? 0.95 : 0.9 }, ...draw(rim, anchor, tone)),
    h('g', null, ...draw(h, anchor, tone)),
  ]
}

// Back items sit behind the buddy; the rest go on top.
export function wornLayers(worn) {
  const on = worn && typeof worn === 'object' ? worn : {}
  return {
    behind: on.back ? [on.back] : [],
    front: ACCESSORY_SLOTS.filter((slot) => slot !== 'back' && on[slot]).map((slot) => on[slot]),
  }
}

// The same drawings as SVG text, for places that take markup (the Android
// widget). Attribute names go to their SVG spelling.
const ATTR = { strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', fillOpacity: 'fill-opacity' }
function markup(tag, props, ...children) {
  const attrs = Object.entries(props || {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => ` ${ATTR[k] || k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join('')
  return `<${tag}${attrs}>${children.flat().join('')}</${tag}>`
}

// A buddy's SVG (48x58) dressed in what it has on, in the padded box.
export function dressedSvg(buddySvg, buddyId, worn, tone) {
  const { behind, front } = wornLayers(worn)
  if (!buddySvg || (!behind.length && !front.length)) return buddySvg
  const inner = buddySvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const layer = (ids) => ids.flatMap((id) => accessoryNodes(markup, id, buddyId, tone)).join('')
  return `<svg viewBox="${ACCESSORY_VIEWBOX}" xmlns="http://www.w3.org/2000/svg">${layer(behind)}${inner}${layer(front)}</svg>`
}

// Accessories reach past the buddy's 48x58 box (wings, balloon, halo), so
// they draw in a bigger box centred on it.
export const ACCESSORY_PAD = 10
export const ACCESSORY_VIEWBOX = `${-ACCESSORY_PAD} ${-ACCESSORY_PAD} ${48 + ACCESSORY_PAD * 2} ${58 + ACCESSORY_PAD * 2}`
