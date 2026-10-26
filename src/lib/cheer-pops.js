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
  'snowflake',
  'bell',
  'disco',
  'ribbon',
  'clink',
  'balldrop',
  'bolt',
  'splat',
  'butterfly',
  'bounce',
  'boo',
  'wishbone',
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
  snowflake: 130,
  bell: 150,
  disco: 160,
  ribbon: 140,
  clink: 150,
  balldrop: 170,
  bolt: 120,
  splat: 110,
  butterfly: 130,
  bounce: 120,
  boo: 150,
  wishbone: 150,
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
  snowflake: 1650,
  bell: 1850,
  disco: 1950,
  ribbon: 1750,
  clink: 1750,
  balldrop: 1850,
  bolt: 1300,
  splat: 1750,
  butterfly: 2150,
  bounce: 2000,
  boo: 2400,
  wishbone: 2600,
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

// Shapes for the winter drops (2026-12-04 to 2027-01-29), shared so web and
// phone draw the same thing. Look tones on the bits: on, gold (onDeep),
// blue (late), warm (miss), ink.
const PAINT_TONES = ['on', 'blue', 'warm', 'gold']

function rem(n) {
  return `${n.toFixed(2)}rem`
}

function turnPoint(x, y, deg) {
  const r = (deg * Math.PI) / 180
  const dx = x - 12
  const dy = y - 12
  return `${(12 + dx * Math.cos(r) - dy * Math.sin(r)).toFixed(2)} ${(12 + dx * Math.sin(r) + dy * Math.cos(r)).toFixed(2)}`
}

// Snowflake: six arms with two pairs of branches, stroked in a 24 box.
const SNOW_ARM = [
  [12, 9.4, 12, 1.6],
  [12, 5.4, 9.3, 3.2],
  [12, 5.4, 14.7, 3.2],
  [12, 8.3, 9.6, 6.5],
  [12, 8.3, 14.4, 6.5],
]
export const SNOW_PATH = [0, 60, 120, 180, 240, 300]
  .map((deg) => SNOW_ARM.map(([x1, y1, x2, y2]) => `M${turnPoint(x1, y1, deg)} L${turnPoint(x2, y2, deg)}`).join(' '))
  .join(' ')
export const SNOW_CORE = `M${[0, 60, 120, 180, 240, 300].map((deg) => turnPoint(12, 9.4, deg)).join(' L')} Z`

// Bell: hangs from the knob at the top; the pop's anchor is its middle.
export const BELL_VIEW = '0 0 40 44'
export const BELL_BODY = 'M20 6 C12.5 6 10.5 12.5 10.5 20 C10.5 27 9 31 5 34 H35 C31 31 29.5 27 29.5 20 C29.5 12.5 27.5 6 20 6 Z'
export const BELL_SHADE = 'M24.5 7 C28 9 29.5 14 29.5 20 C29.5 27 31 31 35 34 H28 C29 28 28.5 15 24.5 7 Z'
export const BELL_LIP = 'M4.5 33.5 H35.5 Q37.5 33.5 37.5 35.5 Q37.5 37.5 35.5 37.5 H4.5 Q2.5 37.5 2.5 35.5 Q2.5 33.5 4.5 33.5 Z'
export const BELL_SHINE = 'M15 11 C13.5 15 13.2 21 13.6 27'
// Sound lines beside the bell, in a 12 x 24 box.
export const SOUND_ARC = 'M3 3 Q10 12 3 21 M0.8 8 Q4.4 12 0.8 16'

// Disco ball: lines of latitude over a turning strip of mirror tiles.
export const DISCO_LATS = 'M3.3 7.5 Q12 9.8 20.7 7.5 M2 12 Q12 14.2 22 12 M3.3 16.5 Q12 18.6 20.7 16.5'
export const DISCO_GRID = `${DISCO_LATS} M12 2 Q6.5 12 12 22 M12 2 Q17.5 12 12 22 M7 3.4 Q2.6 12 7 20.6 M17 3.4 Q21.4 12 17 20.6`
// A mirror is a mirror in every look; did-i.css has them as --di-disco-*.
export const DISCO_COLORS = { hi: '#f4f6fa', mid: '#b9c0cc', lo: '#737b8b', line: '#4b5262' }

