export function HolePlate({ lamp, periodKey, onLate, onSkip, onClose }) {
  if (!lamp) return null
  return (
    <section className="di-hole-plate">
      <p className="di-face-plate">That night</p>
      <h2 className="di-question">{lamp.question}</h2>
      <p className="di-detail-meta">{periodKey}</p>
      <div className="di-switch">
        <button className="di-did di-did-small" type="button" onClick={onLate}>
          late
        </button>
        <button className="di-tape" type="button" onClick={onSkip}>
          nope
        </button>
      </div>
      {onClose ? (
        <button className="di-key" type="button" onClick={onClose}>
          Leave it
        </button>
      ) : null}
    </section>
  )
}
