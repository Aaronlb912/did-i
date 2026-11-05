import { commitBook } from '../../src/lib/achievements.js'
import { putPastAnswer, restorePastAnswer } from '../../src/lib/board-ops.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { answerFor } from '../../src/lib/recurrence.js'
import { ANSWER_UNDO_MS } from '../../src/lib/undo-times.js'
import { showToast } from './toast-queue.js'

// Saves an answer for an older day. The time is read at the tap, not taken from
// the screen's clock: that one can be hours old, and the day may have closed since.
// Changing an answer that was there offers Undo. `save` writes one folder.
// Returns the saved folder, or null when nothing changed.
export function savePastAnswer(from, row, status, save) {
  const clock = new Date()
  const prev = answerFor(from, row.lamp.id, row.periodKey)
  const next = putPastAnswer(from, row, status, clock)
  if (next === from) return null
  const saved = commitBook(next, clock)
  save(saved)
  if (prev) {
    const now = Date.now()
    showToast({
      id: 'undo:past-day',
      kind: 'undo',
      rev: now,
      label: t('cal.answerChanged'),
      hint: t('tonight.undoTap'),
      until: now + ANSWER_UNDO_MS,
      total: ANSWER_UNDO_MS,
      onPress: () => {
        const live = (readShelf().boards || []).find((item) => item.id === saved.id) || saved
        const back = new Date()
        const undone = restorePastAnswer(live, prev, back)
        if (undone !== live) save(commitBook(undone, back))
      },
    })
  }
  return saved
}
