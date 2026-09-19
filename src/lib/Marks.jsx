import { goHash } from '../site/hash.js'
import { ACHIEVEMENTS } from './achievements.js'
import { BoardShell } from './BoardShell.jsx'
import { HeatPips } from './HeatPips.jsx'
import { hallHeat } from './hall-feel.js'
import { showedNights } from './daily.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function Marks({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const shown = showedNights(book)
  const have = new Set(book.unlocked || [])

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-marks">
        <p className="di-face-plate">Marks</p>
        <h2 className="di-page-title">{t('marks.title')}</h2>
        <p className="di-detail-meta">
          Streak is {heat} of 5. {shown === 1 ? 'Shown up 1 night.' : `Shown up ${shown} nights.`}
        </p>
        <HeatPips heat={heat} />

        {book.quietMode ? (
          <p className="di-detail-meta">Marks are hidden in Settings. They still unlock.</p>
        ) : (
          <ul className="di-mark-list" aria-label="Marks">
            {ACHIEVEMENTS.map((item) => {
              const on = have.has(item.id)
              return (
                <li key={item.id} className={on ? 'is-on' : 'is-hole'}>
                  <span className="di-mark-pip" aria-hidden="true" />
                  <span>
                    <strong>{on ? item.name : 'Not yet'}</strong>
                    <em>{on ? item.line : item.name}</em>
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/')}>
            Home
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/stats')}>
            So far
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
