// Pure geometry for card frames. No React Native imports, so scripts/check.mjs
// can load it. All coordinates are in card space: (0,0) is the card's top-left,
// (w,h) its bottom-right.

/** The ids every frame renderer must cover (same as src/lib/frames.js FRAMES). */
export const FRAME_IDS = [
  'first', 'thin', 'double', 'dotted', 'washi', 'pixel', 'stitch', 'polaroid', 'wood', 'flowers',
  'comic', 'moon', 'filigree', 'deco', 'marble', 'glow', 'silver', 'neon', 'fireflies', 'shoot',
  'glass', 'gold', 'const', 'ring', 'aurora', 'vine', 'ember', 'gems', 'frost', 'bloom', 'web', 'leaves',
  'snow', 'sakura', 'bday',
  'ticket', 'notebook', 'postage', 'bamboo', 'chalk', 'quilt', 'rope', 'street', 'lights', 'train', 'garden', 'dusk', 'globe', 'doodle', 'swipe', 'hearts', 'clover', 'fireworks', 'sunny', 'royal', 'wrapped', 'galaxy', 'neonheart', 'storm',
  'linked', 'bedtime', 'countdown',
  'knit', 'window', 'candles', 'ginger', 'snowman', 'solstice', 'mosaic', 'domino', 'fresh', 'origami', 'aquarium', 'books', 'lace', 'boats', 'thaw',
  'fullhouse', 'orchard', 'hundred',
]

/** Clockwise rounded rect that starts at the bottom of the left edge. */
export function rrPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  return `M ${x} ${y + h - rr} L ${x} ${y + rr} A ${rr} ${rr} 0 0 1 ${x + rr} ${y} L ${x + w - rr} ${y} A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr} L ${x + w} ${y + h - rr} A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h} L ${x + rr} ${y + h} A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr} Z`
}

export function rrLength(w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  return 2 * (w - 2 * rr) + 2 * (h - 2 * rr) + 2 * Math.PI * rr
}

/**
 * Point at distance d along rrPath(x,y,w,h,r). Replaces getPointAtLength,
 * which native SVG does not have. ang is the direction of travel; (nx, ny)
 * is the outward normal.
 */
export function rrPointAt(x, y, w, h, r, d) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  const sv = h - 2 * rr
  const sh = w - 2 * rr
  const arc = (Math.PI * rr) / 2
  const L = rrLength(w, h, rr)
  let s = ((d % L) + L) % L
  const out = (px, py, ang) => ({ x: px, y: py, ang, nx: Math.sin(ang), ny: -Math.cos(ang) })
  const onArc = (cx, cy, from, k) => {
    const th = from + (rr ? k / rr : 0)
    return out(cx + rr * Math.cos(th), cy + rr * Math.sin(th), th + Math.PI / 2)
  }
  if (s < sv) return out(x, y + h - rr - s, -Math.PI / 2)
  s -= sv
  if (s < arc) return onArc(x + rr, y + rr, Math.PI, s)
  s -= arc
  if (s < sh) return out(x + rr + s, y, 0)
  s -= sh
  if (s < arc) return onArc(x + w - rr, y + rr, -Math.PI / 2, s)
  s -= arc
  if (s < sv) return out(x + w, y + rr + s, Math.PI / 2)
  s -= sv
  if (s < arc) return onArc(x + w - rr, y + h - rr, 0, s)
  s -= arc
  if (s < sh) return out(x + w - rr - s, y + h, Math.PI)
  s -= sh
  return onArc(x + rr, y + h - rr, Math.PI / 2, Math.min(s, arc))
}

/** Rounded rect with a gap at the top middle (First Light, Tonight's Moon). */
export function openTopPath(w, h, r, gap) {
  const mid = w / 2
  return `M ${mid - gap} 0 L ${r} 0 A ${r} ${r} 0 0 0 0 ${r} L 0 ${h - r} A ${r} ${r} 0 0 0 ${r} ${h} L ${w - r} ${h} A ${r} ${r} 0 0 0 ${w} ${h - r} L ${w} ${r} A ${r} ${r} 0 0 0 ${w - r} 0 L ${mid + gap} 0`
}

/** Point u (0..1) around a plain rect, as the mockup's particle systems use. */
export function edgePoint(w, h, u) {
  'worklet'
  const p = u * 2 * (w + h)
  if (p < w) return [p, 0]
  if (p < w + h) return [w, p - w]
  if (p < 2 * w + h) return [w - (p - w - h), h]
  return [0, h - (p - 2 * w - h)]
}

