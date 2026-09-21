const ORIGINS = [
  [['50%', '42%']],
  [
    ['34%', '40%'],
    ['66%', '44%'],
  ],
  [
    ['50%', '30%'],
    ['32%', '52%'],
    ['68%', '50%'],
  ],
  [
    ['32%', '30%'],
    ['68%', '30%'],
    ['30%', '56%'],
    ['70%', '54%'],
  ],
  [
    ['50%', '28%'],
    ['28%', '40%'],
    ['72%', '38%'],
    ['34%', '60%'],
    ['66%', '62%'],
  ],
]

const DANCE_ORIGINS = [
  [['50%', '68%']],
  [
    ['36%', '68%'],
    ['64%', '70%'],
  ],
  [
    ['28%', '69%'],
    ['50%', '66%'],
    ['72%', '70%'],
  ],
  [
    ['22%', '68%'],
    ['40%', '71%'],
    ['60%', '66%'],
    ['78%', '70%'],
  ],
  [
    ['16%', '70%'],
    ['32%', '66%'],
    ['50%', '69%'],
    ['68%', '65%'],
    ['84%', '71%'],
  ],
]

const STAR_SPOTS = [
  ['18%', '22%'],
  ['78%', '18%'],
  ['62%', '30%'],
  ['28%', '36%'],
  ['88%', '40%'],
  ['12%', '48%'],
  ['42%', '16%'],
  ['70%', '52%'],
  ['34%', '58%'],
  ['84%', '62%'],
  ['8%', '32%'],
  ['54%', '64%'],
  ['92%', '26%'],
  ['22%', '70%'],
  ['48%', '24%'],
]

function limeBits(pop) {
  return [
    { id: `lime-r1-${pop}`, bloom: true, size: '2.4rem', delay: '0ms' },
    { id: `lime-r2-${pop}`, bloom: true, size: '4.4rem', delay: '110ms' },
    { id: `lime-r3-${pop}`, bloom: true, size: '7.2rem', delay: '220ms' },
    { id: `lime-p1-${pop}`, pip: true, delay: '40ms' },
    { id: `lime-p2-${pop}`, pip: true, delay: '160ms' },
  ]
}

function tapeBits(stage) {
  const n = 2 + stage * 2
  return Array.from({ length: n }, (_, i) => ({
    id: `tape-${i}`,
    tape: true,
    side: i % 2 === 0 ? 'left' : 'right',
    y: `${-90 + i * 22}px`,
    delay: `${i * 70}ms`,
    fat: i % 3 === 0,
  }))
}

function paperBits(stage) {
  return Array.from({ length: stage }, (_, i) => ({
    id: `plane-${i}`,
    plane: true,
    hop: (i % 3) + 1,
    delay: `${i * 160}ms`,
    from: i % 2 === 0 ? 'left' : 'right',
  }))
}

function sparkBits(stage) {
  const n = 6 + stage * 2
  const bits = [{ id: 'flash', sparkFlash: true, delay: '0ms' }]
  for (let i = 0; i < n; i += 1) {
    bits.push({
      id: `spark-${i}`,
      spark: true,
      rot: `${(360 / n) * i + (i % 2) * 9}deg`,
      len: `${1.1 + (i % 4) * 0.28}rem`,
      delay: `${30 + (i % 6) * 32}ms`,
      tone: i % 3 === 0 ? 'gold' : i % 3 === 1 ? 'white' : 'lime',
    })
  }
  if (stage >= 2) {
    bits.push({ id: 'spark-ring', sparkRing: true, delay: '120ms', size: '2.6rem' })
  }
  if (stage >= 4) {
    bits.push({ id: 'spark-ring-2', sparkRing: true, delay: '220ms', size: '4.2rem' })
  }
  return bits
}

function flipBits(stage) {
  return Array.from({ length: stage }, (_, i) => ({
    id: `flip-${i}`,
    flip: true,
    delay: `${i * 300}ms`,
    hops: 2,
  }))
}

function nightBits(stage) {
  const stars = STAR_SPOTS.slice(0, 4 + stage * 2).map((spot, i) => ({
    id: `star-${i}`,
    star: true,
    x: spot[0],
    y: spot[1],
    delay: `${80 + i * 70}ms`,
  }))
  const bits = [
    { id: 'veil', veil: true, delay: '0ms' },
    { id: 'moon', moon: true, delay: '120ms' },
    ...stars,
  ]
  if (stage >= 3) {
    bits.push({ id: 'shoot', shoot: true, delay: `${400 + stage * 80}ms` })
  }
  return bits
}

