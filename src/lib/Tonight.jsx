import { useEffect, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { LampFace } from './LampFace.jsx'
import { AppNav } from './AppNav.jsx'
import { StarterPicks } from './StarterPicks.jsx'
import { MastCogs } from './SettingsCog.jsx'
import { WaitPlate } from './WaitPlate.jsx'
import { HolePlate } from './HolePlate.jsx'
import { unlockAchievements } from './achievements.js'
import { shortLabel } from './board-json.js'
import { putAnswer } from './board-ops.js'
import { filamentLevel, hallHeat, hallHour } from './hall-feel.js'
import { HeatPips } from './HeatPips.jsx'
import { bySlot, clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { feelTap, playClick } from './native.js'
import { usePrefs, useTheme } from './prefs.js'
import { normalizePurse } from './purse.js'
import { useReduceMotion } from './useReduceMotion.js'
import {
  allClearTonight,
  boardDate,
  faceReadyTonight,
  formatBoardDate,
  recentPeriodKeys,
  unansweredTonight,
  waitingTonight,
} from './recurrence.js'
import { rowKey, taggedCatchUp, taggedDue } from './tags.js'
import { TagRail } from './TagRail.jsx'
import './did-i.css'

export function Tonight({
  value,
  boards = [],
  tagId = '',
  onTag,
  onChange,
  now,
  focusLampId,
}) {
  usePrefs()
  const theme = useTheme()
  const reduce = useReduceMotion()
  const clock = now || new Date()
  const undoTimer = useRef(null)
  const [faceId, setFaceId] = useState('')
  const [titleEdit, setTitleEdit] = useState(false)
  const [titleDraft, setTitleDraft] = useState(value.title)
  const [undo, setUndo] = useState(null)
  const [holePick, setHolePick] = useState(null)
  const [waitPick, setWaitPick] = useState(null)

  const dateIso = boardDate(clock, value.dayFoldHour)
  const shelf = boards.length ? boards : [value]
  const due = taggedDue(shelf, clock, tagId)
  const unanswered = tagId
    ? unansweredTonight(value, clock)
    : shelf.flatMap((book) => unansweredTonight(book, clock))
  const ready = tagId
    ? faceReadyTonight(value, clock).map((row) => ({ ...row, boardId: value.id, tag: value.title, book: value }))
    : shelf.flatMap((book) =>
        faceReadyTonight(book, clock).map((row) => ({
          ...row,
          boardId: book.id,
          tag: book.title,
          book,
        })),
      )
  const waiting = tagId
    ? waitingTonight(value, clock)
    : shelf.flatMap((book) => waitingTonight(book, clock))
  const catchUp = taggedCatchUp(shelf, clock, tagId)
  const hallOn = (tagId ? [value] : shelf).every((book) => allClearTonight(book, clock))
  const heat = hallHeat(value, clock)
  const hour = hallHour(clock)
  const empty = (tagId ? [value] : shelf).every(
    (book) => (book.lamps || []).filter((lamp) => !lamp.archived).length === 0,
  )

  const faceRow =
    ready.find((row) => row.lamp.id === faceId) ||
    ready.find((row) => rowKey(row) === faceId) ||
    ready[0] ||
    null

  useEffect(() => {
    setTitleDraft(value.title)
  }, [value.title])

  useEffect(() => {
    if (focusLampId) setFaceId(focusLampId)
  }, [focusLampId])

  function closePlates() {
    if (titleEdit || holePick || waitPick) {
      setTitleEdit(false)
      setHolePick(null)
      setWaitPick(null)
      return true
    }
    return false
  }

  useEffect(() => {
    function onBack() {
      if (!closePlates()) goHash('/')
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  })

  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    }
  }, [])

  useEffect(() => {
    function onKey(event) {
      if (event.target.closest('input, textarea, select')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setTitleEdit(false)
        setHolePick(null)
        setWaitPick(null)
        return
      }
      if (event.key === 'u' && undo) {
        event.preventDefault()
        applyUndo()
        return
      }
      if (holePick || waitPick) return
      if (event.key === 'n') {
        event.preventDefault()
        goHash('/add')
        return
      }
      if (!faceRow) return
      if (event.key === 'y' || event.key === ' ') {
        event.preventDefault()
        mark(faceRow, 'yes')
        return
      }
      if (event.key === 's') {
        event.preventDefault()
        mark(faceRow, 'skip')
        return
      }
      if (event.key === 'j' || event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault()
        moveFace(1)
      }
      if (event.key === 'k' || event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault()
        moveFace(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function change(next) {
    onChange(unlockAchievements(next, clock))
  }

  function bookOf(row) {
    return row?.book || shelf.find((item) => item.id === row?.boardId) || value
  }

  function armUndo(payload) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setUndo(payload)
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000)
  }

  function applyUndo() {
    if (!undo) return
    change(undo.book)
    setUndo(null)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
  }

  function mark(row, status) {
    if (!row) return
    const book = bookOf(row)
    const next = putAnswer(book, row, status, clock)
    const wasClear = allClearTonight(book, clock)
    change(next)
    setFaceId('')
    setHolePick(null)
    setWaitPick(null)
    armUndo({ book, label: t('tonight.saved') })
    if (status === 'skip') feelTap('skip')
    else feelTap('did')
    if (book.clickSound && status === 'yes') playClick()
    if (!wasClear && allClearTonight(next, clock)) feelTap('hall-on')
  }

  function moveFace(step) {
    if (!ready.length) return
    const ids = ready.map((row) => row.lamp.id)
    const current = faceRow ? ids.indexOf(faceRow.lamp.id) : 0
    const next = (current + step + ids.length) % ids.length
    setFaceId(ids[next])
  }

  function saveTitle() {
    const title = titleDraft.trim()
    if (!title) {
      setTitleDraft(value.title)
      setTitleEdit(false)
      return
    }
    change({ ...value, title })
    setTitleEdit(false)
  }

  function jewelClick(row) {
    if (row.waiting && !row.answer) {
      setWaitPick(row)
      setHolePick(null)
      return
    }
    if (row.answer) {
      goHash('/lamp', { id: row.lamp.id })
      return
    }
    setFaceId(row.lamp.id)
    setWaitPick(null)
  }

  function pickHole(lamp, periodKey, row) {
    setHolePick({ lamp, periodKey, book: row?.book, boardId: row?.boardId })
    setWaitPick(null)
  }

  const dueWithWait = bySlot(due).map((row) => ({
    ...row,
    waiting: !row.answer && !ready.some((item) => item.lamp.id === row.lamp.id),
  }))
  const answeredCount = due.filter((row) => row.answer).length
  const meterPct = due.length ? (100 * answeredCount) / due.length : 0

  function nextOpenTime(rows) {
    return [...rows]
      .filter((row) => row.lamp.askAfter)
      .sort((a, b) => a.lamp.askAfter.localeCompare(b.lamp.askAfter))[0]
  }

  let body = null
  if (holePick) {
    body = (
      <HolePlate
        lamp={holePick.lamp}
        periodKey={holePick.periodKey}
        onLate={() => mark({ lamp: holePick.lamp, periodKey: holePick.periodKey }, 'late')}
        onSkip={() => mark({ lamp: holePick.lamp, periodKey: holePick.periodKey }, 'skip')}
        onClose={() => setHolePick(null)}
      />
    )
  } else if (waitPick) {
    body = (
      <WaitPlate
        row={waitPick}
        onClose={() => setWaitPick(null)}
        onOpenLamp={() => goHash('/lamp', { id: waitPick.lamp.id })}
      />
    )
  } else if (empty) {
    body = (
      <section className="di-empty">
        <p className="di-face-plate">{t('tonight.emptyKicker')}</p>
        <h2 className="di-question">{t('tonight.emptyTitle')}</h2>
        <StarterPicks book={value} onChange={onChange} now={clock} label={t('first.picks')} />
        <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
          {t('tonight.write')}
        </button>
      </section>
    )
  } else if (faceRow) {
    body = (
      <LampFace
        row={faceRow}
        book={bookOf(faceRow)}
        tag={faceRow.tag}
        keys={recentPeriodKeys(faceRow.lamp, dateIso, 7)}
        onPickHole={pickHole}
        onYes={() => mark(faceRow, 'yes')}
        onSkip={() => mark(faceRow, 'skip')}
      />
    )
  } else if (waiting.length) {
    const next = nextOpenTime(waiting)
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.waitKicker')}</p>
        <h2 className="di-question">{t('tonight.waitTitle')}</h2>
        <p className="di-detail-meta">
          {next
            ? t('tonight.waitOpens', {
                name: shortLabel(next.lamp),
                time: clockWords(next.lamp.askAfter),
              })
            : t('tonight.waitLater')}
        </p>
      </section>
    )
  } else if (due.length === 0) {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.offKicker')}</p>
        <h2 className="di-question">{t('tonight.offTitle')}</h2>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
            {t('home.add')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/lamps')}>
            {t('tonight.seeAll')}
          </button>
        </div>
      </section>
    )
  } else if (hallOn) {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.doneKicker')}</p>
        <h2 className="di-question">{t('tonight.doneTitle')}</h2>
        <p className="di-detail-meta">{t('tonight.doneStreak', { n: heat })}</p>
        <HeatPips heat={heat} />
      </section>
    )
  }

  const purse = normalizePurse(value)

  return (
    <div
      className="di-hall"
      data-heat={heat}
      data-hour={hour}
      data-sit={hallOn ? 'on' : 'ask'}
      data-look={purse.lookOn}
      data-theme={theme}
      {...(reduce ? { 'data-reduce-motion': '' } : {})}
    >
      <div className="di-board" data-heat={heat}>
        <header className="di-mast">
          {titleEdit ? (
            <input
              className="di-title-input"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  saveTitle()
                }
              }}
              aria-label={t('tonight.boardName')}
            />
          ) : (
            <button className="di-title" type="button" onClick={() => setTitleEdit(true)}>
              {tagId ? value.title : t('tonight.didI')}
            </button>
          )}
          <p className="di-date">{formatBoardDate(dateIso)}</p>
          <p className="di-mast-purse">
            {t('tonight.purse', { coins: purse.coins, gems: purse.gems })}
          </p>
          <button className="di-add" type="button" onClick={() => goHash('/add')}>
            {t('tonight.add')}
          </button>
          <MastCogs />
        </header>

        <TagRail boards={shelf} tagId={tagId} onTag={onTag} now={clock} />

        {due.length > 0 ? (
          <div className="di-meter">
            <p className="di-meter-top">
              <span className="di-meter-count">{answeredCount}</span>
              <span className="di-meter-label">
                {t('tonight.meter', { n: due.length })}
              </span>
            </p>
            <div
              className="di-meter-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={due.length}
              aria-valuenow={answeredCount}
              aria-label={t('tonight.meterAria', {
                n: answeredCount,
                total: due.length,
              })}
            >
              <span className="di-meter-fill" style={{ width: `${meterPct}%` }} />
            </div>
          </div>
        ) : null}

        {dueWithWait.length > 0 && !holePick && !waitPick ? (
          <div className="di-edge-wrap">
            <ul className="di-edge" aria-label={t('tonight.aria')}>
              {dueWithWait.map((row) => {
                const on =
                  row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
                const skip = row.answer?.status === 'skip'
                const late = row.answer?.status === 'late'
                const isFace =
                  faceRow && row.lamp.id === faceRow.lamp.id && !holePick && !waitPick
                return (
                  <li key={rowKey(row)}>
                    <button
                      type="button"
                      className={[
                        'di-jewel',
                        on ? 'is-on' : '',
                        skip ? 'is-skip' : '',
                        late ? 'is-late' : '',
                        row.waiting ? 'is-wait' : '',
                        isFace ? 'is-face' : '',
                        hallOn && on ? 'is-sit' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-filament={on ? filamentLevel(bookOf(row), row.lamp.id) : 0}
                      onClick={() => jewelClick(row)}
                    >
                      <span className="di-jewel-ring">
                        <span className="di-jewel-glass" />
                      </span>
                      <span className="di-jewel-label">
                        {shortLabel(row.lamp)}
                        {row.tag && shelf.length > 1 ? <i className="di-lamp-tag">{row.tag}</i> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {catchUp.length > 0 && !holePick && !waitPick ? (
          <div className="di-holes" aria-label="Last time">
            <p className="di-slot-label">{t('tonight.lastNight')}</p>
            <ul className="di-edge">
              {catchUp.map((row) => (
                <li key={rowKey(row)}>
                  <button
                    type="button"
                    className="di-jewel is-hole"
                    onClick={() => pickHole(row.lamp, row.periodKey, row)}
                  >
                    <span className="di-jewel-ring">
                      <span className="di-jewel-glass" />
                    </span>
                    <span className="di-jewel-label">{shortLabel(row.lamp)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {body}

        {undo ? (
          <p className="di-undo di-screws-print-hide">
            {undo.label}{' '}
            <button className="di-key" type="button" onClick={applyUndo}>
              {t('tonight.undo')}
            </button>
          </p>
        ) : null}

        <AppNav />
      </div>

      <ol className="di-print-slip">
        <li className="di-print-title">{value.title} · {formatBoardDate(dateIso)}</li>
        {unanswered.length ? (
          unanswered.map((row) => (
            <li key={row.lamp.id}>
              <span className="di-print-box" />
              {row.lamp.question}
            </li>
          ))
        ) : (
          <li>Nothing left unanswered tonight.</li>
        )}
      </ol>
    </div>
  )
}
