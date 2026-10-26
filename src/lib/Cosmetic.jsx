import { createElement } from 'react'
import { BuddyArt } from './BuddyArt.jsx'
import { ACCESSORY_VIEWBOX, accessoryById, accessoryNodes, eyeLine, wornLayers } from './accessories.js'
import { currentBook, readShelf } from './board-shelf.js'
import { normalizePurse } from './purse.js'

// Accessory parts take the look's colour straight from the theme.
const TONE = 'var(--di-on)'

function AccessoryLayer({ ids, buddyId }) {
  if (!ids.length) return null
  let n = 0
  const h = (tag, props, ...children) => createElement(tag, { ...(props || {}), key: (n += 1) }, ...children)
  return (
    <svg className="di-acc-layer" viewBox={ACCESSORY_VIEWBOX} aria-hidden="true" focusable="false">
      {ids.flatMap((id) => accessoryNodes(h, id, buddyId, TONE))}
    </svg>
  )
}

// The buddy with what it has on: wings behind, the rest on top.
function Dressed({ id, worn, className }) {
  const { behind, front } = wornLayers(worn)
  return (
    <>
      <AccessoryLayer ids={behind} buddyId={id} />
      <BuddyArt id={id} className={className} />
      <AccessoryLayer ids={front} buddyId={id} />
    </>
  )
}

// What your buddy has on, from the saved shelf.
function myWorn() {
  const book = currentBook(readShelf())
  return book ? normalizePurse(book).worn : {}
}

// A shop tile: the buddy (the ant unless one is given) wearing one item.
export function AccessoryChip({ id, buddyId = 'ant' }) {
  const slot = accessoryById(id)?.slot || 'head'
  // Eye items are too small to read on a whole buddy: show the face up close.
  if (slot === 'eyes') {
    const w = 3.6
    return (
      <span className="di-buddy-chip di-acc-chip di-acc-chip-zoom" data-buddy={buddyId} aria-hidden="true">
        <span
          className="di-acc-box"
          style={{ position: 'absolute', width: w + 'rem', left: 'calc(50% - ' + w / 2 + 'rem)', top: 'calc(50% - ' + (eyeLine(buddyId) / 48) * w + 'rem)' }}
        >
          <Dressed id={buddyId} worn={{ eyes: id }} className="di-buddy-art" />
        </span>
      </span>
    )
  }
  return (
    <span className="di-buddy-chip di-acc-chip" data-buddy={buddyId} aria-hidden="true">
      <span className="di-acc-box">
        <Dressed id={buddyId} worn={{ [slot]: id }} className="di-buddy-art" />
      </span>
    </span>
  )
}
import {
  BALL_STRIPE,
  BELL_BODY,
  BELL_LIP,
  BELL_SHADE,
  BELL_VIEW,
  BOLT_PATH,
  BOLT_VIEW,
  BOW_INNER,
  BOW_KNOT,
  BOW_LOOPS,
  BOW_TAILS,
  BUTTERFLY_FEELERS,
  BUTTERFLY_VIEW,
  GHOST_BODY,
  GHOST_EYES,
  GHOST_MOUTH,
  GHOST_VIEW,
  WISH_LEFT,
  WISH_RIGHT,
  WISH_VIEW,
  DISCO_GRID,
  GIFT_BAND,
  GIFT_BOW,
  GIFT_BOX,
  GIFT_LID,
  GIFT_LID_BAND,
  GIFT_SHADE,
  GIFT_VIEW,
  KERNEL_HULL,
  KERNEL_PUFFS,
  MUG_BODY,
  MUG_COCOA,
  MUG_HANDLE,
  RIBBON_VIEW,
  ROCKET_BODY,
  ROCKET_FINS,
  ROCKET_FLAME,
  ROCKET_VIEW,
  SNOW_CORE,
  SNOW_PATH,
  SPLAT_PATH,
  SPLAT_VIEW,
  WING_LOW_L,
  WING_LOW_R,
  WING_UP_L,
  WING_UP_R,
} from './cheer-pops.js'

