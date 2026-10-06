import { useEffect, useRef, useState } from 'react'

// One line of toasts above the tab bar. Undo, marks and errors wait their
// turn here and ToastHost shows the first. A toast is { id, kind, ... }:
//   kind 'undo'  { label, hint, until, onPress }  one at a time; a newer undo
//                                                  replaces the older. It goes
//                                                  first in line, and ToastHost
//                                                  sets aside any other toast
//                                                  on screen for it
//   kind 'mark'  { mark, ms, onGone }
//   kind 'error' { text, ms }
//   kind 'done'  { text, ms }                    an action worked (lib/confirm.js)
//   kind 'kit'   { name, count, ms, fly }        a buy landing in the
//                                                  Collection; `fly` is where
//                                                  the item starts, in window
//                                                  points, and its art
// Showing the same id again updates it in place.

let items = []
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
  if (toast.kind === 'undo') {
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
export function useUndoToast(owner, undo, onUndo, total, hint) {
  const id = `undo:${owner}`
  const press = useRef(onUndo)
  press.current = onUndo
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
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo])
  useEffect(() => () => dropToast(id), [id])
}
