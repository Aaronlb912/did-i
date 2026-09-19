export function WaitPlate({ row, onClose, onOpenLamp }) {
  if (!row) return null
  return (
    <section className="di-wait">
      <p className="di-face-plate">Not yet</p>
      <h2 className="di-question">{row.lamp.question}</h2>
      <p className="di-detail-meta">After {row.lamp.askAfter || 'later'}.</p>
      <div className="di-hang-actions">
        {onOpenLamp ? (
          <button className="di-did di-did-small" type="button" onClick={onOpenLamp}>
            This question
          </button>
        ) : null}
        <button className="di-key" type="button" onClick={onClose}>
          Sit
        </button>
      </div>
    </section>
  )
}
