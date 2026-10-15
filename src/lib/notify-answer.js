// Did and Nope buttons on a reminder. They open the app for a moment (a fully
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
  ]
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
  const key = `${id}|${response?.actionIdentifier || ''}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
}
