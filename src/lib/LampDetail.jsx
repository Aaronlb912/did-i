import { shortLabel } from './board-json.js'

export function LampDetail({ lamp, onClose, onRemove }) {
  if (!lamp) return null
  return (
    <section className="di-detail">
      <p className="di-hang-kicker">{shortLabel(lamp)}</p>
      <h2 className="di-detail-q">{lamp.question}</h2>
      <p className="di-detail-meta">{lamp.cadence}</p>
      <div className="di-hang-actions">
        <button className="di-skip" type="button" onClick={() => onRemove(lamp)}>
          Remove
        </button>
        <button className="di-text" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  )
}
