import { useState } from 'react'
import { View } from 'react-native'
import { endQuestion, endQuestionDate, questionEnded, reopenQuestion, resumeOnDate, setPauseUntil, takeDown, toggleArchive, undoBulkLamps } from '../../src/lib/board-ops.js'
import { addDaysIso, boardDate, formatBoardDate, isPerWeek } from '../../src/lib/recurrence.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { questionStreak } from '../../src/lib/lamp-record.js'
import { finishLine } from '../../src/lib/lamp-finish.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { dropCheckOn, followReopen } from '../../src/lib/check-on.js'
import { DELETE_UNDO_MS } from '../../src/lib/undo-times.js'
import { goHash } from '../navigation/hash.js'
import { openEditAt } from '../lib/edit-fold.js'
import { SetCap, SetCard, SetRow } from './SetBits.jsx'
import { SetChoice } from './SetChoice.jsx'
import { HangMonthCal } from './HangMonthCal.jsx'
import { markFinishSeen } from './FinishedHost.jsx'
import { publishSheet } from './SheetHost.jsx'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { showToast } from '../lib/toast-queue.js'

// The folder as saved now: an undo runs seconds later, after other edits.
function liveBook(book) {
  return (readShelf().boards || []).find((item) => item.id === book.id)
}

// A deleted, paused or stopped question stops its friend check-on too.
// It waits out the undo toast, and skips a question that came back by then.
// Most questions have no check-on, so a network miss stays quiet.
// The ids are kept on disk too, so a kill during the undo still stops them on next start.
const STOP_KEY = 'did-i-checkon-stops'

function readStops() {
  try {
    const list = JSON.parse(globalThis.localStorage?.getItem(STOP_KEY) || '[]')
    return Array.isArray(list) ? list.map(String) : []
  } catch {
    return []
  }
}

function writeStops(ids) {
  try {
    if (ids.length) globalThis.localStorage?.setItem(STOP_KEY, JSON.stringify(ids))
    else globalThis.localStorage?.removeItem(STOP_KEY)
  } catch {
    // Disk full or gone: the in-memory timer still runs.
  }
}

function runStops(ids) {
  const live = new Map()
  for (const book of readShelf().boards || []) {
    for (const lamp of book.lamps || []) live.set(String(lamp.id), { lamp, fold: book.dayFoldHour })
  }
  writeStops(readStops().filter((id) => !ids.includes(id)))
  const now = new Date()
  const drop = ids.filter((id) => {
    const one = live.get(id)
    return !one || one.lamp.archived || questionEnded(one.lamp, boardDate(now, one.fold))
  })
  // Offline: keep it pending so the next start tries again.
  const retry = (id) => writeStops([...new Set([...readStops(), id])])
  for (const id of drop) {
    dropCheckOn(id)
      .then((out) => {
        if (out?.miss === 'people.reach' || out?.miss === 'out') retry(id)
        else if (out?.miss) confirmMiss(tMiss(out.miss))
      })
      .catch(() => retry(id))
  }
}

// later: the caller runs flushCheckOnStops when its own undo window ends.
export function stopCheckOns(lampIds, later = false) {
  const ids = [].concat(lampIds).map(String)
  writeStops([...new Set([...readStops(), ...ids])])
  if (!later) setTimeout(() => runStops(ids), DELETE_UNDO_MS + 500)
  return ids
}

export function flushCheckOnStops(ids) {
  if (ids?.length) runStops(ids)
}

// On start, after sign in: the undo window is long over.
export function resumeCheckOnStops() {
  const ids = readStops()
  if (ids.length) runStops(ids)
}

function deleteNote(book, lamp) {
  const mine = (book.answers || []).filter((item) => item.lampId === lamp.id)
  if (mine.length === 0) return t('lamp.deleteNone')
  const notes = mine.filter((item) => String(item.note || '').trim()).length
  const answers = mine.length === 1 ? t('lamp.delAnswer1') : t('lamp.delAnswerN', { n: mine.length })
  const noteLine = notes === 0 ? '' : notes === 1 ? t('lamp.delNote1') : t('lamp.delNoteN', { n: notes })
  return [answers, noteLine, t('lamp.delUndo')].filter(Boolean).join(' ')
}

