import { Platform } from 'react-native'
import { cloud } from '../../src/lib/cloud.js'
import { deviceKey } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import {
  askNotificationPermission,
  notificationPermissionGranted,
  verifyNotificationPermission,
} from '../lib/notification-perms.js'
import { isNativeHall } from './native.js'

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

async function ensureNotificationHandler() {
  if (handlerReady) return
  handlerReady = true
  try {
    const Notifications = await notifications()
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: Platform.OS === 'ios',
        shouldSetBadge: Platform.OS === 'ios',
      }),
    })
  } catch {
    // ok
  }
}

export function pushPossible() {
  return isNativeHall()
}

async function keepToken(token) {
  const db = cloud()
  if (!db || !token) return
  const { data } = await db.auth.getSession()
  const user = data?.session?.user
  if (!user) return
  await db.from('devices').upsert(
    {
      user_id: user.id,
      device_key: deviceKey(),
      push_token: token,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_key' },
  )
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
  try {
    const Notifications = await notifications()
    const handle = (response) => {
      const data = response?.notification?.request?.content?.data || {}
      const lampId = data.lampId ? String(data.lampId) : ''
      const go = data.go ? String(data.go) : ''
      if (lampId && typeof onLamp === 'function') onLamp(lampId)
      else if (go && typeof onGo === 'function') onGo(go)
    }
    Notifications.addNotificationResponseReceivedListener(handle)
    // The tap that launched the app came before this listener existed.
    const first = await Notifications.getLastNotificationResponseAsync?.()
    if (first) {
      handle(first)
      Notifications.clearLastNotificationResponse?.()
    }
  } catch {
    // ok
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

  const check = await verifyNotificationPermission()
  if (!check.ok) return 'notifications-unavailable'

  await ensureNotificationHandler()
  await bindResponseListener(handlers)

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

  const check = await verifyNotificationPermission()
  if (!check.ok) return 'notifications-unavailable'

  await ensureNotificationHandler()
  await bindResponseListener(handlers)

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
