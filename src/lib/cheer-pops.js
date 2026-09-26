const ORIGINS = [
  [['50%', '42%']],
  [
    ['22%', '38%'],
    ['78%', '46%'],
  ],
  [
    ['50%', '22%'],
    ['18%', '52%'],
    ['82%', '50%'],
  ],
  [
    ['22%', '20%'],
    ['78%', '18%'],
    ['16%', '68%'],
    ['84%', '66%'],
  ],
  [
    ['50%', '16%'],
    ['14%', '32%'],
    ['86%', '30%'],
    ['12%', '72%'],
    ['88%', '70%'],
  ],
]

const DANCE_ORIGINS = [
  [['50%', '68%']],
  [
    ['24%', '68%'],
    ['76%', '70%'],
  ],
  [
    ['50%', '64%'],
    ['18%', '72%'],
    ['82%', '70%'],
  ],
  [
    ['16%', '68%'],
    ['38%', '71%'],
    ['62%', '66%'],
    ['84%', '70%'],
  ],
  [
    ['10%', '70%'],
    ['28%', '66%'],
    ['50%', '69%'],
    ['72%', '65%'],
    ['90%', '71%'],
  ],
]

const STAR_OFFSETS = [
  ['-3.2rem', '-3.6rem'],
  ['3rem', '-3.2rem'],
  ['0.4rem', '-4.2rem'],
  ['-2.4rem', '-2.2rem'],
  ['2.8rem', '-1.8rem'],
  ['-3.8rem', '-0.8rem'],
  ['1.8rem', '-4.4rem'],
  ['3.6rem', '-0.6rem'],
  ['-1.2rem', '-3rem'],
  ['3.4rem', '-2.8rem'],
  ['-2.6rem', '-4rem'],
  ['0.8rem', '-2rem'],
  ['3rem', '-3.8rem'],
  ['-3.4rem', '-2.6rem'],
  ['0rem', '-3.2rem'],
]

const CHEER_KINDS = [
  'lime',
  'tape',
  'paper',
  'boom',
  'night',
  'dance',
  'stamp',
  'rain',
  'check',
  'bubble',
  'spark',
  'flip',
  'confetti',
  'heart',
]

const GAP_MS = {
  lime: 90,
  tape: 130,
  paper: 200,
  boom: 140,
  night: 150,
  dance: 90,
  stamp: 140,
  rain: 120,
  check: 160,
  bubble: 140,
  spark: 110,
  flip: 160,
  confetti: 110,
  heart: 150,
}

const BASE_HOLD = {
  lime: 1050,
  tape: 1050,
  paper: 1450,
  boom: 1450,
  night: 1600,
  dance: 1850,
  stamp: 1150,
  rain: 2300,
  check: 1250,
  bubble: 1500,
  spark: 820,
  flip: 700,
  confetti: 1750,
  heart: 1900,
}

function stageN(stage) {
  return Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
}

function stageMul(stage) {
  return 0.65 + stageN(stage) * 0.28
}

function burstLevel(pop, stage) {
  return stageN(stage) + pop
}

function limeBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const scale = (2 + level * 0.55) * mul
  return [
    { id: `lime-r1-${pop}`, bloom: true, size: `${scale}rem`, delay: '0ms' },
    { id: `lime-r2-${pop}`, bloom: true, size: `${scale * 1.75}rem`, delay: '110ms' },
    { id: `lime-r3-${pop}`, bloom: true, size: `${scale * 2.8}rem`, delay: '220ms' },
    { id: `lime-p1-${pop}`, pip: true, delay: '40ms' },
    ...(level >= 3 ? [{ id: `lime-p2-${pop}`, pip: true, delay: '160ms' }] : []),
  ]
}

function tapeBurstBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const reach = `${Math.min(52, 24 + stageN(stage) * 6)}vw`
  const bits = [
    { id: 'tape-l', tape: true, side: 'left', y: '-36px', delay: '0ms', fat: level >= 4, reach },
    { id: 'tape-r', tape: true, side: 'right', y: '-16px', delay: '70ms', reach },
  ]
  if (level >= 2) {
    bits.push({ id: 'tape-l2', tape: true, side: 'left', y: '10px', delay: '120ms', reach })
  }
  if (level >= 3) {
    bits.push({ id: 'tape-r2', tape: true, side: 'right', y: '28px', delay: '170ms', fat: level >= 5, reach })
  }
  return bits
}

function sparkBurstBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const rays = 4 + level * 2
  const bits = [{ id: 'flash', sparkFlash: true, delay: '0ms' }]
  for (let i = 0; i < rays; i += 1) {
    bits.push({
      id: `spark-${i}`,
      spark: true,
      rot: `${(360 / rays) * i + (i % 2) * 9}deg`,
      len: `${(0.9 + (i % 4) * 0.3 + level * 0.08) * mul}rem`,
      delay: `${20 + (i % 6) * 26}ms`,
      tone: i % 3 === 0 ? 'gold' : i % 3 === 1 ? 'white' : 'lime',
    })
  }
  if (level >= 2) {
    bits.push({
      id: 'spark-ring',
      sparkRing: true,
      delay: '90ms',
      size: `${(1.8 + level * 0.35) * mul}rem`,
    })
  }
  if (level >= 4) {
    bits.push({
      id: 'spark-ring-2',
      sparkRing: true,
      delay: '180ms',
      size: `${(2.8 + level * 0.4) * mul}rem`,
    })
  }
  return bits
}