// Stop asking and Delete, shared by the question page and its edit page.
// `onPaused` lets the edit page keep its unsaved draft in step with the pause.
// `onLess` is how the edit page opens its own When section; elsewhere "Ask less often" opens Edit there.
// The question page's ⋯ menu uses the same two actions.
export function lampActions({ book, lamp, colors, onChange, onPaused, onLess }) {
  // Done with this one: asks first, then ends it (moves to Earlier). It can be taken back for a few seconds.
  function askDone() {
    const from = liveBook(book) || book
    const here = (from.lamps || []).find((item) => item.id === lamp.id) || lamp
    const lastToday = endQuestionDate(from, here) === boardDate(new Date(), from.dayFoldHour)
    // The record comes first; with no Did yet the plain body stands alone.
    const record = finishLine(from, here, boardDate(new Date(), from.dayFoldHour))
    const plain = t(lastToday ? 'lamp.doneBodyToday' : 'lamp.doneBody')
    publishSheet({
      title: t('lamp.doneTitle'),
      body: record ? `${record} ${plain}` : plain,
      moreLabel: here.cadence === 'once' ? undefined : t('lamp.doneLess'),
      onMore:
        here.cadence === 'once'
          ? undefined
          : () => {
              publishSheet(null)
              if (onLess) onLess()
              else {
                openEditAt('when')
                goHash('/hang', { id: lamp.id })
              }
            },
      goLabel: t('lamp.doneRow'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        const live = liveBook(book) || book
        const was = (live.lamps || []).find((item) => item.id === lamp.id) || lamp
        const next = endQuestion(live, was)
        const planned = was.endsOn || ''
        const endsToday = (next.lamps || []).find((item) => item.id === lamp.id)?.endsOn === boardDate(new Date(), live.dayFoldHour)
        onChange(next)
        // Done is its own moment; the finished popup is for end dates set in advance.
        markFinishSeen((next.lamps || []).find((item) => item.id === lamp.id))
        stopCheckOns(lamp.id)
        const now = Date.now()
        showToast({
          id: 'undo:done',
          kind: 'undo',
          rev: now,
          label: t(endsToday ? 'confirm.questionDoneToday' : 'confirm.questionDone'),
          hint: t('tonight.undoTap'),
          until: now + DELETE_UNDO_MS,
          total: DELETE_UNDO_MS,
          onPress: () => {
            const current = liveBook(book) || next
            const ended = (current.lamps || []).find((item) => item.id === lamp.id)
            if (ended) onChange(reopenQuestion(current, ended, planned))
          },
        })
      },
    })
  }

  // Ask a finished question again: the end date goes.
  function askAgain() {
    const live = liveBook(book) || book
    const was = (live.lamps || []).find((item) => item.id === lamp.id) || lamp
    const next = reopenQuestion(live, was)
    onChange(next)
    followReopen(was, next).catch(() => confirmMiss(t('confirm.checkOnMiss')))
    confirmDone(t('confirm.questionResumed'))
  }

  function togglePause() {
    const next = toggleArchive(book, lamp)
    onChange(next)
    onPaused?.(!lamp.archived)
    if (!lamp.archived) stopCheckOns(lamp.id)
    if (lamp.archived) {
      confirmDone(t('confirm.questionResumed'))
      return
    }
    // Pausing can be taken back for a few seconds, like an answer.
    const now = Date.now()
    showToast({
      id: 'undo:pause',
      kind: 'undo',
      rev: now,
      label: t('confirm.questionPaused'),
      hint: t('tonight.undoTap'),
      until: now + DELETE_UNDO_MS,
      total: DELETE_UNDO_MS,
      onPress: () => {
        const live = liveBook(book) || next
        const paused = (live.lamps || []).find((item) => item.id === lamp.id)
        if (paused?.archived) onChange(toggleArchive(live, paused))
        onPaused?.(false)
      },
    })
  }

  function askDelete() {
    const hasAnswers = (book.answers || []).some((item) => item.lampId === lamp.id)
    const stoppable = hasAnswers && !lamp.archived
    // A run worth keeping is said out loud before it goes (days only).
    const days = (lamp.cadence === 'daily' && !isPerWeek(lamp)) || lamp.cadence === 'weekly'
    const streak = days ? questionStreak(book, lamp, boardDate(new Date(), book.dayFoldHour)) : 0
    const note = streak >= 7 ? `${deleteNote(book, lamp)} ${t('lamp.deleteStreak', { n: streak })}` : deleteNote(book, lamp)
    publishSheet({
      title: t('lamp.deleteTitle'),
      body: stoppable ? `${note} ${t('lamp.deleteDays')} ${t('lamp.deleteKeep')}` : hasAnswers ? `${note} ${t('lamp.deleteDays')}` : note,
      moreLabel: stoppable ? t('lamp.pauseBtn') : undefined,
      onMore: stoppable
        ? () => {
            publishSheet(null)
            togglePause()
          }
        : undefined,
      goLabel: t('lamp.delete'),
      danger: true,
      closeLabel: t('lamp.keep'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        // Like Select's delete, it can be taken back for a few seconds.
        const before = liveBook(book) || book
        const after = takeDown(liveBook(book) || book, lamp)
        const now = Date.now()
        onChange(after)
        stopCheckOns(lamp.id)
        goHash('/lamps')
        showToast({
          id: 'undo:delete',
          kind: 'undo',
          rev: now,
          label: t('confirm.questionRemoved'),
          hint: t('tonight.undoTap'),
          until: now + DELETE_UNDO_MS,
          total: DELETE_UNDO_MS,
          // Clears the delete's tombstone too, or sync would drop it again.
          onPress: () => onChange(undoBulkLamps([liveBook(book) || after], [before], [{ lampId: lamp.id }])[0] || before),
        })
      },
    })
  }

  return { togglePause, askDelete, askDone, askAgain }
}