// Chips for the winter drop cheers: the same shapes the cheers draw.
function mugChip(at, tilt, flip, fill) {
  return (
    <g transform={`translate(${at} 30) rotate(${tilt}) scale(${flip} 1) translate(-14 -30)`}>
      <path d={MUG_HANDLE} fill="none" stroke={fill} strokeWidth="3.2" strokeLinecap="round" />
      <path d={MUG_BODY} fill={fill} />
      <ellipse cx={MUG_COCOA[0]} cy={MUG_COCOA[1]} rx={MUG_COCOA[2]} ry={MUG_COCOA[3]} fill="var(--di-cocoa)" stroke={fill} strokeWidth="1.2" />
    </g>
  )
}

function winterChipArt(id) {
  switch (id) {
    case 'snowflake':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--di-on)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={SNOW_PATH} />
          <path d={SNOW_CORE} />
        </svg>
      )
    case 'bell':
      return (
        <svg viewBox={BELL_VIEW}>
          <circle cx="20" cy="40" r="3" fill="var(--di-on-deep)" />
          <path d={BELL_BODY} fill="var(--di-on)" />
          <path d={BELL_SHADE} fill="rgba(0, 0, 0, 0.2)" />
          <path d={BELL_LIP} fill="var(--di-on-deep)" />
          <circle cx="20" cy="4" r="2.4" fill="none" stroke="var(--di-on-deep)" strokeWidth="1.6" />
        </svg>
      )
    case 'disco':
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="var(--di-disco-mid)" />
          <path d={DISCO_GRID} fill="none" stroke="var(--di-disco-line)" strokeWidth="0.9" />
          <circle cx="8.5" cy="7.5" r="2" fill="var(--di-disco-hi)" />
        </svg>
      )
    case 'ribbon':
      return (
        <svg viewBox={RIBBON_VIEW}>
          <path d={BOW_TAILS} fill="var(--di-on)" />
          <path d={BOW_LOOPS} fill="var(--di-on)" />
          <path d={BOW_INNER} fill="var(--di-on-deep)" opacity="0.55" />
          <path d={BOW_KNOT} fill="var(--di-on-deep)" />
        </svg>
      )
    case 'clink':
      return (
        <svg viewBox="0 0 48 34">
          {mugChip(15, 12, -1, 'var(--di-on)')}
          {mugChip(33, -12, 1, 'var(--di-late)')}
        </svg>
      )
    case 'balldrop':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 1 V21 M7 22 H17" stroke="var(--di-ink-soft)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="6" fill="var(--di-on)" stroke="var(--di-on-deep)" strokeWidth="1.2" />
          <circle cx="10" cy="10" r="1.5" fill="rgba(255, 255, 255, 0.6)" />
        </svg>
      )
    case 'bolt':
      return (
        <svg viewBox={BOLT_VIEW}>
          <path d={BOLT_PATH} fill="var(--di-on)" />
        </svg>
      )
    case 'splat':
      return (
        <svg viewBox={SPLAT_VIEW}>
          <path d={SPLAT_PATH} fill="var(--di-on)" />
          <circle cx="36" cy="33" r="2" fill="var(--di-on)" />
          <circle cx="4" cy="31" r="1.5" fill="var(--di-on)" />
        </svg>
      )
    case 'butterfly':
      return (
        <svg viewBox={BUTTERFLY_VIEW}>
          <path d={WING_UP_L} fill="var(--di-on)" />
          <path d={WING_UP_R} fill="var(--di-on)" />
          <path d={WING_LOW_L} fill="var(--di-on-deep)" />
          <path d={WING_LOW_R} fill="var(--di-on-deep)" />
          <ellipse cx="20" cy="17" rx="1.6" ry="7" fill="var(--di-ink)" />
          <path d={BUTTERFLY_FEELERS} fill="none" stroke="var(--di-ink)" strokeWidth="1" strokeLinecap="round" />
        </svg>
      )
    case 'wishbone':
      return (
        <svg viewBox={WISH_VIEW}>
          <path d={WISH_LEFT} fill="var(--di-on)" stroke="var(--di-ink)" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={WISH_RIGHT} fill="var(--di-on)" stroke="var(--di-ink)" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      )
    case 'boo':
      return (
        <svg viewBox={GHOST_VIEW}>
          <path d={GHOST_BODY} fill="var(--di-on)" />
          {GHOST_EYES.map(([cx, cy, rx, ry], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="var(--di-ink)" />
          ))}
          <ellipse cx={GHOST_MOUTH[0]} cy={GHOST_MOUTH[1]} rx={GHOST_MOUTH[2]} ry={GHOST_MOUTH[3]} fill="var(--di-ink)" />
        </svg>
      )
    case 'bounce':
      return (
        <svg viewBox="0 0 24 28">
          <ellipse cx="12" cy="26" rx="7" ry="1.6" fill="var(--di-ink)" opacity="0.25" />
          <circle cx="12" cy="12" r="11" fill="var(--di-on)" />
          <path d={BALL_STRIPE} fill="rgba(0, 0, 0, 0.2)" />
        </svg>
      )
    default:
      return null
  }
}