// Ribbon: a loose swirl that pulls into a bow. The bow's knot sits on the anchor.
export const RIBBON_VIEW = '0 0 48 48'
export const RIBBON_TOP = 22 / 48
export const RIBBON_SWIRL = 'M3 40 C8 30 4 16 14 9 C24 2 41 8 42 21 C43 33 31 39 23 35 C15 31 16 20 24 18 C31 16 34 24 29 27'
export const BOW_LOOPS = 'M24 22 C17 11 7 12 8 19 C9 25 17 26 24 22 Z M24 22 C31 11 41 12 40 19 C39 25 31 26 24 22 Z'
export const BOW_INNER = 'M23 21.5 C18 15.5 12.5 16 13 19 C13.5 22 18 23 23 21.5 Z M25 21.5 C30 15.5 35.5 16 35 19 C34.5 22 30 23 25 21.5 Z'
export const BOW_TAILS = 'M22.6 23.5 L15.5 37 L19.2 35.6 L20.6 39.4 L25 24.5 Z M25.4 23.5 L32.5 37 L28.8 35.6 L27.4 39.4 L23 24.5 Z'
export const BOW_KNOT = 'M21.2 19.4 H26.8 Q28 19.4 28 20.6 V24 Q28 25.2 26.8 25.2 H21.2 Q20 25.2 20 24 V20.6 Q20 19.4 21.2 19.4 Z'

// Clink: a cocoa mug with its handle on the right. Body middle at x 14, base at y 30.
export const MUG_VIEW = '0 0 32 32'
export const MUG_CX = 14 / 32
export const MUG_BASE = 30 / 32
export const MUG_BODY = 'M5 9 H23 V24 Q23 30 17 30 H11 Q5 30 5 24 Z'
export const MUG_BAND = 'M5 17 H23 V20 H5 Z'
export const MUG_HANDLE = 'M23 13 C29.6 13 29.6 23 23 23'
export const MUG_SHINE = 'M8.4 12.5 V21'
export const MUG_COCOA = [14, 9.2, 8.4, 2]
export const MUG_FOAM = [
  [11, 8.3, 1.9],
  [16.4, 7.9, 1.7],
]
// Cocoa and marshmallow are the same in every look; did-i.css has --di-cocoa*.
export const CLINK_COLORS = { cocoa: '#6b3f26', foam: '#f6ead8' }

// Bolt: the tip at (10, 48) strikes the anchor.
export const BOLT_VIEW = '0 0 24 48'
export const BOLT_PATH = 'M16 0 L5 24 H12.5 L10 48 L21 18 H14 L20 0 Z'
export const BOLT_TIP = [10 / 24, 1]
export const CRACKLE_PATH = 'M0 5 L4 1.5 L6.5 7 L10 2 L13 5.5'

// Splat: a paint blob with three drips, in a 40 box.
export const SPLAT_VIEW = '0 0 40 40'
export const SPLAT_PATH =
  'M20 6 C23 6 23 10 26 10 C29 9 31 5 34 8 C36 11 31 13 32 16 C33 19 38 19 37 23 C36 27 31 24 29 27 C27 30 30 35 26 36 C22 37 22 31 19 31 C16 31 15 37 11 35 C8 33 12 29 10 26 C8 23 3 25 3 21 C3 17 9 18 9 15 C9 12 5 9 8 7 C11 5 14 10 17 9 C19 8 18 6 20 6 Z'
// [x, top, width, length] in the same box.
export const SPLAT_DRIPS = [
  [13.5, 29, 2.6, 8],
  [20.5, 29, 3, 11],
  [27.6, 30, 2.2, 6],
]

// Butterfly: left and right wings flap about the body at x 20.
export const BUTTERFLY_VIEW = '0 0 40 32'
export const WING_UP_L = 'M19 15 C14 4 4 1 3 8 C2 14 10 17 19 16 Z'
export const WING_LOW_L = 'M19 17 C12 18 6 24 9 28 C12 31 17 25 19 19 Z'
export const WING_UP_R = 'M21 15 C26 4 36 1 37 8 C38 14 30 17 21 16 Z'
export const WING_LOW_R = 'M21 17 C28 18 34 24 31 28 C28 31 23 25 21 19 Z'
export const BUTTERFLY_FEELERS = 'M19.4 10.5 C18.4 6.5 16.6 4.6 14.8 3.8 M20.6 10.5 C21.6 6.5 23.4 4.6 25.2 3.8'
export const BUTTERFLY_DOTS = [
  [9, 8, 1.7],
  [31, 8, 1.7],
]
// Wing beats over the 1.8s flight (web: di-flap runs 1.8s / 16 per half beat).
export const BUTTERFLY_FLAPS = 8

