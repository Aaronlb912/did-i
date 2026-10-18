import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { shortLabel } from './board-json.js'
import { feedRows, feedSearch, tapWhen } from './hall-pages.js'
import { t } from './i18n.js'
import { boardDate, formatBoardDate, nightOpen, periodNight } from './recurrence.js'
import { gentleOn } from './prefs.js'

// A skip reads Not yet while its day is open. Once the day is over it is
// Missed, like a day never answered: Not yet is only for today. Gentle mode
// never says missed, so there it stays Not yet.
function statusWord(status, open = false) {
  if (status === 'yes') return t('feed.status.did')
  if (status === 'late') return t('feed.status.late')
  if (status === 'skip') return t(open ? 'jewelKey.notYet' : gentleOn() ? 'feed.status.nope' : 'later.missed')
  return status
}

export function Feed({ book, now }) {
  const clock = now || new Date()
  const allRows = feedRows(book)
  const [query, setQuery] = useState('')
  const rows = feedSearch(allRows, query)

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
        {allRows.length ? (
          <label className="di-search">
            <span className="di-search-glyph" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('feed.searchPh')}
              aria-label={t('feed.searchPh')}
            />
            {query ? (
              <button type="button" className="di-search-clear" aria-label={t('questions.searchClear')} onClick={() => setQuery('')}>
                ×
              </button>
            ) : null}
          </label>
        ) : null}
        {allRows.length === 0 ? (
          <p className="di-sit-line">{t('feed.empty')}</p>
        ) : rows.length === 0 ? (
          <p className="di-sit-line">{t('feed.noMatch')}</p>
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
                      {statusWord(row.answer.status, Boolean(row.lamp) && nightOpen(periodNight(row.lamp, row.answer.periodKey), clock))}
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
