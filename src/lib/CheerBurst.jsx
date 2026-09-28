import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { holdFor, popsFor } from './cheer-pops.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { useReduceMotion } from './useReduceMotion.js'

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

function Tick({ wait, delay, scale }) {
  const start = `calc(${wait} + ${delay})`
  const grow = scale && scale !== 1 ? `scale(${scale})` : undefined
  return (
    <svg
      className="di-tick"
      viewBox="0 0 72 50"
      aria-hidden="true"
      style={grow ? { transform: grow } : undefined}
    >
      <path className="di-tick-path" d="M10 27 L26 43 L62 9" pathLength="100" style={{ animationDelay: start }} />
    </svg>
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

function FlipCard({ wait, delay, hops }) {
  const n = Math.min(5, Math.max(1, Math.floor(Number(hops) || 2)))
  return (
    <b
      className="di-flip-card"
      data-hops={n}
      style={{ '--hops': n, animationDelay: `calc(${wait} + ${delay})` }}
    >
      <span className="di-flip-face is-front" />
      <span className="di-flip-face is-back" />
    </b>
  )
}

function Medal({ delay, size, swing }) {
  return (
    <b className="di-medal" style={{ '--sz': size, '--swing': swing < 0 ? -1 : 1, animationDelay: delay }}>
      <svg viewBox="0 0 40 64" aria-hidden="true" focusable="false">
        <polygon className="di-medal-strap" points="4,0 15,0 24,36 15,37" />
        <polygon className="di-medal-strap is-deep" points="25,0 36,0 25,37 16,36" />
        <circle className="di-medal-disc" cx="20" cy="47" r="15.5" />
        <circle className="di-medal-rim" cx="20" cy="47" r="10.5" />
        <path
          className="di-medal-star"
          d="M20 40.8 L21.53 44.9 L25.9 45.08 L22.47 47.8 L23.64 52.02 L20 49.6 L16.36 52.02 L17.53 47.8 L14.1 45.08 L18.47 44.9 Z"
        />
        <ellipse cx="13.5" cy="41" rx="3.2" ry="1.8" fill="#fff" opacity="0.45" transform="rotate(-35 13.5 41)" />
      </svg>
    </b>
  )
}

function Sun({ delay, size, rays, turn }) {
  const n = Math.max(8, Math.floor(Number(rays) || 8))
  return (
    <b className="di-sun" style={{ '--sz': size, '--turn': turn < 0 ? -1 : 1, animationDelay: delay }}>
      <span className="di-sun-rays" style={{ animationDelay: delay }}>
        {Array.from({ length: n }, (_, i) => (
          <i key={i} className={i % 2 ? 'di-sun-ray' : 'di-sun-ray is-long'} style={{ '--a': `${(360 / n) * i}deg` }}>
            <u style={{ animationDelay: `calc(${delay} + ${Math.round((0.14 + (i / n) * 0.12) * 1500)}ms)` }} />
          </i>
        ))}
      </span>
      <span className="di-sun-disc" />
    </b>
  )
}

function renderBit(burst, pop, bit, screen = false) {
  if (bit.screen && !screen) return null
  if (!bit.screen && screen) return null
  const key = `${burst.key}-${screen ? 'screen' : pop.wait}-${bit.id}`
  const delay = `calc(${pop.wait} + ${bit.delay || '0ms'})`
  if (bit.dancer) {
    return <Dancer key={key} hop={bit.hop} wait={pop.wait} delay={bit.delay} />
  }
  if (bit.plane) {
    return <Plane key={key} hop={bit.hop} wait={pop.wait} delay={bit.delay} from={bit.from} />
  }
  if (bit.flip) {
    return <FlipCard key={key} wait={pop.wait} delay={bit.delay} hops={bit.hops} />
  }
  if (bit.puff) {
    return <i key={key} className="di-confetti-puff" style={{ '--sz': bit.size, animationDelay: delay }} />
  }
  if (bit.confetti) {
    return (
      <i
        key={key}
        className={bit.fat ? 'di-confetti is-fat' : 'di-confetti'}
        data-tone={bit.tone}
        style={{
          '--cx': bit.x,
          '--cy': bit.y,
          '--fall': bit.fall,
          '--rot': bit.rot,
          '--sz': bit.size,
          animationDelay: delay,
        }}
      />
    )
  }
  if (bit.heart) {
    return (
      <b key={key} className="di-heart" style={{ '--sz': bit.size, animationDelay: delay }}>
        <i>
          <span />
        </i>
      </b>
    )
  }
  if (bit.heartBit) {
    return (
      <b
        key={key}
        className="di-heart di-heart-bit"
        data-tone={bit.tone}
        style={{ '--hx': bit.x, '--hy': bit.y, '--sz': bit.size, animationDelay: delay }}
      >
        <i />
      </b>
    )
  }
  if (bit.medal) {
    return <Medal key={key} delay={delay} size={bit.size} swing={bit.swing} />
  }
  if (bit.glint) {
    return (
      <i
        key={key}
        className="di-glint"
        data-tone={bit.tone}
        style={{ '--gx': bit.x, '--gy': bit.y, '--sz': bit.size, animationDelay: delay }}
      />
    )
  }
  if (bit.sunGlow) {
    return <i key={key} className="di-sun-glow" style={{ '--sz': bit.size, animationDelay: delay }} />
  }
  if (bit.sun) {
    return <Sun key={key} delay={delay} size={bit.size} rays={bit.rays} turn={bit.turn} />
  }
  if (bit.sparkFlash) {
    return <i key={key} className="di-spark-flash" style={{ animationDelay: delay }} />
  }
  if (bit.sparkRing) {
    return (
      <i
        key={key}
        className="di-spark-ring"
        style={{ '--sz': bit.size || '2.4rem', animationDelay: delay }}
      />
    )
  }
  if (bit.spark) {
    return (
      <i
        key={key}
        className="di-spark-bit"
        data-tone={bit.tone}
        style={{ '--rot': bit.rot, '--len': bit.len, animationDelay: delay }}
      />
    )
  }
  if (bit.stamp) {
    return <Stamp key={key} wait={pop.wait} delay={bit.delay} rot={bit.rot} />
  }
  if (bit.tick) {
    return <Tick key={key} wait={pop.wait} delay={bit.delay} scale={bit.scale} />
  }
  if (bit.drop) {
    return (
      <i
        key={key}
        className={bit.fat ? 'di-rain-drop is-fat' : 'di-rain-drop'}
        style={{ '--rx': bit.x, '--len': bit.len, '--fall': bit.fall || '6.5rem', animationDelay: delay }}
      />
    )
  }
  if (bit.puddle) {
    return (
      <i
        key={key}
        className="di-rain-puddle"
        style={{ '--pw': bit.width || '4.5rem', animationDelay: delay }}
      />
    )
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
          '--rise': bit.rise || '8rem',
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
        style={{ '--ty': bit.y, '--reach': bit.reach || '46vw', animationDelay: delay }}
      />
    )
  }
  if (bit.veil) {
    return (
      <i
        key={key}
        className={bit.screen ? 'di-night-veil di-night-veil-screen' : 'di-night-veil'}
        style={{ animationDelay: delay }}
      />
    )
  }
  if (bit.moon) {
    return (
      <i
        key={key}
        className="di-night-moon"
        style={{ '--sz': bit.size || '3.2rem', animationDelay: delay }}
      />
    )
  }
  if (bit.star) {
    return (
      <i
        key={key}
        className="di-night-star"
        style={{ '--sx': bit.x, '--sy': bit.y, '--sz': bit.size || '0.28rem', animationDelay: delay }}
      />
    )
  }
  if (bit.shoot) {
    return (
      <i
        key={key}
        className="di-night-shoot"
        style={{ '--len': bit.len || '4.2rem', animationDelay: delay }}
      />
    )
  }
  if (bit.stem) {
    return (
      <i
        key={key}
        className="di-boom-stem"
        style={{ '--tall': bit.tall || '3.4rem', animationDelay: delay }}
      />
    )
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

function coatFromHall() {
  if (typeof document === 'undefined') return { look: 'lime', theme: '' }
  const hall = document.querySelector('.di-hall')
  return {
    look: hall?.getAttribute('data-look') || 'lime',
    theme: hall?.getAttribute('data-theme') || '',
  }
}

export function CheerBurst() {
  const reduce = useReduceMotion()
  const [burst, setBurst] = useState(null)

  useEffect(() => {
    function onCheer(event) {
      const preview = Boolean(event.detail?.preview)
      if (reduce && !preview) return
      const kind = event.detail?.kind || 'lime'
      const stage = event.detail?.stage || 1
      const coat = event.detail?.look
        ? { look: event.detail.look, theme: event.detail.theme || coatFromHall().theme }
        : coatFromHall()
      setBurst({
        kind,
        stage,
        preview,
        pops: popsFor(kind, stage),
        key: Date.now(),
        ...coat,
      })
    }
    window.addEventListener('did-i-cheer', onCheer)
    return () => window.removeEventListener('did-i-cheer', onCheer)
  }, [reduce])

  useEffect(() => {
    if (!burst) return undefined
    const timer = window.setTimeout(
      () => setBurst(null),
      holdFor(burst.kind, burst.stage, burst.pops.length),
    )
    return () => window.clearTimeout(timer)
  }, [burst])

  if ((reduce && !burst?.preview) || !burst?.pops) return null
  if (typeof document === 'undefined') return null

  const screenPop = burst.pops.find((pop) => pop.bits.some((bit) => bit.screen))

  return createPortal(
    <div
      className="di-cheer"
      data-cheer={burst.kind}
      data-stage={burst.stage}
      data-look={burst.look || 'lime'}
      {...(burst.theme ? { 'data-theme': burst.theme } : {})}
      aria-hidden="true"
    >
      {screenPop
        ? screenPop.bits
            .filter((bit) => bit.screen)
            .map((bit) => renderBit(burst, screenPop, bit, true))
        : null}
      {burst.pops.map((pop, index) => (
        <span
          key={`${burst.key}-${index}`}
          className="di-cheer-pop"
          style={{ '--ox': pop.ox, '--oy': pop.oy, '--wait': pop.wait }}
        >
          {pop.bits.map((bit) => renderBit(burst, pop, bit))}
        </span>
      ))}
    </div>,
    document.body,
  )
}
