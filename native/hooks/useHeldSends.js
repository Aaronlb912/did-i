import { useEffect, useState } from 'react'
import { t, tMiss } from '../../src/lib/i18n.js'
import { ANSWER_UNDO_MS } from '../../src/lib/undo-times.js'
import { cancelHeld, heldNow, holdSend, onHeld, restartHeld } from '../lib/held-sends.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { dropToast, showToast, toastQueue } from '../lib/toast-queue.js'

// The Did we and family Dids waiting out their undo, so Today can show those
// cards as answered.
export function useHeldSends() {
  const [list, setList] = useState(heldNow)
  useEffect(() => {
    setList(heldNow())
    return onHeld(setList)
  }, [])
  return list
}

// Hold the send and put its undo on the one toast line. Resolves with what the
// send returned, or UNDONE when Undo was tapped.
export function holdWithUndo(item, run, label) {
  const toastId = `undo:held:${item.id}`
  const total = ANSWER_UNDO_MS
  const done = holdSend(item, run, total)
  const rev = Date.now()
  showToast({
    id: toastId,
    kind: 'undo',
    rev,
    label,
    hint: t('tonight.undoTap'),
    until: rev + total,
    total,
    onPress: () => {
      // Too late once it is on its way: say so, not that it was undone.
      if (!cancelHeld(item.id)) confirmDone(t('confirm.saved'))
      dropToast(toastId)
    },
    // Its clock counts from when it can be seen, like the toast on your own cards.
    onShown: () => {
      if (!toastQueue().some((toast) => toast.id === toastId && toast.rev === rev)) return
      showToast({ id: toastId, until: Date.now() + total })
      restartHeld(item.id)
    },
  })
  return done.then((out) => {
    dropToast(toastId)
    // Held for another account: it was not sent. Family Dids say so in their own flow.
    if (out?.unsent && item.kind === 'we') confirmMiss(tMiss(out.miss))
    return out
  })
}
