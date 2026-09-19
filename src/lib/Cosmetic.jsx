export function LookChip({ id }) {
  return (
    <span className="di-look-chip" data-look={id || 'lime'} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

export function CheerChip({ id }) {
  return (
    <span className="di-cheer-chip" data-cheer={id || 'lime'} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export function StageChip({ stage = 1 }) {
  const n = Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
  return (
    <span className="di-stage-chip" data-stage={n} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <i key={step} className={step <= n ? 'is-on' : undefined} />
      ))}
    </span>
  )
}
