import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { shortLabel } from './board-json.js'
import { feedRows, tapWhen } from './hall-pages.js'
import { t } from './i18n.js'
import { boardDate, formatBoardDate } from './recurrence.js'

function statusWord(status) {
  if (status === 'yes') return t('feed.status.did')
  if (status === 'late') return t('feed.status.late')
  if (status === 'skip') return t('feed.status.nope')
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
        <p className="di-face-plate">{t('feed.kicker')}</p>
        <h2 className="di-page-title">{t('feed.title')}</h2>
        {rows.length === 0 ? (
          <p className="di-sit-line">{t('feed.empty')}</p>
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
                      {row.lamp ? shortLabel(row.lamp) : t('feed.deleted')}
                    </span>
                    <span className="di-feed-meta">
                      {statusWord(row.answer.status)}
                      {tapWhen(row.answer.answeredAt, clock)
                        ? ` · ${tapWhen(row.answer.answeredAt, clock)}`
                        : ''}
                    </span>
                    {row.answer.note ? <span className="di-feed-meta">{row.answer.note}</span> : null}
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
