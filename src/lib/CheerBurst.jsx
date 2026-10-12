import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BALL_STRIPE,
  BELL_BODY,
  BELL_LIP,
  BELL_SHADE,
  BELL_SHINE,
  BELL_VIEW,
  BOLT_PATH,
  BOLT_VIEW,
  BOW_INNER,
  BOW_KNOT,
  BOW_LOOPS,
  BOW_TAILS,
  BUTTERFLY_DOTS,
  BUTTERFLY_FEELERS,
  BUTTERFLY_VIEW,
  CRACKLE_PATH,
  DISCO_LATS,
  GIFT_BAND,
  GIFT_BOW,
  GIFT_BOX,
  GIFT_LID,
  GIFT_LID_BAND,
  GIFT_SHADE,
  GIFT_SHINE,
  GIFT_VIEW,
  KERNEL_HULL,
  KERNEL_PUFFS,
  KERNEL_SHINE,
  MUG_BAND,
  MUG_BODY,
  MUG_COCOA,
  MUG_FOAM,
  MUG_HANDLE,
  MUG_SHINE,
  MUG_VIEW,
  RIBBON_SWIRL,
  RIBBON_VIEW,
  SNOW_CORE,
  SNOW_PATH,
  SOUND_ARC,
  SPLAT_DRIPS,
  SPLAT_PATH,
  SPLAT_VIEW,
  WING_LOW_L,
  WING_LOW_R,
  WING_UP_L,
  WING_UP_R,
  ROCKET_BODY,
  ROCKET_FINS,
  ROCKET_FLAME,
  ROCKET_VIEW,
  STAR_PATH,
  holdFor,
  popsFor,
} from './cheer-pops.js'
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

// Shared with the phone's Leaf so both draw the same shape.
export const LEAF_PATH = 'M12 1 C18 6 20 13 12 23 C4 13 6 6 12 1 Z'

function Lantern({ delay, size, rise, swing }) {
  return (
    <b className="di-lantern" style={{ '--sz': size, '--rise': rise, '--swing': swing < 0 ? -1 : 1, animationDelay: delay }}>
      <svg viewBox="0 0 32 44" aria-hidden="true" focusable="false">
        <rect className="di-lantern-cap" x="11" y="2" width="10" height="4" rx="1.5" />
        <rect className="di-lantern-body" x="5" y="6" width="22" height="28" rx="9" />
        <path className="di-lantern-rib" d="M11 7 C8 15 8 25 11 33 M21 7 C24 15 24 25 21 33 M16 6 V34" />
        <rect className="di-lantern-cap" x="11" y="34" width="10" height="4" rx="1.5" />
        <path className="di-lantern-tassel" d="M16 38 V43" />
      </svg>
    </b>
  )
}

function Gift({ delay, size, swing }) {
  return (
    <b className="di-gift" style={{ '--sz': size, '--swing': swing < 0 ? -1 : 1, animationDelay: delay }}>
      <svg viewBox={GIFT_VIEW} aria-hidden="true" focusable="false">
        <path className="di-gift-box" d={GIFT_BOX} />
        <path className="di-gift-shade" d={GIFT_SHADE} />
        <path className="di-gift-band" d={GIFT_BAND} />
        <g className="di-gift-lid" style={{ animationDelay: delay }}>
          <path className="di-gift-box" d={GIFT_LID} />
          <path className="di-gift-shine" d={GIFT_SHINE} />
          <path className="di-gift-band" d={GIFT_LID_BAND} />
          <path className="di-gift-band" d={GIFT_BOW} />
          <circle className="di-gift-band" cx="20" cy="11.5" r="2.4" />
        </g>
      </svg>
    </b>
  )
}

function Kernel({ delay, x, y, fall, rot, size, tone }) {
  return (
    <b className="di-kernel" data-tone={tone} style={{ '--cx': x, '--cy': y, '--fall': fall, '--rot': rot, '--sz': size, animationDelay: delay }}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ animationDelay: delay }}>
        <path className="di-kernel-hull" d={KERNEL_HULL} />
        {KERNEL_PUFFS.map(([cx, cy, r], i) => (
          <circle key={i} className="di-kernel-puff" cx={cx} cy={cy} r={r} />
        ))}
        {KERNEL_PUFFS.map(([cx, cy, r], i) => (
          <circle key={`in-${i}`} className={i === 1 ? 'di-kernel-fill is-butter' : 'di-kernel-fill'} cx={cx} cy={cy} r={r - 0.9} />
        ))}
        <ellipse className="di-kernel-shine" cx={KERNEL_SHINE[0]} cy={KERNEL_SHINE[1]} rx={KERNEL_SHINE[2]} ry={KERNEL_SHINE[3]} />
      </svg>
    </b>
  )
}

