// Quiet hours with no imports, so the service worker (src/sw.js) can use it.

function minutesOf(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return h * 60 + m
}

// A reminder that would land in quiet hours moves to when they end.
export function quietEnd(at, prefs) {
  if (!prefs?.quietOn) return at
  const from = minutesOf(prefs.quietFrom)
  const to = minutesOf(prefs.quietTo)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return at
  const now = at.getHours() * 60 + at.getMinutes()
  const quiet = from < to ? now >= from && now < to : now >= from || now < to
  if (!quiet) return at
  const end = new Date(at.getFullYear(), at.getMonth(), at.getDate(), Math.floor(to / 60), to % 60, 0, 0)
  if (end.getTime() <= at.getTime()) end.setDate(end.getDate() + 1)
  return end
}

// The worker's check before a reminder: off in settings, or quiet hours now,
// means say nothing. No saved prefs (page never armed) keeps the old way.
export function swMayPing(prefs, now = new Date()) {
  if (!prefs) return true
  if (Array.isArray(prefs.pingsOff) && prefs.pingsOff.includes('reminders')) return false
  return quietEnd(now, prefs) === now
}
