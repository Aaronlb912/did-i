import { useEffect, useState } from 'react'
import { shelfHeat } from './hall-feel.js'
import { weekStripNights } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

export function WeekStrip({ boards = [], tagId = '', now }) {
  usePrefs()
  const clock = now || new Date()
  const [weekShift, setWeekShift] = useState(0)

  useEffect(() => {
    setWeekShift(0)
  }, [tagId])

  const nights = weekStripNights(boards, clock, tagId, weekShift)
  const heat = shelfHeat(boards, clock, tagId)
  const label = heat > 0 ? t('weekbar.streak', { n: heat }) : t('weekbar.none')

  return (
    <section className="di-weekbar" aria-label={t('weekbar.aria')}>
      <div className="di-weekbar-head">
        <button
          className="di-weekbar-shift"
          type="button"
          onClick={() => setWeekShift((n) => n - 1)}
          aria-label={t('weekbar.prev')}
        >
          ‹
        </button>
        <p>{label}</p>
        <button
          className="di-weekbar-shift"
          type="button"
          disabled={weekShift >= 0}
          onClick={() => setWeekShift((n) => Math.min(0, n + 1))}
          aria-label={t('weekbar.next')}
        >
          ›
        </button>
      </div>
      <ol className="di-weekbar-days">
        {nights.map((night) => (
          <li
            key={night.iso}
            className={[
              night.on ? 'is-on' : '',
              night.miss ? 'is-miss' : '',
              night.empty ? 'is-empty' : '',
              night.isToday ? 'is-today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span>{night.weekday}</span>
            <i className="di-weekbar-pip" aria-hidden="true" />
          </li>
        ))}
      </ol>
    </section>
  )
}