const TONE_VAR = {
  on: 'var(--di-on)',
  gold: 'var(--di-on-deep)',
  blue: 'var(--di-late)',
  warm: 'var(--di-miss)',
  ink: 'var(--di-ink)',
}

function toneVar(tone) {
  return TONE_VAR[tone] || TONE_VAR.on
}

function Snowflake({ delay, x, y, size, turn }) {
  return (
    <b className="di-flake" style={{ '--fx': x || '0rem', '--fy': y || '0rem', '--sz': size, '--turn': turn < 0 ? -1 : 1, animationDelay: delay }}>
      <i className="di-flake-flash" style={{ animationDelay: delay }} />
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={SNOW_PATH} />
        <path d={SNOW_CORE} />
      </svg>
    </b>
  )
}

function Bell({ delay, size, swing }) {
  return (
    <b className="di-bell" style={{ '--sz': size, '--swing': swing < 0 ? -1 : 1, animationDelay: delay }}>
      <svg viewBox={BELL_VIEW} aria-hidden="true" focusable="false">
        <g className="di-bell-clapper" style={{ animationDelay: delay }}>
          <path d="M20 30 V37" />
          <circle cx="20" cy="40" r="3" />
        </g>
        <path className="di-bell-body" d={BELL_BODY} />
        <path className="di-bell-shade" d={BELL_SHADE} />
        <path className="di-bell-lip" d={BELL_LIP} />
        <path className="di-bell-shine" d={BELL_SHINE} />
        <circle className="di-bell-knob" cx="20" cy="4" r="2.4" />
      </svg>
    </b>
  )
}

function Disco({ delay, size, turn }) {
  return (
    <b className="di-disco" style={{ '--sz': size, '--turn': turn < 0 ? -1 : 1, animationDelay: delay }}>
      <i className="di-disco-line" />
      <span className="di-disco-ball">
        <i className="di-disco-tiles" style={{ animationDelay: delay }} />
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d={DISCO_LATS} />
        </svg>
      </span>
    </b>
  )
}

function Ribbon({ delay, size, turn }) {
  return (
    <b className="di-ribbon" style={{ '--sz': size, '--turn': turn < 0 ? -1 : 1 }}>
      <svg className="di-ribbon-swirl" viewBox={RIBBON_VIEW} aria-hidden="true" focusable="false" style={{ animationDelay: delay }}>
        <path className="di-ribbon-band" d={RIBBON_SWIRL} />
        <path className="di-ribbon-edge" d={RIBBON_SWIRL} />
      </svg>
      <svg className="di-ribbon-bow" viewBox={RIBBON_VIEW} aria-hidden="true" focusable="false" style={{ animationDelay: delay }}>
        <path className="di-bow-main" d={BOW_TAILS} />
        <path className="di-bow-main" d={BOW_LOOPS} />
        <path className="di-bow-deep is-soft" d={BOW_INNER} />
        <path className="di-bow-deep" d={BOW_KNOT} />
      </svg>
    </b>
  )
}

function Cup({ delay, side, size }) {
  return (
    <b className="di-cup" data-side={side} style={{ '--sz': size, '--dir': side === 'left' ? -1 : 1, animationDelay: delay }}>
      <svg viewBox={MUG_VIEW} aria-hidden="true" focusable="false">
        <path className="di-cup-handle" d={MUG_HANDLE} />
        <path className="di-cup-body" d={MUG_BODY} />
        <path className="di-cup-band" d={MUG_BAND} />
        <path className="di-cup-shine" d={MUG_SHINE} />
        <ellipse className="di-cup-cocoa" cx={MUG_COCOA[0]} cy={MUG_COCOA[1]} rx={MUG_COCOA[2]} ry={MUG_COCOA[3]} />
        {MUG_FOAM.map(([cx, cy, r], i) => (
          <circle key={i} className="di-cup-foam" cx={cx} cy={cy} r={r} />
        ))}
      </svg>
    </b>
  )
}

function DropBall({ delay, size, fall }) {
  return (
    <b className="di-dropball" style={{ '--sz': size, '--fall': fall, animationDelay: delay }}>
      <i className="di-dropball-flash" style={{ animationDelay: delay }} />
      <i className="di-dropball-halo" style={{ animationDelay: delay }} />
      <i className="di-dropball-orb" />
    </b>
  )
}

function Bolt({ delay, size }) {
  return (
    <b className="di-bolt" style={{ '--sz': size, animationDelay: delay }}>
      <i className="di-bolt-flash" style={{ animationDelay: delay }} />
      <svg viewBox={BOLT_VIEW} aria-hidden="true" focusable="false" style={{ animationDelay: delay }}>
        <path d={BOLT_PATH} />
      </svg>
    </b>
  )
}

