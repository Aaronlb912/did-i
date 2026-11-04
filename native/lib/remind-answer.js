import { currentBook, readShelf, writeShelf } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { publishShelf } from '../../src/lib/widget-tonight.js'
import { addMorning } from '../../src/lib/morning-ask.js'
import { commitBook } from '../../src/lib/achievements.js'
import { REMIND_AGAIN_MIN, REMIND_TRIES, readReminds, remindNext, restoreRemind } from '../../src/lib/remind-me.js'
import { nativeWidgetsEnabled } from './widgets-enabled.js'
import { syncTonightWidget } from '../widget-sync.js'
import { showToast } from './toast-queue.js'
import { armNativePingsNow, cancelRemind, scheduleRemind } from '../shim/native.js'

// Did or Not yet on a Remind me note. Did clears it. Not yet asks again in 15
// minutes; the last one becomes a one-day question on Today.
export async function answerRemind(id, action) {
  const item = readReminds().find((one) => one.id === id)
  if (!item) return
  await cancelRemind(item)
  const out = remindNext(item, action === 'did' ? 'did' : 'nope')
  if (out.item) {
    const set = await scheduleRemind(out.item)
    if (set.miss) showToast({ id: 'remind', kind: 'error', text: t(set.miss), ms: 5200 })
    return
  }
  if (!out.toToday) return
  const shelf = readShelf()
  const book = currentBook(shelf)
  const added = book ? addMorning(book, shelf.boards, item.text, new Date()) : { error: 'empty' }
  if (added.error && added.error !== 'dupe' && added.error !== 'full' && book) {
    // Nothing to retry (no folder, empty text): drop it and say so.
    showToast({ id: 'remind', kind: 'error', text: t('noteAnswer.notSaved'), ms: 5200 })
    return
  }
  if (added.error === 'full' || !book) {
    // Today is full, or the shelf has not loaded yet: keep it and ask once more rather than lose it.
    const again = { ...item, tries: REMIND_TRIES - 1, at: Date.now() + REMIND_AGAIN_MIN * 60 * 1000 }
    restoreRemind(again)
    scheduleRemind(again).catch(() => {})
    showToast({ id: 'remind', kind: 'error', text: t('noteAnswer.notSaved'), ms: 5200 })
    return
  }
  if (added.book) {
    const next = writeShelf({ ...shelf, boards: shelf.boards.map((one) => (one.id === added.book.id ? commitBook(added.book, new Date()) : one)) })
    publishShelf(next)
    if (nativeWidgetsEnabled()) syncTonightWidget(next).catch(() => {})
    armNativePingsNow(next.boards || []).catch(() => {})
  }
  showToast({ id: 'remind', text: t('remind.toToday'), ms: 3200 })
}
