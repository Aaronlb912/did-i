import { ANSWER_UNDO_MS } from './undo-times.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { unlockAchievements } from './achievements.js'
import { byAskTime, mustSwipeDeadline, shortLabel, hasAnyTopic } from './board-json.js'
import { putAnswer, setAnswerNote } from './board-ops.js'
import { takeBackAnswer } from './answer-log.js'
import { reportRejection } from './report.js'
import { markedToast, toastName } from './pill-status.js'
import { filamentLevel, hallHour, shelfHeat, shelfStreak } from './hall-feel.js'
import { isStreakMilestone } from './streak-milestones.js'
import { clearStreakSeen, deliverStreakHit, maybeStreakHit } from './streak-moments.js'
import { clockWords } from './hall-pages.js'
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
  isEvery,
  unansweredTonight,
  waitingTonight,
} from './recurrence.js'
import { rowKey, taggedCatchUp, taggedDue, scopedBooks } from './tags.js'
import { graceRowsFor } from './grace.js'
import { graceFirst as graceFirstAt, graceNightIso } from './recurrence.js'
import { onWeNights, weNight } from './we-nights.js'

// Yesterday cards set aside with Not yet, by day.
const graceSetAside = new Map()

// How long an answer can be taken back.
export const UNDO_MS = ANSWER_UNDO_MS

export const FINISH_FACE = '__finish__'

// Undo puts back only the one answer (and what the tap paid) on the live
// folder, so nothing answered elsewhere in the window is lost.
export function undoneBook(live, undo) {
  const old = undo.book
  // What the tap itself added; other taps in the window stay.
  const gone = (key) => Math.max(0, (Number(undo.after?.[key]) || 0) - (Number(old[key]) || 0))
  const lessened = (key) => Math.max(0, (Number(live[key]) || 0) - gone(key))
  const untouched = !undo.after || (undo.after.cheerUses ?? 0) === (live.cheerUses ?? 0)
  const same = (item) => item.lampId === undo.lampId && item.periodKey === undo.periodKey
  const before = (old.answers || []).find(same)
  return {
    ...live,
    answers: [...(live.answers || []).filter((item) => !same(item)), ...(before ? [before] : [])],
    coins: lessened('coins'),
    cheerUses: lessened('cheerUses'),
    ...(untouched ? { cheerStages: old.cheerStages, cheerStage: old.cheerStage } : {}),
  }
}

// Up to three answers can be taken back, newest first.
export const UNDO_DEPTH = 3
export function pushUndo(stack, entry) {
  return [entry, ...stack].slice(0, UNDO_DEPTH)
}

// A late Did on a Not yet goes to the next open question, else the next Not yet.
// The new status stays late either way.
export function afterLateDid(ready, row) {
  const open = ready.find((item) => item.lamp.id !== row.lamp.id && !item.answer)
  if (open) return { faceId: open.lamp.id, skipReview: false }
  const nextSkip = ready.find((item) => item.lamp.id !== row.lamp.id && item.answer?.status === 'skip')
  if (nextSkip) return { faceId: nextSkip.lamp.id, skipReview: true }
  return { faceId: '', skipReview: false }
}

// Undo of a set-aside grace card: the key leaves the list, so the card comes back.
export function graceKeysAfterUndo(keys, key) {
  return keys.filter((item) => item !== key)
}