/** Small seeded random so a frame draws the same every time. */
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pie wedges that fake a CSS conic-gradient. stops: [[color, fromFrac, toFrac], ...]. 0 = up, clockwise. */
export function conicWedges(cx, cy, radius, stops, startDeg = 0) {
  const pt = (frac) => {
    const a = ((startDeg / 360 + frac) * 2 * Math.PI)
    return [cx + radius * Math.sin(a), cy - radius * Math.cos(a)]
  }
  const out = []
  for (const [fill, from, to] of stops) {
    // Overlap each wedge a hair so no seam shows between them.
    const a0 = pt(from - 0.002)
    const a1 = pt(to + 0.002)
    const large = to - from > 0.5 ? 1 : 0
    out.push({ fill, d: `M ${cx} ${cy} L ${a0[0]} ${a0[1]} A ${radius} ${radius} 0 ${large} 1 ${a1[0]} ${a1[1]} Z` })
  }
  return out
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** A smooth conic gradient through colors (first == last for a loop) as n wedges. */
export function smoothConic(colors, n = 72) {
  const rgb = colors.map(hexToRgb)
  const seg = rgb.length - 1
  const stops = []
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n
    const k = Math.min(seg - 1, Math.floor(f * seg))
    const local = f * seg - k
    const c = rgb[k].map((v, j) => Math.round(v + (rgb[k + 1][j] - v) * local))
    stops.push([`rgb(${c[0]},${c[1]},${c[2]})`, i / n, (i + 1) / n])
  }
  return stops
}

/* ---------- Real moon phase (same math as the mockup) ---------- */

const SYNODIC = 29.530588853
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

/** 0 = new, 0.5 = full. */
export function moonPhase(date) {
  const days = (date.getTime() - NEW_MOON) / 86400000
  return (((days % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC
}

export function moonIllum(p) {
  return (1 - Math.cos(2 * Math.PI * p)) / 2
}

/** The lit part of a moon of radius r, centered on 0,0, as one path. */
export function litPath(p, r) {
  const rx = Math.abs(Math.cos(2 * Math.PI * p)) * r
  if (p < 0.5) {
    const t = p < 0.25 ? 0 : 1
    return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${t} 0 ${-r} Z`
  }
  const t = p < 0.75 ? 0 : 1
  return `M 0 ${-r} A ${r} ${r} 0 0 0 0 ${r} A ${rx} ${r} 0 0 ${t} 0 ${-r} Z`
}

/** Tonight's phase plus this week's seven (Monday first), each at 9 pm local. */
export function moonWeek(date) {
  const night = new Date(date)
  night.setHours(21, 0, 0, 0)
  const mon = new Date(night)
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  const week = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    d.setHours(21, 0, 0, 0)
    week.push({ p: moonPhase(d), today: d.toDateString() === night.toDateString() })
  }
  return { p: moonPhase(night), week }
}

/* ---------- Growing vine (placeVine in the mockup) ---------- */

export function vineCounts(streak) {
  const s = Math.max(0, Number(streak) || 0)
  return {
    grow: Math.min(1, 0.08 + s / 70),
    leaves: Math.min(70, Math.floor(4 + s * 0.75)),
    flowers: Math.min(14, Math.floor(Math.max(0, s - 8) / 7)),
  }
}

export function vineLayout(streak, w, h, r) {
  const s = Math.max(0, Number(streak) || 0)
  const L = rrLength(w, h, r)
  const { grow, leaves: nLeaves, flowers: nFlowers } = vineCounts(s)
  const usable = L * grow
  const at = (d) => rrPointAt(0, 0, w, h, r, d)
  const leaves = []
  for (let i = 0; i < nLeaves; i++) {
    const q = at(((i + 0.5) / nLeaves) * usable)
    const sgn = i % 3 !== 1 ? 1 : -1 // most leaves point outward, off the card
    const x = q.x + q.nx * 7 * sgn
    const y = q.y + q.ny * 7 * sgn
    leaves.push({ x, y, rot: q.ang * 57.3 + (sgn > 0 ? -90 : 90) + (i % 2 ? 25 : -25) })
  }
  const flowers = []
  for (let i = 0; i < nFlowers; i++) {
    const q = at(((i + 0.6) / nFlowers) * usable)
    flowers.push({ x: q.x + q.nx * 4, y: q.y + q.ny * 4, rot: i * 31, sz: Math.min(8, 5 + (s - 8 - i * 7) / 12) })
  }
  const tip = at(Math.max(0, usable - 1))
  return { length: L, usable, leaves, flowers, tip: { x: tip.x, y: tip.y } }
}

/* ---------- Tonight Ring ---------- */

export function ringProgress(answered, total) {
  const t = Number(total) || 0
  if (t <= 0) return 0
  return Math.max(0, Math.min(1, (Number(answered) || 0) / t))
}
