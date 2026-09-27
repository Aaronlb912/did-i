import { useMemo, useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import {
  activeDeadline,
  cadenceLine,
  dueByUrgency,
  prepQuestionRows,
  shortLabel,
} from './board-json.js'
import { filamentLevel } from './hall-feel.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { clockWords } from './hall-pages.js'
import { questionAddsToName, rowId, searchRows, tonightStates } from './question-list.js'
import { StarterPicks } from './StarterPicks.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { taggedLamps } from './tags.js'
import { TagRail } from './TagRail.jsx'

export function AllLamps({ book, boards = [], tagId = '', onTag, onChange, onOpen, now }) {
  usePrefs()
  const clock = now || new Date()
  const dateIso = boardDate(clock, book.dayFoldHour)
  const shelf = boards.length ? boards : [book]
  const allRows = taggedLamps(shelf, tagId)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  const [query, setQuery] = useState('')
  const rows = searchRows(allRows, query)
  const states = useMemo(() => tonightStates(allRows, clock), [shelf, tagId, clock])
  const hasDeadlines = allRows.some((row) => activeDeadline(row.lamp, dateIso))
  const hung = prepQuestionRows(rows.filter((row) => !row.lamp.archived), {
    dateIso,
    deadlineOnly,
  })
  const down = prepQuestionRows(rows.filter((row) => row.lamp.archived), {
    dateIso,
    deadlineOnly,
  })

  function rowClass(row) {
    const state = states.get(rowId(row))
    if (!state) return 'di-jewel'
    if (state === 'did') return 'di-jewel is-on'
    if (state === 'late') return 'di-jewel is-on is-late'
    if (state === 'nope') return 'di-jewel is-skip'
    const urgency = dueByUrgency(row.lamp, dateIso)
    if (urgency === 'today') return 'di-jewel is-due-today'
    if (urgency === 'soon') return 'di-jewel is-due-soon'
    return 'di-jewel'
  }

  function list(items, label) {
    if (!items.length) return null
    return (
      <section className="di-lamp-block">
        <p className="di-slot-label">
          {label} · {items.length}
        </p>
        <ul className="di-lamp-list">
          {items.map((row) => (
            <li key={rowId(row)}>
              <button
                className="di-lamp-row"
                type="button"
                onClick={() =>
                  onOpen ? onOpen(row.boardId, row.lamp.id) : goHash('/lamp', { id: row.lamp.id })
                }
              >
                <span
                  className={rowClass(row)}
                  data-filament={filamentLevel(row.book, row.lamp.id)}
                  aria-hidden="true"
                >
                  <span className="di-jewel-ring">
                    <span className="di-jewel-glass" />
                  </span>
                </span>
                <span className="di-lamp-copy">
                  <span className="di-lamp-name">{shortLabel(row.lamp)}</span>
                  {questionAddsToName(row.lamp) ? <span className="di-lamp-q">{row.lamp.question}</span> : null}
                  <span className="di-lamp-meta">
                    {[shelf.length > 1 ? row.tag : '', cadenceLine(row.lamp), row.lamp.askAfter ? clockWords(row.lamp.askAfter) : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <BoardShell book={book} now={clock} title={tagId ? book.title : 'Did I'} date={formatBoardDate(dateIso)}>
      <section className="di-page">
        <p className="di-face-plate">{t('questions.kicker')}</p>
        <h2 className="di-page-title">{hung.length ? t('questions.title') : t('questions.empty')}</h2>
        <TagRail boards={shelf} tagId={tagId} onTag={onTag} now={clock} />
        {hasDeadlines ? (
          <div className="di-field di-questions-filter">
            <span id="di-questions-filter">{t('questions.filter')}</span>
            <div className="di-hang-chips" role="group" aria-labelledby="di-questions-filter">
              <button
                className={!deadlineOnly ? 'di-key is-pick' : 'di-key'}
                type="button"
                onClick={() => setDeadlineOnly(false)}
              >
                {t('questions.filterAll')}
              </button>
              <button
                className={deadlineOnly ? 'di-key is-pick' : 'di-key'}
                type="button"
                onClick={() => setDeadlineOnly(true)}
              >
                {t('questions.filterDeadline')}
              </button>
            </div>
          </div>
        ) : null}
        {allRows.length ? (
          <label className="di-search">
            <span className="di-search-glyph" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('questions.searchPh')}
              aria-label={t('questions.searchPh')}
            />
            {query ? (
              <button type="button" className="di-search-clear" aria-label={t('questions.searchClear')} onClick={() => setQuery('')}>
                ×
              </button>
            ) : null}
          </label>
        ) : null}
        <div className="di-page-keys">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
            {t('tonight.add')}
          </button>
        </div>
        {hung.length ? (
          list(hung, t('questions.list'))
        ) : query.trim() && allRows.length ? (
          <p className="di-detail-meta">{t('questions.noMatch')}</p>
        ) : deadlineOnly ? (
          <p className="di-detail-meta">{t('questions.emptyDeadline')}</p>
        ) : (
          <>
            <p className="di-detail-meta">{t('questions.hint')}</p>
            <StarterPicks book={book} onChange={onChange} now={clock} />
          </>
        )}
        {list(down, t('questions.down'))}
      </section>
    </BoardShell>
  )
}