const PAUSE_DAYS = [1, 2, 3, 7, 14, 30]
// The "Pick a date" choice opens the calendar, up to a year ahead.
const PICK = '__pick'
const PICK_DAYS = 365

// No date, or a day from tomorrow on; a day picked earlier stays in the list.
function pauseUntilOptions(lamp, today) {
  const days = PAUSE_DAYS.map((n) => addDaysIso(today, n))
  if (lamp.pausedUntil && !days.includes(lamp.pausedUntil)) days.push(lamp.pausedUntil)
  return [{ id: '', label: t('lamp.pauseNoDate') }, ...days.sort().map((id) => ({ id, label: formatBoardDate(id) })), { id: PICK, label: t('lamp.pauseOther') }]
}

export function LampManage({ book, lamp, colors, onChange, onPaused, onDuplicate, onLess }) {
  const [picking, setPicking] = useState(false)
  if (!lamp) return null
  const { togglePause, askDelete, askDone, askAgain } = lampActions({ book, lamp, colors, onChange, onPaused, onLess })
  const today = boardDate(new Date(), book.dayFoldHour)
  const ended = questionEnded(lamp, today)
  // `picking` shows the calendar: for a paused question its day to come back, for a finished one the day to be asked again.
  const canFinish = !lamp.archived && !ended && lamp.cadence !== 'once'
  return (
    <>
      <SetCap colors={colors}>{t('lamp.secManage')}</SetCap>
      <SetCard colors={colors}>
        {onDuplicate ? (
          <SetRow colors={colors} icon="copy" label={t('lamp.copy')} sub={t('lamp.copySub')} onPress={onDuplicate} plain />
        ) : null}
        <SetRow
          colors={colors}
          icon={lamp.archived ? 'play' : 'pause'}
          label={lamp.archived ? t('lamp.askAgain') : t('lamp.stop')}
          sub={lamp.archived ? t('lamp.askAgainSub') : t('lamp.stopSub')}
          onPress={togglePause}
          plain
        />
        {lamp.archived && !ended ? (
          <SetChoice
            colors={colors}
            icon="clock"
            label={t('lamp.pauseUntil')}
            sub={t('lamp.pauseUntilSub')}
            options={pauseUntilOptions(lamp, today)}
            selected={picking ? PICK : lamp.pausedUntil || ''}
            onSelect={(id) => {
              if (id === PICK) {
                setPicking(true)
                return
              }
              setPicking(false)
              const live = liveBook(book) || book
              onChange(setPauseUntil(live, (live.lamps || []).find((item) => item.id === lamp.id) || lamp, id))
              confirmDone(id ? t('confirm.pauseUntil', { date: formatBoardDate(id) }) : t('confirm.questionPaused'))
            }}
          />
        ) : null}
        {lamp.archived && !ended && picking ? (
          <View style={{ padding: 16 }}>
            <HangMonthCal
              mode="date"
              value={lamp.pausedUntil || ''}
              minIso={addDaysIso(today, 1)}
              maxIso={addDaysIso(today, PICK_DAYS)}
              onChange={(iso) => {
                const live = liveBook(book) || book
                onChange(setPauseUntil(live, (live.lamps || []).find((item) => item.id === lamp.id) || lamp, iso))
                setPicking(false)
                confirmDone(t('confirm.pauseUntil', { date: formatBoardDate(iso) }))
              }}
              now={new Date()}
              dayFoldHour={book.dayFoldHour}
              colors={colors}
            />
          </View>
        ) : null}
        {canFinish ? <SetRow colors={colors} icon="folder" label={t('lamp.doneRow')} sub={t('lamp.doneSub')} plain onPress={askDone} /> : null}
        {ended ? <SetRow colors={colors} icon="play" label={t('lamp.askAgain')} sub={t('lamp.askAgainSub')} plain onPress={askAgain} /> : null}
        {ended ? <SetRow colors={colors} icon="clock" label={t('lamp.resumeOn')} sub={t('lamp.resumeOnSub')} plain onPress={() => setPicking((on) => !on)} /> : null}
        {ended && picking ? (
          <View style={{ padding: 16 }}>
            <HangMonthCal
              mode="date"
              value=""
              minIso={addDaysIso(today, 1)}
              maxIso={addDaysIso(today, PICK_DAYS)}
              onChange={(iso) => {
                const live = liveBook(book) || book
                const was = (live.lamps || []).find((item) => item.id === lamp.id) || lamp
                const next = resumeOnDate(live, was, iso)
                onChange(next)
                followReopen(was, next).catch(() => confirmMiss(t('confirm.checkOnMiss')))
                setPicking(false)
                confirmDone(t('confirm.pauseUntil', { date: formatBoardDate(iso) }))
              }}
              now={new Date()}
              dayFoldHour={book.dayFoldHour}
              colors={colors}
            />
          </View>
        ) : null}
        <SetRow
          colors={colors}
          icon="trash"
          label={t('lamp.delete')}
          sub={t('lamp.deleteSub')}
          danger
          last
          onPress={askDelete}
        />
      </SetCard>
    </>
  )
}
