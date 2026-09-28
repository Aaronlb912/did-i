import { Platform } from 'react-native'

/** Android's `android_ripple`, tinted by the hall's own accent; undefined (no-op) on iOS. */
export function ripple(color, borderless = false) {
  if (Platform.OS !== 'android') return undefined
  return { color, borderless }
}