// Rubber ball: a stripe and a shine on a 24 box. BOUNCE_KEYS is the drop:
// [time 0..1, height as a share of the drop (-1 is the top), squash x, squash y].
export const BALL_STRIPE = 'M1.5 10 C7 13.6 17 13.6 22.5 10 L22.7 13.4 C17 17 7 17 1.3 13.4 Z'
export const BOUNCE_KEYS = [
  [0, -1, 0.9, 1.1],
  [0.05, -1, 0.95, 1.06],
  [0.132, -0.889, 0.97, 1.04],
  [0.174, -0.75, 0.95, 1.06],
  [0.216, -0.556, 0.93, 1.1],
  [0.256, -0.31, 0.9, 1.14],
  [0.286, -0.098, 0.88, 1.16],
  [0.298, 0, 1.38, 0.66],
  [0.316, -0.05, 0.92, 1.1],
  [0.343, -0.167, 0.97, 1.03],
  [0.389, -0.267, 1, 1],
  [0.434, -0.3, 1, 1],
  [0.479, -0.267, 1, 1],
  [0.524, -0.167, 0.97, 1.03],
  [0.556, -0.04, 0.92, 1.1],
  [0.57, 0, 1.22, 0.8],
  [0.586, -0.035, 0.95, 1.06],
  [0.644, -0.09, 1, 1],
  [0.706, -0.02, 0.96, 1.04],
  [0.718, 0, 1.1, 0.9],
  [0.759, -0.027, 1, 1],
  [0.8, 0, 1.04, 0.96],
  [0.82, 0, 1, 1],
  [1, 0, 1, 1],
]

// Boo: a sheet ghost on a 32 by 40 box. The hem is three scallops. GHOST_KEYS is
// the 2s show: [time 0..1, y and x in ghost heights/widths (y is up from the
// anchor, negative is up), tilt in degrees, squash x, squash y, opacity]. x is
// multiplied by the pop's swing side.
export const GHOST_VIEW = '0 0 32 40'
export const GHOST_BODY =
  'M4 34 V16 C4 7.2 9.4 2 16 2 C22.6 2 28 7.2 28 16 V34 A4 4 0 0 1 20 34 A4 4 0 0 1 12 34 A4 4 0 0 1 4 34 Z'
export const GHOST_EYES = [
  [12, 15, 2, 3],
  [20, 15, 2, 3],
]
export const GHOST_MOUTH = [16, 23.5, 2.3, 3.2]
export const GHOST_COLORS = { body: '#ffffff', rim: '#9d90d6', ink: '#2a2342', glow: '#9db4ff', spark: '#a99bec' }
export const GHOST_MS = 2000
export const GHOST_KEYS = [
  [0, 0.6, 0, 0, 0.7, 0.7, 0],
  [0.06, 0.7, 0, 0, 1.12, 0.84, 1],
  [0.2, -0.55, 0, 0, 0.9, 1.18, 1],
  [0.28, -0.8, 0, 0, 0.96, 1.06, 1],
  [0.36, -0.66, 0, 0, 1, 1, 1],
  [0.44, -0.68, -0.06, -12, 1, 1, 1],
  [0.52, -0.66, 0.06, 12, 1, 1, 1],
  [0.6, -0.68, -0.05, -10, 1, 1, 1],
  [0.68, -0.66, 0.04, 8, 1, 1, 1],
  [0.74, -0.66, 0, 0, 1, 1, 1],
  [1, -1.9, 0, 0, 0.96, 1.06, 0],
]
// A four point sparkle on a 12 box.
export const GHOST_SPARK = 'M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6 Z'

// Wishbone: a 32 by 40 box, the two halves joined at the knob (16, 10).
// WISH_KEYS moves the whole bone like GHOST_KEYS: [time 0..1, y and x in bone
// heights/widths, tilt, squash x, squash y, opacity]; it pops up, is tugged
// side to side and strains. WISH_HALF_KEYS then pulls the left half away:
// [time, x in widths, y in heights, turn in degrees, opacity]; the right half
// mirrors x and turn. WISH_STAR_KEYS is the snap: [time, scale, opacity].
export const WISH_VIEW = '0 0 32 40'
export const WISH_LEFT =
  'M16 6.2 C13.4 4.6 10.8 6.4 11.6 9 C12 10.4 13 11 13.4 12.4 L6.6 33.6 C6 35.6 7.8 37.2 9.6 36.4 C11 35.8 11 34.4 10.6 33.2 L15.2 15.6 L16 14.4 Z'
