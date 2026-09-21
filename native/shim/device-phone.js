import { NativeModules, PermissionsAndroid, Platform } from 'react-native'

export async function readDevicePhone() {
  if (Platform.OS !== 'android') return ''
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    )
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return ''
    const raw = await NativeModules.DevicePhone?.getLineNumber?.()
    return String(raw || '').trim()
  } catch {
    return ''
  }
}
