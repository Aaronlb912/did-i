import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { liveLampCount } from './board-shelf.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { leftoverOn } from './tags.js'

export function Boards({
  book,
  boards,
  now,
  onSelect,
  onAdd,
  onRemove,
  onChange,
  onStartEmpty,
}) {
  usePrefs()
  const [addMiss, setAddMiss] = useState('')
  const clock = now || new Date()
  const [confirm, setConfirm] = useState(null)
  const [titleDraft, setTitleDraft] = useState(book.title)

  useBackDismiss(Boolean(confirm), () => setConfirm(null))

  useEffect(() => {
    setTitleDraft(book.title)
  }, [book.title, book.id])

  function saveTitle() {
    const title = titleDraft.trim()
    if (!title) {
      setTitleDraft(book.title)
      return
    }
    if (title === book.title) return
    // Same name as another folder: saving would merge the two.
    if ((boards || []).some((item) => item.id !== book.id && String(item.title || '').trim().toLowerCase() === title.toLowerCase())) {
      setAddMiss(t('boards.addSame'))
      setTitleDraft(book.title)
      return
    }
    setAddMiss('')
    onChange({ ...book, title, at: new Date().toISOString() })
  }

  const live = (boards || []).filter((item) => !item.archived)
  const parked = (boards || []).filter((item) => item.archived)
  if (confirm) {
    return (
      <BoardShell
        book={book}
        now={clock}
        title={book.title}
        date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
      >
        <section className="di-face">
          <p className="di-face-plate">{confirm.kicker}</p>
          <h2 className="di-question">{confirm.title}</h2>
          <p className="di-detail-meta">{confirm.body}</p>
          <div className="di-hang-actions">
            <button
              className="di-did di-did-small"
              type="button"
              onClick={() => {
                confirm.go()
                setConfirm(null)
              }}
            >
              {confirm.yes}
            </button>
            <button className="di-key" type="button" onClick={() => setConfirm(null)}>
              {t('settings.neverMind')}
            </button>
          </div>
        </section>
      </BoardShell>
    )
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-boards">
        <p className="di-face-plate">{t('boards.kicker')}</p>
        <h2 className="di-page-title">{t('boards.title')}</h2>

        <div className="di-board-stack" aria-label={t('boards.kicker')}>
          {live.map((item) => {
            const left = leftoverOn(boards, clock, item.id)
            const n = liveLampCount(item)
            const on = item.id === book.id
            return (
              <article
                key={item.id}
                data-board-id={item.id}
                className={on ? 'di-board-card is-on' : 'di-board-card'}
              >
                <button
                  className="di-board-pick"
                  type="button"
                  onClick={() => {
                    onSelect(item.id)
                    goHash('/tonight', { tag: item.id })
                  }}
                >
                  <p className="di-face-plate">{on ? t('boards.thisOne') : t('boards.one')}</p>
                  <h3 className="di-question">{item.title}</h3>
                  <p className="di-detail-meta">
                    {n === 1 ? t('boards.qOne') : t('boards.qMany', { n })}
                    {' · '}
                    {left === 0
                      ? t('boards.leftNone')
                      : left === 1
                        ? t('boards.leftOne')
                        : t('boards.leftMany', { n: left })}
                  </p>
                </button>
                {on ? (
                  <>
                    <label className="di-field">
                      <span>{t('boards.name')}</span>
                      <input
                        key={book.id}
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            saveTitle()
                          }
                        }}
                      />
                    </label>
                  </>
                ) : null}
              </article>
            )
          })}
          <button
            className="di-board-card di-board-add"
            type="button"
            onClick={() => setAddMiss(onAdd() || '')}
          >
            <p className="di-face-plate">{t('boards.new')}</p>
            <h3 className="di-question">{t('boards.add')}</h3>
            <p className="di-detail-meta">{t('boards.addHint')}</p>
          </button>
        </div>

        {addMiss ? (
          <p className="di-miss" role="alert">
            {addMiss}
          </p>
        ) : null}

        {parked.length ? (
          <div className="di-group">
            <p className="di-slot-label">{t('tags.putAway')}</p>
            <p className="di-set-note">{t('tags.putAwayHint')}</p>
            <div className="di-set-card">
              {parked.map((item) => (
                <button
                  key={item.id}
                  className="di-set-row is-miss"
                  type="button"
                  onClick={() =>
                    setConfirm({
                      kicker: t('boards.removeKicker'),
                      title: t('boards.removeTitle', { title: item.title }),
                      body: t('boards.removeBody'),
                      yes: t('boards.removeYes'),
                      go: () => onRemove(item.id),
                    })
                  }
                >
                  <span className="di-set-copy">
                    <span>{item.title}</span>
                  </span>
                  <span className="di-set-end">
                    <span className="di-set-val">{t('boards.remove')}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="di-group">
          <p className="di-slot-label">{t('boards.this')}</p>
          <div className="di-tray-files">
            <button className="di-key" type="button" onClick={() => goHash('/home')}>
              {t('boards.home')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/tonight')}>
              {t('boards.tonight')}
            </button>
            {boards.length > 1 ? (
              <button
                className="di-key"
                type="button"
                onClick={() =>
                  setConfirm({
                    kicker: t('boards.removeKicker'),
                    title: t('boards.removeTitle', { title: book.title }),
                    body: t('boards.removeBody'),
                    yes: t('boards.removeYes'),
                    go: () => onRemove(book.id),
                  })
                }
              >
                {t('boards.remove')}
              </button>
            ) : null}
            {onStartEmpty ? (
              <button
                className="di-key"
                type="button"
                onClick={() =>
                  setConfirm({
                    kicker: t('settings.startOver'),
                    title: t('settings.clearFolderTitle', { name: book.title }),
                    body: t('settings.clearFolderBody', { name: book.title }),
                    yes: t('settings.clearYes'),
                    go: onStartEmpty,
                  })
                }
              >
                {t('settings.emptyBoard')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="di-group">
          <p className="di-slot-label">{t('boards.look')}</p>
          <div className="di-tray-files">
            <button className="di-key" type="button" onClick={() => goHash('/calendar')}>
              {t('boards.calendar')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/week')}>
              {t('boards.week')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/streaks')}>
              {t('boards.streaks')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/stats')}>
              {t('boards.stats')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/feed')}>
              {t('boards.feed')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/marks')}>
              {t('boards.marks')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/later')}>
              {t('boards.later')}
            </button>
          </div>
        </div>
      </section>
    </BoardShell>
  )
}