function Splat({ delay, x, y, rot, len, size, tone }) {
  const angle = ((Number.parseFloat(rot) || 0) * Math.PI) / 180
  const far = Number.parseFloat(len) || 0
  return (
    <b
      className="di-splat"
      style={{
        '--sx': x,
        '--sy': y,
        '--bx': `${(Math.cos(angle) * far).toFixed(2)}rem`,
        '--by': `${(Math.sin(angle) * far).toFixed(2)}rem`,
        '--sz': size,
        '--tone': toneVar(tone),
      }}
    >
      <i className="di-splat-blob" style={{ animationDelay: delay }} />
      {SPLAT_DRIPS.map(([dx, top, w, l], i) => (
        <i
          key={i}
          className="di-splat-drip"
          style={{ '--dx': dx / 40 - 0.5, '--dt': top / 40 - 0.5, '--dw': w / 40, '--dl': l / 40, animationDelay: delay }}
        />
      ))}
      <svg className="di-splat-art" viewBox={SPLAT_VIEW} aria-hidden="true" focusable="false" style={{ animationDelay: delay }}>
        <path d={SPLAT_PATH} />
        <ellipse cx="15" cy="15" rx="3.2" ry="2" />
      </svg>
    </b>
  )
}

function Butterfly({ delay, x, y, size, tone, turn }) {
  return (
    <b
      className="di-butterfly"
      style={{ '--bx': x, '--by': y, '--sz': size, '--tone': toneVar(tone), '--turn': turn < 0 ? -1 : 1, animationDelay: delay }}
    >
      <svg viewBox={BUTTERFLY_VIEW} aria-hidden="true" focusable="false">
        <g className="di-wing">
          <path d={WING_UP_L} />
          <path className="di-wing-low" d={WING_LOW_L} />
          <circle cx={BUTTERFLY_DOTS[0][0]} cy={BUTTERFLY_DOTS[0][1]} r={BUTTERFLY_DOTS[0][2]} />
        </g>
        <g className="di-wing">
          <path d={WING_UP_R} />
          <path className="di-wing-low" d={WING_LOW_R} />
          <circle cx={BUTTERFLY_DOTS[1][0]} cy={BUTTERFLY_DOTS[1][1]} r={BUTTERFLY_DOTS[1][2]} />
        </g>
        <ellipse className="di-butterfly-body" cx="20" cy="17" rx="1.6" ry="7" />
        <path className="di-butterfly-feelers" d={BUTTERFLY_FEELERS} />
      </svg>
    </b>
  )
}

