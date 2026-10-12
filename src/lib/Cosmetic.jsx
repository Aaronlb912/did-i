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
  GIFT_BAND,
  GIFT_BOW,
  GIFT_BOX,
  GIFT_LID,
  GIFT_LID_BAND,
  GIFT_SHADE,
  GIFT_VIEW,
  KERNEL_HULL,
  KERNEL_PUFFS,
  ROCKET_BODY,
  ROCKET_FINS,
  ROCKET_FLAME,
  ROCKET_VIEW,
} from './cheer-pops.js'

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
