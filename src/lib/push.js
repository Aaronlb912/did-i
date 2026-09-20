import { Capacitor } from '@capacitor/core'
import { cloud } from './cloud.js'
import { deviceKey } from './account.js'
import { t } from './i18n.js'
import { isNativeHall } from './native.js'

// A real push, so a Did I from a friend reaches a phone that is not
// open. The phone registers with Firebase, hands the token to the
// account, and a database trigger does the sending.
//
// This does nothing at all until android/app/google-services.json exists
// and the edge function has its key. See docs/push.md.

let held = null

// Wrapped in an object on purpose. A Capacitor plugin is a proxy that
// forwards every property to native, so returning it straight out of an
// async function makes the runtime reach for .then() and the app throws
// "PushNotifications.then() is not implemented on android".
async function load() {
  if (held) return held
  if (!isNativeHall()) return null
  try {
    const mod = await import('@capacitor/push-notifications')
    held = { push: mod.PushNotifications }
    return held
  } catch {
    return null
  }
}

export function pushPossible() {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
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
  const found = await load()
  if (!found) return 'not native'
  const { push } = found

  // Listeners go on before anything else. The token can arrive the
  // moment the plugin wakes up, and an event with nobody listening is
  // gone for good.
  await push.addListener('registration', (token) => {
    keepToken(token?.value)
  })
  await push.addListener('registrationError', () => {
    // Nothing to do here. The badge inside the app still works.
  })
  await push.addListener('pushNotificationActionPerformed', (event) => {
    const where = event?.notification?.data?.go
    if (where && typeof onOpen === 'function') onOpen(String(where))
  })

  let state = (await push.checkPermissions()).receive
  if (state === 'prompt' || state === 'prompt-with-rationale') {
    state = (await push.requestPermissions()).receive
  }
  if (state !== 'granted') return state

  // Android throws a notification away if its channel does not exist,
  // and says nothing about it. The sender asks for this channel by name,
  // so it has to be here before the first one arrives.
  if (Capacitor.getPlatform() === 'android') {
    try {
      await push.createChannel({
        id: 'did-i',
        name: t('push.channelName'),
        description: t('push.channelDesc'),
        importance: 4,
        visibility: 1,
      })
    } catch {
      // An older Android has no channels and does not need one.
    }
  }

  await push.register()
  return 'granted'
}

// Signing out should stop the phone being reachable on that account.
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