function flipBurstBits(pop, stage) {
  const level = burstLevel(pop, stage)
  return [{ id: `flip-${pop}`, flip: true, delay: '0ms', hops: Math.min(5, 1 + level) }]
}

function nightBurstBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const bits = []
  if (pop === 0) {
    bits.push({ id: 'veil', veil: true, screen: true, delay: '0ms' })
  }
  if (pop === 0 || stageN(stage) >= 3) {
    bits.push({ id: 'moon', moon: true, delay: '90ms', size: `${3.2 * mul}rem` })
  }
  const stars = 1 + Math.min(4, level)
  for (let i = 0; i < stars; i += 1) {
    const spot = STAR_OFFSETS[(pop * 4 + i) % STAR_OFFSETS.length]
    const scale = mul
    bits.push({
      id: `star-${i}`,
      star: true,
      x: spot[0],
      y: spot[1],
      size: `${0.28 * scale}rem`,
      delay: `${60 + i * 55}ms`,
    })
  }
  if (level >= 3 + pop) {
    bits.push({ id: 'shoot', shoot: true, delay: '320ms', len: `${4.2 * mul}rem` })
  }
  return bits
}

function rainBurstBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const count = Math.min(24, 8 + level * 4)
  // Drops stay under their cloud; more stages means more clouds, not one huge one.
  const cloud = Math.min(12, (4.5 + n * 1.4) * mul)
  const spread = cloud / 2 - 0.9
  const fall = `${Math.min(13, (3.5 + n * 1.3) * mul)}rem`
  const bits = Array.from({ length: count }, (_, i) => ({
    id: `drop-${i}`,
    drop: true,
    x: `${-spread + (i / Math.max(1, count - 1)) * spread * 2}rem`,
    len: `${(0.8 + (i % 3) * 0.3) * Math.min(mul, 1.4)}rem`,
    fall,
    delay: `${Math.round(((i * 8) % 29) / 29 * 760) + pop * 20}ms`,
    fat: i % 5 === 0 && level >= 3,
  }))
  // Phone only for now: the drops fall out of this.
  bits.push({ id: 'cloud', cloud: true, delay: '0ms', width: `${cloud}rem` })
  bits.push({
    id: 'puddle',
    puddle: true,
    delay: '850ms',
    fall,
    width: `${cloud * 0.85}rem`,
  })
  return bits
}

function bubbleBurstBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const count = 3 + level
  const spread = mul * (1.4 + n * 1.1)
  const rise = `${(5 + n * 2.8) * mul}rem`
  return Array.from({ length: count }, (_, i) => ({
    id: `bub-${i}`,
    bubble: true,
    x: `${-spread + (i / Math.max(1, count - 1)) * spread * 2}rem`,
    size: `${(1.3 + (i % 3) * 0.45 + level * 0.22) * mul}rem`,
    rise,
    delay: `${(i * 90) % 600 + pop * 25}ms`,
    drift: i % 2 === 0 ? `${-1.3 * mul}rem` : `${1.5 * mul}rem`,
  }))
}

function paperBurstBits(pop, stage) {
  const level = burstLevel(pop, stage)
  return [
    {
      id: `plane-${pop}`,
      plane: true,
      hop: Math.min(3, 1 + (level % 3)),
      delay: '0ms',
      from: pop % 2 === 0 ? 'left' : 'right',
      span: stageN(stage),
    },
  ]
}

function boomBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const streaks = Array.from({ length: 10 + level * 2 }, (_, i) => ({
    id: `streak-${pop}-${i}`,
    streak: true,
    rot: `${(360 / (10 + level * 2)) * i}deg`,
    delay: `${200 + (i % 4) * 24}ms`,
    len: `${(2.1 + (i % 5) * 0.3 + level * 0.1) * mul}rem`,
    tone: i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'gold' : 'lime',
  }))
  return [
    { id: `stem-${pop}`, stem: true, delay: '0ms', tall: `${3.4 * mul}rem` },
    { id: `ring-${pop}-a`, ring: true, delay: '180ms', tone: 'lime' },
    { id: `ring-${pop}-b`, ring: true, delay: '300ms', tone: 'gold' },
    ...(level >= 3 ? [{ id: `ring-${pop}-c`, ring: true, delay: '420ms', tone: 'blue' }] : []),
    ...streaks,
  ]
}

function danceBits(pop, stage) {
  const level = burstLevel(pop, stage)
  return [
    {
      id: `dance-${pop}`,
      dancer: true,
      hop: Math.min(3, 1 + (level % 3)),
      delay: `${pop * 40}ms`,
      scale: stageMul(stage),
    },
  ]
}