export function useTonightStack({
  value,
  boards = [],
  tagId = '',
  topics = [],
  onChange,
  now,
  focusLampId,
  focusKey,
  onFocusNote,
}) {
  const clock = now || new Date()
  const undoTimers = useRef(new Map())
  const [faceId, setFaceId] = useState('')
  const [skipReview, setSkipReview] = useState(false)
  const [restNight, setRestNight] = useState(false)
  const [titleEdit, setTitleEdit] = useState(false)
  const [titleDraft, setTitleDraft] = useState(value.title)
  const [undoStack, setUndoStack] = useState([])
  const undo = undoStack[0] || null
  // A new day hides the card an undo would bring back, so it ends here. A folder
  // switch does not: undo restores the answer in its own book, whatever folder is open.
  const undoTag = useRef(boardDate(clock))
  useEffect(() => {
    if (undoTag.current === boardDate(clock)) return
    undoTag.current = boardDate(clock)
    undoTimers.current.forEach((timer) => window.clearTimeout(timer))
    undoTimers.current.clear()
    setUndoStack([])
  }, [boardDate(clock)])
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

  // The grace period for the previous night: its open questions, one card at
  // a time. A nope sets one aside for now; it stays answerable until 9am.
  const graceNight = graceNightIso(clock)
  const [graceLeft, setGraceLeftState] = useState(() => graceSetAside.get(graceNight) || [])
  // Kept for the app's life, so leaving Today does not deal a set-aside card again.
  function setGraceLeft(update) {
    setGraceLeftState((keys) => {
      const next = typeof update === 'function' ? update(keys) : update
      graceSetAside.clear()
      if (graceNight) graceSetAside.set(graceNight, next)
      return next
    })
  }
  const graceRows = useMemo(
    () => (graceNight ? graceRowsFor(scopedBooks(shelf, tagId), graceNight).filter((row) => hasAnyTopic(row.lamp, topics)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, tagId, topicKey, graceNight],
  )
  const graceOpen = graceRows.filter((row) => !graceLeft.includes(`${rowKey(row)}:${row.periodKey}`))
  useEffect(() => {
    setGraceLeftState(graceSetAside.get(graceNight) || [])
  }, [graceNight])

  function markGrace(row, status) {
    if (!row) return
    const markKey = `grace:${rowKey(row)}:${row.periodKey}:${status}`
    if (marking.current === markKey) return
    marking.current = markKey
    const book = bookOf(row)
    const live = answerFor(book, row.lamp.id, row.periodKey)
    const key = `${rowKey(row)}:${row.periodKey}`
    if (status === 'skip') {
      setGraceLeft((keys) => [...keys, key])
      if (live) {
        armUndo({ book, after: book, graceKey: key, lampId: row.lamp.id, periodKey: row.periodKey, status: 'skip', label: markedToast('skip', row.lamp) })
        return
      }
    }
    // A did after midnight is a did; a did after a nope is late, as always.
    const finalStatus = status === 'yes' ? didStatusForRow({ ...row, answer: live || row.answer }) : status
    const next = putAnswer(book, row, finalStatus, clock)
    // The day closed before the tap landed: nothing saved, so no undo or buzz.
    if (next === book) return
    setOverlay(next)
    change(next)
    armUndo({ book, after: next, graceKey: finalStatus === 'skip' ? key : undefined, lampId: row.lamp.id, periodKey: row.periodKey, status: finalStatus, label: markedToast(finalStatus, row.lamp) })
    feelTap(finalStatus === 'skip' ? 'skip' : 'did')
  }
  const hallOn = dueClearTonight(due)
  // Did wes due for you tonight: in the bar's count and in the streak.
  const [, setWeTick] = useState(0)
  useEffect(() => onWeNights(() => setWeTick((n) => n + 1)), [])
  const weTonight = weNight(dateIso, tagId)
  // Tonight is done only once your Did wes due tonight are done too. Until
  // then the done look (sky, glow, cheer) waits and the Did we card comes
  // first. The Did we nights are kept on the phone, so this is known at once.
  // A Did we hidden for today (Not yet on a monthly card) does not hold it.
  const nightDone = hallOn && weTonight.done + (weTonight.hidden || 0) >= weTonight.due
  const wasDone = useRef(nightDone)
  const cheerDays = useRef(new Set())
  useEffect(() => {
    // Your own questions were already done; a Did we just finished the night.
    if (!wasDone.current && nightDone && weTonight.due && weTonight.done >= weTonight.due) {
      const to = shelfStreak(shelf, clock, tagId)
      if (to > 0 && !cheerDays.current.has(dateIso)) {
        cheerDays.current.add(dateIso)
        setCheer({ dateIso, from: to - 1, to })
      }
    }
    wasDone.current = nightDone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightDone])
  // A walk back through the nights, so only once tonight is clear.
  const streak = useMemo(
    () => (hallOn ? shelfStreak(shelf, clock, tagId) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelf, tagId, dateIso, hallOn, weTonight.due, weTonight.done],
  )
  const openReady = ready.filter((row) => !row.answer)
  // An every so often question never holds the night open, but while it is
  // due and unanswered it is still dealt as a card, after the night is clear.
  const deckClear = hallOn && !openReady.some((row) => isEvery(row.lamp))
  const finishCount = useMemo(() => {
    const books = boards.length ? boards : [value]
    const persistedReady = scopedBooks(books, tagId)
      .flatMap((book) => faceSwipeTonight(book, clock))
      .filter((row) => hasAnyTopic(row.lamp, topics))
    return finishStackCount(persistedReady)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, value, tagId, topicKey, dateIso, minute])
  const onFinish = faceId === FINISH_FACE && finishCount > 0 && !deckClear
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
    deckClear || faceId === FINISH_FACE
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

  // A push or widget tap named a question that is answered or gone: say so
  // once per tap, since the card on screen is a different one.
  const focusNoted = useRef('')
  useEffect(() => {
    if (!focusLampId || !onFocusNote) return
    const key = `${focusKey || ''}:${focusLampId}`
    if (focusNoted.current === key) return
    // Nothing loaded yet: wait, or a real question reads as removed.
    if (!shelf.some((book) => (book.lamps || []).length > 0)) return
    const exists = shelf.some((book) =>
      (book.lamps || []).some((lamp) => lamp.id === focusLampId && !lamp.archived),
    )
    if (!exists) {
      focusNoted.current = key
      onFocusNote({ gone: true })
      return
    }
    const row = ready.find((one) => one.lamp.id === focusLampId)
    if (!row) return
    focusNoted.current = key
    if (row.answer?.status) onFocusNote({ status: row.answer.status, name: toastName(row.lamp) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLampId, focusKey, ready, shelf])

  useEffect(() => {
    if (skipReview || faceId === FINISH_FACE || deckClear || !openReady.length) return
    const picked = ready.find((row) => row.lamp.id === faceId)
    if (picked?.answer?.status === 'skip') setFaceId(openReady[0].lamp.id)
  }, [faceId, deckClear, openReady, ready, skipReview])

  useEffect(() => {
    if (deckClear || restNight || skipReview) return
    if (faceId === FINISH_FACE || openReady.length || !finishCount) return
    setFaceId(FINISH_FACE)
  }, [faceId, finishCount, deckClear, openReady.length, restNight, skipReview])

  useEffect(() => {
    if (faceId !== FINISH_FACE) return
    // A question added after the last nope (or a due every so often one) is
    // dealt as a card instead of the still-open list.
    if (deckClear || !finishCount || openReady.length) setFaceId('')
  }, [faceId, finishCount, deckClear, openReady.length])

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
      undoTimers.current.forEach((timer) => window.clearTimeout(timer))
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

  // A note (and amount) on an answer from the undo toast.
  function saveNote(target, note, amount) {
    const book = shelf.find((item) => item.id === target?.boardId)
    if (!book) return
    const next = setAnswerNote(book, target.lampId, target.periodKey, note, clock, amount)
    if (next === book) return
    setOverlay(next)
    change(next)
  }

  function bookOf(row) {
    return row?.book || shelf.find((item) => item.id === row?.boardId) || value
  }

  function expireUndo(entry) {
    undoTimers.current.set(entry, window.setTimeout(() => {
      undoTimers.current.delete(entry)
      setUndoStack((stack) => stack.filter((item) => item !== entry))
    }, UNDO_MS))
  }

  function dropUndo(entry) {
    window.clearTimeout(undoTimers.current.get(entry))
    undoTimers.current.delete(entry)
    setUndoStack((stack) => stack.filter((item) => item !== entry))
  }

  function armUndo(payload) {
    setUndoStack((stack) => {
      const next = pushUndo(stack, payload)
      stack.filter((item) => !next.includes(item)).forEach((item) => {
        window.clearTimeout(undoTimers.current.get(item))
        undoTimers.current.delete(item)
      })
      return next
    })
    expireUndo(payload)
  }

  // The undo toast is on screen now: the window to undo starts over from here,
  // so the whole of it can be tapped.
  function holdUndo() {
    if (!undo) return
    window.clearTimeout(undoTimers.current.get(undo))
    expireUndo(undo)
  }

  function applyUndo() {
    if (!undo) return
    if (undo.graceKey) setGraceLeft((keys) => graceKeysAfterUndo(keys, undo.graceKey))
    if (undo.graceKey && undo.after === undo.book) {
      dropUndo(undo)
      feelTap('undo')
      return
    }
    const current = shelf.find((item) => item.id === undo.book.id) || undo.book
    const next = undoneBook(current, undo)
    // Reopening a cleared day: a real clear later plays the streak moment again.
    if (allClearTonight(current, clock) && !allClearTonight(next, clock)) {
      clearStreakSeen('hit', dateIso)
      // Dropping below a milestone just reached: its moment plays again.
      if (isStreakMilestone(streak)) clearStreakSeen('milestone', String(streak))
    }
    setOverlay(next)
    change(next)
    // The card you took back comes to the front, not the one after it. A
    // yesterday card is not today's, so today's stack stays as it was.
    if (!undo.periodKey || undo.periodKey === dateIso) setFaceId(undo.lampId)
    setSkipReview(false)
    setRestNight(false)
    // The tap may already be on the account; without this the next pull brings it back.
    takeBackAnswer(undo.book, undo.lampId, undo.periodKey).catch(reportRejection('undo-answer'))
    dropUndo(undo)
    feelTap('undo')
  }

  // Two taps before a render both read the old book: the second would
  // save again and arm a second undo that takes coins off twice.
  const marking = useRef('')
  useEffect(() => {
    marking.current = ''
  })
  function mark(row, status) {
    if (!row) return
    const markKey = `${rowKey(row)}:${row.periodKey}:${status}`
    if (marking.current === markKey) return
    marking.current = markKey
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
      const go = afterLateDid(ready, row)
      setSkipReview(go.skipReview)
      setFaceId(go.faceId)
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
    // A picked card stays open in its answered state, with its note.
    if (!pillPick || rowKey(pillPick) !== rowKey(row)) setPillPick(null)
    armUndo({ book, after: next, lampId: row.lamp.id, periodKey: row.periodKey, status: finalStatus, label: markedToast(finalStatus, row.lamp) })
    const clears = !wasClear && allClearTonight(next, clock)
    // One success when the night clears, not a Did and then a second one.
    if (finalStatus === 'skip') feelTap('skip')
    else if (!clears) feelTap('did')
    if (book.clickSound && finalStatus === 'yes') playClick()
    if (clears) {
      // The night just cleared: no card follows, so its cheer plays in full.
      if (typeof window !== 'undefined') window.__didICheerFull = Date.now()
      feelTap('hall-on')
      const afterBooks = shelf.map((item) => (item.id === next.id ? next : item))
      const afterStreak = shelfStreak(afterBooks, clock, tagId)
      const beforeStreak = shelfStreak(shelf, clock, tagId)
      // Once a day: clear, Undo, Did again does not roll the cheer twice.
      // A late Did that joins two runs rolls from the real count, not one less.
      if (afterStreak > 0 && !cheerDays.current.has(dateIso)) {
        cheerDays.current.add(dateIso)
        setCheer({ dateIso, from: Math.min(beforeStreak, afterStreak - 1), to: afterStreak })
      }
      const hit = maybeStreakHit({
        beforeHeat: beforeStreak,
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

  // Open one Not yet question's card from the rest list.
  function openSkipped(row) {
    setRestNight(false)
    setSkipReview(true)
    setFaceId(row.lamp.id)
    feelTap('tick')
  }

  function restStack(quiet) {
    setRestNight(true)
    setSkipReview(false)
    setFaceId('')
    if (!quiet) feelTap('tick')
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
  else if (deckClear) bodyKind = 'hall'
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
    cheer: cheer && cheer.dateIso === dateIso && nightDone ? cheer : null,
    nightDone,
    cheered,
    hour,
    hallOn,
    graceOpen,
    graceFirst: graceOpen.length > 0 && graceFirstAt(clock),
    markGrace,
    weTonight,
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
    undoCount: undoStack.length,
    holdUndo,
    dateIso,
    mark,
    continueStack,
    openSkipped,
    restStack,
    stillOpen,
    lateFromList,
    leaveFromList,
    reopenStillOpen,
    jewelClick,
    pickHole,
    saveTitle,
    applyUndo,
    saveNote,
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
