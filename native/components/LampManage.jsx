import { takeDown, toggleArchive, undoBulkLamps } from '../../src/lib/board-ops.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { dropCheckOn } from '../../src/lib/check-on.js'
import { DELETE_UNDO_MS } from '../../src/lib/undo-times.js'
import { goHash } from '../navigation/hash.js'
import { SetCap, SetCard, SetRow } from './SetBits.jsx'
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
    for (const lamp of book.lamps || []) live.set(String(lamp.id), lamp)
  }
  writeStops(readStops().filter((id) => !ids.includes(id)))
  const drop = ids.filter((id) => !live.has(id) || live.get(id).archived)
  // Offline: keep it pending so the next start tries again.
  const retry = (id) => writeStops([...new Set([...readStops(), id])])
  for (const id of drop) {
    dropCheckOn(id)
      .then((out) => {
        if (out?.miss === 'people.reach') retry(id)
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
// The question page's ⋯ menu uses the same two actions.
export function lampActions({ book, lamp, colors, onChange, onPaused }) {
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
    publishSheet({
      title: t('lamp.deleteTitle'),
      body: deleteNote(book, lamp),
      goLabel: t('lamp.delete'),
      danger: true,
      closeLabel: t('lamp.keep'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        // Like Select's delete, it can be taken back for a few seconds.
        const before = book
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

  return { togglePause, askDelete }
}

export function LampManage({ book, lamp, colors, onChange, onPaused, onDuplicate }) {
  if (!lamp) return null
  const { togglePause, askDelete } = lampActions({ book, lamp, colors, onChange, onPaused })
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
