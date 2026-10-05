import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { periodLabel } from './recurrence.js'

export function HolePlate({ lamp, periodKey, wasSkip, onLate, onSkip, onClose }) {
  usePrefs()
  if (!lamp) return null
  return (
    <section className="di-hole-plate">
      <p className="di-face-plate">{wasSkip ? t('hole.nopeKicker') : t('hole.kicker')}</p>
      <h2 className="di-question">{lamp.question}</h2>
      <p className="di-detail-meta">{wasSkip ? t('hole.nopeBody') : periodLabel(lamp, periodKey)}</p>
      <div className="di-switch">
        <button className="di-did di-did-small" type="button" onClick={onLate}>
          {t('hole.late')}
        </button>
        {!wasSkip && onSkip ? (
          <button className="di-tape" type="button" onClick={onSkip}>
            {t('tonight.swipeNope')}
          </button>
        ) : null}
      </div>
      {onClose ? (
        <button className="di-key" type="button" onClick={onClose}>
          {wasSkip ? t('settings.neverMind') : t('hole.leave')}
        </button>
      ) : null}
    </section>
  )
}
