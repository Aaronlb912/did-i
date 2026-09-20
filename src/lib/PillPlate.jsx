import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

function kickerFor(status) {
  if (status === 'yes') return t('pill.done')
  if (status === 'late') return t('pill.late')
  if (status === 'skip') return t('pill.nope')
  return t('pill.open')
}

// Answering from the pill, for the nights you know the answer before the
// card comes round. Same two taps as the card, plus the way in to edit.
export function PillPlate({ row, onDid, onNope, onEdit, onClose }) {
  usePrefs()
  if (!row) return null
  const status = row.answer?.status || ''
  const isDid = status === 'yes' || status === 'late'

  return (
    <section className="di-hole-plate">
      <p className="di-face-plate">{kickerFor(status)}</p>
      <h2 className="di-question">{row.lamp.question}</h2>
      <div className="di-switch">
        <button className="di-did di-did-small" type="button" disabled={isDid} onClick={onDid}>
          {t('tonight.swipeDid')}
        </button>
        <button
          className="di-tape"
          type="button"
          disabled={status === 'skip'}
          onClick={onNope}
        >
          {t('tonight.swipeNope')}
        </button>
      </div>
      <div className="di-hang-actions">
        <button className="di-key" type="button" onClick={onEdit}>
          {t('pill.edit')}
        </button>
        <button className="di-key" type="button" onClick={onClose}>
          {t('settings.neverMind')}
        </button>
      </div>
    </section>
  )
}