export const WISH_RIGHT =
  'M16 6.2 C18.6 4.6 21.2 6.4 20.4 9 C20 10.4 19 11 18.6 12.4 L25.4 33.6 C26 35.6 24.2 37.2 22.4 36.4 C21 35.8 21 34.4 21.4 33.2 L16.8 15.6 L16 14.4 Z'
export const WISH_SHINE = 'M12.6 8.2 C12.8 9.4 13.6 10 13.8 11 M11.6 18 L9 26'
export const WISH_STAR = 'M16 3 Q16 9 22 9 Q16 9 16 15 Q16 9 10 9 Q16 9 16 3 Z M9 1.6 Q9 4 11.4 4 Q9 4 9 6.4 Q9 4 6.6 4 Q9 4 9 1.6 Z M23 1.5 Q23 3.5 25 3.5 Q23 3.5 23 5.5 Q23 3.5 21 3.5 Q23 3.5 23 1.5 Z'
export const WISH_COLORS = { bone: '#fff3d6', rim: '#b07a3c', shine: '#ffffff', star: '#ffd34d', glow: '#ffcf7a' }
export const WISH_MS = 2200
export const WISH_KEYS = [
  [0, 0.5, 0, 0, 0.6, 0.6, 0],
  [0.08, -0.18, 0, 0, 1.12, 0.88, 1],
  [0.18, -0.5, 0, 0, 0.94, 1.08, 1],
  [0.26, -0.42, 0, 0, 1, 1, 1],
  [0.32, -0.42, -0.03, -8, 1, 1, 1],
  [0.38, -0.42, 0.03, 8, 1, 1, 1],
  [0.44, -0.42, -0.02, -6, 1, 1, 1],
  [0.5, -0.42, 0, 0, 1.06, 0.95, 1],
  [0.54, -0.42, 0, 0, 1, 1, 1],
  [0.86, -0.42, 0, 0, 1, 1, 1],
  [1, -0.42, 0, 0, 1, 1, 0],
]
export const WISH_HALF_KEYS = [
  [0, 0, 0, 0, 1],
  [0.54, 0, 0, 0, 1],
  [0.62, -0.2, -0.08, -24, 1],
  [0.8, -0.5, 0.3, -50, 1],
  [1, -0.75, 0.75, -70, 0],
]
export const WISH_STAR_KEYS = [
  [0, 0, 0],
  [0.52, 0, 0],
  [0.57, 1.35, 1],
  [0.7, 0.9, 0.9],
  [0.86, 0.4, 0],
  [1, 0.4, 0],
]

// Lean a spray toward the middle so edge pops stay on screen.
function leanFor(pop, stage, reach) {
  const ox = Number.parseFloat(ORIGINS[stageN(stage) - 1][pop]?.[0]) || 50
  return ((50 - ox) / 50) * reach * 0.6
}

function glintRing(bits, count, dist, mul, delay, step, from = -160, span = 140, dy = 0) {
  for (let i = 0; i < count; i += 1) {
    const angle = (from + (i / Math.max(1, count - 1)) * span) * (Math.PI / 180)
    const far = dist * (0.9 + (i % 2) * 0.25)
    bits.push({
      id: `glint-${i}`,
      glint: true,
      x: rem(Math.cos(angle) * far),
      y: rem(Math.sin(angle) * far + dy),
      size: rem((0.5 + (i % 3) * 0.14) * Math.min(mul, 1.5)),
      tone: CONFETTI_TONES[(i + 1) % CONFETTI_TONES.length],
      delay: `${delay + i * step}ms`,
    })
  }
}

