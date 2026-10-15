import { cloud } from './cloud.js'
import { isAppForeground, onAppForegroundChange } from './app-foreground.js'

// App Review switch (supabase/reviewer-flag.sql). It only hides the UI; the
// review account's password is what lets anyone in. Offline, an error or
// anything but a plain true reads as off.
export async function readReviewerFlag(db = cloud()) {
  if (!db) return false
  try {
    const { data, error } = await db.rpc('reviewer_signin_on')
    return !error && data === true
  } catch {
    return false
  }
}

export const REVIEWER_HOLD_MS = 3000

// Waits after each miss: 1s, 3s, 10s, then three at 30s, then stop until the
// app comes back to the front or the window gets focus.
const RETRY_MS = [1000, 3000, 10000, 30000, 30000, 30000]
export const REVIEWER_FOCUS_GAP_MS = 5000

export function reviewerRetryMs(attempt) {
  return RETRY_MS[attempt] ?? null
}

/**
 * One watcher shared by every mounted sign-in screen. Reads on the first
 * subscribe, retries on the schedule above while off and in front, never
 * schedules in the background, and stops for good once on.
 */
export function createReviewerWatch({
  read = readReviewerFlag,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  now = Date.now,
  isFront = isAppForeground,
  onFront = onAppForegroundChange,
  win = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : null,
} = {}) {
  const subs = new Set()
  let on = false
  let attempt = 0
  let timer = null
  let busy = false
  let lastRead = 0
  let unhook = null

  function stopTimer() {
    if (timer != null) clearTimer(timer)
    timer = null
  }

  async function check() {
    if (on || busy || !subs.size || !isFront()) return
    busy = true
    stopTimer()
    lastRead = now()
    const next = await read()
    busy = false
    if (next) {
      on = true
      unhookAll()
      subs.forEach((fn) => fn(true))
      return
    }
    if (!subs.size || !isFront()) return
    const wait = reviewerRetryMs(attempt)
    attempt += 1
    if (wait != null) timer = setTimer(check, wait)
  }

  function front(isOn) {
    if (!isOn) {
      stopTimer()
      return
    }
    attempt = 0
    check()
  }

  function focus() {
    if (now() - lastRead < REVIEWER_FOCUS_GAP_MS) return
    attempt = 0
    check()
  }

  function hook() {
    if (unhook || on) return
    const offFront = onFront(front)
    win?.addEventListener('focus', focus)
    unhook = () => {
      offFront()
      win?.removeEventListener('focus', focus)
    }
  }

  function unhookAll() {
    stopTimer()
    unhook?.()
    unhook = null
  }

  return function subscribe(onChange) {
    if (on) {
      onChange(true)
      return () => {}
    }
    subs.add(onChange)
    if (subs.size === 1) {
      hook()
      attempt = 0
      check()
    }
    return () => {
      subs.delete(onChange)
      if (!subs.size) unhookAll()
    }
  }
}

export const watchReviewerFlag = createReviewerWatch()