// 'ink' not 'white', so the paper still shows on a light theme.
const CONFETTI_TONES = ['on', 'gold', 'blue', 'ink']

function confettiBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const count = Math.min(22, 12 + level * 2)
  const reach = Math.min(7, (3.6 + n * 0.7) * mul)
  const peak = Math.min(5.5, (3.4 + n * 0.5) * mul)
  const fall = Math.min(14, (5 + n * 1.4) * mul)
  // Lean the fan toward the middle so edge pops stay on screen.
  const ox = Number.parseFloat(ORIGINS[n - 1][pop]?.[0]) || 50
  const lean = ((50 - ox) / 50) * reach * 0.6
  const piece = Math.max(1, Math.min(mul, 1.5))
  const bits = [{ id: 'puff', puff: true, delay: '0ms', size: `${1.3 * mul}rem` }]
  for (let i = 0; i < count; i += 1) {
    const side = count === 1 ? 0 : i / (count - 1) - 0.5
    const angle = side * 2.4 + (((i * 7) % 5) - 2) * 0.05
    const lift = 0.6 + ((i * 5) % 7) / 15
    const w = (0.45 + (i % 3) * 0.1) * piece
    bits.push({
      id: `conf-${i}`,
      confetti: true,
      x: `${(Math.sin(angle) * reach + lean).toFixed(2)}rem`,
      y: `${(-peak * lift).toFixed(2)}rem`,
      fall: `${(fall * (0.75 + ((i * 3) % 5) * 0.08)).toFixed(2)}rem`,
      rot: `${(i % 2 ? 1 : -1) * (320 + ((i * 53) % 280))}deg`,
      size: `${w.toFixed(2)}rem`,
      fat: i % 3 === 0,
      tone: CONFETTI_TONES[(i * 3) % CONFETTI_TONES.length],
      delay: `${70 + ((i * 29) % 90)}ms`,
    })
  }
  return bits
}

function heartBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  // Capped so an edge pop's 1.22 overshoot stays on a 390px screen.
  const size = Math.min(4.2, (2.8 + level * 0.15) * mul)
  const bits = [
    { id: 'heart', heart: true, delay: '0ms', size: `${size.toFixed(2)}rem` },
    // One ring per beat (the heart's keyframes beat at ~46% and ~72%).
    { id: 'beat-1', bloom: true, delay: '560ms', size: `${(size * 1.5).toFixed(2)}rem` },
    { id: 'beat-2', bloom: true, delay: '900ms', size: `${(size * 1.9).toFixed(2)}rem` },
  ]
  const minis = Math.min(6, level + 1)
  const dist = Math.min(5, (1.6 + level * 0.25) * mul)
  for (let i = 0; i < minis; i += 1) {
    const angle = (-150 + (i / Math.max(1, minis - 1)) * 120) * (Math.PI / 180)
    const far = dist * (0.8 + (i % 2) * 0.3)
    bits.push({
      id: `heart-bit-${i}`,
      heartBit: true,
      x: `${(Math.cos(angle) * far).toFixed(2)}rem`,
      y: `${(Math.sin(angle) * far).toFixed(2)}rem`,
      size: `${((0.55 + (i % 3) * 0.12) * Math.min(mul, 1.5)).toFixed(2)}rem`,
      tone: CONFETTI_TONES[i % 3],
      delay: `${920 + i * 45}ms`,
    })
  }
  return bits
}

const BURST_BUILDERS = {
  lime: limeBits,
  tape: tapeBurstBits,
  paper: paperBurstBits,
  boom: boomBits,
  night: nightBurstBits,
  dance: danceBits,
  stamp: (pop, stage) => [
    {
      id: `stamp-${pop}`,
      stamp: true,
      rot: `${-14 + pop * 8}deg`,
      delay: '0ms',
      scale: stageMul(stage),
    },
  ],
  rain: rainBurstBits,
  check: (pop, stage) => [{ id: `tick-${pop}`, tick: true, delay: '0ms', scale: stageMul(stage) }],
  bubble: bubbleBurstBits,
  spark: sparkBurstBits,
  flip: flipBurstBits,
  confetti: confettiBits,
  heart: heartBits,
}

function popsAtOrigins(origins, stage, buildBits, gapMs = 120) {
  return origins[stage - 1].map((spot, pop) => ({
    ox: spot[0],
    oy: spot[1],
    wait: `${pop * gapMs}ms`,
    bits: buildBits(pop, stage),
  }))
}

export function popsFor(kind, stage) {
  const n = stageN(stage)
  const build = BURST_BUILDERS[kind] || BURST_BUILDERS.lime
  const origins = kind === 'dance' ? DANCE_ORIGINS : ORIGINS
  const gap = GAP_MS[kind] ?? 120
  return popsAtOrigins(origins, n, build, gap)
}

export function holdFor(kind, stage, popCount) {
  const n = stageN(stage)
  const pops = stageN(popCount ?? n)
  const gap = GAP_MS[kind] ?? 100
  const base = BASE_HOLD[kind] ?? 1050
  return base + (pops - 1) * gap
}

export function cheerKinds() {
  return CHEER_KINDS
}