// A big snowflake spins in with an overshoot, flashes, and bursts into ice
// dust. Higher stages bring small flakes alongside.
function snowflakeBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const size = Math.min(4.2, (2.9 + level * 0.15) * mul)
  const turn = pop % 2 ? -1 : 1
  const bits = [{ id: 'flake', snowflake: true, delay: '0ms', size: rem(size), turn }]
  const minis = Math.min(3, Math.floor(level / 2))
  for (let i = 0; i < minis; i += 1) {
    const angle = (-140 + i * 100 + pop * 25) * (Math.PI / 180)
    const far = size * 0.95
    bits.push({
      id: `flake-${i}`,
      snowflake: true,
      x: rem(Math.cos(angle) * far),
      y: rem(Math.sin(angle) * far),
      size: rem(size * 0.38),
      turn: -turn,
      delay: `${110 + i * 80}ms`,
    })
  }
  const dust = Math.min(24, 12 + level * 2)
  const reach = Math.min(5.5, size * 1.25)
  for (let i = 0; i < dust; i += 1) {
    const angle = (i / dust) * Math.PI * 2 + (pop % 2) * 0.2
    const far = reach * (0.55 + ((i * 7) % 5) * 0.12)
    bits.push({
      id: `dust-${i}`,
      iceDust: true,
      x: rem(Math.cos(angle) * far),
      y: rem(Math.sin(angle) * far + 0.4),
      size: rem((0.26 + (i % 3) * 0.1) * Math.min(mul, 1.4)),
      tone: ['ink', 'on', 'blue'][i % 3],
      delay: `${680 + ((i * 23) % 90)}ms`,
    })
  }
  glintRing(bits, Math.min(5, level + 1), size * 0.75, mul, 700, 60, -150, 300)
  return bits
}

// A bell swings in, rings three times with sound lines out both sides, and
// gives a little bounce on each ring.
const BELL_RINGS = [440, 660, 880]

function bellBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const size = Math.min(3.6, (2.4 + level * 0.12) * mul)
  const bits = [{ id: 'bell', bell: true, delay: '0ms', size: rem(size), swing: pop % 2 ? -1 : 1 }]
  const rings = level >= 3 ? BELL_RINGS : BELL_RINGS.slice(0, 2)
  rings.forEach((at, r) => {
    for (const side of [-1, 1]) {
      bits.push({
        id: `arc-${r}-${side}`,
        soundArc: true,
        x: rem(side * size * 0.58),
        y: rem(size * 0.08),
        size: rem(size * (0.5 + r * 0.08)),
        turn: side,
        tone: r % 2 ? 'gold' : 'on',
        delay: `${at}ms`,
      })
    }
  })
  if (level >= 2) glintRing(bits, Math.min(5, level), size * 0.85, mul, 900, 70, -150, 120)
  return bits
}

// A mirror ball drops in on its line, bobs, turns, and throws spots of
// light that sweep out around it.
function discoBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const size = Math.min(3.4, (2.2 + level * 0.12) * mul)
  const bits = [{ id: 'disco', disco: true, delay: '0ms', size: rem(size), turn: pop % 2 ? -1 : 1 }]
  const spots = Math.min(14, 5 + level)
  const reach = Math.min(6.5, (3 + n * 0.6) * mul)
  for (let i = 0; i < spots; i += 1) {
    const sweep = (i % 2 ? 1 : -1) * (35 + ((i * 13) % 30))
    bits.push({
      id: `spot-${i}`,
      discoSpot: true,
      rot: `${Math.round((i / spots) * 360 + pop * 17)}deg`,
      turn: sweep,
      len: rem(reach * (0.55 + ((i * 5) % 7) / 14)),
      size: rem((0.55 + (i % 3) * 0.2) * Math.min(mul, 1.5)),
      tone: ['on', 'blue', 'warm', 'gold', 'ink'][i % 5],
      delay: `${380 + ((i * 47) % 240)}ms`,
    })
  }
  glintRing(bits, Math.min(4, level + 1), size * 0.45, mul, 460, 120, -140, 100)
  return bits
}

// A ribbon swirls in a loop, then pulls tight into a bow.
function ribbonBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  // The bow lands at 1.35 with a 1.6 overshoot; capped so an edge pop stays
  // on a 390px screen.
  const size = Math.min(4, (3 + level * 0.14) * mul)
  const bits = [{ id: 'ribbon', ribbon: true, delay: '0ms', size: rem(size), turn: pop % 2 ? -1 : 1 }]
  if (level >= 3) bits.push({ id: 'ribbon-ring', bloom: true, delay: '700ms', size: rem(size * 1.5) })
  glintRing(bits, Math.min(6, level + 2), size * 0.75, mul, 760, 55, -165, 150)
  return bits
}

