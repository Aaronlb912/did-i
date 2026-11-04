import { AppState, Platform } from 'react-native'
import { cloud } from '../../src/lib/cloud.js'
import { deviceKey } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { REMIND_CATEGORY, SEND_CATEGORY, firstResponse, notificationAnswer, remindActions, sendActions, snoozeFrom } from '../../src/lib/notify-answer.js'
import {
  askNotificationPermission,
  notificationPermissionGranted,
  verifyNotificationPermission,
} from '../lib/notification-perms.js'
import { isNativeHall, snoozeNative } from './native.js'
import { askMorningFocus } from '../../src/lib/first-run.js'
import { addNotice, noticesSeenAt, readNotices } from '../../src/lib/notices.js'

const CHANNEL_ID = 'did-i'

let handlerReady = false
let responseBound = false
let tokenBound = false
let notificationsMod = null

async function notifications() {
  if (notificationsMod) return notificationsMod
  notificationsMod = await import('expo-notifications')
  return notificationsMod
}

// A push from the server (someone joined your Did we, a cheer, a friend
// request) also goes on Recent, so one swiped away can still be found.
// Reminders are local, not 'push', and stay off it.
function keepPushNotice(notification) {
  const request = notification?.request
  if (request?.trigger?.type !== 'push' || !request.identifier) return
  const content = request.content || {}
  const title = String(content.title || '')
  if (!title) return
  const go = content.data?.go ? String(content.data.go) : ''
  const at = Number(notification.date) || Date.now()
  addNotice({ id: 'push:' + request.identifier, kind: 'push', title, text: String(content.body || ''), at, go: go ? { path: go } : undefined })
}

async function keepTrayNotices(Notifications) {
  const shown = await Notifications.getPresentedNotificationsAsync?.().catch(() => [])
  // Only ones Recent never had: a cleared or already-seen one stays gone.
  const have = new Set(readNotices().map((item) => item.id))
  const seenAt = noticesSeenAt()
  ;(shown || [])
    .filter((n) => !have.has('push:' + n?.request?.identifier) && Number(n?.date) > seenAt)
    .forEach(keepPushNotice)
}

async function ensureNotificationHandler() {
  if (handlerReady) return
  handlerReady = true
  try {
    const Notifications = await notifications()
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        keepPushNotice(notification)
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: Platform.OS === 'ios',
          shouldSetBadge: Platform.OS === 'ios',
        }
      },
    })
  } catch {
    // ok
  }
}

export function pushPossible() {
  return isNativeHall()
}

// Every push sets the icon to 1 and nothing cleared it, so the icon kept a
// number after everything was read. The app sets it to what is really
// waiting (0 clears it) whenever that count changes. A push that came in
// while away sets the icon behind the app's back, so `force` sets it again
// each time the app comes to the front.
let badgeShown = -1
export async function setAppBadge(n, force = false) {
  const next = Math.max(0, Math.floor(Number(n) || 0))
  if (!pushPossible() || (next === badgeShown && !force)) return
  badgeShown = next
  try {
    const Notifications = await notifications()
    await Notifications.setBadgeCountAsync(next)
  } catch {
    badgeShown = -1
  }
}

async function keepToken(token) {
  const db = cloud()
  if (!db || !token) return
  const { data } = await db.auth.getSession()
  const user = data?.session?.user
  if (!user) return
  const row = {
    user_id: user.id,
    device_key: deviceKey(),
    push_token: token,
    last_seen_at: new Date().toISOString(),
  }
  // wake_ok: this build handles silent wakes (supabase/wake-push.sql). Older
  // builds never send it, so they never get one.
  const first = await db.from('devices').upsert({ ...row, wake_ok: true }, { onConflict: 'user_id,device_key' })
  // Before wake-push.sql is applied there is no wake_ok column.
  if (first?.error) await db.from('devices').upsert(row, { onConflict: 'user_id,device_key' })
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  try {
    const Notifications = await notifications()
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('push.channelName'),
      description: t('push.channelDesc'),
      importance: Notifications.AndroidImportance.HIGH,
    })
  } catch {
    // ok
  }
}

