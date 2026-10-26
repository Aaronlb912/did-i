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
  // The bee's antennae stand tall, so head items sit up between their tips.
  hive: { ex: [18, 30], ey: 27, er: 3.7, crown: 17, neck: 40, side: 14, hat: { y: 10, scale: 1 } },
  otter: { ex: [18, 30], ey: 27, er: 3.7, crown: 17, neck: 40, side: 15 },
  hedgehog: { ex: [18.5, 29.5], ey: 29, er: 3.6, crown: 16, neck: 40, side: 15 },
  panda: { ex: [18.2, 29.8], ey: 28, er: 4.4, crown: 17, neck: 39, side: 14 },
  duck: { ex: [18, 30], ey: 26, er: 3.7, crown: 17, neck: 40, side: 15 },
  axolotl: { ex: [18, 30], ey: 26, er: 4, crown: 13, neck: 38, side: 14.5 },
  turtle: { ex: [19.5, 28.5], ey: 25, er: 3.5, crown: 16, neck: 35, side: 11, back: 34 },
  snowman: { ex: [20, 28], ey: 23, er: 3.5, crown: 15.5, neck: 33.5, side: 13 },
  // Antlers rise from the top of the head; head items sit on it, in front of their bases.
  reindeer: { ex: [19.5, 28.5], ey: 27, er: 3.5, crown: 17.5, neck: 39.5, side: 14 },
  // Tall ears and folded wings: head items sit in front of the ear bases, back items behind the wings.
  bat: { ex: [19.5, 28.5], ey: 27, er: 3.7, crown: 17, neck: 40, side: 16 },
  // The tail fan rises behind the head: head items sit on the head, in front of it.
  turkey: { ex: [19.5, 28.5], ey: 28, er: 3.7, crown: 19.5, neck: 41, side: 14 },
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

