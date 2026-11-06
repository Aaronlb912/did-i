import { quietEnd } from './quiet.js'
import { graceNightIso, nightOpen } from './recurrence.js'

// Did, Not yet and Later buttons on a reminder. They open the app for a moment (a fully
// closed app drops background taps without a native task); the answer goes
// through the same path as a widget tap.

export const ASK_CATEGORY = 'did-i-ask'

// What a question reminder carries: the question and the period it asks about.
export function askNoteData(row) {
  return { lampId: String(row?.lamp?.id || ''), night: String(row?.periodKey || ''), go: '/tonight' }
}

export function askActions(t) {
  return [
    { identifier: 'did', buttonTitle: t('tonight.answerDid'), options: { opensAppToForeground: true } },
    { identifier: 'nope', buttonTitle: t('tonight.answerNope'), options: { opensAppToForeground: true } },
    { identifier: 'later', buttonTitle: t('tonight.answerLater'), options: { opensAppToForeground: true } },
  ]
}

// Did and Not yet on a Remind me note. No shelf row: the answer clears or re-asks it.
export const REMIND_CATEGORY = 'did-i-remind'
export function remindActions(t) {
  return [
    { identifier: 'did', buttonTitle: t('tonight.answerDid'), options: { opensAppToForeground: true } },
    { identifier: 'nope', buttonTitle: t('tonight.answerNope'), options: { opensAppToForeground: true } },
  ]
}

// Keep and Pass on a friend's did you (supabase/functions/push sets the category).
export const SEND_CATEGORY = 'did-i-send'
export function sendActions(t) {
  return [
    { identifier: 'keep', buttonTitle: t('inbox.keep'), options: { opensAppToForeground: true } },
    { identifier: 'pass', buttonTitle: t('inbox.pass'), options: { opensAppToForeground: true } },
  ]
}

// Later on a reminder: no answer, the same note again in an hour. Same
// title, body, data and category, so it has the same buttons.
export const SNOOZE_MS = 60 * 60 * 1000
export const LATER_MINUTES = [15, 30, 60]
export const SNOOZE_KEY = 'did-i-snoozed'
export function snoozeFrom(response, now = Date.now(), prefs = null) {
  if (String(response?.actionIdentifier || '') !== 'later') return null
  const request = response?.notification?.request || {}
  const c = request.content || {}
  if (!c.data?.lampId && !c.data?.weId) return null
  const wait = LATER_MINUTES.includes(prefs?.laterMin) ? prefs.laterMin * 60 * 1000 : SNOOZE_MS
  // Quiet hours hold it until they end, like the asks.
  const at = quietEnd(new Date(now + wait), prefs).getTime()
  // A Later past the close time would ask for a day that no longer takes answers.
  // Only a single day: a monthly question's night is the month ('2026-11').
  if (c.data.lampId && !c.data.weId && /^\d{4}-\d{2}-\d{2}$/.test(c.data.night || '') && !nightOpen(c.data.night, new Date(at))) return null
  return {
    identifier: 'snooze:' + String(request.identifier || c.data.lampId || c.data.weId),
    content: { title: c.title, body: c.body, data: c.data, categoryIdentifier: c.categoryIdentifier || ASK_CATEGORY },
    at,
  }
}

// A button press on a reminder, or null for anything else (a plain tap opens
// the app as before). `at` is when it was handled. A 23:59:58 tap handled
// after midnight still files to `night` while grace holds it open; a night
// that has truly closed is dropped by the tap path.
export function notificationAnswer(response, now = Date.now()) {
  const action = String(response?.actionIdentifier || '')
  if (action !== 'did' && action !== 'nope') return null
  const request = response?.notification?.request || {}
  const data = request.content?.data || {}
  if (data.remindId) return { kind: 'remind', id: String(data.remindId), action }
  const night = data.night ? String(data.night) : ''
  const noteId = request.identifier ? String(request.identifier) : ''
  if (data.weId) return { kind: 'we', id: String(data.weId), action, night, at: now, noteId }
  if (data.lampId) return { kind: 'lamp', id: String(data.lampId), action, night, at: now, noteId }
  return null
}

// A plain tap on a note that is about last night while its grace period runs:
// the 7:00 streak note, or a reminder for yesterday's question.
export function opensGrace(data, now = new Date()) {
  const grace = graceNightIso(now)
  if (!grace || !data) return false
  return Boolean(data.streakRisk) || data.night === grace
}

// Notes already in the tray that no longer say anything true. Our own notes
// only (a push from the server is a cheer or a friend and stays). Returns the
// identifiers to dismiss. ctx: answered(lampId, night), weDid(weId, night),
// openToday, atRisk(deliveredAtMs).
export function staleDelivered(presented, ctx) {
  const out = []
  for (const note of Array.isArray(presented) ? presented : []) {
    const request = note?.request || {}
    const id = request.identifier ? String(request.identifier) : ''
    if (!id || request.trigger?.type === 'push') continue
    const data = request.content?.data || {}
    let at = Number(note?.date) || Date.now()
    if (at < 1e11) at *= 1000
    let stale = false
    if (data.weId) stale = Boolean(data.night) && ctx.weDid(String(data.weId), String(data.night))
    else if (data.lampId) stale = Boolean(data.night) && ctx.answered(String(data.lampId), String(data.night))
    else if (data.streakRisk) stale = !ctx.atRisk(at)
    else if (data.left) stale = !ctx.openToday
    if (stale) out.push(id)
  }
  return out
}

// A cold launch hands the launching tap to the listener and to
// getLastNotificationResponseAsync. True the first time a tap is seen.
export function firstResponse(seen, response) {
  const id = response?.notification?.request?.identifier
  if (!id) return true
  // The streak note reuses its id each day; the delivery time tells the days apart.
  const key = `${id}|${response?.notification?.date || ''}|${response?.actionIdentifier || ''}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
}
