// Accessories for the iPhone widget. WidgetKit there has no paths, only
// ovals, rectangles, lines and the widget's own triangle, so each accessory is
// rebuilt from those, close to its drawing in accessories.js. Parts use the
// widget's buddy format on the 48x58 grid:
//   e  [cx, cy, rx, ry, fill, rotate, opacity]   oval
//   t  [base x, base y, half width, height (+ up, - down), fill]
//   l  [x1, y1, x2, y2, colour, width]
//   r  [x, y, w, h, fill, corner radius, rotate]  rounded rectangle
//   o  [cx, cy, rx, ry, colour, line width]       ring
import { BOPPER_SPRING, CONFETTI, HOLLY, HORN_FRINGE, PLANES, STREAMERS, accessoryById, curl, orbitRing, wornLayers } from './accessories.js'

const AT = {
  cat: { ex: [18, 30], ey: 28, er: 3.6, crown: 17, neck: 37, side: 13 },
  dog: { ex: [18, 30], ey: 27, er: 3.7, crown: 17, neck: 39.5, side: 14 },
  rabbit: { ex: [18, 30], ey: 29, er: 3.4, crown: 20, neck: 37.5, side: 12.5 },
  owl: { ex: [18, 30], ey: 28, er: 5, crown: 20, neck: 37, side: 13 },
  ant: { ex: [19.6, 28.4], ey: 19.8, er: 3.5, crown: 13.5, neck: 28.5, side: 8.5, back: 33 },
  possum: { ex: [19, 29], ey: 28, er: 4.2, crown: 19.5, neck: 40, side: 13 },
  frog: { ex: [16, 32], ey: 19, er: 5.4, crown: 16, neck: 38, side: 15, hat: { y: 13.2, scale: 1.3 } },
  penguin: { ex: [19.8, 28.2], ey: 26.5, er: 3.5, crown: 17, neck: 36.8, side: 14 },
  fox: { ex: [19.8, 28.2], ey: 27.5, er: 3.5, crown: 18, neck: 37, side: 14 },
  hive: { ex: [18, 30], ey: 27, er: 3.7, crown: 17, neck: 40, side: 14, hat: { y: 10, scale: 1 } },
  otter: { ex: [18, 30], ey: 27, er: 3.7, crown: 17, neck: 40, side: 15 },
  hedgehog: { ex: [18.5, 29.5], ey: 29, er: 3.6, crown: 16, neck: 40, side: 15 },
  panda: { ex: [18.2, 29.8], ey: 28, er: 4.4, crown: 17, neck: 39, side: 14 },
  duck: { ex: [18, 30], ey: 26, er: 3.7, crown: 17, neck: 40, side: 15 },
  axolotl: { ex: [18, 30], ey: 26, er: 4, crown: 13, neck: 38, side: 14.5 },
  turtle: { ex: [19.5, 28.5], ey: 25, er: 3.5, crown: 16, neck: 35, side: 11, back: 34 },
}

const INK = '#2d241c'
const CREAM = '#f7f5f0'
const GOLD = '#f5c542'
const DARK = '#24262c'

