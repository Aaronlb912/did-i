import { t } from './i18n.js'
import { nightProgress } from './night-progress.js'
import { usePop } from './pop.js'
import { usePrefs } from './prefs.js'

export { nightProgress } from './night-progress.js'

// waiting: the "+2 family" chip (peopleWaitingLine); onWaiting jumps to those cards.
export function NightMeter({ due = [], waiting = '', onWaiting }) {
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
        {waiting ? (
          <button className="di-meter-chip" type="button" onClick={onWaiting} disabled={!onWaiting}>
            {waiting}
          </button>
        ) : null}
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
