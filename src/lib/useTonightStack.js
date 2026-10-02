import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { unlockAchievements } from './achievements.js'
import { byAskTime, mustSwipeDeadline, shortLabel, hasAnyTopic } from './board-json.js'
import { putAnswer } from './board-ops.js'
import { reportRejection } from './report.js'
import { filamentLevel, hallHour, shelfHeat, shelfStreak } from './hall-feel.js'
import { deliverStreakHit, maybeStreakHit } from './streak-moments.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { feelTap, playClick } from './native.js'
import {
  allClearTonight,
  answerFor,
  askAfterPassed,
  boardDate,
  didStatusForRow,
  dueClearTonight,
  faceSwipeTonight,
  finishStackCount,
  formatBoardDate,
  recentPeriodKeys,
  shouldFinishAfterNope,
  unansweredTonight,
  waitingTonight,
} from './recurrence.js'
import { rowKey, taggedCatchUp, taggedDue, scopedBooks } from './tags.js'

// How long an answer can be taken back.
export const UNDO_MS = 6000

export const FINISH_FACE = '__finish__'

export function useTonightStack({
  value,
  boards = [],
  tagId = '',
  topics = [],
  onChange,
  now,
  focusLampId,
  focusKey,
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
  // Set when a Did clears the night right here, so the done card can play
  // the moment once instead of every time Tonight opens on a clear night.
  const [cheer, setCheer] = useState(null)
  const cheered = useCallback(() => setCheer(null), [])
  // Noped questions set aside one by one from the still-open list tonight.
  const [leftKeys, setLeftKeys] = useState([])
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
  // Topic picks narrow tonight to questions with any of those topics.
  const topicKey = topics.join('|')
  const night = useMemo(
    () => {
      const keep = (row) => hasAnyTopic(row.lamp, topics)
      return {
        due: taggedDue(shelf, clock, tagId).filter(keep),
        unanswered: scopedBooks(shelf, tagId).flatMap((book) => unansweredTonight(book, clock)).filter(keep),
        ready: byAskTime(
          scopedBooks(shelf, tagId).flatMap((book) =>
            faceSwipeTonight(book, clock).map((row) => ({
              ...row,
              boardId: book.id,
              tag: book.title,
              book,
            })),
          ),
        ).filter(keep),
        waiting: scopedBooks(shelf, tagId).flatMap((book) => waitingTonight(book, clock)).filter(keep),
        catchUp: taggedCatchUp(shelf, clock, tagId).filter(keep),
        heat: shelfHeat(shelf, clock, tagId),
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, liveValue, tagId, topicKey, dateIso, minute],
  )
  const { due, unanswered, ready, waiting, catchUp, heat } = night
  const hallOn = dueClearTonight(due)
  // A walk back through the nights, so only once tonight is clear.
  const streak = useMemo(
    () => (hallOn ? shelfStreak(shelf, clock, tagId) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, tagId, dateIso, hallOn],
  )
  const openReady = ready.filter((row) => !row.answer)
  const finishCount = useMemo(() => {
    const books = boards.length ? boards : [value]
    const persistedReady = scopedBooks(books, tagId)
      .flatMap((book) => faceSwipeTonight(book, clock))
      .filter((row) => hasAnyTopic(row.lamp, topics))
    return finishStackCount(persistedReady)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, value, tagId, topicKey, dateIso, minute])
  const onFinish = faceId === FINISH_FACE && finishCount > 0 && !hallOn
  const hour = hallHour(clock)
  const empty = scopedBooks(shelf, tagId).every(
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
  }, [focusLampId, focusKey])

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
    setLeftKeys([])
  }, [dateIso])

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
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }

  function applyUndo() {
    if (!undo) return
    setOverlay(undo.book)
    change(undo.book)
    setUndo(null)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    feelTap('undo')
  }

  function mark(row, status) {
    if (!row) return
    const book = bookOf(row)
    const liveAnswer = answerFor(book, row.lamp.id, row.periodKey)
    if (
      status === 'skip' &&
      (liveAnswer?.status === 'yes' || liveAnswer?.status === 'late')
    ) {
      return
    }
    const ids = ready.map((item) => item.lamp.id)
    const at = ready.findIndex((item) => rowKey(item) === rowKey(row))
    const wasSkip = liveAnswer?.status === 'skip'
    const finalStatus =
      status === 'yes' ? didStatusForRow({ ...row, answer: liveAnswer || row.answer }) : status

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
    const clears = !wasClear && allClearTonight(next, clock)
    // One success when the night clears, not a Did and then a second one.
    if (finalStatus === 'skip') feelTap('skip')
    else if (!clears) feelTap('did')
    if (book.clickSound && finalStatus === 'yes') playClick()
    if (clears) {
      feelTap('hall-on')
      const afterBooks = shelf.map((item) => (item.id === next.id ? next : item))
      const afterStreak = shelfStreak(afterBooks, clock, tagId)
      if (afterStreak > 0) setCheer({ dateIso, from: afterStreak - 1, to: afterStreak })
      const hit = maybeStreakHit({
        beforeHeat: shelfStreak(shelf, clock, tagId),
        afterHeat: afterStreak,
        clearedTonight: true,
        dateIso,
      })
      if (hit) deliverStreakHit(hit, dateIso).catch(reportRejection('streak-hit'))
    }
  }

  function continueStack() {
    setRestNight(false)
    if (openReady.length > 0) {
      setSkipReview(false)
      setFaceId(openReady[0].lamp.id)
      feelTap('tick')
      return
    }
    const skipped = ready.find((row) => row.answer?.status === 'skip')
    if (skipped) {
      setSkipReview(true)
      setFaceId(skipped.lamp.id)
      feelTap('tick')
      return
    }
    setFaceId('')
  }

  function restStack() {
    setRestNight(true)
    setSkipReview(false)
    setFaceId('')
    feelTap('tick')
  }

  // The still-open list: each noped question with its own way out.
  const stillOpen = ready.filter((row) => row.answer?.status === 'skip' && !leftKeys.includes(rowKey(row)))

  // Did it after all: saved as late (the blue dot), and the list stays put
  // instead of turning the next nope back into a card.
  function lateFromList(row) {
    mark(row, 'yes')
    setSkipReview(false)
    setFaceId(FINISH_FACE)
  }

  // The nope stands for this one; the list lets it go.
  function leaveFromList(row) {
    const key = rowKey(row)
    setLeftKeys((keys) => (keys.includes(key) ? keys : [...keys, key]))
    if (stillOpen.every((item) => rowKey(item) === key)) restStack()
    else feelTap('tick')
  }

  // Back from resting: new open questions first, else the list again.
  function reopenStillOpen() {
    if (openReady.length > 0) {
      continueStack()
      return
    }
    setRestNight(false)
    setLeftKeys([])
    setSkipReview(false)
    setFaceId(FINISH_FACE)
    feelTap('tick')
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

  // Deadlines that are not due tonight go at the end of the pills, after
  // tonight's real questions.
  const slotted = byAskTime(due)
  const notDueYet = (row) => !mustSwipeDeadline(row.lamp, row.dateIso)
  const dueWithWait = [...slotted.filter((row) => !notDueYet(row)), ...slotted.filter(notDueYet)].map(
    (row) => ({
      ...row,
      waiting: !row.answer && !askAfterPassed(row.lamp, clock),
      optionalDeadline: !row.answer && notDueYet(row),
    }),
  )

  // The open questions waiting behind the face card, in the order they come up.
  const upNext = faceRow ? openReady.filter((row) => rowKey(row) !== rowKey(faceRow)) : []

  const activePillPick = pillPick
    ? due.find((row) => rowKey(row) === rowKey(pillPick)) || null
    : null

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
  // A noped question opens as a card you can still swipe Did on (late);
  // only a did is view-only.
  else if (activePillPick?.answer && activePillPick.answer.status !== 'skip') bodyKind = 'pillView'
  else if (activePillPick) bodyKind = 'pill'
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
    unanswered,
    ready,
    catchUp,
    heat,
    streak,
    cheer: cheer && cheer.dateIso === dateIso && hallOn ? cheer : null,
    cheered,
    hour,
    hallOn,
    empty,
    finishCount,
    onFinish,
    faceRow,
    upNext,
    dueWithWait,
    bodyKind,
    holePick,
    holeWasSkip,
    waitPick,
    pillPick: activePillPick,
    titleEdit,
    titleDraft,
    setTitleEdit,
    setTitleDraft,
    undo,
    dateIso,
    mark,
    continueStack,
    restStack,
    stillOpen,
    lateFromList,
    leaveFromList,
    reopenStillOpen,
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
