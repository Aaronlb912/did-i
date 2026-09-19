import { useEffect, useState } from 'react'
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
  const n = kind === 'paper' ? 28 : kind === 'tape' ? 18 : 22
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4
    const dist = 70 + Math.random() * 140
    return {
      id: `${kind}-${pop}-${i}`,
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 40}px`,
      spin: `${Math.random() * 240 - 120}deg`,
      delay: `${Math.random() * 80}ms`,
      wide: kind === 'tape' && i % 2 === 0,
    }
  })
}

function popsFor(kind, stage) {
  const n = Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
  const spots = kind === 'dance' ? DANCE_ORIGINS[n - 1] : ORIGINS[n - 1]
  return spots.map((spot, pop) => ({
    ox: spot[0],
    oy: spot[1],
    wait: `${pop * (kind === 'boom' ? 140 : 90)}ms`,
    bits: bitsFor(kind, pop),
  }))
}

function holdFor(kind, pops) {
  const extra = (pops - 1) * (kind === 'boom' ? 140 : 90)
  if (kind === 'dance') return 1900 + extra
  if (kind === 'boom') return 1500 + extra
  return 900 + extra
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

  return (
    <div className="di-cheer" data-cheer={burst.kind} data-stage={burst.stage} aria-hidden="true">
      {burst.pops.map((pop, index) => (
        <span
          key={`${burst.key}-${index}`}
          className="di-cheer-pop"
          style={{ '--ox': pop.ox, '--oy': pop.oy, '--wait': pop.wait }}
        >
          {pop.bits.map((bit) => {
            if (bit.dancer) {
              return (
                <Dancer
                  key={`${burst.key}-${bit.id}`}
                  hop={bit.hop}
                  wait={pop.wait}
                  delay={bit.delay}
                />
              )
            }
            if (bit.stem) {
              return (
                <i
                  key={`${burst.key}-${bit.id}`}
                  className="di-boom-stem"
                  style={{ animationDelay: `calc(${pop.wait} + ${bit.delay})` }}
                />
              )
            }
            if (bit.ring) {
              return (
                <i
                  key={`${burst.key}-${bit.id}`}
                  className="di-boom-ring"
                  data-tone={bit.tone}
                  style={{ animationDelay: `calc(${pop.wait} + ${bit.delay})` }}
                />
              )
            }
            if (bit.streak) {
              return (
                <i
                  key={`${burst.key}-${bit.id}`}
                  className="di-boom-streak"
                  data-tone={bit.tone}
                  style={{
                    '--rot': bit.rot,
                    '--len': bit.len,
                    animationDelay: `calc(${pop.wait} + ${bit.delay})`,
                  }}
                />
              )
            }
            return (
              <i
                key={`${burst.key}-${bit.id}`}
                className={bit.wide ? 'di-cheer-bit is-wide' : 'di-cheer-bit'}
                style={{
                  '--dx': bit.dx,
                  '--dy': bit.dy,
                  '--spin': bit.spin,
                  animationDelay: `calc(${pop.wait} + ${bit.delay})`,
                }}
              />
            )
          })}
        </span>
      ))}
    </div>
  )
}