async function bindResponseListener(handlers = {}) {
  if (!pushPossible() || responseBound) return
  responseBound = true
  const onGo = handlers.onGo
  const onLamp = handlers.onLamp
  let listening = false
  try {
    const Notifications = await notifications()
    // Keep and Pass on a friend's did you (supabase/functions/push sets the
    // category). Both open the app; the inbox answers it.
    try {
      Notifications.setNotificationCategoryAsync(REMIND_CATEGORY, remindActions(t))?.catch?.(() => {})
      // Not awaited, so a slow call never holds up the listener below.
      Notifications.setNotificationCategoryAsync(SEND_CATEGORY, sendActions(t))?.catch?.(() => {})
    } catch {
      // No buttons; a tap still opens the inbox.
    }
    const seen = new Set()
    const handle = (response) => {
      if (!firstResponse(seen, response)) return
      keepPushNotice(response?.notification)
      const data = response?.notification?.request?.content?.data || {}
      const lampId = data.lampId ? String(data.lampId) : ''
      const go = data.go ? String(data.go) : ''
      const sendId = data.sendId ? String(data.sendId) : ''
      const action = String(response?.actionIdentifier || '')
      const answer = notificationAnswer(response)
      if (answer?.kind === 'remind') {
        Notifications.dismissNotificationAsync?.(String(response?.notification?.request?.identifier || ''))?.catch?.(() => {})
        if (typeof handlers.onRemind === 'function') handlers.onRemind(answer.id, answer.action, data.remindText)
        return
      }
      const snooze = snoozeFrom(response)
      // The buttons answer without leaving the reminder in the tray.
      if (snooze) {
        Notifications.dismissNotificationAsync?.(String(response?.notification?.request?.identifier || ''))?.catch?.(() => {})
        snoozeNative(snooze)
        return
      }
      if (answer?.noteId) Notifications.dismissNotificationAsync?.(answer.noteId)?.catch?.(() => {})
      if (sendId && (action === 'keep' || action === 'pass') && typeof handlers.onSend === 'function') {
        handlers.onSend(sendId, action === 'keep')
      } else if (answer?.kind === 'we' && typeof handlers.onWeAnswer === 'function') {
        handlers.onWeAnswer(answer.id, answer.action, answer.night)
      } else if (answer?.kind === 'lamp' && typeof handlers.onAnswer === 'function') {
        handlers.onAnswer(answer.id, answer.action, answer.night, answer.at)
      } else if (lampId && typeof onLamp === 'function') onLamp(lampId)
      else if (go && typeof onGo === 'function') {
        if (data.morning) askMorningFocus()
        onGo(go)
      }
    }
    Notifications.addNotificationResponseReceivedListener(handle)
    listening = true
    keepTrayNotices(Notifications)
    AppState.addEventListener('change', (state) => {
      if (state === 'active') keepTrayNotices(Notifications)
    })
    // The tap that launched the app came before this listener existed.
    const first = await Notifications.getLastNotificationResponseAsync?.()
    if (first) {
      handle(first)
      Notifications.clearLastNotificationResponse?.()
    }
  } catch {
    // Never bound (the import failed): let the next start try again.
    if (!listening) responseBound = false
  }
}

async function bindTokenListener() {
  if (!pushPossible() || tokenBound) return
  tokenBound = true
  try {
    const Notifications = await notifications()
    Notifications.addPushTokenListener((event) => {
      keepToken(event?.data).catch(() => {})
    })
  } catch {
    // ok
  }
}

/** Only call after permission is already granted. Never prompts. */
export async function syncPushTokenIfAllowed() {
  if (!pushPossible()) return 'not native'
  await verifyNotificationPermission()
  if (!notificationPermissionGranted()) return 'not granted'
  await bindTokenListener()
  try {
    const Notifications = await notifications()
    const token = await Notifications.getDevicePushTokenAsync()
    const data = token?.data
    if (!data) return 'token-fail'
    await keepToken(data)
    return 'granted'
  } catch {
    // Firebase / APNs not wired yet. See docs/push-ios.md.
    return 'token-fail'
  }
}

/** Launch path: handlers only. No token fetch (iOS can fatal without Firebase wired). */
export async function preparePush(handlers = {}) {
  if (!pushPossible()) return 'not native'

  // First and apart from the permission check: a hang or throw there must
  // not drop the reminder tap that launched the app.
  await bindResponseListener(handlers)
  const check = await verifyNotificationPermission()
  if (!check.ok) return 'notifications-unavailable'

  await ensureNotificationHandler()

  try {
    await ensureAndroidChannel()
  } catch {
    // ok
  }

  return 'default'
}

/** User tapped enable reminders — may prompt, then sync token. */
export async function startPush(handlers = {}) {
  if (!pushPossible()) return 'not native'

  // First and apart from the permission check: a hang or throw there must
  // not drop the reminder tap that launched the app.
  await bindResponseListener(handlers)
  const check = await verifyNotificationPermission()
  if (!check.ok) return 'notifications-unavailable'

  await ensureNotificationHandler()

  try {
    await ensureAndroidChannel()
  } catch {
    // ok
  }

  if (!notificationPermissionGranted()) {
    const status = await askNotificationPermission()
    if (status !== 'granted') return status
  }
  return syncPushTokenIfAllowed()
}

export async function dropToken() {
  const db = cloud()
  if (!db) return
  const { data } = await db.auth.getSession()
  const user = data?.session?.user
  if (!user) return
  await db
    .from('devices')
    .update({ push_token: null })
    .eq('user_id', user.id)
    .eq('device_key', deviceKey())
}
