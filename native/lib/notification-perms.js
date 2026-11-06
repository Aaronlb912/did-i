import { Linking, Platform } from 'react-native'

let lastCheck = null
let notificationsMod = null

async function notifications() {
  if (notificationsMod) return notificationsMod
  notificationsMod = await import('expo-notifications')
  return notificationsMod
}

export async function verifyNotificationPermission() {
  try {
    const Notifications = await notifications()
    const result = await Notifications.getPermissionsAsync()
    lastCheck = { ok: true, status: result.status, canAskAgain: result.canAskAgain !== false, ios: result.ios }
    return lastCheck
  } catch (error) {
    lastCheck = { ok: false, status: 'undetermined', error: String(error?.message || error) }
    return lastCheck
  }
}

export function notificationPermissionGranted() {
  return lastCheck?.ok && lastCheck.status === 'granted'
}

export async function askNotificationPermission() {
  try {
    const Notifications = await notifications()
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    })
    const canAskAgain = asked.canAskAgain !== false
    lastCheck = { ok: true, status: asked.status, canAskAgain, ios: asked.ios }
    // Android: a swiped-away prompt says denied but may be asked again.
    if (asked.status === 'denied' && canAskAgain) return 'undetermined'
    return asked.status
  } catch {
    // The module failed, not the person: not a denial.
    lastCheck = { ok: false, status: 'undetermined' }
    return 'missing'
  }
}

// Android: the Did I channel can be muted (None, Min or Low) while the app
// itself is allowed. True off Android, with no channel yet, or on an error.
export async function reminderChannelOn() {
  if (Platform.OS !== 'android') return true
  try {
    const Notifications = await notifications()
    const channel = await Notifications.getNotificationChannelAsync('did-i')
    const { NONE, MIN, LOW } = Notifications.AndroidImportance
    return !channel || ![NONE, MIN, LOW].includes(channel.importance)
  } catch {
    return true
  }
}

export function openReminderChannel() {
  return Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
    { key: 'android.provider.extra.APP_PACKAGE', value: 'com.aaronbryant.didi' },
    { key: 'android.provider.extra.CHANNEL_ID', value: 'did-i' },
  ]).catch(() => Linking.openSettings())
}
