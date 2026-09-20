import * as Notifications from 'expo-notifications'
import { cloud } from '../../src/lib/cloud.js'
import { deviceKey } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { isNativeHall } from './native.js'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

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

export async function startPush(onOpen) {
  if (!pushPossible()) return 'not native'
  const { status: existing } = await Notifications.getPermissionsAsync()
  let status = existing
  if (existing !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync()
    status = asked.status
  }
  if (status !== 'granted') return status

  Notifications.addNotificationResponseReceivedListener((response) => {
    const where = response?.notification?.request?.content?.data?.go
    if (where && typeof onOpen === 'function') onOpen(String(where))
  })

  try {
    const token = await Notifications.getDevicePushTokenAsync()
    await keepToken(token?.data)
  } catch {
    // Firebase not configured yet. See docs/push.md.
  }
  return 'granted'
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
