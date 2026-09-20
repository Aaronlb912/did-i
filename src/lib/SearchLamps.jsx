import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { shortLabel } from './board-json.js'
import { matchLamps } from './hall-pages.js'
import { t } from './i18n.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function SearchLamps({ book, now }) {
  const clock = now || new Date()
  const [query, setQuery] = useState('')
  const hits = matchLamps(book, query)

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">{t('search.kicker')}</p>
        <h2 className="di-page-title">{t('search.title')}</h2>
        <label className="di-field">
          <span>{t('search.label')}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.ph')}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </label>
        {hits.length === 0 ? (
          <p className="di-sit-line">{query.trim() ? t('search.empty') : t('search.type')}</p>
        ) : (
          <ul className="di-lamp-list">
            {hits.map((lamp) => (
              <li key={lamp.id}>
                <button className="di-lamp-row" type="button" onClick={() => goHash('/lamp', { id: lamp.id })}>
                  <span className="di-lamp-copy">
                    <span className="di-lamp-name">{shortLabel(lamp)}</span>
                    <span className="di-lamp-meta">{lamp.question}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </BoardShell>
  )
}
