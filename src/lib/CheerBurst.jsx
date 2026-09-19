import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { useReduceMotion } from './useReduceMotion.js'

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

function popsFor(kind, stage) {
  const n = Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
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

function holdFor(kind, pops) {
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

function Dancer({ hop, wait, delay }) {
  return (
    <b className="di-dancer" data-hop={hop} style={{ animationDelay: `calc(${wait} + ${delay})` }}>
      <span className="di-dancer-head" />
      <span className="di-dancer-arm is-left" />
      <span className="di-dancer-arm is-right" />
      <span className="di-dancer-body" />
      <span className="di-dancer-leg is-left" />
      <span className="di-dancer-leg is-right" />
    </b>
  )
}

function Stamp({ wait, delay, rot }) {
  usePrefs()
  return (
    <b
      className="di-stamp"
      style={{ animationDelay: `calc(${wait} + ${delay})`, '--rot': rot }}
    >
      {t('tonight.swipeDid')}
    </b>
  )
}

function Tick({ wait, delay }) {
  const start = `calc(${wait} + ${delay})`
  return (
    <b className="di-tick">
      <span className="di-tick-short" style={{ animationDelay: start }} />
      <span className="di-tick-long" style={{ animationDelay: `calc(${start} + 0.18s)` }} />
    </b>
  )
}

function Plane({ hop, wait, delay, from }) {
  return (
    <b
      className="di-plane"
      data-hop={hop}
      data-from={from}
      style={{ animationDelay: `calc(${wait} + ${delay})` }}
    >
      <span className="di-plane-body" />
      <span className="di-plane-wing" />
    </b>
  )
}

function renderBit(burst, pop, bit) {
  const key = `${burst.key}-${bit.id}`
  const delay = `calc(${pop.wait} + ${bit.delay || '0ms'})`
  if (bit.dancer) {
    return <Dancer key={key} hop={bit.hop} wait={pop.wait} delay={bit.delay} />
  }
  if (bit.plane) {
    return <Plane key={key} hop={bit.hop} wait={pop.wait} delay={bit.delay} from={bit.from} />
  }
  if (bit.stamp) {
    return <Stamp key={key} wait={pop.wait} delay={bit.delay} rot={bit.rot} />
  }
  if (bit.tick) {
    return <Tick key={key} wait={pop.wait} delay={bit.delay} />
  }
  if (bit.drop) {
    return (
      <i
        key={key}
        className={bit.fat ? 'di-rain-drop is-fat' : 'di-rain-drop'}
        style={{ '--rx': bit.x, '--len': bit.len, animationDelay: delay }}
      />
    )
  }
  if (bit.puddle) {
    return <i key={key} className="di-rain-puddle" style={{ animationDelay: delay }} />
  }
  if (bit.bubble) {
    return (
      <i
        key={key}
        className="di-bubble"
        style={{
          '--bx': bit.x,
          '--sz': bit.size,
          '--drift': bit.drift,
          animationDelay: delay,
        }}
      />
    )
  }
  if (bit.bloom) {
    return <i key={key} className="di-lime-ring" style={{ '--sz': bit.size, animationDelay: delay }} />
  }
  if (bit.pip) {
    return <i key={key} className="di-lime-pip" style={{ animationDelay: delay }} />
  }
  if (bit.tape) {
    return (
      <i
        key={key}
        className={bit.fat ? 'di-tape-bit is-fat' : 'di-tape-bit'}
        data-side={bit.side}
        style={{ '--ty': bit.y, animationDelay: delay }}
      />
    )
  }
  if (bit.veil) {
    return <i key={key} className="di-night-veil" style={{ animationDelay: delay }} />
  }
  if (bit.moon) {
    return <i key={key} className="di-night-moon" style={{ animationDelay: delay }} />
  }
  if (bit.star) {
    return (
      <i
        key={key}
        className="di-night-star"
        style={{ '--sx': bit.x, '--sy': bit.y, animationDelay: delay }}
      />
    )
  }
  if (bit.shoot) {
    return <i key={key} className="di-night-shoot" style={{ animationDelay: delay }} />
  }
  if (bit.stem) {
    return <i key={key} className="di-boom-stem" style={{ animationDelay: delay }} />
  }
  if (bit.ring) {
    return <i key={key} className="di-boom-ring" data-tone={bit.tone} style={{ animationDelay: delay }} />
  }
  if (bit.streak) {
    return (
      <i
        key={key}
        className="di-boom-streak"
        data-tone={bit.tone}
        style={{ '--rot': bit.rot, '--len': bit.len, animationDelay: delay }}
      />
    )
  }
  return null
}

export function CheerBurst() {
  const reduce = useReduceMotion()
  const [burst, setBurst] = useState(null)

  useEffect(() => {
    function onCheer(event) {
      if (reduce) return
      const kind = event.detail?.kind || 'lime'
      const stage = event.detail?.stage || 1
      setBurst({ kind, stage, pops: popsFor(kind, stage), key: Date.now() })
    }
    window.addEventListener('did-i-cheer', onCheer)
    return () => window.removeEventListener('did-i-cheer', onCheer)
  }, [reduce])

  useEffect(() => {
    if (!burst) return undefined
    const timer = window.setTimeout(() => setBurst(null), holdFor(burst.kind, burst.pops.length))
    return () => window.clearTimeout(timer)
  }, [burst])

  if (reduce || !burst?.pops) return null
  if (typeof document === 'undefined') return null

  const fill = burst.kind === 'night' || burst.kind === 'rain' || burst.kind === 'bubble'

  return createPortal(
    <div className="di-cheer" data-cheer={burst.kind} data-stage={burst.stage} aria-hidden="true">
      {burst.pops.map((pop, index) => (
        <span
          key={`${burst.key}-${index}`}
          className={fill ? 'di-cheer-pop is-fill' : 'di-cheer-pop'}
          style={{ '--ox': pop.ox, '--oy': pop.oy, '--wait': pop.wait }}
        >
          {pop.bits.map((bit) => renderBit(burst, pop, bit))}
        </span>
      ))}
    </div>,
    document.body,
  )
}
