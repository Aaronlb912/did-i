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
    lastCheck = { ok: true, status: asked.status, ios: asked.ios }
    return asked.status
  } catch {
    lastCheck = { ok: false, status: 'denied' }
    return 'denied'
  }
}
