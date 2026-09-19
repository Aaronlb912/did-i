import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

function isAnswered(row) {
  const status = row?.answer?.status
  return status === 'yes' || status === 'skip' || status === 'late'
}

export function nightProgress(due = [], done = false) {
  const total = due.length
  const answered = due.filter(isAnswered).length
  const ratio = done || (total > 0 && answered >= total) ? 1 : total ? answered / total : 0
  return { total, answered, ratio }
}

export function NightMeter({ due = [], done = false }) {
  usePrefs()
  const { total, answered, ratio } = nightProgress(due, done)
  if (!total) return null
  return (
    <div className="di-meter">
      <p className="di-meter-top">
        <span className="di-meter-count">{answered}</span>
        <span className="di-meter-label">{t('tonight.meter', { n: total })}</span>
      </p>
      <div
        className="di-meter-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        aria-label={t('tonight.meterAria', { n: answered, total })}
      >
        <span className="di-meter-fill" style={{ width: `${Math.round(ratio * 1000) / 10}%` }} />
      </div>
    </div>
  )
}
