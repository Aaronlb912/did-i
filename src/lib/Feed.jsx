import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { shortLabel } from './board-json.js'
import { feedRows, tapWhen } from './hall-pages.js'
import { boardDate, formatBoardDate } from './recurrence.js'

function statusWord(status) {
  if (status === 'yes') return 'DID'
  if (status === 'late') return 'late'
  if (status === 'skip') return 'nope'
  return status
}

export function Feed({ book, now }) {
  const clock = now || new Date()
  const rows = feedRows(book)

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">Answers</p>
        <h2 className="di-page-title">Every answer</h2>
        {rows.length === 0 ? (
          <p className="di-sit-line">No answers yet.</p>
        ) : (
          <ol className="di-feed">
            {rows.map((row) => (
              <li key={row.answer.id}>
                <button
                  type="button"
                  className="di-feed-row"
                  onClick={() => row.lamp && goHash('/lamp', { id: row.lamp.id })}
                >
                  <span className={`di-feed-pip is-${row.answer.status}`} />
                  <span className="di-feed-copy">
                    <span className="di-feed-q">
                      {row.lamp ? shortLabel(row.lamp) : 'Deleted question'}
                    </span>
                    <span className="di-feed-meta">
                      {statusWord(row.answer.status)}
                      {tapWhen(row.answer.answeredAt, clock)
                        ? ` · ${tapWhen(row.answer.answeredAt, clock)}`
                        : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </BoardShell>
  )
}
