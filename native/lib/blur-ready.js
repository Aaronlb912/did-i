import { Platform, UIManager } from 'react-native'

const BLUR_VIEW = 'ExpoBlurView'

/** True when the dev build was compiled with expo-blur linked in. */
export function blurNativeReady() {
  if (Platform.OS === 'web') return false
  try {
    if (typeof UIManager.getViewManagerConfig === 'function') {
      return UIManager.getViewManagerConfig(BLUR_VIEW) != null
    }
    if (typeof UIManager.hasViewManagerConfig === 'function') {
      return UIManager.hasViewManagerConfig(BLUR_VIEW)
    }
  } catch {
    return false
  }
  return false
}
