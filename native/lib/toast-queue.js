import { useEffect, useRef, useState } from 'react'
import { markLabel } from '../../src/lib/achievements.js'
import { frameText } from '../../src/lib/frames.js'
import { t } from '../../src/lib/i18n.js'
import { addNotice } from '../../src/lib/notices.js'

// One line of toasts above the tab bar. Undo, marks and errors wait their
// turn here and ToastHost shows the first. A toast is { id, kind, ... }:
//   kind 'undo'  { label, hint, until, onPress, onShown }  one at a time; a newer undo
//                                                  replaces the older. It goes
//                                                  first in line, and ToastHost
//                                                  sets aside any other toast
//                                                  on screen for it
//   kind 'mark'  { mark, ms, onGone }
//   kind 'frame' { frameId, ms, onWear }         an earned frame, just unlocked
//   kind 'error' { text, ms }
//   kind 'done'  { text, ms }                    an action worked (lib/confirm.js)
//   kind 'kit'   { name, count, ms, fly }        a buy landing in the
//                                                  Collection; `fly` is where
//                                                  the item starts, in window
//                                                  points, and its art
// Showing the same id again updates it in place.

let items = []

// A new achievement or Did we moment also goes on the Recent list, so one
// missed on screen can still be read in full.
function keepNotice(toast) {
  if (toast.kind === 'mark') {
    const mark = toast.mark || {}
    // Recent names every new mark, not "and 2 more" with no way to see them.
    const rest = Array.isArray(mark.ids) ? mark.ids.slice(1).map((id) => markLabel(id, 'name')).filter(Boolean) : []
    const also = rest.length ? t('marks.alsoNew', { names: rest.join(', ') }) : mark.more ? t('marks.more', { n: mark.more }) : ''
    const text = [markLabel(mark.id, 'name'), mark.id ? markLabel(mark.id, 'line') : '', also]
      .filter(Boolean)
      .join('. ')
    addNotice({ id: toast.id, kind: 'mark', title: t('marks.new'), text, go: { path: '/marks' } })
  } else if (toast.kind === 'frame') {
    addNotice({ id: toast.id, kind: 'frame', title: t('frames.unlocked'), text: t(frameText(toast.frameId, 'name')), go: { path: '/shop/frames' } })
  } else if (toast.kind === 'we') {
    addNotice({ id: toast.id, kind: 'we', title: t('we.title'), text: toast.text || '', go: { path: '/we', id: toast.cardId } })
  }
}
const listeners = new Set()

function emit() {
  const next = items
  listeners.forEach((fn) => fn(next))
}

export function showToast(toast) {
  if (!toast?.id) return
  const at = items.findIndex((item) => item.id === toast.id)
  if (at >= 0) {
    items = items.map((item, index) => (index === at ? { ...item, ...toast } : item))
    emit()
    return
  }
  keepNotice(toast)
  if (toast.kind === 'undo') {
    // Every undo's clock counts from when it has slid in and can be tapped.
    if (!toast.onShown && toast.total) {
      const { id, rev, total } = toast
      toast = {
        ...toast,
        onShown: () => {
          if (items.some((item) => item.id === id && item.rev === rev)) showToast({ id, until: Date.now() + total })
        },
      }
    }
    // Only the latest answer can be undone, and its clock is already running,
    // so it shows at once. Whatever it pushes aside waits its turn again.
    const rest = items.filter((item) => item.kind !== 'undo')
    items = [toast, ...rest]
    emit()
    return
  }
  items = [...items, toast]
  emit()
}

export function dropToast(id) {
  if (!items.some((item) => item.id === id)) return
  items = items.filter((item) => item.id !== id)
  emit()
}

export function toastQueue() {
  return items
}

/** True while an undo is waiting or on screen; new achievements wait until it is gone. */
export function undoUp(list = items) {
  return list.some((item) => item.kind === 'undo')
}

/** The toast to show: an undo always, else the first in line. */
export function nextToast(list = items) {
  return list.find((item) => item.kind === 'undo') || list[0] || null
}

export function useToastQueue() {
  const [now, setNow] = useState(items)
  useEffect(() => {
    listeners.add(setNow)
    setNow(items)
    return () => {
      listeners.delete(setNow)
    }
  }, [])
  return now
}

/**
 * Offer `undo` (anything with a `label`) as the undo toast while it is set.
 * `owner` keeps two screens' undos apart; a newer one still replaces an older.
 */
export function useUndoToast(owner, undo, onUndo, total, hint, onShown) {
  const id = `undo:${owner}`
  const press = useRef(onUndo)
  press.current = onUndo
  const shown = useRef(onShown)
  shown.current = onShown
  useEffect(() => {
    if (!undo) {
      dropToast(id)
      return
    }
    const now = Date.now()
    showToast({
      id,
      kind: 'undo',
      rev: now,
      label: undo.label,
      hint,
      until: now + total,
      total,
      onPress: () => press.current?.(),
      // A second, smaller action next to Undo (Add a note after a Did).
      extra: undo.extra || null,
      // Once it has slid in, its clock starts over: the time to undo counts
      // from when it can be seen and tapped, not from the answer.
      onShown: () => {
        if (!toastQueue().some((item) => item.id === id && item.rev === now)) return
        showToast({ id, until: Date.now() + total })
        shown.current?.()
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo])
  useEffect(() => () => dropToast(id), [id])
}