function rainBits(stage) {
  const n = 10 + stage * 7
  const drops = Array.from({ length: n }, (_, i) => ({
    id: `drop-${i}`,
    drop: true,
    x: `${3 + ((i * 19) % 94)}%`,
    len: `${1.1 + (i % 4) * 0.4}rem`,
    delay: `${(i * 38) % 720}ms`,
    fat: i % 6 === 0,
  }))
  return [...drops, { id: 'puddle', puddle: true, delay: '420ms' }]
}

function bubbleBits(stage) {
  const n = 3 + stage * 2
  return Array.from({ length: n }, (_, i) => ({
    id: `bub-${i}`,
    bubble: true,
    x: `${8 + ((i * 21) % 84)}%`,
    size: `${1.8 + (i % 4) * 0.75}rem`,
    delay: `${i * 150}ms`,
    drift: i % 2 === 0 ? '-1.6rem' : '1.8rem',
  }))
}

function bitsFor(kind, pop) {
  if (kind === 'dance') {
    return [
      {
        id: `dance-${pop}`,
        dancer: true,
        hop: (pop % 3) + 1,
        delay: `${pop * 70}ms`,
      },
    ]
  }
  if (kind === 'boom') {
    const streaks = Array.from({ length: 14 }, (_, i) => ({
      id: `streak-${pop}-${i}`,
      streak: true,
      rot: `${(360 / 14) * i}deg`,
      delay: `${220 + (i % 4) * 28}ms`,
      len: `${2.4 + (i % 5) * 0.35}rem`,
      tone: i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'gold' : 'lime',
    }))
    return [
      { id: `stem-${pop}`, stem: true, delay: '0ms' },
      { id: `ring-${pop}-a`, ring: true, delay: '200ms', tone: 'lime' },
      { id: `ring-${pop}-b`, ring: true, delay: '340ms', tone: 'gold' },
      { id: `ring-${pop}-c`, ring: true, delay: '480ms', tone: 'blue' },
      ...streaks,
    ]
  }
  return limeBits(pop)
}

export function popsFor(kind, stage) {
  const n = Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
  if (kind === 'spark') {
    return [{ ox: '50%', oy: '44%', wait: '0ms', bits: sparkBits(n) }]
  }
  if (kind === 'flip') {
    return [{ ox: '50%', oy: '52%', wait: '0ms', bits: flipBits(n) }]
  }
  if (kind === 'tape') {
    return [{ ox: '50%', oy: '46%', wait: '0ms', bits: tapeBits(n) }]
  }
  if (kind === 'paper') {
    return [{ ox: '50%', oy: '58%', wait: '0ms', bits: paperBits(n) }]
  }
  if (kind === 'night') {
    return [{ ox: '50%', oy: '42%', wait: '0ms', bits: nightBits(n) }]
  }
  if (kind === 'rain') {
    return [{ ox: '50%', oy: '0%', wait: '0ms', bits: rainBits(n) }]
  }
  if (kind === 'bubble') {
    return [{ ox: '50%', oy: '100%', wait: '0ms', bits: bubbleBits(n) }]
  }
  if (kind === 'stamp') {
    return ORIGINS[n - 1].map((spot, pop) => ({
      ox: spot[0],
      oy: spot[1],
      wait: `${pop * 140}ms`,
      bits: [
        {
          id: `stamp-${pop}`,
          stamp: true,
          rot: `${-14 + pop * 8}deg`,
          delay: '0ms',
        },
      ],
    }))
  }
  if (kind === 'check') {
    return ORIGINS[n - 1].map((spot, pop) => ({
      ox: spot[0],
      oy: spot[1],
      wait: `${pop * 160}ms`,
      bits: [{ id: `tick-${pop}`, tick: true, delay: '0ms' }],
    }))
  }
  const spots = kind === 'dance' ? DANCE_ORIGINS[n - 1] : ORIGINS[n - 1]
  return spots.map((spot, pop) => ({
    ox: spot[0],
    oy: spot[1],
    wait: `${pop * (kind === 'boom' ? 140 : 90)}ms`,
    bits: bitsFor(kind, pop),
  }))
}

export function holdFor(kind, pops) {
  if (kind === 'spark') return 900
  if (kind === 'flip') return 1320 + (pops - 1) * 300
  if (kind === 'night') return 2100
  if (kind === 'tape') return 1700
  if (kind === 'paper') return 2000
  if (kind === 'rain') return 1700
  if (kind === 'bubble') return 2100
  if (kind === 'stamp') return 1200 + (pops - 1) * 140
  if (kind === 'check') return 1300 + (pops - 1) * 160
  const extra = (pops - 1) * (kind === 'boom' ? 140 : 90)
  if (kind === 'dance') return 1900 + extra
  if (kind === 'boom') return 1500 + extra
  return 1100 + extra
}
