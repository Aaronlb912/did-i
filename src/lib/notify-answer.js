// Did and Nope buttons on a reminder. They open the app for a moment (a fully
// closed app drops background taps without a native task); the answer goes
// through the same path as a widget tap.

import { nightEnd } from './daily.js'
import { nightOpen } from './recurrence.js'

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
// the app as before). `at` stamps the answer. On a cold launch JS runs seconds
// after the tap, so a 23:59:58 tap is handled after midnight. While the
// reminder's night still takes answers (grace) it files there, at that night's
// end; a night that has truly closed keeps `now` and the tap path drops it.
export function notificationAnswer(response, now = Date.now()) {
  const action = String(response?.actionIdentifier || '')
  if (action !== 'did' && action !== 'nope') return null
  const request = response?.notification?.request || {}
  const data = request.content?.data || {}
  const night = data.night ? String(data.night) : ''
  const noteId = request.identifier ? String(request.identifier) : ''
  const at = night && nightOpen(night, new Date(now)) ? Math.min(now, nightEnd(night).getTime()) : now
  if (data.weId) return { kind: 'we', id: String(data.weId), action, night, at, noteId }
  if (data.lampId) return { kind: 'lamp', id: String(data.lampId), action, night, at, noteId }
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