export function LookChip({ id }) {
  return (
    <span className="di-look-chip" data-look={id || 'lime'} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

export function CheerChip({ id, stage = 1 }) {
  const n = Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
  const winter = winterChipArt(id)
  if (winter) {
    return (
      <span className="di-cheer-chip" data-cheer={id} data-stage={n} aria-hidden="true">
        {winter}
      </span>
    )
  }
  if (id === 'launch') {
    return (
      <span className="di-cheer-chip" data-cheer="launch" data-stage={n} aria-hidden="true">
        <svg viewBox={ROCKET_VIEW}>
          <path d={ROCKET_FLAME} fill="var(--di-on-deep)" />
          <path d={ROCKET_FINS} fill="var(--di-on)" />
          <path d={ROCKET_BODY} fill="var(--di-ink)" />
          <circle cx="12" cy="12.5" r="2.4" fill="var(--di-on)" />
        </svg>
      </span>
    )
  }
  if (id === 'gift') {
    return (
      <span className="di-cheer-chip" data-cheer="gift" data-stage={n} aria-hidden="true">
        <svg viewBox={GIFT_VIEW}>
          <path d={GIFT_BOX} fill="var(--di-on)" />
          <path d={GIFT_SHADE} fill="rgba(0, 0, 0, 0.22)" />
          <path d={GIFT_BAND} fill="var(--di-ink)" />
          <path d={GIFT_LID} fill="var(--di-on)" />
          <path d={GIFT_LID_BAND} fill="var(--di-ink)" />
          <path d={GIFT_BOW} fill="var(--di-ink)" />
          <circle cx="20" cy="11.5" r="2.4" fill="var(--di-ink)" />
        </svg>
      </span>
    )
  }
  if (id === 'popcorn') {
    return (
      <span className="di-cheer-chip" data-cheer="popcorn" data-stage={n} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d={KERNEL_HULL} fill="var(--di-pop-hull)" />
          {KERNEL_PUFFS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="var(--di-pop-puff)" stroke="var(--di-pop-edge)" strokeWidth="1.2" />
          ))}
          {KERNEL_PUFFS.map(([cx, cy, r], i) => (
            <circle key={`in-${i}`} cx={cx} cy={cy} r={r - 0.9} fill={i === 1 ? 'var(--di-pop-butter)' : 'var(--di-pop-puff)'} />
          ))}
        </svg>
      </span>
    )
  }
  return (
    <span className="di-cheer-chip" data-cheer={id || 'lime'} data-stage={n} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export function BuddyChip({ id }) {
  if (!id) return null
  return (
    <span className="di-buddy-chip" data-buddy={id} aria-hidden="true">
      <BuddyArt id={id} className="di-buddy-art di-buddy-art-chip" />
    </span>
  )
}

export function BuddyHang({ id, worn = null }) {
  if (!id) return null
  const outfit = worn || myWorn()
  // The card clips at its top edge, so hang lower when something sits on top.
  const tall = outfit.head || outfit.around || outfit.back === 'butterfly' || outfit.back === 'bee'
  return (
    <span className={tall ? 'di-buddy-hang is-tall' : 'di-buddy-hang'} data-buddy={id} aria-hidden="true">
      <Dressed id={id} worn={outfit} className="di-buddy-art di-buddy-art-hang" />
    </span>
  )
}
