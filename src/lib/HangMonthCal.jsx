import { useMemo, useState } from 'react'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, isoDate, parseIsoDate } from './recurrence.js'

function dateLocale(code) {
  if (code === 'zh') return 'zh-CN'
  return code || 'en'
}

function dowMarks(locale) {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const date = new Date(2026, 8, 6 + day)
    return date.toLocaleDateString(dateLocale(locale), { weekday: 'narrow' })
  })
}

function monthDays(year, month, todayIso) {
  const start = new Date(year, month, 1)
  const pad = start.getDay()
  const last = new Date(year, month + 1, 0).getDate()
  const nights = []
  for (let i = 0; i < pad; i += 1) {
    nights.push({ pad: true, key: `pad-${i}` })
  }
  for (let day = 1; day <= last; day += 1) {
    const iso = isoDate(new Date(year, month, day))
    nights.push({
      pad: false,
      key: iso,
      iso,
      dayNum: String(day),
      isToday: iso === todayIso,
    })
  }
  while (nights.length % 7 !== 0) {
    nights.push({ pad: true, key: `pad-end-${nights.length}` })
  }
  return nights
}

/** mode date: value is YYYY-MM-DD. mode monthly: value is 1-31 or 'last'. */
export function HangMonthCal({ mode, value, onChange, now = new Date(), dayFoldHour = 0 }) {
  const prefs = usePrefs()
  const todayIso = boardDate(now, dayFoldHour)
  const todayDate = parseIsoDate(todayIso) || now
  const [monthShift, setMonthShift] = useState(0)

  const view = useMemo(() => {
    const start = new Date(todayDate.getFullYear(), todayDate.getMonth() + monthShift, 1)
    return {
      start,
      label: start.toLocaleDateString(dateLocale(prefs.locale), { month: 'long', year: 'numeric' }),
      nights: monthDays(start.getFullYear(), start.getMonth(), todayIso),
      lastDay: new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
    }
  }, [todayDate, monthShift, todayIso, prefs.locale])

  const dows = dowMarks(prefs.locale)

  function isPick(night) {
    if (mode === 'monthly') {
      if (value === 'last') return Number(night.dayNum) === view.lastDay
      return Number(night.dayNum) === Number(value)
    }
    return night.iso === value
  }

  function pickDay(night) {
    if (mode === 'monthly') onChange(Number(night.dayNum))
    else onChange(night.iso)
  }

  return (
    <div className="di-hang-cal">
      <div className="di-hang-cal-head">
        <button
          className="di-weekbar-shift"
          type="button"
          onClick={() => setMonthShift((n) => n - 1)}
          aria-label={t('cal.prev')}
        >
          ‹
        </button>
        <p className="di-hang-cal-title">{view.label}</p>
        <button
          className="di-weekbar-shift"
          type="button"
          onClick={() => setMonthShift((n) => n + 1)}
          aria-label={t('cal.next')}
        >
          ›
        </button>
      </div>
      <div className="di-hang-cal-grid" role="grid" aria-label={t('hang.calAria')}>
        {dows.map((day, i) => (
          <span className="di-hang-cal-dow" role="columnheader" key={`dow-${i}`}>
            {day}
          </span>
        ))}
        {view.nights.map((night) =>
          night.pad ? (
            <span className="di-hang-cal-day is-pad" key={night.key} aria-hidden="true" />
          ) : (
            <button
              key={night.key}
              type="button"
              className={[
                'di-hang-cal-day',
                night.isToday ? 'is-today' : '',
                isPick(night) ? 'is-pick' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="gridcell"
              aria-pressed={isPick(night)}
              aria-current={night.isToday ? 'date' : undefined}
              onClick={() => pickDay(night)}
            >
              {night.dayNum}
            </button>
          ),
        )}
      </div>
      {mode === 'monthly' ? (
        <div className="di-hang-cal-foot">
          <button
            type="button"
            className={value === 'last' ? 'di-key is-pick' : 'di-key'}
            onClick={() => onChange('last')}
          >
            {t('hang.lastDay')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
