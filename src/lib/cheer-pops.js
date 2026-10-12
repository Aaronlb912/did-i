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
  'launch',
  'medal',
  'sun',
  'leaves',
  'lantern',
  'gift',
  'popcorn',
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
  launch: 200,
  medal: 150,
  sun: 130,
  leaves: 110,
  lantern: 160,
  gift: 150,
  popcorn: 100,
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
  launch: 2300,
  medal: 1850,
  sun: 1800,
  leaves: 1800,
  lantern: 1900,
  gift: 2200,
  popcorn: 1900,
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

// Launch (a gift, never sold): a rocket climbs on a smoke trail, then bursts
// into stars. The first pop also shows the word "FIRST" in the middle of
// its stars. Shapes are shared so web and phone draw the same rocket.
export const ROCKET_VIEW = '0 0 24 32'
export const ROCKET_BODY = 'M12 1 C16.5 5 17 11 17 18 L17 24 L7 24 L7 18 C7 11 7.5 5 12 1 Z'
export const ROCKET_FINS = 'M7 16.5 L2.5 25 L7 24 Z M17 16.5 L21.5 25 L17 24 Z'
export const ROCKET_FLAME = 'M9 25 L12 31 L15 25 Z'
export const STAR_PATH = 'M12 2 L14.9 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.1 8.6 Z'
export const LAUNCH_FLY_MS = 820

// Gift and popcorn shapes, shared so web and phone draw the same thing.
// The gift's open top (y 18 of 44) sits on the pop's anchor.
export const GIFT_VIEW = '0 0 40 44'
export const GIFT_TOP = 18 / 44
export const GIFT_BOX = 'M9.5 18 H30.5 Q33 18 33 20.5 V38.5 Q33 41 30.5 41 H9.5 Q7 41 7 38.5 V20.5 Q7 18 9.5 18 Z'
export const GIFT_SHADE = 'M26 18 H30.5 Q33 18 33 20.5 V38.5 Q33 41 30.5 41 H26 Z'
export const GIFT_BAND = 'M17.5 18 H22.5 V41 H17.5 Z'
export const GIFT_LID = 'M7 12 H33 Q35 12 35 14 V17 Q35 19 33 19 H7 Q5 19 5 17 V14 Q5 12 7 12 Z'
export const GIFT_LID_BAND = 'M17.5 12 H22.5 V19 H17.5 Z'
export const GIFT_BOW = 'M20 11.5 C15 3.5 8.5 5.5 10.8 10 C12 12.2 16 12.4 20 11.5 Z M20 11.5 C25 3.5 31.5 5.5 29.2 10 C28 12.2 24 12.4 20 11.5 Z'
export const GIFT_SHINE = 'M8.5 14.2 H18'
// Four puffs and a hull; [cx, cy, r] in a 24 box.
export const KERNEL_PUFFS = [
  [8.8, 12.2, 5.3],
  [15.3, 11.2, 5.1],
  [12, 6.9, 4.7],
  [12.4, 15.1, 4.9],
]
export const KERNEL_HULL = 'M8.6 17.4 Q12 23.6 15.9 17.5 Q12.2 19.7 8.6 17.4 Z'
export const KERNEL_SHINE = [10.6, 5.6, 1.7, 1.1]
// The same snack in every look; did-i.css has them as --di-pop-*.
export const POPCORN_COLORS = { puff: '#fff6e2', edge: '#d4ad62', butter: '#ffdf7e', hull: '#c98a2c' }

function launchBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const rise = Math.min(6.2, (3.4 + level * 0.3) * mul)
  const size = Math.min(2.4, 1.6 * Math.min(mul, 1.4))
  const bits = [{ id: 'rocket', rocket: true, rise: `${(-rise).toFixed(2)}rem`, size: `${size.toFixed(2)}rem`, delay: '0ms' }]
  for (let i = 0; i < 5; i += 1) {
    bits.push({
      id: `smoke-${i}`,
      smoke: true,
      x: `${((i % 2 ? 1 : -1) * 0.25).toFixed(2)}rem`,
      y: `${(-rise * (i / 6)).toFixed(2)}rem`,
      size: `${((0.7 + i * 0.12) * Math.min(mul, 1.4)).toFixed(2)}rem`,
      delay: `${Math.round((LAUNCH_FLY_MS * i) / 6)}ms`,
    })
  }
  const count = Math.min(12, 7 + level)
  const reach = Math.min(4.2, (2.2 + level * 0.25) * mul)
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + (pop % 2) * 0.3
    const far = reach * (0.8 + (i % 3) * 0.14)
    bits.push({
      id: `star-${i}`,
      star: true,
      oy: `${(-rise).toFixed(2)}rem`,
      x: `${(Math.cos(angle) * far).toFixed(2)}rem`,
      y: `${(Math.sin(angle) * far).toFixed(2)}rem`,
      size: `${((0.8 + (i % 3) * 0.25) * Math.min(mul, 1.4)).toFixed(2)}rem`,
      rot: `${(i % 2 ? 1 : -1) * (120 + ((i * 47) % 160))}deg`,
      tone: CONFETTI_TONES[i % 3],
      delay: `${LAUNCH_FLY_MS + (i % 4) * 30}ms`,
    })
  }
  if (pop === 0) {
    bits.push({
      id: 'first',
      launchWord: true,
      oy: `${(-rise).toFixed(2)}rem`,
      size: `${(1.5 * Math.min(mul, 1.35)).toFixed(2)}rem`,
      delay: `${LAUNCH_FLY_MS + 40}ms`,
    })
  }
  return bits
}

// Drops in on its ribbon, swings, settles, then a few glints wink around it.
function medalBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  // Width of the art. Capped so the swing of an edge pop stays on a 390px screen.
  const size = Math.min(4, (3.3 + level * 0.12) * mul)
  const bits = [
    { id: 'medal', medal: true, delay: '0ms', size: `${size.toFixed(2)}rem`, swing: pop % 2 ? -1 : 1 },
  ]
  const glints = Math.min(6, level + 2)
  const dist = size * 0.62
  for (let i = 0; i < glints; i += 1) {
    const angle = (-160 + (i / Math.max(1, glints - 1)) * 140) * (Math.PI / 180)
    const far = dist * (0.95 + (i % 2) * 0.2)
    bits.push({
      id: `glint-${i}`,
      glint: true,
      x: `${(Math.cos(angle) * far).toFixed(2)}rem`,
      y: `${(Math.sin(angle) * far).toFixed(2)}rem`,
      size: `${((0.55 + (i % 3) * 0.14) * Math.min(mul, 1.5)).toFixed(2)}rem`,
      tone: CONFETTI_TONES[i % CONFETTI_TONES.length],
      delay: `${780 + i * 70}ms`,
    })
  }
  return bits
}

// Same flight as confetti, but leaves: fewer, bigger, warm, and they rock
// side to side as they fall.
const LEAF_TONES = ['on', 'gold', 'warm']

function leavesBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const count = Math.min(14, 8 + level)
  const reach = Math.min(6.5, (3.2 + n * 0.6) * mul)
  const peak = Math.min(5, (3 + n * 0.45) * mul)
  const fall = Math.min(13, (5.5 + n * 1.3) * mul)
  const ox = Number.parseFloat(ORIGINS[n - 1][pop]?.[0]) || 50
  const lean = ((50 - ox) / 50) * reach * 0.6
  const piece = Math.max(1, Math.min(mul, 1.5))
  const bits = []
  for (let i = 0; i < count; i += 1) {
    const side = count === 1 ? 0 : i / (count - 1) - 0.5
    const angle = side * 2.2 + (((i * 7) % 5) - 2) * 0.05
    const lift = 0.6 + ((i * 5) % 7) / 15
    bits.push({
      id: `leaf-${i}`,
      leaf: true,
      x: `${(Math.sin(angle) * reach + lean).toFixed(2)}rem`,
      y: `${(-peak * lift).toFixed(2)}rem`,
      fall: `${(fall * (0.75 + ((i * 3) % 5) * 0.08)).toFixed(2)}rem`,
      rot: `${(i % 2 ? 1 : -1) * (160 + ((i * 53) % 160))}deg`,
      size: `${((0.8 + (i % 3) * 0.16) * piece).toFixed(2)}rem`,
      tone: LEAF_TONES[(i * 2) % LEAF_TONES.length],
      delay: `${60 + ((i * 37) % 110)}ms`,
    })
  }
  return bits
}

// A paper lantern floats up with a slow sway and a warm glow, then fades.
function lanternBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const size = Math.min(2.8, (2.1 + level * 0.12) * mul)
  const rise = Math.min(6, (3.2 + level * 0.3) * mul)
  const bits = [
    { id: 'lantern-glow', sunGlow: true, delay: '200ms', size: `${(size * 2.2).toFixed(2)}rem` },
    { id: 'lantern', lantern: true, delay: '0ms', size: `${size.toFixed(2)}rem`, rise: `${(-rise).toFixed(2)}rem`, swing: pop % 2 ? -1 : 1 },
  ]
  const sparks = Math.min(6, level + 2)
  for (let i = 0; i < sparks; i += 1) {
    const angle = (-150 + (i / Math.max(1, sparks - 1)) * 120) * (Math.PI / 180)
    const far = size * (0.8 + (i % 2) * 0.25)
    bits.push({
      id: `spark-${i}`,
      glint: true,
      x: `${(Math.cos(angle) * far).toFixed(2)}rem`,
      y: `${(Math.sin(angle) * far - rise * 0.5).toFixed(2)}rem`,
      size: `${((0.5 + (i % 3) * 0.12) * Math.min(mul, 1.5)).toFixed(2)}rem`,
      tone: CONFETTI_TONES[(i + 1) % CONFETTI_TONES.length],
      delay: `${700 + i * 80}ms`,
    })
  }
  return bits
}

// A gift box pops in, shakes twice, and its lid flies off. Stars and paper
// burst out of the open top. The box's opening sits on the pop's anchor.
function giftBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  // Capped so an edge pop's 1.15 overshoot stays on a 390px screen.
  const size = Math.min(3.6, (2.4 + level * 0.12) * mul)
  const bits = [
    { id: 'gift-glow', sunGlow: true, delay: '820ms', size: `${(size * 1.9).toFixed(2)}rem` },
    { id: 'gift', gift: true, delay: '0ms', size: `${size.toFixed(2)}rem`, swing: pop % 2 ? -1 : 1 },
  ]
  const reach = Math.min(5, (2.2 + n * 0.5) * mul)
  const peak = Math.min(4.5, (2.6 + n * 0.4) * mul)
  const fall = Math.min(9, (3.5 + n * 1.1) * mul)
  const paper = Math.min(12, 5 + level)
  for (let i = 0; i < paper; i += 1) {
    const side = paper === 1 ? 0 : i / (paper - 1) - 0.5
    const angle = side * 1.8 + (((i * 7) % 5) - 2) * 0.05
    bits.push({
      id: `paper-${i}`,
      confetti: true,
      x: `${(Math.sin(angle) * reach).toFixed(2)}rem`,
      y: `${(-peak * (0.7 + ((i * 5) % 7) / 20)).toFixed(2)}rem`,
      fall: `${(fall * (0.75 + ((i * 3) % 5) * 0.08)).toFixed(2)}rem`,
      rot: `${(i % 2 ? 1 : -1) * (300 + ((i * 53) % 240))}deg`,
      size: `${((0.4 + (i % 3) * 0.08) * Math.min(mul, 1.4)).toFixed(2)}rem`,
      fat: i % 3 === 0,
      tone: CONFETTI_TONES[(i * 3) % CONFETTI_TONES.length],
      delay: `${860 + ((i * 29) % 90)}ms`,
    })
  }
  const stars = Math.min(7, level + 2)
  for (let i = 0; i < stars; i += 1) {
    const angle = (-155 + (i / Math.max(1, stars - 1)) * 130) * (Math.PI / 180)
    const far = size * (0.7 + (i % 2) * 0.3)
    bits.push({
      id: `star-${i}`,
      glint: true,
      x: `${(Math.cos(angle) * far).toFixed(2)}rem`,
      y: `${(Math.sin(angle) * far).toFixed(2)}rem`,
      size: `${((0.55 + (i % 3) * 0.14) * Math.min(mul, 1.5)).toFixed(2)}rem`,
      tone: CONFETTI_TONES[(i + 1) % CONFETTI_TONES.length],
      delay: `${880 + i * 60}ms`,
    })
  }
  return bits
}

