// Accessories for the iPhone widget. WidgetKit there has no paths, only
// ovals, rectangles, lines and the widget's own triangle, so each accessory is
// rebuilt from those, close to its drawing in accessories.js. Parts use the
// widget's buddy format on the 48x58 grid:
//   e  [cx, cy, rx, ry, fill, rotate, opacity]   oval
//   t  [base x, base y, half width, height (+ up, - down), fill]
//   l  [x1, y1, x2, y2, colour, width]
//   r  [x, y, w, h, fill, corner radius, rotate]  rounded rectangle
//   o  [cx, cy, rx, ry, colour, line width]       ring
import { accessoryById, wornLayers } from './accessories.js'

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
