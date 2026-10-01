import { BuddyArt } from './BuddyArt.jsx'
import { ROCKET_BODY, ROCKET_FINS, ROCKET_FLAME, ROCKET_VIEW } from './cheer-pops.js'

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

export function BuddyHang({ id }) {
  if (!id) return null
  return (
    <span className="di-buddy-hang" data-buddy={id} aria-hidden="true">
      <BuddyArt id={id} className="di-buddy-art di-buddy-art-hang" />
    </span>
  )
}