// Kernels pop: each starts as a small seed, bursts into a puff with a
// squash and a bounce, flies up and tumbles down. Butter on some.
function popcornBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const count = Math.min(13, 6 + level)
  const reach = Math.min(6, (2.8 + n * 0.6) * mul)
  const peak = Math.min(5.5, (3.6 + n * 0.45) * mul)
  const fall = Math.min(12, (4.5 + n * 1.3) * mul)
  // Lean the spray toward the middle so edge pops stay on screen.
  const ox = Number.parseFloat(ORIGINS[n - 1][pop]?.[0]) || 50
  const lean = ((50 - ox) / 50) * reach * 0.6
  const piece = Math.max(1, Math.min(mul, 1.45))
  const bits = [{ id: 'puff', puff: true, delay: '0ms', size: `${1.1 * mul}rem` }]
  for (let i = 0; i < count; i += 1) {
    const side = count === 1 ? 0 : i / (count - 1) - 0.5
    const angle = side * 2 + (((i * 7) % 5) - 2) * 0.06
    bits.push({
      id: `kernel-${i}`,
      kernel: true,
      x: `${(Math.sin(angle) * reach + lean).toFixed(2)}rem`,
      y: `${(-peak * (0.55 + ((i * 5) % 7) / 14)).toFixed(2)}rem`,
      fall: `${(fall * (0.8 + ((i * 3) % 5) * 0.07)).toFixed(2)}rem`,
      rot: `${(i % 2 ? 1 : -1) * (120 + ((i * 47) % 200))}deg`,
      size: `${((0.95 + (i % 3) * 0.18) * piece).toFixed(2)}rem`,
      tone: i % 3 === 1 ? 'butter' : 'plain',
      delay: `${(i * 70 + ((i * 37) % 60)) % 520}ms`,
    })
  }
  return bits
}

// Rises with a bounce while a crown of rays grows out and turns.
function sunBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  // Rays reach about 1.05x the disc; capped so edge pops stay on screen.
  const size = Math.min(2.5, (2.1 + level * 0.1) * mul)
  const rays = Math.min(16, 8 + level * 2)
  const bits = [
    { id: 'sun-glow', sunGlow: true, delay: '120ms', size: `${(size * 2).toFixed(2)}rem` },
    { id: 'sun', sun: true, delay: '0ms', size: `${size.toFixed(2)}rem`, rays, turn: pop % 2 ? -1 : 1 },
  ]
  if (level >= 3) {
    bits.push({ id: 'sun-ring', bloom: true, delay: '420ms', size: `${(size * 2.3).toFixed(2)}rem` })
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
  launch: launchBits,
  medal: medalBits,
  sun: sunBits,
  leaves: leavesBits,
  lantern: lanternBits,
  gift: giftBits,
  popcorn: popcornBits,
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
