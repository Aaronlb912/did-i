import { useMemo } from 'react'
import { DEFAULT_TIME, from24, HOUR_OPTIONS, minuteOptions, to24 } from './hang-time.js'
import { HangSelect } from './HangSelect.jsx'
import { t } from './i18n.js'

export function HangTimeSelect({ value, onChange, ariaLabel }) {
  const timed = Boolean(value)
  const { hour, minute, meridiem } = from24(value)
  const minutes = useMemo(() => minuteOptions(minute), [minute])
  const meridiemOptions = useMemo(
    () => [
      { value: 'am', label: t('hang.am') },
      { value: 'pm', label: t('hang.pm') },
    ],
    [],
  )

  function setPart(part, next) {
    const bits = from24(value || DEFAULT_TIME)
    bits[part] = next
    onChange(to24(bits.hour, bits.minute, bits.meridiem))
  }

  return (
    <div className="di-hang-time">
      <div className="di-hang-chips" role="group" aria-label={ariaLabel}>
        <button
          className={!timed ? 'di-key is-pick' : 'di-key'}
          type="button"
          onClick={() => onChange('')}
        >
          {t('hang.askAny')}
        </button>
        <button
          className={timed ? 'di-key is-pick' : 'di-key'}
          type="button"
          onClick={() => onChange(value || DEFAULT_TIME)}
        >
          {t('hang.askAt')}
        </button>
      </div>
      {timed ? (
        <div className="di-hang-time-picks">
          <div className="di-field">
            <span>{t('hang.timeHour')}</span>
            <HangSelect
              ariaLabel={t('hang.timeHour')}
              value={hour}
              onChange={(next) => setPart('hour', next)}
              options={HOUR_OPTIONS}
            />
          </div>
          <div className="di-field">
            <span>{t('hang.timeMin')}</span>
            <HangSelect
              ariaLabel={t('hang.timeMin')}
              value={minute}
              onChange={(next) => setPart('minute', next)}
              options={minutes}
            />
          </div>
          <div className="di-field">
            <span>{t('hang.timeDaypart')}</span>
            <HangSelect
              ariaLabel={t('hang.timeDaypart')}
              value={meridiem}
              onChange={(next) => setPart('meridiem', next)}
              options={meridiemOptions}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
