import { cloud } from './cloud.js'
import { onAppForegroundChange } from './app-foreground.js'

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

const RETRY_MS = [1000, 3000, 10000]

// Wait before re-reading after the nth miss (0-based): 1s, 3s, 10s, then 30s.
export function reviewerRetryMs(attempt) {
  return RETRY_MS[attempt] ?? 30000
}

/**
 * Reads the switch now, retries while it reads off, and re-reads when the
 * app comes back to the front (phone) or the window gets focus (web).
 * Stops once on. Returns a stop function for unmount.
 */
export function watchReviewerFlag(onChange, { read = readReviewerFlag, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let live = true
  let on = false
  let attempt = 0
  let timer = null
  let busy = false

  async function check() {
    if (!live || on || busy) return
    busy = true
    clearTimer(timer)
    timer = null
    const next = await read()
    busy = false
    if (!live) return
    if (next) {
      on = true
      stopListening()
      onChange(true)
      return
    }
    timer = setTimer(check, reviewerRetryMs(attempt))
    attempt += 1
  }

  function wake() {
    attempt = 0
    check()
  }

  const offForeground = onAppForegroundChange((front) => {
    if (front) wake()
  })
  const win = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : null
  win?.addEventListener('focus', wake)

  function stopListening() {
    offForeground()
    win?.removeEventListener('focus', wake)
  }

  check()

  return () => {
    live = false
    clearTimer(timer)
    stopListening()
  }
}
