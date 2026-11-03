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
export const SNOOZE_KEY = 'did-i-snoozed'
export function snoozeFrom(response, now = Date.now()) {
  if (String(response?.actionIdentifier || '') !== 'later') return null
  const request = response?.notification?.request || {}
  const c = request.content || {}
  if (!c.data?.lampId && !c.data?.weId) return null
  const at = now + SNOOZE_MS
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
  const night = data.night ? String(data.night) : ''
  const noteId = request.identifier ? String(request.identifier) : ''
  if (data.weId) return { kind: 'we', id: String(data.weId), action, night, at: now, noteId }
  if (data.lampId) return { kind: 'lamp', id: String(data.lampId), action, night, at: now, noteId }
  return null
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
