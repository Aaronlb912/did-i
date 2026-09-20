import { useMemo } from 'react'
import { HangSelect } from './HangSelect.jsx'
import { t } from './i18n.js'

const DEFAULT_TIME = '20:00'
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

function from24(value) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return { hour: '8', minute: '00', meridiem: 'pm' }
  let hour = Number(match[1])
  const minute = match[2]
  const meridiem = hour >= 12 ? 'pm' : 'am'
  hour %= 12
  if (hour === 0) hour = 12
  return { hour: String(hour), minute, meridiem }
}

function to24(hour, minute, meridiem) {
  let h = Number(hour)
  if (meridiem === 'am') {
    if (h === 12) h = 0
  } else if (h !== 12) {
    h += 12
  }
  return `${String(h).padStart(2, '0')}:${minute}`
}

function minuteOptions(minute) {
  const options = MINUTES.map((m) => ({ value: m, label: `:${m}` }))
  if (minute && !MINUTES.includes(minute)) {
    options.push({ value: minute, label: `:${minute}` })
    options.sort((a, b) => a.value.localeCompare(b.value))
  }
  return options
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const v = String(i + 1)
  return { value: v, label: v }
})

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
