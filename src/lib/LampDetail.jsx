import { NightStrip } from './NightStrip.jsx'
import { cadenceLine, shortLabel } from './board-json.js'
import { recentPeriodKeys } from './recurrence.js'

export function LampDetail({
  book,
  lamp,
  dateIso,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  onRemove,
  onMarkHole,
}) {
  if (!lamp) return null
  const keys = recentPeriodKeys(lamp, dateIso, lamp.cadence === 'monthly' ? 12 : 14)
  return (
    <section className="di-detail">
      <p className="di-hang-kicker">{shortLabel(lamp)}</p>
      <h2 className="di-detail-q">{lamp.question}</h2>
      <p className="di-detail-meta">
        {cadenceLine(lamp)}
        {lamp.askAfter ? ` · after ${lamp.askAfter}` : ''}
        {lamp.archived ? ' · down' : ''}
      </p>
      {lamp.notes ? <p className="di-detail-notes">{lamp.notes}</p> : null}
      <NightStrip book={book} lamp={lamp} keys={keys} onPickHole={onMarkHole} />
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => onEdit(lamp)}>
          Edit
        </button>
        <button className="di-skip" type="button" onClick={() => onDuplicate(lamp)}>
          Duplicate
        </button>
        <button className="di-skip" type="button" onClick={() => onArchive(lamp)}>
          {lamp.archived ? 'Hang again' : 'Take down'}
        </button>
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
