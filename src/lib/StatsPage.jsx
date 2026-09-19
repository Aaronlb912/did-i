import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { ACHIEVEMENTS } from './achievements.js'
import { statsCounts } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function StatsPage({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const counts = statsCounts(book, clock)
  const pips = ACHIEVEMENTS.filter((item) => (book.unlocked || []).includes(item.id))

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">So far</p>
        <h2 className="di-page-title">{t('stats.title')}</h2>
        <dl className="di-stats">
          <div>
            <dt>Questions</dt>
            <dd>{counts.hung}</dd>
          </div>
          <div>
            <dt>DID</dt>
            <dd>{counts.did}</dd>
          </div>
          <div>
            <dt>Late</dt>
            <dd>{counts.late}</dd>
          </div>
          <div>
            <dt>Nope</dt>
            <dd>{counts.skip}</dd>
          </div>
          <div>
            <dt>Nights on</dt>
            <dd>{counts.heat}</dd>
          </div>
        </dl>
        <div className="di-page-keys">
          <button className="di-key" type="button" onClick={() => goHash('/marks')}>
            Marks
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/week')}>
            Seven nights
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/streaks')}>
            Nights in a row
          </button>
        </div>
        {book.quietMode || pips.length === 0 ? null : (
          <ul className="di-pips" aria-label="Marks">
            {pips.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        )}
      </section>
    </BoardShell>
  )
}
