import { useEffect, useState } from 'react'
import { shortLabel } from './board-json.js'
import { BoardShell } from './BoardShell.jsx'
import { monthStripNights, nightDueRows, nightWhy } from './hall-pages.js'
import { nightWhyLines } from './night-why.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate, nightOpen } from './recurrence.js'
import { useReduceMotion } from './useReduceMotion.js'

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

// A Not yet on a day that is over reads Missed: Not yet is only for today.
// Gentle mode never says missed.
function markOf(answer, open = true, gentle = false) {
  const status = answer?.status
  if (status === 'yes') return { key: 'yes', label: t('jewelKey.did') }
  if (status === 'late') return { key: 'late', label: t('hole.late') }
  if (status === 'skip') return open || gentle ? { key: 'skip', label: t('jewelKey.nope') } : { key: 'skip', label: t('later.missed') }
  return { key: 'hole', label: t('cal.open') }
}

export function Calendar({ book, boards = [], tagId = '', now }) {
  const prefs = usePrefs()
  const still = useReduceMotion()
  const clock = now || new Date()
  const [monthShift, setMonthShift] = useState(0)
  const [picked, setPicked] = useState('')

  useEffect(() => {
    setMonthShift(0)
    setPicked('')
  }, [tagId])

  useEffect(() => {
    if (!picked) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setPicked('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picked])

  const shelf = boards.length ? boards : [book]
  const pack = monthStripNights(shelf, clock, tagId, monthShift)
  const locale = dateLocale(prefs.locale)
  const monthLabel = pack.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const dows = dowMarks(prefs.locale)
  const nightRows = picked ? nightDueRows(shelf, picked, tagId) : []
  const pickedLabel = picked ? formatBoardDate(picked) : ''

  function shiftMonth(next) {
    setMonthShift(next)
    setPicked('')
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('cal.kicker')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-cal">
        <p className="di-face-plate">{t('cal.kicker')}</p>
        <div className="di-cal-head">
          <button
            className="di-weekbar-shift"
            type="button"
            onClick={() => shiftMonth((n) => n - 1)}
            aria-label={t('cal.prev')}
          >
            ‹
          </button>
          <h2 className="di-page-title">{monthLabel}</h2>
          <button
            className="di-weekbar-shift"
            type="button"
            disabled={monthShift >= 0}
            onClick={() => shiftMonth((n) => Math.min(0, n + 1))}
            aria-label={t('cal.next')}
          >
            ›
          </button>
        </div>
        <p className="di-detail-meta">{t(prefs.gentle === true ? 'cal.hintGentle' : 'cal.hint')}</p>
        <div className="di-cal-grid" role="grid" aria-label={t('cal.aria')}>
          {dows.map((day, i) => (
            <span className="di-cal-dow" role="columnheader" key={`dow-${i}`}>
              {day}
            </span>
          ))}
          {pack.nights.map((night) =>
            night.pad ? (
              <span className="di-cal-day is-pad" key={night.iso} aria-hidden="true" />
            ) : (
              <button
                key={night.iso}
                className={[
                  'di-cal-day',
                  night.on ? 'is-on' : '',
                  night.miss && prefs.gentle !== true ? 'is-miss' : '',
                  night.freeze ? 'is-freeze' : '',
                  night.empty ? 'is-empty' : '',
                  night.isToday ? 'is-today' : '',
                  picked === night.iso ? 'is-pick' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="button"
                role="gridcell"
                aria-current={night.isToday ? 'date' : undefined}
                aria-pressed={picked === night.iso}
                aria-label={t('cal.day', { date: formatBoardDate(night.iso) })}
                onClick={() => setPicked(night.iso)}
              >
                <b>{night.dayNum}</b>
                <i className="di-cal-pip" aria-hidden="true" />
              </button>
            ),
          )}
        </div>
      </section>
      {picked ? (
        <div className="di-buy-veil" role="presentation" onClick={() => setPicked('')}>
          <div
            className={still ? 'di-buy-pop di-cal-pop is-still' : 'di-buy-pop di-cal-pop'}
            role="dialog"
            aria-modal="true"
            aria-labelledby="di-cal-day-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="di-face-plate">{t('cal.kicker')}</p>
            <h2 id="di-cal-day-title" className="di-buy-title">
              {pickedLabel}
            </h2>
            {nightWhyLines(nightWhy(shelf, picked, clock, tagId)).map((line) => (
              <p className="di-detail-meta" key={line}>{line}</p>
            ))}
            {nightRows.length ? (
              <ul className="di-mark-list">
                {nightRows.map((row) => {
                  const mark = markOf(row.answer, nightOpen(picked, clock), prefs.gentle === true)
                  return (
                    <li className={`is-${mark.key}`} key={`${row.boardId}-${row.lamp.id}`}>
                      <i className="di-mark-pip" aria-hidden="true" />
                      <span>
                        <strong>{mark.label}</strong>
                        <em>{shortLabel(row.lamp)}</em>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            <div className="di-hang-actions">
              <button className="di-key" type="button" onClick={() => setPicked('')}>
                {t('cal.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </BoardShell>
  )
}
