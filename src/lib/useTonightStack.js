import { useEffect, useMemo, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { unlockAchievements } from './achievements.js'
import { byPriority, shortLabel } from './board-json.js'
import { putAnswer } from './board-ops.js'
import { filamentLevel, hallHour, shelfHeat } from './hall-feel.js'
import { bySlot, clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { feelTap, playClick } from './native.js'
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

export const FINISH_FACE = '__finish__'

export function useTonightStack({
  value,
  boards = [],
  tagId = '',
  onChange,
  now,
  focusLampId,
}) {
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
  const { due, ready, waiting, catchUp, heat } = night
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

  useEffect(() => {
    if (hallOn || restNight || skipReview) return
    if (faceId === FINISH_FACE || openReady.length || !finishCount) return
    setFaceId(FINISH_FACE)
  }, [faceId, finishCount, hallOn, openReady.length, restNight, skipReview])

  useEffect(() => {
    if (faceId !== FINISH_FACE) return
    if (hallOn || !finishCount) setFaceId('')
  }, [faceId, finishCount, hallOn])

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

  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    }
  }, [])

  // Back closes an open plate before it leaves the screen.
  useEffect(() => {
    function onBack(event) {
      if (closePlates()) event?.preventDefault?.()
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  }, [titleEdit, holePick, waitPick, pillPick])

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

  const dueWithWait = bySlot(due).map((row) => ({
    ...row,
    waiting: !row.answer && !ready.some((item) => item.lamp.id === row.lamp.id),
  }))

  function nextOpenTime(rows) {
    return [...rows]
      .filter((row) => row.lamp.askAfter)
      .sort((a, b) => a.lamp.askAfter.localeCompare(b.lamp.askAfter))[0]
  }

  let bodyKind = 'idle'
  let holeWasSkip = false
  if (holePick) {
    bodyKind = 'hole'
    const holeBook = holePick.book || bookOf(holePick)
    holeWasSkip = answerFor(holeBook, holePick.lamp.id, holePick.periodKey)?.status === 'skip'
  } else if (waitPick) bodyKind = 'wait'
  else if (pillPick) bodyKind = 'pill'
  else if (empty) bodyKind = 'empty'
  else if (onFinish) bodyKind = 'finish'
  else if (hallOn) bodyKind = 'hall'
  else if (restNight && finishCount > 0) bodyKind = 'rest'
  else if (faceRow) bodyKind = 'face'
  else if (waiting.length) bodyKind = 'waiting'
  else if (due.length === 0) bodyKind = 'off'

  return {
    clock,
    shelf,
    liveValue,
    due,
    ready,
    catchUp,
    heat,
    hour,
    hallOn,
    empty,
    finishCount,
    onFinish,
    faceRow,
    dueWithWait,
    bodyKind,
    holePick,
    holeWasSkip,
    waitPick,
    pillPick,
    titleEdit,
    titleDraft,
    setTitleEdit,
    setTitleDraft,
    undo,
    dateIso,
    mark,
    continueStack,
    restStack,
    jewelClick,
    pickHole,
    saveTitle,
    applyUndo,
    closePlates,
    moveFace,
    bookOf,
    nextOpenTime,
    shortLabel,
    recentPeriodKeys,
    formatBoardDate,
    filamentLevel,
    rowKey,
    waiting,
  }
}
