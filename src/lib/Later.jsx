import { goHash } from '../site/hash.js'
import { shortLabel } from './board-json.js'
import { BoardShell } from './BoardShell.jsx'
import { clockWords, comingDays } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function Later({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const nights = comingDays(book, clock, 7).filter((night) => night.due.length)
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-later">
        <p className="di-face-plate">Coming up</p>
        <h2 className="di-page-title">The next nights</h2>
        <p className="di-about-p">
          {t('later.body')}
        </p>
        {!hung.length ? (
          <p className="di-detail-meta">Add a question first.</p>
        ) : !nights.length ? (
          <p className="di-detail-meta">Nothing is set to ask in the next seven nights.</p>
        ) : (
          nights.map((night) => (
            <section key={night.iso} className="di-later-night">
              <p className="di-slot-label">
                {night.isToday ? 'Tonight' : night.weekday} · {night.label}
              </p>
              <ul className="di-home-list">
                {night.due.map((row) => (
                  <li key={row.lamp.id}>
                    <button
                      className="di-lamp-row"
                      type="button"
                      onClick={() =>
                        night.isToday
                          ? goHash('/tonight', { face: row.lamp.id })
                          : goHash('/lamp', { id: row.lamp.id })
                      }
                    >
                      <span>{shortLabel(row.lamp)}</span>
                      <span className="di-home-state">
                        {row.answer
                          ? row.answer.status === 'yes'
                            ? 'DID'
                            : row.answer.status === 'late'
                              ? 'Late'
                              : 'Nope'
                          : row.lamp.askAfter
                            ? clockWords(row.lamp.askAfter)
                            : 'Open'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/tonight')}>
            Tonight
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/add')}>
            Add
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
