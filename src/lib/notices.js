import { useEffect, useState } from 'react'

// Recent in-app notices (new achievements, Did we moments), kept on this
// device so a toast you missed can still be read in full. Newest first.
// { id, kind, title, text, at, go: { path, id } }
const KEY = 'did-i-notices'
const SEEN_KEY = 'did-i-notices-seen'
export const NOTICE_CAP = 30

const listeners = new Set()

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ok
  }
}

function emit() {
  listeners.forEach((fn) => fn())
}

export function readNotices() {
  const list = read(KEY, [])
  return Array.isArray(list) ? list : []
}

/** Adds a notice once per id; the same id again moves it to the top. */
export function addNotice(notice, now = Date.now()) {
  if (!notice?.id || !notice.title) return
  const rest = readNotices().filter((item) => item.id !== notice.id)
  const next = [{ ...notice, at: notice.at || now }, ...rest].slice(0, NOTICE_CAP)
  write(KEY, next)
  emit()
}

export function noticesSeenAt() {
  return Number(read(SEEN_KEY, 0)) || 0
}

export function markNoticesSeen(now = Date.now()) {
  write(SEEN_KEY, now)
  emit()
}

export function unseenNotices(list = readNotices(), seenAt = noticesSeenAt()) {
  return list.filter((item) => (item.at || 0) > seenAt).length
}

export function useNotices() {
  const [state, setState] = useState(() => ({ list: readNotices(), seenAt: noticesSeenAt() }))
  useEffect(() => {
    const fn = () => setState({ list: readNotices(), seenAt: noticesSeenAt() })
    listeners.add(fn)
    fn()
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return { ...state, unseen: unseenNotices(state.list, state.seenAt) }
}