// Two cocoa mugs swing in and clink; a sparkle at the touch and bubbles
// up out of the cups.
function clinkBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const size = Math.min(3, (2.2 + level * 0.12) * mul)
  // Where the two rims meet when the mugs lean in (see the cup keyframes).
  const touch = -size * 0.56
  const bits = [
    { id: 'cup-l', cup: true, side: 'left', delay: '0ms', size: rem(size) },
    { id: 'cup-r', cup: true, side: 'right', delay: '0ms', size: rem(size) },
    {
      id: 'touch',
      glint: true,
      x: '0rem',
      y: rem(touch),
      size: rem(size * 0.42),
      tone: 'ink',
      delay: '420ms',
    },
  ]
  const fizz = Math.min(12, 5 + level)
  for (let i = 0; i < fizz; i += 1) {
    const side = fizz === 1 ? 0 : i / (fizz - 1) - 0.5
    bits.push({
      id: `fizz-${i}`,
      fizz: true,
      x: rem(side * size * 1.6),
      y: rem(touch + 0.2),
      rise: rem(-(size * (1 + ((i * 5) % 7) / 6))),
      size: rem((0.32 + (i % 3) * 0.12) * Math.min(mul, 1.4)),
      tone: i % 2 ? 'ink' : 'on',
      delay: `${440 + ((i * 41) % 260)}ms`,
    })
  }
  glintRing(bits, Math.min(4, level), size * 0.7, mul, 470, 50, -160, 140, touch)
  return bits
}

// A glowing ball slides down its pole, lands with a flash, and rays shoot out.
function balldropBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const size = Math.min(2.6, (1.5 + level * 0.1) * mul)
  const drop = Math.min(7, (3.6 + level * 0.35) * mul)
  const bits = [
    { id: 'pole', pole: true, delay: '0ms', size: rem(size), fall: rem(drop) },
    { id: 'ball', dropBall: true, delay: '0ms', size: rem(size), fall: rem(drop) },
  ]
  const beams = Math.min(16, 8 + level)
  for (let i = 0; i < beams; i += 1) {
    bits.push({
      id: `beam-${i}`,
      beam: true,
      rot: `${Math.round((360 / beams) * i + (pop % 2) * 11)}deg`,
      len: rem(size * (0.9 + (i % 2) * 0.55) * Math.min(mul, 1.3)),
      size: rem(size),
      tone: ['on', 'gold', 'ink'][i % 3],
      delay: `${790 + (i % 3) * 35}ms`,
    })
  }
  glintRing(bits, Math.min(5, level + 1), size * 1.5, mul, 860, 55, -170, 160)
  return bits
}

// A bolt zigzags down, flashes, and crackles where it hits.
function boltBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const size = Math.min(3.2, (2.1 + level * 0.12) * mul)
  const bits = [
    { id: 'bolt', bolt: true, delay: '0ms', size: rem(size) },
    { id: 'bolt-ring', bloom: true, delay: '110ms', size: rem(size * 1.7) },
  ]
  const crackles = Math.min(10, 5 + level)
  for (let i = 0; i < crackles; i += 1) {
    bits.push({
      id: `crackle-${i}`,
      crackle: true,
      rot: `${Math.round(-180 + (i / Math.max(1, crackles - 1)) * 180 + ((i * 17) % 20) - 10)}deg`,
      len: rem(size * (0.45 + (i % 3) * 0.2)),
      size: rem((0.7 + (i % 2) * 0.3) * Math.min(mul, 1.4)),
      tone: i % 2 ? 'ink' : 'on',
      delay: `${120 + ((i * 37) % 110)}ms`,
    })
  }
  return bits
}

