import { useEffect, useMemo, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { FinishFace } from './FinishFace.jsx'
import { LampFace } from './LampFace.jsx'
import { PillPlate } from './PillPlate.jsx'
import { DIT_ENABLED } from './features.js'
import { FamilyTonight } from './FamilyTonight.jsx'
import { StarterPicks } from './StarterPicks.jsx'
import { MastCogs } from './SettingsCog.jsx'
import { WaitPlate } from './WaitPlate.jsx'
import { HolePlate } from './HolePlate.jsx'
import { unlockAchievements } from './achievements.js'
import { activeBuddy, activeLook } from './dit-board.js'
import { byPriority, shortLabel } from './board-json.js'
import { putAnswer } from './board-ops.js'
import { filamentLevel, hallHour, shelfHeat } from './hall-feel.js'
import { bySlot, clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { NightMeter } from './NightMeter.jsx'
import { useAccount } from './account.js'
import { useSync } from './cloud-sync.js'
import { feelTap, playClick } from './native.js'
import { usePrefs, useTheme } from './prefs.js'
import { PurseLine } from './PurseLine.jsx'
import { mergePurses } from './purse.js'
import { WeekStrip } from './WeekStrip.jsx'
import { useReduceMotion } from './useReduceMotion.js'
import {
  allClearTonight,
  answerFor,
  boardDate,
  didStatusForRow,
  dueClearTonight,
  faceReadyTonight,
  finishStackCount,
  formatBoardDate,
  recentPeriodKeys,
  shouldFinishAfterNope,
  unansweredTonight,
  waitingTonight,
} from './recurrence.js'
import { rowKey, taggedCatchUp, taggedDue } from './tags.js'
import { TagRail } from './TagRail.jsx'
import './did-i.css'

const FINISH_FACE = '__finish__'

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
  const account = useAccount()
  const sync = useSync()
  const clock = now || new Date()
  const undoTimer = useRef(null)
  const [faceId, setFaceId] = useState('')
  const [skipReview, setSkipReview] = useState(false)
  const [restNight, setRestNight] = useState(false)
  const [titleEdit, setTitleEdit] = useState(false)
  const [titleDraft, setTitleDraft] = useState(value.title)
  const [undo, setUndo] = useState(null)
  const [holePick, setHolePick] = useState(null)
  const [waitPick, setWaitPick] = useState(null)
  const [pillPick, setPillPick] = useState(null)
  const [overlay, setOverlay] = useState(null)
  const dateIso = boardDate(clock)
  const liveValue = overlay && overlay.id === value.id ? overlay : value
  const shelf = useMemo(
    () =>
      (boards.length ? boards : [value]).map((book) =>
        overlay && book.id === overlay.id ? overlay : book,
      ),
    [boards, value, overlay],
  )

  // Working out tonight walks every question and every answer. Doing that
  // again for a keystroke or a swipe frame is what makes a phone stutter.
  // A question with an ask-after time still has to move from waiting to
  // ready on its own, so the minute is part of the key.
  const minute = Math.floor(clock.getTime() / 60000)
  const night = useMemo(
    () => ({
      due: taggedDue(shelf, clock, tagId),
      unanswered: tagId
        ? unansweredTonight(liveValue, clock)
        : shelf.flatMap((book) => unansweredTonight(book, clock)),
      ready: byPriority(
        tagId
          ? faceReadyTonight(liveValue, clock).map((row) => ({
              ...row,
              boardId: liveValue.id,
              tag: liveValue.title,
              book: liveValue,
            }))
          : shelf.flatMap((book) =>
              faceReadyTonight(book, clock).map((row) => ({
                ...row,
                boardId: book.id,
                tag: book.title,
                book,
              })),
            ),
      ),
      waiting: tagId
        ? waitingTonight(liveValue, clock)
        : shelf.flatMap((book) => waitingTonight(book, clock)),
      catchUp: taggedCatchUp(shelf, clock, tagId),
      heat: shelfHeat(shelf, clock, tagId),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, liveValue, tagId, dateIso, minute],
  )
  const { due, unanswered, ready, waiting, catchUp, heat } = night
  const hallOn = dueClearTonight(due)
  const openReady = ready.filter((row) => !row.answer)
  const finishCount = finishStackCount(ready)
  const onFinish = faceId === FINISH_FACE && finishCount > 0 && !hallOn
  const hour = hallHour(clock)
  const empty = (tagId ? [liveValue] : shelf).every(
    (book) => (book.lamps || []).filter((lamp) => !lamp.archived).length === 0,
  )

  const pickedRow =
    faceId && faceId !== FINISH_FACE
      ? ready.find((row) => row.lamp.id === faceId) ||
        ready.find((row) => rowKey(row) === faceId)
      : null
  const faceRow =
    hallOn || faceId === FINISH_FACE
      ? null
      : openReady.length > 0
        ? skipReview && pickedRow?.answer?.status === 'skip'
          ? pickedRow
          : pickedRow && !pickedRow.answer
            ? pickedRow
            : openReady[0]
        : pickedRow || ready[0] || null

  useEffect(() => {
    setTitleDraft(value.title)
  }, [value.title])

  useEffect(() => {
    if (focusLampId) setFaceId(focusLampId)
  }, [focusLampId])

  useEffect(() => {
    if (skipReview || faceId === FINISH_FACE || hallOn || !openReady.length) return
    const picked = ready.find((row) => row.lamp.id === faceId)
    if (picked?.answer?.status === 'skip') setFaceId(openReady[0].lamp.id)
  }, [faceId, hallOn, openReady, ready, skipReview])

  // Landing on a stack that is all nopes, with nothing open, is the same
  // place a nope lap ends. Ask rather than leave the slot blank.
  useEffect(() => {
    if (hallOn || restNight || skipReview) return
    if (faceId === FINISH_FACE || openReady.length || !finishCount) return
    setFaceId(FINISH_FACE)
  }, [faceId, finishCount, hallOn, openReady.length, restNight, skipReview])

  // Nothing left to finish, so the prompt has no question to send you back to.
  useEffect(() => {
    if (faceId !== FINISH_FACE) return
    if (hallOn || !finishCount) setFaceId('')
  }, [faceId, finishCount, hallOn])

  // A fresh question, a cleared night, or a new day puts the stack back.
  useEffect(() => {
    setRestNight(false)
  }, [dateIso, hallOn, openReady.length > 0])

  useEffect(() => {
    if (!overlay) return
    const incoming = (boards.length ? boards : [value]).find((book) => book.id === overlay.id)
    if (!incoming) {
      setOverlay(null)
      return
    }
    if ((incoming.answers || []).length >= (overlay.answers || []).length) setOverlay(null)
  }, [boards, overlay, value])

  function closePlates() {
    if (titleEdit || holePick || waitPick || pillPick) {
      setTitleEdit(false)
      setHolePick(null)
      setWaitPick(null)
      setPillPick(null)
      return true
    }
    return false
  }

  useEffect(() => {
    function onBack(event) {
      if (closePlates()) {
        event.preventDefault()
        return
      }
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
        setPillPick(null)
        return
      }
      if (event.key === 'u' && undo) {
        event.preventDefault()
        applyUndo()
        return
      }
      if (holePick || waitPick || pillPick) return
      if (event.key === 'n') {
        event.preventDefault()
        goHash('/add')
        return
      }
      if (onFinish) {
        if (event.key === ' ' || event.key === 'Enter' || event.key === 'y') {
          event.preventDefault()
          continueStack()
        }
        if (event.key === 's' || event.key === 'Escape') {
          event.preventDefault()
          restStack()
        }
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
    setOverlay(undo.book)
    change(undo.book)
    setUndo(null)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
  }

  function mark(row, status) {
    if (!row) return
    const book = bookOf(row)
    const ids = ready.map((item) => item.lamp.id)
    const at = ids.indexOf(row.lamp.id)
    const wasSkip = row?.answer?.status === 'skip'
    const finalStatus = status === 'yes' ? didStatusForRow(row) : status

    if (finalStatus === 'skip' && shouldFinishAfterNope(ready, row, at)) {
      setFaceId(FINISH_FACE)
      setSkipReview(false)
    } else if (finalStatus === 'skip' && at >= 0 && ids.length > 1) {
      setFaceId(ids[(at + 1) % ids.length])
      setSkipReview(false)
    } else if (finalStatus === 'late' && wasSkip) {
      const nextSkip = ready.find(
        (item) => item.lamp.id !== row.lamp.id && item.answer?.status === 'skip',
      )
      if (nextSkip) {
        setSkipReview(true)
        setFaceId(nextSkip.lamp.id)
      } else {
        setSkipReview(false)
        setFaceId('')
      }
    } else {
      setFaceId('')
      setSkipReview(false)
    }
    setRestNight(false)
    const next = putAnswer(book, row, finalStatus, clock)
    const wasClear = allClearTonight(book, clock)
    setOverlay(next)
    change(next)
    setHolePick(null)
    setWaitPick(null)
    setPillPick(null)
    armUndo({ book, label: t('tonight.saved') })
    if (finalStatus === 'skip') feelTap('skip')
    else feelTap('did')
    if (book.clickSound && finalStatus === 'yes') playClick()
    if (!wasClear && allClearTonight(next, clock)) feelTap('hall-on')
  }

  // Back into the stack: the first open question, else the first nope for
  // a second look. skipReview is what keeps the prompt from firing again.
  function continueStack() {
    setRestNight(false)
    if (openReady.length > 0) {
      setSkipReview(false)
      setFaceId(openReady[0].lamp.id)
      feelTap('did')
      return
    }
    const skipped = ready.find((row) => row.answer?.status === 'skip')
    if (skipped) {
      setSkipReview(true)
      setFaceId(skipped.lamp.id)
      feelTap('did')
      return
    }
    setFaceId('')
  }

  function restStack() {
    setRestNight(true)
    setSkipReview(false)
    setFaceId('')
    feelTap('skip')
  }

  function moveFace(step) {
    if (!ready.length) return
    const ids = ready.map((row) => row.lamp.id)
    const current = faceRow ? ids.indexOf(faceRow.lamp.id) : 0
    const next = (current + step + ids.length) % ids.length
    const nextRow = ready[next]
    setRestNight(false)
    setSkipReview(nextRow?.answer?.status === 'skip')
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
      setPillPick(null)
      return
    }
    if (pillPick && rowKey(pillPick) === rowKey(row)) {
      setPillPick(null)
      return
    }
    setRestNight(false)
    setWaitPick(null)
    setHolePick(null)
    setPillPick(row)
  }

  function pickHole(lamp, periodKey, row) {
    setHolePick({ lamp, periodKey, book: row?.book, boardId: row?.boardId })
    setWaitPick(null)
  }

  const dueWithWait = bySlot(due).map((row) => ({
    ...row,
    waiting: !row.answer && !ready.some((item) => item.lamp.id === row.lamp.id),
  }))

  function nextOpenTime(rows) {
    return [...rows]
      .filter((row) => row.lamp.askAfter)
      .sort((a, b) => a.lamp.askAfter.localeCompare(b.lamp.askAfter))[0]
  }

  let body = null
  if (holePick) {
    const holeBook = holePick.book || bookOf(holePick)
    const wasSkip = answerFor(holeBook, holePick.lamp.id, holePick.periodKey)?.status === 'skip'
    body = (
      <HolePlate
        lamp={holePick.lamp}
        periodKey={holePick.periodKey}
        wasSkip={wasSkip}
        onLate={() => mark({ lamp: holePick.lamp, periodKey: holePick.periodKey, book: holeBook }, 'late')}
        onSkip={
          wasSkip
            ? undefined
            : () => mark({ lamp: holePick.lamp, periodKey: holePick.periodKey, book: holeBook }, 'skip')
        }
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
  } else if (pillPick) {
    body = (
      <PillPlate
        row={pillPick}
        buddy={activeBuddy(bookOf(pillPick))}
        onDid={() => mark(pillPick, 'yes')}
        onNope={() => mark(pillPick, 'skip')}
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
  } else if (onFinish) {
    body = <FinishFace count={finishCount} onContinue={continueStack} onRest={restStack} />
  } else if (hallOn) {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.doneKicker')}</p>
        <h2 className="di-question">{t('tonight.doneTitle')}</h2>
      </section>
    )
  } else if (restNight && finishCount > 0) {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.restKicker')}</p>
        <h2 className="di-question">
          {finishCount === 1
            ? t('tonight.restOne')
            : t('tonight.restTitle', { n: finishCount })}
        </h2>
        <p className="di-detail-meta">{t('tonight.restHint')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={continueStack}>
            {t('tonight.finishKeep')}
          </button>
        </div>
      </section>
    )
  } else if (faceRow) {
    body = (
      <LampFace
        key={`${rowKey(faceRow)}:${faceRow.periodKey}:${faceRow.answer?.status || 'open'}`}
        row={faceRow}
        book={bookOf(faceRow)}
        tag={faceRow.tag}
        keys={recentPeriodKeys(faceRow.lamp, dateIso, 7)}
        buddy={activeBuddy(bookOf(faceRow))}
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
  } else {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.didI')}</p>
        <h2 className="di-question">{t('tonight.waitTitle')}</h2>
      </section>
    )
  }

  const purse = mergePurses(shelf)

  return (
    <div
      className="di-hall"
      data-heat={heat}
      data-hour={hour}
      data-sit={hallOn ? 'on' : 'ask'}
      data-look={activeLook(liveValue)}
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
          <div className="di-mast-actions">
            <PurseLine purse={purse} className="di-mast-purse" gemsLink />
            <MastCogs showAdd />
          </div>
        </header>

        {account.user && sync.how === 'miss' ? (
          <p className="di-set-note di-off-line">{t('tonight.syncMiss')}</p>
        ) : null}

        <TagRail boards={shelf} tagId={tagId} onTag={onTag} now={clock} />

        <NightMeter due={due} />

        {dueWithWait.length > 0 && !holePick && !waitPick ? (
          <div className="di-edge-wrap">
            <ul className="di-edge" aria-label={t('tonight.aria')}>
              {dueWithWait.map((row) => {
                const on =
                  row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
                const skip = row.answer?.status === 'skip'
                const late = row.answer?.status === 'late'
                const isFace = pillPick
                  ? rowKey(row) === rowKey(pillPick)
                  : Boolean(faceRow) && row.lamp.id === faceRow.lamp.id && !holePick && !waitPick
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
          <div className="di-holes" aria-label={t('tonight.holesAria')}>
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

        <div className="di-face-slot">{body}</div>

        {undo ? (
          <p className="di-undo di-screws-print-hide">
            {undo.label}{' '}
            <button className="di-key" type="button" onClick={applyUndo}>
              {t('tonight.undo')}
            </button>
          </p>
        ) : null}

        {DIT_ENABLED ? <FamilyTonight /> : null}

        <WeekStrip boards={shelf} tagId={tagId} now={clock} />
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
          <li>{t('tonight.printDone')}</li>
        )}
      </ol>
    </div>
  )
}