function shade(hex, f = 0.72) {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16)
  if (!Number.isFinite(n)) return hex
  const c = (v) => Math.max(0, Math.round(v * f)).toString(16).padStart(2, '0')
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`
}

const mid = (a) => a.back ?? (a.ey + a.neck) / 2
const hand = (a) => [24 + a.side + 2.5, a.neck + 1]

// Head items are drawn around (24, y) and grown for the frog.
function onHead(a, y0, parts) {
  const y = a.hat?.y ?? y0
  const k = a.hat?.scale ?? 1
  if (k === 1) return parts(y)
  const X = (x) => 24 + (x - 24) * k
  const Y = (v) => y + (v - y) * k
  return parts(y).map((p) => {
    const [kind, ...v] = p
    if (kind === 'e' || kind === 'o') return [kind, X(v[0]), Y(v[1]), v[2] * k, v[3] * k, ...v.slice(4, kind === 'o' ? 5 : 7), ...(kind === 'o' ? [v[5] * k] : [])]
    if (kind === 't') return [kind, X(v[0]), Y(v[1]), v[2] * k, v[3] * k, v[4]]
    if (kind === 'l') return [kind, X(v[0]), Y(v[1]), X(v[2]), Y(v[3]), v[4], v[5] * k]
    return [kind, X(v[0]), Y(v[1]), v[2] * k, v[3] * k, v[4], (v[5] || 0) * k, v[6] || 0]
  })
}

const heart = (x, y, s, fill) => [
  ['e', x - s * 0.45, y - s * 0.25, s * 0.55, s * 0.55, fill],
  ['e', x + s * 0.45, y - s * 0.25, s * 0.55, s * 0.55, fill],
  ['t', x, y + 0.05, s * 0.98, -s * 0.95, fill],
]
// Two triangles, one up and one down, read as a star at this size.
const star = (x, y, s, fill) => [
  ['t', x, y + s * 0.35, s * 0.9, s * 1.2, fill],
  ['t', x, y - s * 0.35, s * 0.9, -s * 1.2, fill],
]
const sparkle = (x, y, r, fill) => [
  ['e', x, y, r, r * 0.28, fill],
  ['e', x, y, r * 0.28, r, fill],
]

const SHAPES = {
  // ---- head
  beanie: (a, t) => onHead(a, a.crown + 1, (y) => [
    ['e', 24, y - 2, 9, 5.8, t],
    ['r', 14, y - 1.5, 20, 4, shade(t), 2],
    ['e', 24, y - 7.6, 2.6, 2.6, CREAM],
  ]),
  party: (a, t) => onHead(a, a.crown + 1.5, (y) => [
    ['t', 24, y, 5.5, 13, t],
    ['l', 21, y - 3.5, 27, y - 1.6, CREAM, 1.1],
    ['e', 24, y - 13.5, 1.9, 1.9, CREAM],
  ]),
  flower: (a, t) => onHead(a, a.crown + 2, (y) => [
    ...[0, 72, 144, 216, 288].map((d) => ['e', 16.5 + Math.cos(((d - 90) * Math.PI) / 180) * 3, y - 1.5 + Math.sin(((d - 90) * Math.PI) / 180) * 3, 2.5, 2.5, t]),
    ['e', 16.5, y - 1.5, 1.9, 1.9, GOLD],
  ]),
  hairbow: (a, t) => onHead(a, a.crown + 2, (y) => [
    ['e', 27.6, y - 1.5, 3.2, 2.4, t, -18],
    ['e', 33.4, y - 1.5, 3.2, 2.4, t, 18],
    ['e', 30.5, y - 1.5, 1.8, 1.8, shade(t)],
  ]),
  beret: (a, t) => onHead(a, a.crown + 1, (y) => [
    ['e', 22.5, y - 2.5, 10, 4, t, -10],
    ['r', 22, y - 8, 1.4, 2.6, shade(t), 0.7],
  ]),
  cap: (a, t) => onHead(a, a.crown + 1, (y) => [
    ['e', 33, y - 0.2, 6.5, 1.8, shade(t)],
    ['e', 24, y - 2, 8, 5.5, t],
    ['e', 24, y - 7, 1, 1, shade(t)],
  ]),
  bucket: (a, t) => onHead(a, a.crown + 1, (y) => [
    ['e', 24, y - 0.5, 12, 2.6, shade(t)],
    ['r', 18, y - 8, 12, 7.5, t, 2],
    ['r', 17.6, y - 3.6, 12.8, 1.4, shade(t, 0.55)],
  ]),
  crown: (a) => onHead(a, a.crown + 1, (y) => [
    ['t', 18.2, y - 2.5, 1.8, 4.2, GOLD],
    ['t', 24, y - 2.5, 2.3, 5.6, GOLD],
    ['t', 29.8, y - 2.5, 1.8, 4.2, GOLD],
    ['r', 16.5, y - 3, 15, 3, GOLD],
    ['e', 24, y - 1.6, 1.1, 1.1, '#e2463c'],
    ['e', 19.4, y - 1.6, 0.8, 0.8, '#4aa8ff'],
    ['e', 28.6, y - 1.6, 0.8, 0.8, '#4aa8ff'],
  ]),
  tophat: (a, t) => onHead(a, a.crown + 1, (y) => [
    ['r', 15, y - 2, 18, 2.6, DARK, 1.3],
    ['r', 18.5, y - 12, 11, 10.5, DARK, 1],
    ['r', 18.5, y - 4.6, 11, 2.2, t],
  ]),
  headphones: (a, t) => [
    ['l', 24 - a.side, a.ey - 1, 24 - a.side + 2.5, a.crown - 4, '#3a3f4b', 3],
    ['l', 24 - a.side + 2.5, a.crown - 4, 24 + a.side - 2.5, a.crown - 4, '#3a3f4b', 3],
    ['l', 24 + a.side - 2.5, a.crown - 4, 24 + a.side, a.ey - 1, '#3a3f4b', 3],
    ['r', 24 - a.side - 2.4, a.ey - 4, 4.8, 7, t, 2.2],
    ['r', 24 + a.side - 2.4, a.ey - 4, 4.8, 7, t, 2.2],
  ],
  halo: (a) => onHead(a, a.crown - 3, (y) => [['o', 24, y - 2, 8, 2.5, GOLD, 2.4]]),
  santa: (a) => onHead(a, a.crown + 1, (y) => [
    ['e', 24, y - 3, 8.5, 6, '#e2463c'],
    ['t', 30.5, y - 6, 3.5, -0.1, '#e2463c'],
    ['l', 28, y - 7, 33.5, y - 7.8, '#e2463c', 3.5],
    ['r', 14.5, y - 1.8, 19, 4, CREAM, 2],
    ['e', 34.2, y - 7.8, 2.3, 2.3, CREAM],
  ]),
  witch: (a, t) => onHead(a, a.crown + 1, (y) => [
    ['e', 24, y - 0.6, 12.5, 2.4, '#2a2440'],
    ['t', 24.5, y - 1, 6, 14, '#2a2440'],
    ['r', 18.6, y - 4, 11, 2, t],
  ]),
  antlers: (a) => onHead(a, a.crown + 1, (y) => [
    ...[-1, 1].flatMap((d) => {
      const X = (v) => 24 + d * (v - 24)
      return [
        ['l', X(19), y, X(16), y - 7, '#9a6538', 2.4],
        ['l', X(16.8), y - 4.8, X(13), y - 6.5, '#9a6538', 2.4],
        ['l', X(16), y - 7, X(14.5), y - 10, '#9a6538', 2.4],
        ['l', X(16), y - 7, X(18.5), y - 10, '#9a6538', 2.4],
      ]
    }),
  ]),
  // ---- eyes
  glasses: (a) => [
    ['o', a.ex[0], a.ey, a.er, a.er, INK, 1.2],
    ['o', a.ex[1], a.ey, a.er, a.er, INK, 1.2],
    ['l', a.ex[0] + a.er, a.ey - 0.8, a.ex[1] - a.er, a.ey - 0.8, INK, 1.2],
  ],
  shades: (a) => {
    const s = a.er + 0.6
    return [
      ...a.ex.map((x) => ['r', x - s, a.ey - s * 0.75, s * 2, s * 1.5, '#1b1d22', s * 0.6]),
      ['l', a.ex[0] + s, a.ey - 0.6, a.ex[1] - s, a.ey - 0.6, '#1b1d22', 1.2],
      ['r', a.ex[0] - s * 0.6, a.ey - s * 0.5, s * 0.7, 0.8, '#ffffff', 0.4],
    ]
  },
  heartglasses: (a, t) => {
    const s = a.er * 0.95
    return [
      ...heart(a.ex[0], a.ey, s, t),
      ...heart(a.ex[1], a.ey, s, t),
      ['l', a.ex[0] + s, a.ey - 0.4, a.ex[1] - s, a.ey - 0.4, shade(t), 1],
    ]
  },
  starglasses: (a) => a.ex.flatMap((x) => star(x, a.ey, a.er * 1.2, GOLD)),
  monocle: (a) => [
    ['o', a.ex[1], a.ey, a.er + 0.3, a.er + 0.3, GOLD, 1.8],
    ['l', a.ex[1] + a.er * 0.75, a.ey + a.er * 0.75, a.ex[1] + 2.5, a.ey + 12, GOLD, 1.1],
  ],
  glasses3d: (a) => {
    const [l, r] = a.ex
    const s = Math.min(a.er + 1, (r - l) / 2 - 0.7)
    const ry = s * 0.9
    return [
      ['r', l - s - 0.8, a.ey - ry - 0.8, s * 2 + 1.6, ry * 2 + 1.6, CREAM, 1.6],
      ['r', r - s - 0.8, a.ey - ry - 0.8, s * 2 + 1.6, ry * 2 + 1.6, CREAM, 1.6],
      ['r', l - s, a.ey - ry, s * 2, ry * 2, '#e2463c', 1],
      ['r', r - s, a.ey - ry, s * 2, ry * 2, '#2fb8e8', 1],
      ['r', l + s + 0.6, a.ey - 1.2, r - l - s * 2 - 1.2, 1.4, CREAM, 0],
      ['r', l - s + 1, a.ey - ry + 0.9, s * 0.7, 0.8, '#ffffff', 0.4],
    ]
  },
  // ---- back
  angelwings: (a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].flatMap((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return [
        ['e', X(8), y - 4, 7.5, 5.5, '#ffffff', d * -20],
        ['e', X(6), y + 1.5, 6, 3, '#ffffff', d * -10],
        ['e', X(9.5), y + 0.5, 3.5, 2.4, '#ffffff', d * -25],
        ['l', X(3), y - 2, X(12), y - 3, '#c9cfdb', 0.7],
      ]
    })
  },
  batwings: (a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].flatMap((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return [
        ['e', X(8.5), y - 2, 8.5, 5, '#5b4b8a', d * -15],
        ['t', X(16.5), y + 0.5, 1.6, -3.5, '#5b4b8a'],
        ['t', X(11.5), y + 1.5, 1.6, -3, '#5b4b8a'],
        ['t', X(6.5), y + 1.5, 1.6, -3, '#5b4b8a'],
        ['t', X(5.5), y - 9.6, 0.9, 2.4, '#2f2550'],
      ]
    })
  },
  butterfly: (a, t) => {
    const y = mid(a) - 1
    const x0 = a.side - 3
    const top = a.hat?.y ?? a.crown
    return [
      ...[-1, 1].flatMap((d) => {
        const X = (v) => 24 + d * (x0 + v)
        return [
          ['e', X(7.5), y - 6.5, 7, 5.5, t, d * -25],
          ['e', X(5), y + 3.5, 5, 3.6, shade(t), d * 20],
          ['e', X(9), y - 7, 2, 2, '#ffffff'],
          ['e', X(5.5), y - 4.5, 1.1, 1.1, INK],
        ]
      }),
      ['l', 21.5, top + 1, 17.5, top - 6, INK, 0.9],
      ['l', 26.5, top + 1, 30.5, top - 6, INK, 0.9],
      ['e', 17.5, top - 6, 1.1, 1.1, INK],
      ['e', 30.5, top - 6, 1.1, 1.1, INK],
    ]
  },
  fairy: (a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].flatMap((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return [
        ['e', X(7), y - 7, 4.5, 8, '#d9f0ff', d * 40, 0.9],
        ['e', X(5), y + 3.5, 4, 3, '#f1d9ff', d * -30, 0.9],
        ['e', X(9), y - 12.5, 0.9, 0.9, '#ffffff'],
      ]
    })
  },
  dragon: (a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].flatMap((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return [
        ['t', X(4), y - 6, 1.6, 3, '#3f9e6a'],
        ['t', X(8), y - 8.5, 1.6, 3.5, '#3f9e6a'],
        ['t', X(12), y - 11, 1.8, 4, '#3f9e6a'],
        ['e', X(9), y - 3, 9, 5.5, '#3f9e6a', d * -22],
        ['l', X(1), y - 2.5, X(14), y - 10, '#1f5e3c', 0.9],
        ['l', X(1), y - 2.5, X(15), y + 1.5, '#1f5e3c', 0.9],
        ['t', X(13), y - 13, 0.9, 2.6, GOLD],
      ]
    })
  },
  bee: (a) => {
    const y = mid(a) - 4
    const x0 = a.side - 4
    const top = a.hat?.y ?? a.crown
    return [
      ['e', 24 + a.side - 1, a.neck + 5, 3.4, 2, GOLD, 35],
      ['l', 24 + a.side - 2.4, a.neck + 3.8, 24 + a.side - 3.2, a.neck + 5.8, INK, 1],
      ...[-1, 1].flatMap((d) => {
        const X = (v) => 24 + d * (x0 + v)
        return [
          ['e', X(6), y - 5, 6, 4, '#eef6ff', d * -35, 0.9],
          ['e', X(5.5), y + 0.5, 4.3, 2.8, '#eef6ff', d * -15, 0.9],
          ['l', X(1), y - 2, X(9.5), y - 8.5, INK, 0.45],
        ]
      }),
      ['l', 21.5, top + 1, 18.5, top - 6.5, INK, 0.9],
      ['l', 26.5, top + 1, 29.5, top - 6.5, INK, 0.9],
      ['e', 18.5, top - 6.5, 1.3, 1.3, GOLD],
      ['e', 29.5, top - 6.5, 1.3, 1.3, GOLD],
    ]
  },
  rainbow: (a) => {
    const y = mid(a) + 4
    return [['#e2463c', 23], ['#f5a623', 20.6], ['#7cc65a', 18.2], ['#4a9be8', 15.8]].flatMap(([c, r]) =>
      Array.from({ length: 12 }, (_, i) => {
        const p = (k) => [24 - Math.cos((Math.PI * k) / 12) * r, y - Math.sin((Math.PI * k) / 12) * r]
        const [x1, y1] = p(i)
        const [x2, y2] = p(i + 1)
        return ['l', x1, y1, x2, y2, c, 2.8]
      }))
  },
  // ---- held
  balloon: (a, t) => {
    const [x, y] = hand(a)
    return [
      ['l', x, y, x + 1, y - 15, '#d8d2c4', 0.6],
      ['e', x + 1, y - 20, 4.6, 5.4, t],
      ['t', x + 1, y - 14.4, 1.2, 1.2, shade(t)],
      ['e', x - 0.6, y - 22, 1.2, 1.8, '#ffffff', 0, 0.55],
    ]
  },
  flag: (a, t) => {
    const [x, y] = hand(a)
    return [
      ['r', x - 0.5, y - 14, 1.1, 16, '#9a6538', 0.5],
      ['e', x + 4.6, y - 11, 4.2, 2.8, t],
      ['t', x + 0.6, y - 11, 0.1, 3, t],
    ]
  },
  umbrella: (a, t) => {
    const [x, y] = hand(a)
    return [
      ['l', x, y - 15, x, y + 1, '#3a3f4b', 1.1],
      ['l', x, y + 1, x - 2, y + 3, '#3a3f4b', 1.1],
      ['e', x, y - 18.5, 9, 4.6, t],
      ...[-6, 0, 6].map((dx) => ['e', x + dx, y - 14.6, 3, 1.1, t]),
    ]
  },
  icecream: (a, t) => {
    const [x, y] = hand(a)
    return [
      ['t', x, y - 8.5, 3.6, -11, '#e0a860'],
      ['l', x - 2.2, y - 6.2, x + 1.3, y - 1, '#a8702f', 0.7],
      ['l', x + 2.2, y - 6.2, x - 1.3, y - 1, '#a8702f', 0.7],
      ['e', x, y - 9, 4.8, 2.2, CREAM],
      ['e', x, y - 13, 4, 4, t],
      ['e', x - 1.4, y - 14.2, 1, 1.5, '#ffffff', 0, 0.5],
      ['l', x + 0.6, y - 18.4, x + 2.6, y - 21.2, '#3f8a3a', 0.8],
      ['e', x + 0.6, y - 17.4, 1.6, 1.6, '#e2463c'],
    ]
  },
  cocoa: (a, t) => {
    const [x, y] = hand(a)
    return [
      ['o', x + 4.5, y - 2.7, 1.8, 2.2, t, 1.3],
      ['r', x - 3, y - 6, 7, 8, t, 1.6],
      ['r', x - 2.4, y - 5.6, 5.8, 1.4, '#6b4a32', 0.7],
      ['l', x - 0.8, y - 8, x - 1.4, y - 11.5, '#ffffff', 0.8],
      ['l', x + 1.8, y - 8, x + 2.4, y - 11.5, '#ffffff', 0.8],
    ]
  },
  sparkler: (a) => {
    const [x, y] = hand(a)
    return [['l', x, y + 1, x + 3, y - 12, '#8a8f99', 1], ...star(x + 3.2, y - 13, 3.8, GOLD), ['e', x + 3.2, y - 13, 1.2, 1.2, '#ffffff']]
  },
  // ---- around
  hearts: (a, t) => [[-19, -5, 2.6], [19, -11, 3.2], [18, 5, 2.2]].flatMap(([dx, dy, k]) => heart(24 + dx, a.ey + dy, k * 1.1, t)),
  sparkles: (a) => [[-19, -7, 3.6], [19, -1, 3], [-17, 9, 2.4], [16, -15, 2.4]].flatMap(([dx, dy, r]) => sparkle(24 + dx, a.ey + dy, r, GOLD)),
  snow: (a) => [[-20, -11], [-19, 2], [19, -13], [20, 0], [-18, 13], [18, 11], [9, -20], [-7, -21]].map(([dx, dy], i) =>
    ['e', 24 + dx, a.ey + dy, i % 3 ? 1.3 : 1.8, i % 3 ? 1.3 : 1.8, '#ffffff']),
  bubbles: (a) => [[-20, -9, 3.4], [20, -5, 2.6], [-18, 8, 2.2], [17, 10, 1.7]].flatMap(([dx, dy, r]) => [
    ['e', 24 + dx, a.ey + dy, r, r, '#bfe6ff'],
    ['e', 24 + dx - r * 0.35, a.ey + dy - r * 0.35, r * 0.3, r * 0.3, '#ffffff'],
  ]),
  // Blades as turned bars round a pin, close to the drawn pinwheel.
  pinwheel: (a) => {
    const [x, y] = hand(a)
    const cx = x + 0.5
    const cy = y - 15
    const s = 5.4
    const blades = ['#e2463c', '#f5c542', '#4a9be8', '#7cc65a']
    return [
      ['r', x - 0.55, cy, 1.1, y + 3 - cy, '#9a6538', 0.5],
      ...blades.map((c, k) => {
        const th = ((k * 90 + 12 + 22) * Math.PI) / 180
        const bx = cx + Math.sin(th) * s * 0.55
        const by = cy - Math.cos(th) * s * 0.55
        return ['r', bx - s * 0.5, by - s * 0.3, s, s * 0.6, c, 0.6, k * 90 + 12 + 22]
      }),
      ['e', cx, cy, 1.4, 1.4, CREAM],
      ['e', cx, cy, 0.55, 0.55, INK],
    ]
  },
  goggles: (a, t) => {
    const [l, r] = a.ex
    const s = Math.min(a.er + 1.2, 6.4)
    const x0 = l - s - 1.2
    const x1 = r + s + 1.2
    const y0 = a.ey - s * 0.95
    const y1 = a.ey + s * 0.95
    const reach = Math.max(a.side + 2, x1 - 24 + 2.5)
    const band = (y1 - y0) / 2 - 1.2
    return [
      ['r', 24 - reach, a.ey - 1.5, reach * 2, 3, t, 1],
      ['r', x0, y0, x1 - x0, y1 - y0, '#2b2f38', (y1 - y0) * 0.42],
      ['r', x0 + 1.2, y0 + 1.2, x1 - x0 - 2.4, y1 - y0 - 2.4, '#ff7a3d', (y1 - y0 - 2.4) * 0.42],
      ['r', x0 + 1.2, y0 + 1.2, x1 - x0 - 2.4, band, '#ffc94a', band * 0.8],
      ['l', l + s * 0.15, y0 + 1.9, l - s * 0.45, y1 - 2.1, '#ffffff', 1.2],
    ]
  },
  // Puffs round each muff give the same scalloped edge; the band's curve is
  // four straight pieces.
  earmuffs: (a, t) => {
    const sx = a.side - 0.5
    const my = a.ey - 2.5
    const R = 4.8
    const top = (a.hat?.y ?? a.crown) - 8
    const y0 = my - R + 1
    const bez = (k) => {
      const u = 1 - k
      return [24 - sx + 2 * sx * (3 * u * k * k + k * k * k), (u * u * u + k * k * k) * y0 + 3 * u * k * top]
    }
    const muff = (cx) => [
      ...Array.from({ length: 10 }, (_, i) => {
        const th = (i * Math.PI) / 5
        return ['e', cx + Math.cos(th) * (R - 1.3), my + Math.sin(th) * (R - 1.3), 1.45, 1.45, '#f4a6c6']
      }),
      ['e', cx, my, R - 1, R - 1, '#f4a6c6'],
      ['e', cx - 1.1, my - 1.2, 1.4, 1.1, '#ffcfe1'],
    ]
    return [
      ...[0, 1, 2, 3, 4, 5].map((i) => ['l', ...bez(i / 6), ...bez((i + 1) / 6), t, 1.3]),
      ...muff(24 - sx),
      ...muff(24 + sx),
    ]
  },
  snowglobe: (a) => {
    const [x, y] = hand(a)
    const cx = x + 0.5
    const R = 5.2
    const gy = y - 9.2
    return [
      ['e', cx, gy, R, R, '#d3ecff'],
      ['e', cx, gy + 3.3, 3.9, 1.7, '#ffffff'],
      ['r', cx - 0.45, gy + 0.6, 0.9, 1.6, '#8a5a32', 0.2],
      ['t', cx, gy - 1, 1.7, 2.8, '#3f9e6a'],
      ['t', cx, gy + 1, 2.4, 3.4, '#3f9e6a'],
      ['e', cx, gy - 3.9, 0.6, 0.6, GOLD],
      ...[[-3, -2], [2.6, -2.8], [-2.2, 0.6], [3, 0.2], [-0.8, -4.4], [1.6, -4]].map(([dx, dy]) => ['e', cx + dx, gy + dy, 0.42, 0.42, '#ffffff']),
      ['l', cx - 3.7, gy - 1.2, cx - 1.4, gy - 3.8, '#ffffff', 0.8],
      ['r', cx - 4.7, gy + R - 1.2, 9.4, 4.6, '#b23a3a', 1],
      ['r', cx - 4.6, gy + R + 0.4, 9.2, 1.1, GOLD, 0.3],
    ]
  },
  fairylights: (a) => {
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
    return [
      ...pts.slice(1).flatMap(([x2, y2], i) => {
        const [x1, y1] = pts[i]
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2 + 1.5
        return [['l', x1, y1, mx, my, '#2f5d3a', 0.7], ['l', mx, my, x2, y2, '#2f5d3a', 0.7]]
      }),
      ...pts.flatMap(([px, py, th], i) => {
        const dx = Math.cos(th)
        const dy = -Math.sin(th) + 1.2
        const len = Math.hypot(dx, dy)
        const ux = dx / len
        const uy = dy / len
        const turn = (Math.atan2(-dx, dy) * 180) / Math.PI
        return [
          ['r', px + ux * 0.35 - 0.85, py + uy * 0.35 - 0.65, 1.7, 1.3, '#2f5d3a', 0.3, turn],
          ['e', px + ux * 2.6, py + uy * 2.6, 1.35, 1.95, bulbs[i % bulbs.length], turn],
        ]
      }),
    ]
  },
  candycane: (a) => {
    const [x, y] = hand(a)
    const r = 2.5
    const top = y - 11.5
    const cx = x + r
    const P = (deg, rr = r) => [cx + Math.cos((deg * Math.PI) / 180) * rr, top - Math.sin((deg * Math.PI) / 180) * rr]
    const path = [[x, y + 2.5], [x, top], P(135), P(90), P(45), [x + r * 2, top], [x + r * 2, top + 2.4]]
    const tube = (c, w) => [
      ...path.slice(1).map((p, i) => ['l', ...path[i], ...p, c, w]),
      ...path.slice(1, -1).map(([px, py]) => ['e', px, py, w / 2, w / 2, c]),
    ]
    return [
      ...tube('#c8303a', 3.2),
      ...tube('#ffffff', 2.1),
      ...[0, 1, 2, 3, 4].map((i) => ['l', x - 1, y + 0.6 - i * 2.6 + 0.75, x + 1, y + 0.6 - i * 2.6 - 0.75, '#e2463c', 0.95]),
      ...[150, 90, 30].map((deg) => ['l', ...P(deg + 14, r - 1), ...P(deg - 14, r + 1), '#e2463c', 0.95]),
    ]
  },
  pixelshades: (a) => {
    const [l, r] = a.ex
    const half = Math.min(a.er + 1.2, (r - l) / 2 - 0.6)
    const p = (half * 2) / 5
    const y0 = a.ey - p * 1.7
    const px = (x, y, w, ht, fill = '#141518') => ['r', x, y, w + 0.04, ht + 0.04, fill, 0]
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
  // Fewer points per loop than the drawing; they are tiny on the widget.
  streamers: (a) => [
    ...STREAMERS.flatMap(([dx, dy, ang, c, turns]) => {
      const pts = curl(24 + dx, a.ey + dy, ang, 5, turns)
      return pts.slice(1).map((p, i) => ['l', ...pts[i], ...p, c, 1.5])
    }),
    ...CONFETTI.map(([dx, dy, c, turn]) => ['r', 24 + dx - 1.1, a.ey + dy - 0.6, 2.2, 1.2, c, 0.3, turn]),
  ],
  propeller: (a, t) => onHead(a, a.crown + 1, (y) => {
    const hub = y - 10.4
    const tl = (-8 * Math.PI) / 180
    return [
      ['r', 15, y - 6.75, 18, 8, '#4a9be8', 4],
      ['e', 24, y - 2.7, 4.4, 4.05, GOLD],
      ['e', 24, y - 2.7, 1.7, 4.05, '#e2463c'],
      ['r', 14.5, y - 1.8, 19, 3, t, 1.5],
      ['r', 23.3, hub, 1.4, 4, '#3a3f4b', 0.5],
      ['e', 24 - 4.4 * Math.cos(tl), hub - 4.4 * Math.sin(tl), 4.2, 1.25, '#e2463c', -8],
      ['e', 24 + 4.4 * Math.cos(tl), hub + 4.4 * Math.sin(tl), 4.2, 1.25, '#e2463c', -8],
      ['e', 24, hub, 1.3, 1.3, GOLD],
    ]
  }),
  kite: (a) => {
    const [x, y] = hand(a)
    const kx = x + 4.5
    const ky = y - 23
    const w = 4.6
    const up = 4.8
    const dn = 8
    // The string's curve in three pieces.
    const s = (k) => [(1 - k) ** 2 * x + 2 * k * (1 - k) * (kx + 2) + k * k * kx, (1 - k) ** 2 * y + 2 * k * (1 - k) * (y - 4) + k * k * ky]
    const tail = [[kx, ky + dn], [kx - 2.2, ky + dn + 2.6], [kx - 1.2, ky + dn + 6.6], [kx - 3, ky + dn + 9]]
    const bow = (bx, by, c) => [['e', bx - 1.1, by, 1.1, 0.75, c], ['e', bx + 1.1, by, 1.1, 0.75, c]]
    return [
      ...[0, 1, 2].map((i) => ['l', ...s(i / 3), ...s((i + 1) / 3), '#7d8696', 0.5]),
      ...tail.slice(1).map((p, i) => ['l', ...tail[i], ...p, '#3a3f4b', 0.6]),
      ['t', kx, ky, w, up, '#e2463c'],
      ['t', kx, ky, w, -dn, GOLD],
      ['l', kx, ky - up, kx, ky + dn, '#6b4a32', 0.55],
      ['l', kx - w, ky, kx + w, ky, '#6b4a32', 0.55],
      ...bow(kx - 2.2, ky + dn + 2.6, '#4a9be8'),
      ...bow(kx - 1.2, ky + dn + 6.6, '#f07ac0'),
    ]
  },
  dragonfly: (a) => {
    const y = mid(a) - 3
    const x0 = a.side - 4
    const wing = (L, w, dy, ang) => [-1, 1].flatMap((d) => {
      const th = (ang * Math.PI) / 180
      const P = (u, v) => [24 + d * (x0 + u * Math.cos(th) - v * Math.sin(th)), y + dy + u * Math.sin(th) + v * Math.cos(th)]
      return [
        ['e', ...P(L / 2, -w * 0.1), L / 2, w * 0.85, '#e6f4ff', d * ang, 0.9],
        ['l', ...P(0.5, -w * 0.55), ...P(L * 0.8, -w * 0.8), '#5f84ad', 0.5],
        ['l', ...P(0.4, -0.1), ...P(L - 1, -w * 0.1), '#8fb6dc', 0.4],
        ['e', ...P(L * 0.84, -w * 0.68), 1.1, 0.45, '#3a4a63', d * ang],
      ]
    })
    return [...wing(15.5, 2.3, 1.6, 12), ...wing(18, 2.6, -1.6, -14)]
  },
  orbit: (a) => {
    const ring = orbitRing(a)
    const [mx, my] = ring.at(Math.PI - 0.5)
    return [
      ...ring.arcs(12).flatMap((pts) => pts.slice(1).map((p, i) => ['l', ...pts[i], ...p, GOLD, 1])),
      ['e', mx, my, 2.8, 2.8, '#ece6d6'],
      ['e', mx - 0.9, my - 0.6, 0.7, 0.7, '#cbc2aa'],
      ['e', mx + 0.9, my + 0.8, 0.5, 0.5, '#cbc2aa'],
      ['e', mx + 0.7, my - 1.3, 0.35, 0.35, '#cbc2aa'],
    ]
  },
  // Shards as triangles over an oval, with the facet lines.
  icewings: (a) => {
    const y = mid(a) - 2
    const x0 = a.side - 3
    return [-1, 1].flatMap((d) => {
      const X = (v) => 24 + d * (x0 + v)
      return [
        ['e', X(8.5), y - 1, 8.5, 4, '#a9d8f5', d * -12],
        ['t', X(6.5), y - 4, 3, 8, '#a9d8f5'],
        ['t', X(13.5), y - 3.5, 3, 11, '#a9d8f5'],
        ['t', X(10.5), y + 1, 2.4, -5.5, '#a9d8f5'],
        ['t', X(7), y - 2, 2.4, 6.5, '#e3f4ff'],
        ...[[6, -11], [14.6, -13.6], [16.4, -2], [11.6, 5.6]].map(([u, v]) => ['l', X(0.6), y, X(u), y + v, '#ffffff', 0.6]),
      ]
    })
  },
  // Leaves as pointed ovals, berries as dots.
  holly: (a) => HOLLY.flatMap(([dx, dy, k, turn]) => {
    const th = (turn * Math.PI) / 180
    const P = (u, v) => [24 + dx + (u * Math.cos(th) - v * Math.sin(th)) * k, a.ey + dy + (u * Math.sin(th) + v * Math.cos(th)) * k]
    return [
      ['e', ...P(-3.8, -0.4), 3.9 * k, 1.6 * k, '#2f8a4a', turn - 6],
      ['e', ...P(3.8, -0.4), 3.9 * k, 1.6 * k, '#3fa45c', turn + 6],
      ...[[0, 0.6], [-1.3, 1.8], [1.3, 1.8]].map(([u, v]) => ['e', ...P(u, v), 1.15 * k, 1.15 * k, '#d83a3a']),
    ]
  }),
  elfhat: (a) => onHead(a, a.crown + 1, (y) => [
    ['e', 23.5, y - 2.6, 8.2, 5.6, '#3f9e6a'],
    ['r', 26.5, y - 11.4, 4.2, 7.5, '#3f9e6a', 2, 55],
    ['r', 14.5, y - 1.6, 19, 3.2, '#e2463c', 0.4],
    ...[17, 22, 27, 32].map((x) => ['t', x, y - 1.5, 2.4, 2.1, '#e2463c']),
    ['e', 35, y - 7.8, 1.7, 1.7, GOLD],
  ]),
  peppermint: (a) => {
    const [l, r] = a.ex
    const R = Math.min(a.er + 0.8, (r - l) / 2 - 0.4)
    return [
      ['l', l + R, a.ey - 0.8, r - R, a.ey - 0.8, '#c8303a', 1.1],
      ...[l, r].flatMap((c) => [
        ['e', c, a.ey, R, R, '#ffffff'],
        ...[25, 145, 265].map((deg) => ['e', c + Math.cos((deg * Math.PI) / 180) * R * 0.5, a.ey + Math.sin((deg * Math.PI) / 180) * R * 0.5, R * 0.5, R * 0.24, '#e2463c', deg + 20]),
        ['o', c, a.ey, R, R, '#c8303a', 0.8],
      ]),
    ]
  },
  tiara: (a) => onHead(a, a.crown + 1, (y) => [
    ['t', 18.9, y - 1.4, 1.9, 3.6, '#d9dde6'],
    ['t', 24, y - 1.4, 3.2, 7.4, '#d9dde6'],
    ['t', 29.1, y - 1.4, 1.9, 3.6, '#d9dde6'],
    ['r', 16.6, y - 1.8, 14.8, 1.8, '#c3c9d6', 0.9],
    ['e', 24, y - 5.4, 1.1, 1.8, '#f07ac0'],
    ['e', 18.8, y - 3.1, 0.65, 0.65, '#7fd6ff'],
    ['e', 29.2, y - 3.1, 0.65, 0.65, '#7fd6ff'],
  ]),
  // The cone as a turned bar; the fringe as lines.
  horn: (a) => {
    const [x, y] = hand(a)
    const th = (18 * Math.PI) / 180
    const P = (u, v) => [x + u * Math.cos(th) - v * Math.sin(th), y + u * Math.sin(th) + v * Math.cos(th)]
    const [cx, cy] = P(0, -6.4)
    return [
      ['r', ...P(-0.9, -1), 1.8, 2.6, '#3a3f4b', 0.6, 18],
      ['r', cx - 1.9, cy - 5.6, 3.8, 11.2, GOLD, 1.2, 18],
      ['l', ...P(-1.2, -3.2), ...P(1.6, -5.4), '#e2463c', 0.9],
      ['l', ...P(-1.8, -6.8), ...P(2.2, -9.6), '#e2463c', 0.9],
      ['e', ...P(0, -12), 3.1, 1.1, shade(GOLD, 0.8), 18],
      ...HORN_FRINGE.map(([u, v, c]) => ['l', ...P(u, -12.6), ...P(v, -16), c, 0.8]),
    ]
  },
  cateye: (a, t) => {
    const l = a.ex[0]
    const s = Math.min(a.er + 0.9, (a.ex[1] - a.ex[0]) / 2 - 0.3)
    const y = a.ey
    return [
      ['l', l + s, y - 0.6, 48 - l - s, y - 0.6, t, 1.1],
      ...[1, -1].flatMap((d) => {
        const X = (v) => 24 + d * (v - 24)
        return [
          ['e', X(l), y, s, s * 0.88, t],
          ['e', X(l - s * 1.05), y - s * 0.75, s * 0.75, s * 0.32, t, d * 40],
          ['e', X(l), y, s * 0.74, s * 0.6, '#22252c'],
          ['e', X(l - s * 1.25), y - s * 0.95, 0.6, 0.6, '#ffffff'],
        ]
      }),
    ]
  },
  planes: (a) => PLANES.flatMap(([dx, dy, turn, k, flip]) => {
    const th = (turn * Math.PI) / 180
    const f = flip ? -1 : 1
    const P = (u, v) => [24 + dx + f * (u * Math.cos(th) - v * Math.sin(th)) * k, a.ey + dy + (u * Math.sin(th) + v * Math.cos(th)) * k]
    return [
      ['e', ...P(0.4, -1), 3.9 * k, 1.2 * k, '#ffffff', f * (turn + 18)],
      ['e', ...P(0.6, 0.7), 3.4 * k, 0.9 * k, '#cdd6e4', f * (turn - 14)],
      ['e', ...P(-5.6, 0.6), 0.5 * k, 0.5 * k, '#8fb6dc'],
      ['e', ...P(-7.6, 1.4), 0.4 * k, 0.4 * k, '#8fb6dc'],
    ]
  }),
  boppers: (a, t) => onHead(a, a.crown + 1, (y) => {
    const band = (k) => [15.5 + 17 * k, (1 - k) ** 2 * (y + 1.5) + 2 * k * (1 - k) * (y - 5.5) + k * k * (y + 1.5)]
    return [
      ...[-1, 1].flatMap((d) => BOPPER_SPRING.slice(1).map(([u, v], i) => ['l', 24 + d * BOPPER_SPRING[i][0], y + BOPPER_SPRING[i][1], 24 + d * u, y + v, '#3a3f4b', 0.7])),
      ...[0, 1, 2, 3].map((i) => ['l', ...band(i / 4), ...band((i + 1) / 4), t, 1.5]),
      ...star(18.8, y - 12, 2.4, GOLD),
      ...star(29.2, y - 12, 2.4, '#f07ac0'),
    ]
  }),
  lantern: (a) => {
    const [x, y] = hand(a)
    const cx = x + 1
    const cy = y - 9.5
    return [
      ['l', x - 2, y + 2, cx, y - 20, '#9a6538', 0.9],
      ['l', cx, y - 19.6, cx, cy - 5.6, '#6b4a32', 0.5],
      ...[-0.9, 0, 0.9].map((u) => ['l', cx + u, cy + 4.6, cx + u, cy + (u ? 8 : 8.6), GOLD, 0.6]),
      ['e', cx, cy, 4.6, 4.6, '#e2463c'],
      ['e', cx, cy, 2.4, 4.4, '#b23030'],
      ['e', cx, cy, 1.8, 4.2, '#e2463c'],
      ['r', cx - 2.6, cy - 5.6, 5.2, 1.6, GOLD, 0.5],
      ['r', cx - 2.6, cy + 3.9, 5.2, 1.6, GOLD, 0.5],
    ]
  },
  raincloud: (a) => {
    const y = (a.hat?.y ?? a.crown) - 9
    return [
      ['e', 20, y, 4.5, 3.4, '#c7ccd6'],
      ['e', 25.5, y - 1.6, 5.2, 4.2, '#d6dae2'],
      ['e', 30, y + 0.6, 3.8, 2.9, '#c7ccd6'],
      ...[19, 24, 29].map((x) => ['l', x, y + 4, x - 0.8, y + 6.4, '#4aa8ff', 1.1]),
    ]
  },
  notes: (a, t) => [[-20, -6, 1.3], [19, -12, 1.1], [19, 4, 0.95]].flatMap(([dx, dy, k]) => {
    const x = 24 + dx
    const y = a.ey + dy
    return [
      ['e', x, y + 3 * k, 2 * k, 1.5 * k, t, -20],
      ['l', x + 1.8 * k, y + 3 * k, x + 1.8 * k, y - 4 * k, t, 0.9 * k],
      ['l', x + 1.8 * k, y - 4 * k, x + 4 * k, y - 1.5 * k, t, 0.9 * k],
    ]
  }),
}

// Every part again, a little bigger and in the rim colour, underneath.
function rimmed(parts, color, g) {
  const rim = parts.map((p) => {
    const [kind, a, b, c, d, , f, h] = p
    if (kind === 'e') return ['e', a, b, c + g, d + g, color, f || 0]
    if (kind === 't') return ['t', a, b + (d > 0 ? g * 0.6 : -g * 0.6), c + g * 1.2, d + (d > 0 ? g * 1.8 : -g * 1.8), color]
    if (kind === 'l') return ['l', a, b, c, d, color, (Number(f) || 0) + g * 2]
    if (kind === 'o') return ['o', a, b, c, d, color, (Number(f) || 0) + g * 2]
    return ['r', a - g, b - g, c + g * 2, d + g * 2, color, (f || 0) + g, h || 0]
  })
  return [...rim, ...parts]
}

const LIGHT_RIM = new Set(['back', 'held', 'around'])

export function accessoryShapes(id, buddyId, tone = '#c9f24d') {
  const item = accessoryById(id)
  const a = AT[buddyId]
  const make = SHAPES[id]
  if (!item || !a || !make) return []
  const light = LIGHT_RIM.has(item.slot)
  return rimmed(make(a, tone), light ? '#f4f6fa' : '#1f1a16', light ? 0.7 : 0.6)
}

export function wornShapes(worn, buddyId, tone) {
  const { behind, front } = wornLayers(worn)
  return {
    behind: behind.flatMap((id) => accessoryShapes(id, buddyId, tone)),
    front: front.flatMap((id) => accessoryShapes(id, buddyId, tone)),
  }
}

export const SHAPED_ACCESSORIES = Object.keys(SHAPES)