// Paint blobs fly at the screen and splat into color with drips. Each pop
// throws its own color; bigger pops throw a second, smaller blob.
function splatBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const mul = stageMul(stage)
  const size = Math.min(3.8, (2.4 + level * 0.14) * mul)
  const tone = PAINT_TONES[pop % PAINT_TONES.length]
  const blobs = [{ x: 0, y: 0, size, tone, rot: pop % 2 ? 210 : -30, wait: 0 }]
  if (level >= 2) {
    // The second blob lands on the screen side of an edge pop.
    const ox = Number.parseFloat(ORIGINS[stageN(stage) - 1][pop]?.[0]) || 50
    const side = ox === 50 ? (pop % 2 ? -1 : 1) : ox < 50 ? 1 : -1
    blobs.push({ x: side * size * 0.85, y: -size * 0.55, size: size * 0.5, tone: PAINT_TONES[(pop + 1) % PAINT_TONES.length], rot: side > 0 ? -60 : 240, wait: 120 })
  }
  const bits = []
  blobs.forEach((blob, b) => {
    bits.push({
      id: `splat-${b}`,
      splat: true,
      x: rem(blob.x),
      y: rem(blob.y),
      rot: `${blob.rot}deg`,
      len: rem(blob.size * 2.2),
      size: rem(blob.size),
      tone: blob.tone,
      delay: `${blob.wait}ms`,
    })
    const dots = b === 0 ? Math.min(9, 4 + level) : 3
    for (let i = 0; i < dots; i += 1) {
      const angle = (i / dots) * Math.PI * 2 + 0.4 + b
      const far = blob.size * (0.7 + ((i * 7) % 5) * 0.1)
      bits.push({
        id: `dot-${b}-${i}`,
        splatDot: true,
        x: rem(blob.x + Math.cos(angle) * far),
        y: rem(blob.y + Math.sin(angle) * far * 0.85),
        size: rem(blob.size * (0.1 + (i % 3) * 0.04)),
        tone: blob.tone,
        delay: `${blob.wait + 380}ms`,
      })
    }
  })
  return bits
}

// Butterflies pop out and flutter up and away, wings beating.
function butterflyBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const size = Math.min(3, (2 + level * 0.12) * mul)
  const count = Math.min(4, 2 + Math.floor(level / 3))
  const rise = Math.min(8, (4 + n * 0.8) * mul)
  const lean = leanFor(pop, stage, rise * 0.6)
  const bits = []
  for (let i = 0; i < count; i += 1) {
    const side = count === 1 ? 0 : i / (count - 1) - 0.5
    bits.push({
      id: `fly-${i}`,
      butterfly: true,
      x: rem(side * rise * 0.9 + lean),
      y: rem(-rise * (0.8 + ((i * 3) % 4) * 0.1)),
      size: rem(size * (1 - (i % 2) * 0.18)),
      tone: PAINT_TONES[(i + pop) % PAINT_TONES.length],
      turn: i % 2 ? -1 : 1,
      delay: `${i * 110}ms`,
    })
  }
  return bits
}

