import Constants from 'expo-constants'

/** Matches app.config.js `extra.nativeWidgets` (widgets extension in this IPA). */
export function nativeWidgetsEnabled() {
  const flag = Constants.expoConfig?.extra?.nativeWidgets
  return flag === '1' || flag === true
}
