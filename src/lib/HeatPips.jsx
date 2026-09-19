export function HeatPips({ heat = 0 }) {
  const n = Math.max(0, Math.min(5, Number(heat) || 0))
  return (
    <ol className="di-heat-pips" aria-label={`Streak ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((pip) => (
        <li key={pip} className={pip <= n ? 'is-on' : undefined} />
      ))}
    </ol>
  )
}