function RubberBall({ delay, x, len, fall, size, tone }) {
  const roll = Number.parseFloat(len) || 0
  const spin = (roll / (Math.PI * (Number.parseFloat(size) || 1))) * 360
  return (
    <b className="di-rubber" style={{ '--bx': x, '--roll': len, '--h': fall, '--sz': size, '--tone': toneVar(tone), '--spin': `${spin.toFixed(0)}deg`, animationDelay: delay }}>
      <i className="di-rubber-shadow" style={{ animationDelay: delay }} />
      <span className="di-rubber-hop" style={{ animationDelay: delay }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ animationDelay: delay }}>
          <circle cx="12" cy="12" r="11" />
          <path d={BALL_STRIPE} />
        </svg>
        <i className="di-rubber-shine" />
      </span>
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
  if (bit.rocket) {
    return (
      <b key={key} className="di-rocket" style={{ '--sz': bit.size, '--rise': bit.rise, animationDelay: delay }}>
        <svg viewBox={ROCKET_VIEW} aria-hidden="true">
          <path className="di-rocket-flame" d={ROCKET_FLAME} />
          <path className="di-rocket-fins" d={ROCKET_FINS} />
          <path className="di-rocket-body" d={ROCKET_BODY} />
          <circle className="di-rocket-window" cx="12" cy="12.5" r="2.4" />
        </svg>
      </b>
    )
  }
  if (bit.smoke) {
    return (
      <i
        key={key}
        className="di-smoke"
        style={{ '--sx': bit.x, '--sy': bit.y, '--sz': bit.size, animationDelay: delay }}
      />
    )
  }
  if (bit.star) {
    return (
      <b
        key={key}
        className="di-star-bit"
        data-tone={bit.tone}
        style={{ '--oy': bit.oy, '--hx': bit.x, '--hy': bit.y, '--sz': bit.size, '--rot': bit.rot, animationDelay: delay }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR_PATH} />
        </svg>
      </b>
    )
  }
  if (bit.launchWord) {
    return (
      <b key={key} className="di-launch-word" style={{ '--oy': bit.oy, '--sz': bit.size, animationDelay: delay }}>
        {t('cheer.launch.word')}
      </b>
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
  if (bit.leaf) {
    return (
      <b
        key={key}
        className="di-leaf"
        data-tone={bit.tone}
        style={{ '--cx': bit.x, '--cy': bit.y, '--fall': bit.fall, '--rot': bit.rot, '--sz': bit.size, animationDelay: delay }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d={LEAF_PATH} />
          <path className="di-leaf-vein" d="M12 4 V21" />
        </svg>
      </b>
    )
  }
  if (bit.lantern) {
    return <Lantern key={key} delay={delay} size={bit.size} rise={bit.rise} swing={bit.swing} />
  }
  if (bit.gift) {
    return <Gift key={key} delay={delay} size={bit.size} swing={bit.swing} />
  }
  if (bit.kernel) {
    return <Kernel key={key} delay={delay} x={bit.x} y={bit.y} fall={bit.fall} rot={bit.rot} size={bit.size} tone={bit.tone} />
  }
  if (bit.snowflake) {
    return <Snowflake key={key} delay={delay} x={bit.x} y={bit.y} size={bit.size} turn={bit.turn} />
  }
  if (bit.iceDust) {
    return (
      <i
        key={key}
        className="di-ice-dust"
        style={{ '--dx': bit.x, '--dy': bit.y, '--sz': bit.size, '--tone': toneVar(bit.tone), animationDelay: delay }}
      />
    )
  }
  if (bit.bell) {
    return <Bell key={key} delay={delay} size={bit.size} swing={bit.swing} />
  }
  if (bit.soundArc) {
    return (
      <b
        key={key}
        className="di-sound-arc"
        style={{ '--ax': bit.x, '--ay': bit.y, '--sz': bit.size, '--turn': bit.turn < 0 ? -1 : 1, '--tone': toneVar(bit.tone), animationDelay: delay }}
      >
        <svg viewBox="0 0 12 24" aria-hidden="true" focusable="false">
          <path d={SOUND_ARC} />
        </svg>
      </b>
    )
  }
  if (bit.disco) {
    return <Disco key={key} delay={delay} size={bit.size} turn={bit.turn} />
  }
  if (bit.discoSpot) {
    return (
      <b
        key={key}
        className="di-disco-spot"
        style={{ '--a': bit.rot, '--sweep': `${bit.turn}deg`, '--len': bit.len, '--sz': bit.size, '--tone': toneVar(bit.tone), animationDelay: delay }}
      >
        <i style={{ animationDelay: delay }} />
      </b>
    )
  }
  if (bit.ribbon) {
    return <Ribbon key={key} delay={delay} size={bit.size} turn={bit.turn} />
  }
  if (bit.cup) {
    return <Cup key={key} delay={delay} side={bit.side} size={bit.size} />
  }
  if (bit.fizz) {
    return (
      <i
        key={key}
        className="di-fizz"
        style={{ '--fx': bit.x, '--fy': bit.y, '--rise': bit.rise, '--sz': bit.size, '--tone': toneVar(bit.tone), animationDelay: delay }}
      />
    )
  }
  if (bit.pole) {
    return <i key={key} className="di-pole" style={{ '--sz': bit.size, '--fall': bit.fall, animationDelay: delay }} />
  }
  if (bit.dropBall) {
    return <DropBall key={key} delay={delay} size={bit.size} fall={bit.fall} />
  }
  if (bit.beam) {
    return (
      <b key={key} className="di-beam" style={{ '--rot': bit.rot, '--len': bit.len, '--sz': bit.size, '--tone': toneVar(bit.tone) }}>
        <i style={{ animationDelay: delay }} />
      </b>
    )
  }
  if (bit.bolt) {
    return <Bolt key={key} delay={delay} size={bit.size} />
  }
  if (bit.crackle) {
    return (
      <b key={key} className="di-crackle" style={{ '--rot': bit.rot, '--len': bit.len, '--sz': bit.size, '--tone': toneVar(bit.tone) }}>
        <svg viewBox="0 0 14 9" aria-hidden="true" focusable="false" style={{ animationDelay: delay }}>
          <path d={CRACKLE_PATH} />
        </svg>
      </b>
    )
  }
  if (bit.splat) {
    return <Splat key={key} delay={delay} x={bit.x} y={bit.y} rot={bit.rot} len={bit.len} size={bit.size} tone={bit.tone} />
  }
  if (bit.splatDot) {
    return (
      <i
        key={key}
        className="di-splat-dot"
        style={{ '--dx': bit.x, '--dy': bit.y, '--sz': bit.size, '--tone': toneVar(bit.tone), animationDelay: delay }}
      />
    )
  }
  if (bit.butterfly) {
    return <Butterfly key={key} delay={delay} x={bit.x} y={bit.y} size={bit.size} tone={bit.tone} turn={bit.turn} />
  }
  if (bit.rubberBall) {
    return <RubberBall key={key} delay={delay} x={bit.x} len={bit.len} fall={bit.fall} size={bit.size} tone={bit.tone} />
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
