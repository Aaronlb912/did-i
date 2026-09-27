import { useEffect, useMemo, useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import {
  activeDeadline,
  cadenceLine,
  dueByUrgency,
  prepQuestionRows,
  shortLabel,
} from './board-json.js'
import { commitBook } from './achievements.js'
import { bulkLamps, undoBulkLamps } from './board-ops.js'
import { filamentLevel } from './hall-feel.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { clockWords } from './hall-pages.js'
import { questionAddsToName, rowId, searchRows, tonightStates } from './question-list.js'
import { StarterPicks } from './StarterPicks.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { rowKey, taggedLamps } from './tags.js'
import { TagRail } from './TagRail.jsx'

const UNDO_MS = 6000

export function AllLamps({ book, boards = [], tagId = '', onTag, onChange, onChangeBooks, onOpen, now }) {
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
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(() => new Set())
  const [confirm, setConfirm] = useState(false)
  const [undo, setUndo] = useState(null)
  const shown = [...hung, ...down]
  // Only what is on screen counts, so a filter change never acts on hidden rows.
  const chosen = shown.filter((row) => picked.has(rowKey(row)))
  const allOn = shown.length > 0 && chosen.length === shown.length
  const allDown = chosen.length > 0 && chosen.every((row) => row.lamp.archived)

  function stopPicking() {
    setPicking(false)
    setPicked(new Set())
    setConfirm(false)
  }

  useEffect(() => {
    if (!picking) return undefined
    function onKey(event) {
      if (event.key === 'Escape') stopPicking()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picking])

  useEffect(() => {
    if (!undo) return undefined
    const timer = window.setTimeout(() => setUndo(null), UNDO_MS)
    return () => window.clearTimeout(timer)
  }, [undo])

  function pick(row) {
    setPicked((live) => {
      const next = new Set(live)
      const key = rowKey(row)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function apply(kind) {
    if (!chosen.length || !onChangeBooks) return
    const lampPicks = chosen.map((row) => ({ boardId: row.boardId || row.book?.id, lampId: row.lamp.id }))
    const before = shelf.filter((item) => lampPicks.some((one) => one.boardId === item.id))
    onChangeBooks(bulkLamps(shelf, lampPicks, kind).map((item) => commitBook(item, clock)))
    const n = lampPicks.length
    const label =
      kind === 'delete'
        ? t('questions.bulkDeleted', { n })
        : kind === 'stop'
          ? t('questions.bulkStopped', { n })
          : t('questions.bulkAsked', { n })
    setUndo({ id: Date.now(), label, before, picks: lampPicks })
    stopPicking()
  }

  function takeBack() {
    if (!undo || !onChangeBooks) return
    onChangeBooks(undoBulkLamps(shelf, undo.before, undo.picks))
    setUndo(null)
  }

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
                className={picking && picked.has(rowKey(row)) ? 'di-lamp-row is-picked' : 'di-lamp-row'}
                type="button"
                role={picking ? 'checkbox' : undefined}
                aria-checked={picking ? picked.has(rowKey(row)) : undefined}
                onClick={() => {
                  if (picking) {
                    pick(row)
                    return
                  }
                  if (onOpen) onOpen(row.boardId, row.lamp.id)
                  else goHash('/lamp', { id: row.lamp.id })
                }}
              >
                {picking ? (
                  <span className={picked.has(rowKey(row)) ? 'di-pick-box is-on' : 'di-pick-box'} aria-hidden="true">
                    {picked.has(rowKey(row)) ? '✓' : ''}
                  </span>
                ) : null}
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
        {picking ? (
          <div className="di-pick-bar">
            <div className="di-pick-head">
              <strong>{t('questions.pickedN', { n: chosen.length })}</strong>
              <button
                className="di-key"
                type="button"
                onClick={() => setPicked(allOn ? new Set() : new Set(shown.map(rowKey)))}
              >
                {allOn ? t('questions.pickNone') : t('questions.pickAll')}
              </button>
              <button className="di-key" type="button" onClick={stopPicking}>
                {t('questions.pickDone')}
              </button>
            </div>
            <div className="di-pick-head">
              <button
                className="di-key"
                type="button"
                disabled={!chosen.length}
                onClick={() => apply(allDown ? 'ask' : 'stop')}
              >
                {allDown ? t('lamp.askAgain') : t('lamp.stop')}
              </button>
              <button
                className="di-key di-key-danger"
                type="button"
                disabled={!chosen.length}
                onClick={() => setConfirm(true)}
              >
                {t('lamp.delete')}
              </button>
            </div>
          </div>
        ) : (
          <div className="di-page-keys">
            <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
              {t('tonight.add')}
            </button>
            {shown.length && onChangeBooks ? (
              <button className="di-key" type="button" onClick={() => setPicking(true)}>
                {t('questions.pick')}
              </button>
            ) : null}
          </div>
        )}
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
      {confirm ? (
        <div className="di-buy-veil" role="presentation" onClick={() => setConfirm(false)}>
          <div
            className="di-buy-pop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="di-bulk-drop"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="di-bulk-drop" className="di-buy-title">
              {t('questions.bulkDeleteTitle')}
            </h2>
            <p className="di-detail-meta">{t('questions.bulkDeleteBody', { n: chosen.length })}</p>
            <div className="di-hang-actions">
              <button className="di-did di-did-small" type="button" onClick={() => apply('delete')}>
                {t('lamp.delete')}
              </button>
              <button className="di-key" type="button" onClick={() => setConfirm(false)}>
                {t('lamp.keep')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {undo ? (
        <p className="di-undo di-screws-print-hide" role="status">
          <span>{undo.label}</span>
          <button className="di-key" type="button" onClick={takeBack}>
            {t('tonight.undo')}
          </button>
        </p>
      ) : null}
    </BoardShell>
  )
}