// Rubber balls drop in and bounce with a squash on each landing, every
// bounce lower than the last.
function bounceBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const mul = stageMul(stage)
  const size = Math.min(2.5, (1.65 + level * 0.1) * mul)
  const count = Math.min(3, 1 + Math.floor(level / 2))
  const high = Math.min(7, (3.4 + n * 0.6) * mul)
  const lean = leanFor(pop, stage, high * 0.5)
  const bits = []
  for (let i = 0; i < count; i += 1) {
    const side = count === 1 ? 0 : i / (count - 1) - 0.5
    const roll = (i % 2 ? -1 : 1) * size * (1.2 + (i % 3) * 0.4)
    bits.push({
      id: `ball-${i}`,
      rubberBall: true,
      x: rem(side * size * 3.4),
      len: rem(roll + lean),
      fall: rem(high * (1 - (i % 2) * 0.2)),
      size: rem(size * (1 - (i % 3) * 0.12)),
      tone: PAINT_TONES[(i + pop) % PAINT_TONES.length],
      delay: `${i * 130}ms`,
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

/**
 * The sun's rays in px for a disc `px` wide, inside a square `box` centered
 * on the disc. Each ray sits in its own full-size box that turns `deg` about
 * that box's middle, so the turn point is the disc's center on every
 * platform (a 0x0 view's pivot is not reliable on the phone).
 */
export function sunRayLayout(px, rays) {
  const count = Math.max(8, Math.floor(Number(rays) || 8))
  const size = Math.max(0, Number(px) || 0)
  const w = Math.max(3, size * 0.11)
  const gap = size * 0.62
  // Room for the 1.25 grow overshoot so nothing pokes past the box.
  const box = Math.ceil((gap + size * 0.42 * 1.25) * 2)
  const list = Array.from({ length: count }, (_, i) => {
    const long = i % 2 === 0
    const len = size * (long ? 0.42 : 0.28)
    return { deg: (360 / count) * i, long, w, len, left: box / 2 - w / 2, top: box / 2 - gap - len }
  })
  return { count, box, rays: list }
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
  snowflake: snowflakeBits,
  bell: bellBits,
  disco: discoBits,
  ribbon: ribbonBits,
  clink: clinkBits,
  balldrop: balldropBits,
  bolt: boltBits,
  splat: splatBits,
  butterfly: butterflyBits,
  bounce: bounceBits,
  boo: booBits,
  wishbone: wishBits,
}

function popsAtOrigins(origins, stage, buildBits, gapMs = 120) {
  return origins[stage - 1].map((spot, pop) => ({
    ox: spot[0],
    oy: spot[1],
    wait: `${pop * gapMs}ms`,
    bits: buildBits(pop, stage),
  }))
}

// A little sheet ghost pops up with a dip, overshoots, wobbles side to side
// and floats away. More pops make more ghosts; higher levels add a small
// companion ghost, twinkles and tiny puffs.
function booBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const size = Math.min(6.2, (3.1 + n * 0.55 + pop * 0.1) * (pop % 2 ? 0.92 : 1))
  const side = pop % 2 ? -1 : 1
  const lean = leanFor(pop, stage, size * 0.8)
  const down = size * 0.8
  const bits = [{ id: 'boo-ghost', ghost: true, x: rem(lean), y: rem(down), size: rem(size), swing: side, delay: '0ms' }]
  if (level >= 7) {
    const inward = lean ? Math.sign(lean) : side
    bits.push({ id: 'boo-mini', ghost: true, x: rem(lean + inward * size * 0.85), y: rem(down), size: rem(size * 0.5), swing: -inward, delay: '260ms' })
  }
  const sparks = Math.min(3, Math.max(0, level - 2))
  for (let i = 0; i < sparks; i += 1) {
    const a = ((i + 0.5) / sparks) * Math.PI + Math.PI
    bits.push({
      id: `boo-spark-${i}`,
      ghostSpark: true,
      x: rem(lean + Math.cos(a) * size * 0.75),
      y: rem(down - size * 0.8 + Math.sin(a) * size * 0.65),
      size: rem(Math.min(1.1, 0.55 + n * 0.1)),
      delay: `${380 + i * 120}ms`,
    })
  }
  const puffs = level >= 4 ? Math.min(2, level - 3) : 0
  for (let i = 0; i < puffs; i += 1) {
    bits.push({
      id: `boo-puff-${i}`,
      wisp: true,
      x: rem(lean + (i ? -1 : 1) * side * size * 0.3),
      y: rem(down - size * 0.5),
      rise: rem(size * 0.7),
      size: rem(Math.min(0.95, 0.5 + n * 0.08)),
      delay: `${820 + i * 150}ms`,
    })
  }
  return bits
}

// A wishbone pops up, is tugged side to side, snaps with a gold star and the
// halves fly apart. Higher levels add a smaller second wishbone and gold sparks
// at the snap.
function wishBits(pop, stage) {
  const level = burstLevel(pop, stage)
  const n = stageN(stage)
  const size = Math.min(6.2, (3.1 + n * 0.55 + pop * 0.1) * (pop % 2 ? 0.92 : 1))
  const side = pop % 2 ? -1 : 1
  const lean = leanFor(pop, stage, size * 0.8)
  const down = size * 0.8
  const bits = [{ id: 'wish-bone', wish: true, x: rem(lean), y: rem(down), size: rem(size), swing: side, delay: '0ms' }]
  if (level >= 7) {
    const inward = lean ? Math.sign(lean) : side
    bits.push({ id: 'wish-mini', wish: true, x: rem(lean + inward * size * 0.85), y: rem(down), size: rem(size * 0.55), swing: -inward, delay: '260ms' })
  }
  const snap = Math.round(WISH_MS * 0.55)
  const sparks = Math.min(4, Math.max(0, level - 2))
  for (let i = 0; i < sparks; i += 1) {
    const a = ((i + 0.5) / sparks) * Math.PI + Math.PI
    bits.push({
      id: `wish-spark-${i}`,
      ghostSpark: true,
      tone: 'gold',
      x: rem(lean + Math.cos(a) * size * 0.7),
      y: rem(down - size * 1.17 + Math.sin(a) * size * 0.4),
      size: rem(Math.min(1.1, 0.55 + n * 0.1)),
      delay: `${snap + i * 70}ms`,
    })
  }
  return bits
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
