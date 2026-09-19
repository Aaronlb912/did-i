import { NightStrip } from './NightStrip.jsx'
import { cadenceLine, lampNotifyOn, lampPriority } from './board-json.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { recentPeriodKeys } from './recurrence.js'

const KIND_WORD = {
  house: 'The house',
  pills: 'Medicine',
  money: 'Money',
  people: 'People',
  other: 'Something else',
}

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
  const priority = lampPriority(lamp)
  return (
    <section className="di-detail di-plate-hand">
      <p className="di-hang-kicker">This question</p>
      <h2 className="di-question di-detail-q">{lamp.question}</h2>
      <p className="di-detail-meta">
        {KIND_WORD[lamp.kind] || 'Something else'}
        {` · ${cadenceLine(lamp)}`}
        {priority !== 'normal' ? ` · ${t(`hang.priority.${priority}`)}` : ''}
        {lampNotifyOn(lamp) ? '' : ` · ${t('hang.notifyOff')}`}
        {lamp.askAfter ? ` · not until ${clockWords(lamp.askAfter)}` : ''}
        {lamp.archived ? ' · not being asked' : ''}
      </p>
      {lamp.notes ? <p className="di-detail-notes">{lamp.notes}</p> : null}
      <NightStrip book={book} lamp={lamp} keys={keys} onPickHole={onMarkHole} />
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => onEdit(lamp)}>
          Edit
        </button>
        <button className="di-key" type="button" onClick={() => onDuplicate(lamp)}>
          Duplicate
        </button>
        <button className="di-key" type="button" onClick={() => onArchive(lamp)}>
          {lamp.archived ? 'Ask me again' : 'Stop asking'}
        </button>
        <button className="di-skip" type="button" onClick={() => onRemove(lamp)}>
          Delete
        </button>
        <button className="di-text" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  )
}
