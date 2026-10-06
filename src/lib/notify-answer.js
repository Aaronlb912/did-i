// Did and Nope buttons on a reminder. The buttons answer without opening the
// app; the answer goes through the same path as a widget tap.

export const ASK_CATEGORY = 'did-i-ask'

// What a question reminder carries: the question and the period it asks about.
export function askNoteData(row) {
  return { lampId: String(row?.lamp?.id || ''), night: String(row?.periodKey || ''), go: '/tonight' }
}

export function askActions(t) {
  return [
    { identifier: 'did', buttonTitle: t('tonight.answerDid'), options: { opensAppToForeground: false } },
    { identifier: 'nope', buttonTitle: t('tonight.answerNope'), options: { opensAppToForeground: false } },
  ]
}

// A button press on a reminder, or null for anything else (a plain tap opens
// the app as before). `at` is when it was handled: an answer for a night that
// has already turned is dropped by the tap path, never filed on an old night.
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
