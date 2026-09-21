import { useState } from 'react'
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
import { boardDate, dueTonight, formatBoardDate } from './recurrence.js'
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
  const rows = taggedLamps(shelf, tagId)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  const hasDeadlines = rows.some((row) => activeDeadline(row.lamp, dateIso))
  const hung = prepQuestionRows(rows.filter((row) => !row.lamp.archived), {
    dateIso,
    deadlineOnly,
  })
  const down = prepQuestionRows(rows.filter((row) => row.lamp.archived), {
    dateIso,
    deadlineOnly,
  })

  function rowClass(row) {
    const due = dueTonight(row.book, clock)
    const hit = due.find((item) => item.lamp.id === row.lamp.id)
    if (!hit) return 'di-jewel'
    if (hit.answer && (hit.answer.status === 'yes' || hit.answer.status === 'late')) {
      return hit.answer.status === 'late' ? 'di-jewel is-on is-late' : 'di-jewel is-on'
    }
    if (hit.answer?.status === 'skip') return 'di-jewel is-skip'
    const urgency = dueByUrgency(row.lamp, dateIso)
    if (urgency === 'today') return 'di-jewel is-due-today'
    if (urgency === 'soon') return 'di-jewel is-due-soon'
    return 'di-jewel'
  }

  function list(items, label) {
    if (!items.length) return null
    return (
      <section className="di-lamp-block">
        <p className="di-slot-label">{label}</p>
        <ul className="di-lamp-list">
          {items.map((row) => (
            <li key={`${row.boardId}:${row.lamp.id}`}>
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
                  <span className="di-lamp-meta">
                    {shelf.length > 1 ? `${row.tag} · ` : ''}
                    {cadenceLine(row.lamp)}
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
        <div className="di-page-keys">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
            {t('tonight.add')}
          </button>
        </div>
        {hung.length ? (
          list(hung, t('questions.list'))
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
