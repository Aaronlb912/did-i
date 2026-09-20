import { t } from './i18n.js'
import { usePop } from './pop.js'
import { usePrefs } from './prefs.js'

function isComplete(row) {
  const status = row?.answer?.status
  return status === 'yes' || status === 'late'
}

export function nightProgress(due = []) {
  const total = due.length
  const answered = due.filter(isComplete).length
  const ratio = total ? answered / total : 0
  return { total, answered, ratio }
}

export function NightMeter({ due = [] }) {
  usePrefs()
  const { total, answered, ratio } = nightProgress(due)
  const pop = usePop(answered)
  if (!total) return null
  return (
    <div className={ratio >= 1 ? 'di-meter is-done' : 'di-meter'}>
      <p className="di-meter-top">
        <span className={pop === 'is-pop' ? 'di-meter-count is-pop' : 'di-meter-count'}>
          {answered}
        </span>
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
