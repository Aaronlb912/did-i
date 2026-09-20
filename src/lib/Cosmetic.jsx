import { BuddyArt } from './BuddyArt.jsx'

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