// Streamers: where each starts (from the eyes), which way it falls, its colour.
// These three are shared with accessory-shapes.js.
export const STREAMERS = [[-21, -18, 86, '#f07ac0', 3.5], [19, -20, 94, '#4a9be8', 3.5], [-22, 4, 96, GOLD, 3], [20, 2, 82, '#7cc65a', 3]]
// A few bits of confetti between them: offset, colour, turn.
export const CONFETTI = [[-11, -21, '#4a9be8', 30], [24, -9, '#f07ac0', -20], [-25, -6, '#7cc65a', 55]]
// Ice wing outline (outward from the body, y from the wing's middle).
export const ICE_WING = [[0, -2], [6, -12], [9, -9], [15, -14.5], [13, -4.5], [17.5, -2], [10.5, 2], [12, 6.5], [4.5, 3.2], [0, 2.5]]
// Holly sprigs: offset from the eyes, size, turn.
export const HOLLY = [[-19, -9, 1, -15], [19, -3, 0.9, 20], [-17, 10, 0.8, 10]]
// Paper planes: offset from the eyes, turn, size, flipped to face left.
export const PLANES = [[-18, -7, -22, 1.2, false], [17, -14, -22, 1, true]]
// Party horn fringe: from (across the bell) to (spread), colour.
export const HORN_FRINGE = [[-2.6, -4.6, '#4a9be8'], [-0.9, -1.4, '#f07ac0'], [0.9, 1.4, '#7cc65a'], [2.6, 4.6, '#4a9be8']]
// A bopper's spring, zigzagging up from the band (x out from the middle, y from the band).
export const BOPPER_SPRING = [[3.5, -2.4], [4.6, -4], [3.6, -5.2], [5, -6.6], [4, -7.8], [5.6, -9.4], [5.2, -10.6]]
// A curly ribbon (a looped cycloid) falling along `ang` degrees.
export const curl = (x0, y0, ang, steps, turns) => {
  const c = Math.cos((ang * Math.PI) / 180)
  const s = Math.sin((ang * Math.PI) / 180)
  const n = Math.round(steps * turns)
  return Array.from({ length: n + 1 }, (_, i) => {
    const th = (i / steps) * Math.PI * 2
    // The loops get smaller toward the end, like a curled ribbon.
    const k = 1 - (0.45 * i) / n
    const u = 0.55 * th + 1.1 * k * Math.sin(th)
    const v = 2 * k * (1 - Math.cos(th)) * 0.9
    return [x0 + u * c - v * s, y0 + u * s + v * c]
  })
}
// The orbit ring: a tilted oval round the body. `arcs` gives the front half
// and the two ends of the back half that show past the sides.
export const orbitRing = (a) => {
  const cy = a.neck + 1.5
  // The turtle's shell (a wide buddy with a `back`) is wider than its side.
  const body = a.back && a.side > 10 ? a.side + 5 : a.side
  const rx = body + 7
  const ry = 3.4
  const tl = (-8 * Math.PI) / 180
  const at = (t) => {
    const X = Math.cos(t) * rx
    const Y = Math.sin(t) * ry
    return [24 + X * Math.cos(tl) - Y * Math.sin(tl), cy + X * Math.sin(tl) + Y * Math.cos(tl)]
  }
  const run = (t0, t1, n) => Array.from({ length: n + 1 }, (_, i) => at(t0 + ((t1 - t0) * i) / n))
  const gap = Math.acos(Math.min(0.95, (body - 0.5) / rx))
  const arcs = (n) => [run(Math.PI, Math.PI + gap, Math.max(2, Math.round(n / 6))), run(2 * Math.PI - gap, 2 * Math.PI, Math.max(2, Math.round(n / 6))), run(0, Math.PI, n)]
  return { at, arcs }
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
  glasses3d: (h, a) => {
    const [l, r] = a.ex
    const s = Math.min(a.er + 1, (r - l) / 2 - 0.7)
    const ry = s * 0.9
    return [
      h('path', { d: box(l - s - 0.8, a.ey - ry - 0.8, s * 2 + 1.6, ry * 2 + 1.6, 1.6), fill: CREAM }),
      h('path', { d: box(r - s - 0.8, a.ey - ry - 0.8, s * 2 + 1.6, ry * 2 + 1.6, 1.6), fill: CREAM }),
      h('path', { d: box(l - s, a.ey - ry, s * 2, ry * 2, 1), fill: '#e2463c' }),
      h('path', { d: box(r - s, a.ey - ry, s * 2, ry * 2, 1), fill: '#2fb8e8' }),
      h('path', { d: box(l + s + 0.6, a.ey - 1.2, r - l - s * 2 - 1.2, 1.4), fill: CREAM }),
      h('path', { d: box(l - s + 1, a.ey - ry + 0.9, s * 0.7, 0.8, 0.4), fill: '#ffffff', opacity: 0.55 }),
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
  rainbow: (h, a) => {
    const y = mid(a) + 4
    return [['#e2463c', 23], ['#f5a623', 20.6], ['#7cc65a', 18.2], ['#4a9be8', 15.8]].map(([c, r]) =>
      h('path', { d: `M${24 - r} ${y} A${r} ${r} 0 0 1 ${24 + r} ${y}`, fill: 'none', stroke: c, strokeWidth: 2.6 }))
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
  icecream: (h, a, t) => {
    const [x, y] = hand(a)
    return [
      h('path', { d: `M${x - 3.6} ${y - 8.5} L${x + 3.6} ${y - 8.5} L${x} ${y + 2.5} Z`, fill: '#e0a860' }),
      h('path', { d: `M${x - 2.2} ${y - 6.2} L${x + 1.3} ${y - 1} M${x + 2.2} ${y - 6.2} L${x - 1.3} ${y - 1}`, fill: 'none', stroke: '#a8702f', strokeWidth: 0.7, strokeLinecap: 'round' }),
      h('ellipse', { cx: x, cy: y - 9, rx: 4.8, ry: 2.2, fill: CREAM }),
      h('circle', { cx: x, cy: y - 13, r: 4, fill: t }),
      h('ellipse', { cx: x - 1.4, cy: y - 14.2, rx: 1, ry: 1.5, fill: '#ffffff', opacity: 0.5 }),
      h('path', { d: `M${x + 0.6} ${y - 18.4} Q${x + 1.2} ${y - 21} ${x + 3.2} ${y - 21.6}`, fill: 'none', stroke: '#3f8a3a', strokeWidth: 0.8, strokeLinecap: 'round' }),
      h('circle', { cx: x + 0.6, cy: y - 17.4, r: 1.6, fill: '#e2463c' }),
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
  bubbles: (h, a) => [[-20, -9, 3.4], [20, -5, 2.6], [-18, 8, 2.2], [17, 10, 1.7]].map(([dx, dy, r]) => {
    const x = 24 + dx
    const y = a.ey + dy
    return h('g', null,
      h('circle', { cx: x, cy: y, r, fill: '#bfe6ff' }),
      h('circle', { cx: x - r * 0.35, cy: y - r * 0.35, r: r * 0.3, fill: '#ffffff' }),
    )
  }),
  // A pinwheel on a stick: four colored blades, each with a folded flap.
  pinwheel: (h, a) => {
    const [x, y] = hand(a)
    const cx = x + 0.5
    const cy = y - 15
    const s = 5.4
    const turn = (px, py, k) => {
      const th = ((k * 90 + 12) * Math.PI) / 180
      return `${(cx + px * Math.cos(th) - py * Math.sin(th)).toFixed(2)} ${(cy + px * Math.sin(th) + py * Math.cos(th)).toFixed(2)}`
    }
    const blades = ['#e2463c', '#f5c542', '#4a9be8', '#7cc65a']
    return [
      h('path', { d: box(x - 0.55, cy, 1.1, y + 3 - cy, 0.5), fill: '#9a6538' }),
      ...blades.map((fill, k) => h('path', { d: `M${turn(0, 0, k)} L${turn(0, -s, k)} L${turn(s, -s, k)} Z`, fill })),
      ...blades.map((fill, k) => h('path', { d: `M${turn(0, 0, k)} L${turn(s, -s, k)} L${turn(s * 0.55, -s * 0.12, k)} Z`, fill: shade(fill, 0.8) })),
      h('circle', { cx, cy, r: 1.4, fill: CREAM }),
      h('circle', { cx, cy, r: 0.55, fill: INK }),
    ]
  },
  // Ski goggles: one wide mirrored lens with a nose notch, on a strap.
  goggles: (h, a, t) => {
    const [l, r] = a.ex
    const s = Math.min(a.er + 1.2, 6.4)
    const x0 = l - s - 1.2
    const x1 = r + s + 1.2
    const y0 = a.ey - s * 0.95
    const y1 = a.ey + s * 0.95
    const reach = Math.max(a.side + 2, x1 - 24 + 2.5)
    const lens = (i, n) => {
      const X0 = x0 + i
      const X1 = x1 - i
      const Y0 = y0 + i
      const Y1 = y1 - i
      const R = (Y1 - Y0) * 0.42
      return `M${X0 + R} ${Y0} H${X1 - R} Q${X1} ${Y0} ${X1} ${Y0 + R} V${Y1 - R} Q${X1} ${Y1} ${X1 - R} ${Y1} H${24 + n} Q24 ${Y1 - n * 1.1} ${24 - n} ${Y1} H${X0 + R} Q${X0} ${Y1} ${X0} ${Y1 - R} V${Y0 + R} Q${X0} ${Y0} ${X0 + R} ${Y0} Z`
    }
    const band = (y1 - y0) / 2 - 1.2
    return [
      h('path', { d: box(24 - reach, a.ey - 1.5, reach * 2, 3, 1), fill: t }),
      h('path', { d: `M${24 - reach + 0.8} ${a.ey} H${24 + reach - 0.8}`, stroke: shade(t), strokeWidth: 0.7, fill: 'none' }),
      h('path', { d: lens(0, 2.6), fill: '#2b2f38' }),
      h('path', { d: lens(1.2, 1.6), fill: '#ff7a3d' }),
      h('path', { d: box(x0 + 1.2, y0 + 1.2, x1 - x0 - 2.4, band, band * 0.8), fill: '#ffc94a' }),
      h('path', { d: `M${l + s * 0.15} ${y0 + 1.9} L${l - s * 0.45} ${y1 - 2.1}`, stroke: '#ffffff', strokeWidth: 1.2, strokeLinecap: 'round', opacity: 0.75, fill: 'none' }),
      h('path', { d: `M${l + s * 0.6} ${y0 + 1.9} L${l} ${y1 - 2.1}`, stroke: '#ffffff', strokeWidth: 0.6, strokeLinecap: 'round', opacity: 0.6, fill: 'none' }),
    ]
  },
  // Earmuffs: two fluffy muffs, each a ring of puffs, on a thin band. The
  // scalloped edge is what tells them from the headphones.
  earmuffs: (h, a, t) => {
    const sx = a.side - 0.5
    const my = a.ey - 2.5
    const R = 4.8
    const top = (a.hat?.y ?? a.crown) - 8
    const muff = (cx) => [
      ...Array.from({ length: 14 }, (_, i) => {
        const th = (i * Math.PI) / 7
        return h('circle', { cx: cx + Math.cos(th) * (R - 1.25), cy: my + Math.sin(th) * (R - 1.25), r: 1.3, fill: '#f4a6c6' })
      }),
      h('circle', { cx, cy: my, r: R - 1, fill: '#f4a6c6' }),
      h('ellipse', { cx: cx - 1.1, cy: my - 1.2, rx: 1.4, ry: 1.1, fill: '#ffcfe1' }),
    ]
    return [
      h('path', { d: `M${24 - sx} ${my - R + 1} C${24 - sx} ${top} ${24 + sx} ${top} ${24 + sx} ${my - R + 1}`, fill: 'none', stroke: t, strokeWidth: 1.3 }),
      ...muff(24 - sx),
      ...muff(24 + sx),
    ]
  },
  // A snow globe on a red base: a tiny tree and snow inside the glass.
  snowglobe: (h, a) => {
    const [x, y] = hand(a)
    const cx = x + 0.5
    const R = 5.2
    const gy = y - 9.2
    const gx = Math.sqrt(R * R - 2.4 * 2.4)
    return [
      h('circle', { cx, cy: gy, r: R, fill: '#d3ecff' }),
      h('path', { d: `M${cx - gx} ${gy + 2.4} Q${cx} ${gy + 1.2} ${cx + gx} ${gy + 2.4} A${R} ${R} 0 0 1 ${cx - gx} ${gy + 2.4} Z`, fill: '#ffffff' }),
      h('path', { d: box(cx - 0.45, gy + 0.6, 0.9, 1.6, 0.2), fill: '#8a5a32' }),
      h('path', { d: `M${cx} ${gy - 3.8} L${cx + 1.7} ${gy - 1} L${cx - 1.7} ${gy - 1} Z M${cx} ${gy - 2.4} L${cx + 2.4} ${gy + 1} L${cx - 2.4} ${gy + 1} Z`, fill: '#3f9e6a' }),
      h('circle', { cx, cy: gy - 3.9, r: 0.6, fill: GOLD }),
      ...[[-3, -2], [2.6, -2.8], [-2.2, 0.6], [3, 0.2], [-0.8, -4.4], [1.6, -4]].map(([dx, dy]) => h('circle', { cx: cx + dx, cy: gy + dy, r: 0.42, fill: '#ffffff' })),
      h('path', { d: `M${cx - 3.7} ${gy - 1.2} A4 4 0 0 1 ${cx - 1.4} ${gy - 3.8}`, fill: 'none', stroke: '#ffffff', strokeWidth: 0.8, strokeLinecap: 'round', opacity: 0.85 }),
      h('path', { d: `M${cx - 4.2} ${gy + R - 1.2} H${cx + 4.2} L${cx + 5.2} ${gy + R + 3.4} H${cx - 5.2} Z`, fill: '#b23a3a' }),
      h('path', { d: box(cx - 4.6, gy + R + 0.4, 9.2, 1.1, 0.3), fill: GOLD }),
    ]
  },
  // A string of lights draped over the buddy, bulbs hanging from the wire.
  fairylights: (h, a) => {
    const top = a.hat?.y ?? a.crown
    const cy = a.ey + 1
    const rx = a.side + 7
    const ry = cy - top + 9
    const n = 7
    const pts = Array.from({ length: n }, (_, i) => {
      const th = ((205 - (i * 230) / (n - 1)) * Math.PI) / 180
      return [24 + Math.cos(th) * rx, cy - Math.sin(th) * ry, th]
    })
    const bulbs = ['#e2463c', '#f5c542', '#4a9be8', '#7cc65a', '#f07ac0']
    let wire = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
    for (let i = 1; i < n; i += 1) {
      wire += ` Q${((pts[i - 1][0] + pts[i][0]) / 2).toFixed(2)} ${((pts[i - 1][1] + pts[i][1]) / 2 + 3).toFixed(2)} ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`
    }
    return [
      h('path', { d: wire, fill: 'none', stroke: '#2f5d3a', strokeWidth: 0.7 }),
      ...pts.map(([px, py, th], i) => {
        // Hang down, splayed outward on the sides.
        const dx = Math.cos(th)
        const dy = -Math.sin(th) + 1.2
        const turn = (Math.atan2(-dx, dy) * 180) / Math.PI
        return h('g', { transform: `translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${turn.toFixed(1)})` },
          h('path', { d: box(-0.85, -0.3, 1.7, 1.3, 0.3), fill: '#2f5d3a' }),
          h('ellipse', { cx: 0, cy: 2.6, rx: 1.35, ry: 1.95, fill: bulbs[i % bulbs.length] }),
          h('circle', { cx: -0.45, cy: 2.1, r: 0.45, fill: '#ffffff', opacity: 0.8 }),
        )
      }),
    ]
  },
  // A striped candy cane, hook at the top.
  candycane: (h, a) => {
    const [x, y] = hand(a)
    const r = 2.5
    const top = y - 11.5
    const cx = x + r
    const cane = `M${x} ${y + 2.5} V${top} A${r} ${r} 0 0 1 ${x + r * 2} ${top} V${top + 2.4}`
    const at = (deg, rr) => {
      const th = (deg * Math.PI) / 180
      return `${(cx + Math.cos(th) * rr).toFixed(2)} ${(top - Math.sin(th) * rr).toFixed(2)}`
    }
    const stripes = [
      ...[0, 1, 2, 3, 4].map((i) => `M${x - 1} ${y + 0.6 - i * 2.6 + 0.75} L${x + 1} ${y + 0.6 - i * 2.6 - 0.75}`),
      ...[150, 90, 30].map((deg) => `M${at(deg + 14, r - 1)} L${at(deg - 14, r + 1)}`),
    ].join(' ')
    return [
      h('path', { d: cane, fill: 'none', stroke: '#c8303a', strokeWidth: 3.2, strokeLinecap: 'round' }),
      h('path', { d: cane, fill: 'none', stroke: '#ffffff', strokeWidth: 2.1, strokeLinecap: 'round' }),
      h('path', { d: stripes, fill: 'none', stroke: '#e2463c', strokeWidth: 0.95 }),
    ]
  },
  // 8-bit shades: square pixels, a stepped lens edge and two white glints.
  pixelshades: (h, a) => {
    const [l, r] = a.ex
    const half = Math.min(a.er + 1.2, (r - l) / 2 - 0.6)
    const p = (half * 2) / 5
    const y0 = a.ey - p * 1.7
    const px = (x, y, w, ht, fill = '#141518') => h('path', { d: box(x, y, w + 0.04, ht + 0.04), fill })
    return [
      px(l - half - p, y0, r - l + half * 2 + p * 2, p),
      ...[l, r].flatMap((c) => {
        const x0 = c - half
        return [
          px(x0, y0 + p, p * 5, p),
          px(x0 + p, y0 + p * 2, p * 4, p),
          px(x0 + p * 2, y0 + p * 3, p * 3, p),
          px(x0 + p, y0 + p, p, p, '#ffffff'),
          px(x0 + p * 2, y0 + p * 2, p, p, '#ffffff'),
        ]
      }),
    ]
  },
  // Curly party streamers: corkscrew ribbons on both sides.
  streamers: (h, a) => [
    ...STREAMERS.map(([dx, dy, ang, c, turns]) => {
      const pts = curl(24 + dx, a.ey + dy, ang, 20, turns)
      return h('path', { d: 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L'), fill: 'none', stroke: c, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
    }),
    ...CONFETTI.map(([dx, dy, c, turn]) => h('path', { d: box(24 + dx - 1.1, a.ey + dy - 0.6, 2.2, 1.2, 0.3), fill: c, transform: `rotate(${turn} ${24 + dx} ${a.ey + dy})` })),
  ],
  // A striped beanie with a propeller on top.
  propeller: (h, a, t) => onHead(h, a, a.crown + 1, (y) => {
    const gore = (w) => `M24 ${y - 6.75} C${24 - w * 0.75} ${y - 6.2} ${24 - w} ${y - 3} ${24 - w} ${y} L${24 + w} ${y} C${24 + w} ${y - 3} ${24 + w * 0.75} ${y - 6.2} 24 ${y - 6.75} Z`
    return [
      h('path', { d: `M15 ${y} C15 ${y - 9} 33 ${y - 9} 33 ${y} Z`, fill: '#4a9be8' }),
      h('path', { d: gore(4.4), fill: GOLD }),
      h('path', { d: gore(1.7), fill: '#e2463c' }),
      h('path', { d: box(14.5, y - 1.8, 19, 3, 1.5), fill: t }),
      h('path', { d: box(23.3, y - 10.4, 1.4, 4, 0.5), fill: '#3a3f4b' }),
      h('g', { transform: `rotate(-8 24 ${y - 10.4})` },
        h('ellipse', { cx: 19.6, cy: y - 10.4, rx: 4.2, ry: 1.25, fill: '#e2463c' }),
        h('ellipse', { cx: 28.4, cy: y - 10.4, rx: 4.2, ry: 1.25, fill: '#e2463c' }),
      ),
      h('circle', { cx: 24, cy: y - 10.4, r: 1.3, fill: GOLD }),
    ]
  }),
  // A diamond kite on its string, with a bow tail.
  kite: (h, a) => {
    const [x, y] = hand(a)
    const kx = x + 4.5
    const ky = y - 23
    const w = 4.6
    const up = 4.8
    const dn = 8
    const bow = (bx, by, fill) => h('path', { d: `M${bx} ${by} L${bx - 1.9} ${by - 1.1} L${bx - 1.9} ${by + 1.1} Z M${bx} ${by} L${bx + 1.9} ${by - 1.1} L${bx + 1.9} ${by + 1.1} Z`, fill })
    return [
      h('path', { d: `M${x} ${y} Q${kx + 2} ${y - 4} ${kx} ${ky}`, fill: 'none', stroke: '#7d8696', strokeWidth: 0.5 }),
      h('path', { d: `M${kx} ${ky + dn} Q${kx - 3.4} ${ky + dn + 2.4} ${kx - 1.8} ${ky + dn + 4.8} Q${kx - 0.4} ${ky + dn + 7.2} ${kx - 3} ${ky + dn + 9}`, fill: 'none', stroke: '#3a3f4b', strokeWidth: 0.6 }),
      h('path', { d: `M${kx} ${ky - up} L${kx + w} ${ky} L${kx - w} ${ky} Z`, fill: '#e2463c' }),
      h('path', { d: `M${kx} ${ky - up} L${kx + w} ${ky} L${kx} ${ky} Z`, fill: shade('#e2463c', 0.84) }),
      h('path', { d: `M${kx - w} ${ky} L${kx + w} ${ky} L${kx} ${ky + dn} Z`, fill: GOLD }),
      h('path', { d: `M${kx} ${ky} L${kx + w} ${ky} L${kx} ${ky + dn} Z`, fill: shade(GOLD, 0.84) }),
      h('path', { d: `M${kx} ${ky - up} V${ky + dn} M${kx - w} ${ky} H${kx + w}`, fill: 'none', stroke: '#6b4a32', strokeWidth: 0.55 }),
      bow(kx - 2.2, ky + dn + 2.6, '#4a9be8'),
      bow(kx - 1.2, ky + dn + 6.6, '#f07ac0'),
    ]
  },
  // Dragonfly wings: two pairs, long and narrow, veined, a dark spot near
  // each tip. Clear, not colored like the fairy or butterfly.
  dragonfly: (h, a) => {
    const y = mid(a) - 3
    const x0 = a.side - 4
    const wing = (L, w, dy, ang) => [-1, 1].map((d) => h('g', { transform: `translate(${24 + d * x0} ${y + dy}) scale(${d} 1) rotate(${ang})` },
      h('path', { d: `M0 -0.7 C${L * 0.3} ${-w * 1.05} ${L * 0.7} ${-w * 1.1} ${L - 0.6} ${-w * 0.55} Q${L + 0.5} ${-w * 0.05} ${L - 0.8} ${w * 0.45} C${L * 0.6} ${w * 0.95} ${L * 0.25} ${w * 0.7} 0 0.7 Z`, fill: '#e6f4ff', fillOpacity: 0.85, stroke: '#8fb6dc', strokeWidth: 0.45 }),
      h('path', { d: `M0.4 -0.5 C${L * 0.3} ${-w * 0.95} ${L * 0.7} ${-w} ${L - 0.6} ${-w * 0.55}`, fill: 'none', stroke: '#5f84ad', strokeWidth: 0.6 }),
      h('path', { d: [`M0.4 0 Q${L * 0.5} ${-w * 0.2} ${L - 1} ${-w * 0.05}`, ...[0.22, 0.4, 0.58, 0.74].map((f) => `M${L * f} ${-w * 0.8} L${L * f + 0.5} ${w * 0.62}`)].join(' '), fill: 'none', stroke: '#8fb6dc', strokeWidth: 0.35 }),
      h('ellipse', { cx: L * 0.84, cy: -w * 0.68, rx: 1.1, ry: 0.45, fill: '#3a4a63' }),
    ))
    return [...wing(15.5, 2.3, 1.6, 12), ...wing(18, 2.6, -1.6, -14)]
  },
  // A tiny moon on a tilted ring. The back of the ring hides behind the body.
  orbit: (h, a) => {
    const ring = orbitRing(a)
    const [mx, my] = ring.at(Math.PI - 0.5)
    const line = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')
    return [
      h('path', { d: ring.arcs(24).map(line).join(' '), fill: 'none', stroke: GOLD, strokeWidth: 1 }),
      h('circle', { cx: mx, cy: my, r: 2.8, fill: '#ece6d6' }),
      h('circle', { cx: mx - 0.9, cy: my - 0.6, r: 0.7, fill: '#cbc2aa' }),
      h('circle', { cx: mx + 0.9, cy: my + 0.8, r: 0.5, fill: '#cbc2aa' }),
      h('circle', { cx: mx + 0.7, cy: my - 1.3, r: 0.35, fill: '#cbc2aa' }),
    ]
  },
  // Ice wings: jagged shards of ice, a paler inner shard and white facet lines.
  icewings: (h, a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].map((d) => {
      const X = (v) => (24 + d * (x0 + v)).toFixed(2)
      const P = (pts) => 'M' + pts.map(([u, v]) => `${X(u)} ${(y + v).toFixed(2)}`).join(' L') + ' Z'
      return h('g', null,
        h('path', { fill: '#a9d8f5', d: P(ICE_WING) }),
        h('path', { fill: '#e3f4ff', d: P([[1, -1], [6, -9.5], [8.6, -7.2], [12.5, -11.5], [10.6, -3.4], [1, 0.5]]) }),
        h('path', { fill: 'none', stroke: '#ffffff', strokeWidth: 0.6, strokeLinecap: 'round', d: [[6, -11], [14.6, -13.6], [16.4, -2], [11.6, 5.6]].map(([u, v]) => `M${X(0.6)} ${y} L${X(u)} ${y + v}`).join(' ') }),
      )
    })
  },
  // Holly sprigs: two spiky leaves and three red berries each.
  holly: (h, a) => HOLLY.map(([dx, dy, k, turn]) => {
    const leaf = 'M0 0 L-1.8 -2 L-3.2 -1 L-4.8 -2.8 L-5.8 -1.2 L-7.8 -1.8 L-7 0.3 L-5.4 1.3 L-3.6 0.7 L-2.3 1.8 Z'
    return h('g', { transform: `translate(${24 + dx} ${a.ey + dy}) rotate(${turn}) scale(${k})` },
      h('path', { d: leaf, fill: '#2f8a4a' }),
      h('g', { transform: 'scale(-1 1)' }, h('path', { d: leaf, fill: '#3fa45c' })),
      h('path', { d: 'M-0.6 0 L-6.4 -0.4 M0.6 0 L6.4 -0.4', fill: 'none', stroke: '#1f5e3c', strokeWidth: 0.4 }),
      ...[[0, 0.6], [-1.3, 1.8], [1.3, 1.8]].map(([bx, by]) => h('circle', { cx: bx, cy: by, r: 1.15, fill: '#d83a3a' })),
      h('circle', { cx: -0.35, cy: 0.25, r: 0.35, fill: '#ffffff', opacity: 0.8 }),
    )
  }),
  // An elf hat: green, flopping to one side, a bell at the tip, a zigzag cuff.
  elfhat: (h, a) => onHead(h, a, a.crown + 1, (y) => [
    h('path', { d: `M15.5 ${y} C16 ${y - 6} 20 ${y - 10} 25 ${y - 11.2} C28.5 ${y - 12} 32 ${y - 11.2} 34.5 ${y - 8.5} C31 ${y - 9.5} 29 ${y - 7.5} 31.5 ${y} Z`, fill: '#3f9e6a' }),
    h('path', { d: `M24 ${y - 10.9} C27.5 ${y - 11.6} 31 ${y - 10.8} 33.4 ${y - 9}`, fill: 'none', stroke: '#2f7a50', strokeWidth: 0.7 }),
    h('path', { d: `M14.5 ${y + 1.6} V${y - 1.6} L17 ${y - 3.6} L19.5 ${y - 1.6} L22 ${y - 3.6} L24.5 ${y - 1.6} L27 ${y - 3.6} L29.5 ${y - 1.6} L32 ${y - 3.6} L33.5 ${y - 1.6} V${y + 1.6} Z`, fill: '#e2463c' }),
    h('circle', { cx: 35, cy: y - 7.8, r: 1.7, fill: GOLD }),
    h('path', { d: `M34.2 ${y - 7.2} H35.8`, fill: 'none', stroke: shade(GOLD, 0.6), strokeWidth: 0.5 }),
  ]),
  // Peppermint glasses: round lenses swirled red and white like the candy.
  peppermint: (h, a) => {
    const [l, r] = a.ex
    const R = Math.min(a.er + 0.8, (r - l) / 2 - 0.4)
    const lens = (c) => [
      h('circle', { cx: c, cy: a.ey, r: R, fill: '#ffffff' }),
      ...[0, 120, 240].map((deg) => {
        const P = (th, rr) => `${(c + Math.cos((th * Math.PI) / 180) * rr).toFixed(2)} ${(a.ey + Math.sin((th * Math.PI) / 180) * rr).toFixed(2)}`
        return h('path', { d: `M${c} ${a.ey} Q${P(deg + 10, R * 0.75)} ${P(deg + 40, R - 0.3)} L${P(deg + 85, R - 0.3)} Q${P(deg + 50, R * 0.55)} ${c} ${a.ey} Z`, fill: '#e2463c' })
      }),
      h('circle', { cx: c, cy: a.ey, r: R, fill: 'none', stroke: '#c8303a', strokeWidth: 0.8 }),
    ]
    return [
      h('path', { d: `M${l + R} ${a.ey - 0.6} Q24 ${a.ey - 2.2} ${r - R} ${a.ey - 0.6}`, fill: 'none', stroke: '#c8303a', strokeWidth: 1.1 }),
      ...lens(l),
      ...lens(r),
    ]
  },
  // A silver tiara: three arches over a thin band, a pink gem in the middle.
  tiara: (h, a) => onHead(h, a, a.crown + 1, (y) => [
    h('path', { d: `M17 ${y - 1} Q18.8 ${y - 5} 20.8 ${y - 1.6} Q24 ${y - 9} 27.2 ${y - 1.6} Q29.2 ${y - 5} 31 ${y - 1}`, fill: 'none', stroke: '#d9dde6', strokeWidth: 1.2, strokeLinejoin: 'round' }),
    h('path', { d: box(16.6, y - 1.8, 14.8, 1.8, 0.9), fill: '#c3c9d6' }),
    h('path', { d: `M24 ${y - 7.4} L25.3 ${y - 5.4} L24 ${y - 3.4} L22.7 ${y - 5.4} Z`, fill: '#f07ac0' }),
    h('circle', { cx: 18.8, cy: y - 3.1, r: 0.65, fill: '#7fd6ff' }),
    h('circle', { cx: 29.2, cy: y - 3.1, r: 0.65, fill: '#7fd6ff' }),
    h('path', { d: `M23.6 ${y - 6} L24 ${y - 6.8}`, fill: 'none', stroke: '#ffffff', strokeWidth: 0.45, strokeLinecap: 'round' }),
  ]),
  // A party horn: a striped cone with a paper fringe at the wide end.
  horn: (h, a) => {
    const [x, y] = hand(a)
    return [h('g', { transform: `rotate(18 ${x} ${y})` },
      h('path', { d: box(x - 0.9, y - 1, 1.8, 2.6, 0.6), fill: '#3a3f4b' }),
      h('path', { d: `M${x - 0.8} ${y - 0.8} L${x + 0.8} ${y - 0.8} L${x + 3} ${y - 12} L${x - 3} ${y - 12} Z`, fill: GOLD }),
      h('path', { d: `M${x - 1.2} ${y - 3.2} L${x + 1.6} ${y - 5.4} M${x - 1.8} ${y - 6.8} L${x + 2.2} ${y - 9.6} M${x - 2.6} ${y - 10.4} L${x + 1} ${y - 12}`, fill: 'none', stroke: '#e2463c', strokeWidth: 0.9 }),
      h('ellipse', { cx: x, cy: y - 12, rx: 3.1, ry: 1.1, fill: shade(GOLD, 0.8) }),
      ...HORN_FRINGE.map(([u, v, c]) => h('path', { d: `M${x + u} ${y - 12.6} L${x + v} ${y - 16}`, fill: 'none', stroke: c, strokeWidth: 0.8, strokeLinecap: 'round' })),
    )]
  },
  // Cat-eye glasses: dark lenses, frames that sweep up to a point with a gem.
  cateye: (h, a, t) => {
    const l = a.ex[0]
    const s = Math.min(a.er + 0.9, (a.ex[1] - a.ex[0]) / 2 - 0.3)
    const y = a.ey
    const frame = `M${l + s} ${y - s * 0.4} Q${l + s} ${y + s * 0.95} ${l} ${y + s * 0.85} Q${l - s} ${y + s * 0.8} ${l - s * 1.05} ${y} Q${l - s * 1.3} ${y - s * 0.8} ${l - s * 1.6} ${y - s * 1.3} Q${l - s * 0.4} ${y - s * 1.05} ${l} ${y - s * 0.9} Q${l + s * 0.9} ${y - s * 0.9} ${l + s} ${y - s * 0.4} Z`
    const side = (mirror) => h('g', mirror ? { transform: 'translate(48 0) scale(-1 1)' } : null,
      h('path', { d: frame, fill: t }),
      h('ellipse', { cx: l, cy: y, rx: s * 0.74, ry: s * 0.6, fill: '#22252c' }),
      h('path', { d: box(l - s * 0.5, y - s * 0.4, s * 0.55, 0.7, 0.35), fill: '#ffffff', opacity: 0.5 }),
      h('circle', { cx: l - s * 1.25, cy: y - s * 0.95, r: 0.6, fill: '#ffffff' }),
    )
    return [
      h('path', { d: `M${l + s} ${y - 0.6} L${48 - l - s} ${y - 0.6}`, fill: 'none', stroke: t, strokeWidth: 1.1 }),
      side(false),
      side(true),
    ]
  },
  // Two paper planes climbing, a dotted trail behind each.
  planes: (h, a) => PLANES.map(([dx, dy, turn, k, flip]) =>
    h('g', { transform: `translate(${24 + dx} ${a.ey + dy}) scale(${flip ? -k : k} ${k}) rotate(${turn})` },
      h('path', { d: 'M4.2 0 L-4 -2.8 L-1.6 0 Z', fill: '#ffffff' }),
      h('path', { d: 'M4.2 0 L-1.6 0 L-3.2 2.2 Z', fill: '#cdd6e4' }),
      h('path', { d: 'M4.2 0 L-1.6 0', fill: 'none', stroke: '#8f9db3', strokeWidth: 0.4 }),
      ...[[-5.6, 0.6, 0.5], [-7.6, 1.4, 0.4]].map(([cx, cy, r]) => h('circle', { cx, cy, r, fill: '#8fb6dc' })),
    )),
  // Head boppers: a headband with two springs and a star on each.
  boppers: (h, a, t) => onHead(h, a, a.crown + 1, (y) => [
    ...[-1, 1].map((d) => h('path', { d: BOPPER_SPRING.map(([u, v], i) => `${i ? 'L' : 'M'}${24 + d * u} ${y + v}`).join(' '), fill: 'none', stroke: '#3a3f4b', strokeWidth: 0.7, strokeLinejoin: 'round' })),
    h('path', { d: `M15.5 ${y + 1.5} Q24 ${y - 5.5} 32.5 ${y + 1.5}`, fill: 'none', stroke: t, strokeWidth: 1.5, strokeLinecap: 'round' }),
    h('polygon', { points: star(18.8, y - 12, 2.6), fill: GOLD }),
    h('polygon', { points: star(29.2, y - 12, 2.6), fill: '#f07ac0' }),
  ]),
  // A red paper lantern on a stick: gold caps, ribs and a tassel.
  lantern: (h, a) => {
    const [x, y] = hand(a)
    const cx = x + 1
    const cy = y - 9.5
    return [
      h('path', { d: `M${x - 2} ${y + 2} L${cx} ${y - 20}`, fill: 'none', stroke: '#9a6538', strokeWidth: 0.9, strokeLinecap: 'round' }),
      h('path', { d: `M${cx} ${y - 19.6} V${cy - 5.6}`, fill: 'none', stroke: '#6b4a32', strokeWidth: 0.5 }),
      h('path', { d: `M${cx - 0.9} ${cy + 4.6} V${cy + 8} M${cx} ${cy + 4.6} V${cy + 8.6} M${cx + 0.9} ${cy + 4.6} V${cy + 8}`, fill: 'none', stroke: GOLD, strokeWidth: 0.6 }),
      h('ellipse', { cx, cy, rx: 4.6, ry: 4.6, fill: '#e2463c' }),
      h('path', { d: `M${cx} ${cy - 4.4} V${cy + 4.4} M${cx - 2.3} ${cy - 3.9} Q${cx - 3.4} ${cy} ${cx - 2.3} ${cy + 3.9} M${cx + 2.3} ${cy - 3.9} Q${cx + 3.4} ${cy} ${cx + 2.3} ${cy + 3.9}`, fill: 'none', stroke: '#b23030', strokeWidth: 0.5 }),
      h('path', { d: box(cx - 2.6, cy - 5.6, 5.2, 1.6, 0.5), fill: GOLD }),
      h('path', { d: box(cx - 2.6, cy + 3.9, 5.2, 1.6, 0.5), fill: GOLD }),
      h('ellipse', { cx: cx - 2, cy: cy - 1.2, rx: 0.8, ry: 1.6, fill: '#ffffff', opacity: 0.35 }),
    ]
  },
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
  // Dated drops (docs/shop-drops.md): on sale from `from`, no end date.
  { id: 'icecream', slot: 'held', tier: 'standard', from: '2026-10-23' },
  { id: 'glasses3d', slot: 'eyes', tier: 'rare', from: '2026-10-23' },
  { id: 'rainbow', slot: 'back', tier: 'rare', from: '2026-10-23' },
  { id: 'bubbles', slot: 'around', tier: 'common', from: '2026-10-23' },
  { id: 'pinwheel', slot: 'held', tier: 'standard', from: '2026-11-20' },
  { id: 'goggles', slot: 'eyes', tier: 'rare', from: '2026-11-20' },
  { id: 'earmuffs', slot: 'head', tier: 'standard', from: '2026-12-04' },
  { id: 'snowglobe', slot: 'held', tier: 'rare', from: '2026-12-04' },
  { id: 'fairylights', slot: 'around', tier: 'rare', from: '2026-12-18' },
  { id: 'candycane', slot: 'held', tier: 'common', from: '2026-12-18' },
  { id: 'pixelshades', slot: 'eyes', tier: 'rare', from: '2027-01-01' },
  { id: 'streamers', slot: 'around', tier: 'standard', from: '2027-01-01' },
  { id: 'propeller', slot: 'head', tier: 'rare', from: '2027-01-15' },
  { id: 'kite', slot: 'held', tier: 'standard', from: '2027-01-15' },
  { id: 'dragonfly', slot: 'back', tier: 'rare', from: '2027-01-29' },
  { id: 'orbit', slot: 'around', tier: 'common', from: '2027-01-29' },
  { id: 'icewings', slot: 'back', tier: 'standard', from: '2026-12-04' },
  { id: 'holly', slot: 'around', tier: 'common', from: '2026-12-04' },
  { id: 'elfhat', slot: 'head', tier: 'standard', from: '2026-12-18' },
  { id: 'peppermint', slot: 'eyes', tier: 'common', from: '2026-12-18' },
  { id: 'tiara', slot: 'head', tier: 'standard', from: '2027-01-01' },
  { id: 'horn', slot: 'held', tier: 'common', from: '2027-01-01' },
  { id: 'cateye', slot: 'eyes', tier: 'standard', from: '2027-01-15' },
  { id: 'planes', slot: 'around', tier: 'common', from: '2027-01-15' },
  { id: 'boppers', slot: 'head', tier: 'common', from: '2027-01-29' },
  { id: 'lantern', slot: 'held', tier: 'standard', from: '2027-01-29' },
].map((item) => ({ ...item, coins: ACCESSORY_TIERS[item.tier] }))

export const ACCESSORIES = ALL_ACCESSORIES
export const ACCESSORY_IDS = new Set(ALL_ACCESSORIES.map((item) => item.id))

// What the shop sells today. Same rule as purse.js isLive, plus an end date.
export function accessoryOnSale(item, today) {
  if (!item) return false
  // Seasonal rows come back every year: from its first day on, the month and
  // day decide (until stays exclusive; a window may wrap the new year).
  if (item.tier === 'seasonal' && item.from && item.until) {
    const day = String(today || '')
    if (day < item.from) return false
    const md = day.slice(5, 10)
    const from = item.from.slice(5, 10)
    const until = item.until.slice(5, 10)
    return from < until ? md >= from && md < until : md >= from || md < until
  }
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
