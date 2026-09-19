import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { shortLabel } from './board-json.js'
import { streakLength } from './achievements.js'
import { hallHeat } from './hall-feel.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function Streaks({ book, now }) {
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const lamps = (book.lamps || []).filter((lamp) => !lamp.archived)
  const rows = lamps
    .map((lamp) => ({ lamp, n: streakLength(book, lamp, clock) }))
    .sort((a, b) => b.n - a.n)

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">Nights in a row</p>
        <h2 className="di-page-title">Nights in a row</h2>
        <p className="di-streak-line">Streak is {heat} of 5 nights.</p>
        <ol className="di-heat-row" aria-label="Streak">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className={n <= heat ? 'is-on' : undefined} />
          ))}
        </ol>
        {rows.length === 0 ? (
          <p className="di-sit-line">Add a question first.</p>
        ) : (
          <ul className="di-streak-list">
            {rows.map((row) => (
              <li key={row.lamp.id}>
                <button type="button" onClick={() => goHash('/lamp', { id: row.lamp.id })}>
                  {shortLabel(row.lamp)}
                </button>
                <span>{row.n ? `${row.n}` : '0'}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="di-page-keys">
          <button className="di-key" type="button" onClick={() => goHash('/week')}>
            Seven nights
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
