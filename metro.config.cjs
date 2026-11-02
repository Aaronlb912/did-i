const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const nativeHash = path.resolve(__dirname, 'native/navigation/hash.js')
const nativeShim = path.resolve(__dirname, 'native/shim/native.js')
const pushShim = path.resolve(__dirname, 'native/shim/push.js')
const gemIapShim = path.resolve(__dirname, 'native/iap/gem-store.js')

const NATIVE_SHIMS = [
  ['react-native-worklets', 'worklets-safe.cjs'],
  ['react-native-reanimated', 'reanimated-safe.cjs'],
  ['react-native-gesture-handler', 'gesture-handler-safe.cjs'],
  ['react-native-svg', 'svg-safe.cjs'],
  ['react-native-safe-area-context', 'safe-area-safe.cjs'],
  ['expo-constants', 'constants-safe.cjs'],
  ['@react-native-community/netinfo', 'netinfo-safe.cjs'],
  ['expo-clipboard', 'clipboard-safe.cjs'],
  ['expo-haptics', 'haptics-safe.cjs'],
  ['expo-store-review', 'store-review-safe.cjs'],
  ['expo-sharing', 'sharing-safe.cjs'],
  ['react-native-view-shot', 'view-shot-safe.cjs'],
  ['expo-battery', 'battery-safe.cjs'],
  ['expo-secure-store', 'secure-store-safe.cjs'],
  ['expo-crypto', 'crypto-safe.cjs'],
  ['expo-linking', 'linking-safe.cjs'],
  ['expo-splash-screen', 'splash-safe.cjs'],
  ['expo-document-picker', 'document-picker-safe.cjs'],
  ['expo-image-picker', 'image-picker-safe.cjs'],
  ['expo-image-manipulator', 'image-manipulator-safe.cjs'],
  ['expo-camera', 'camera-safe.cjs'],
  ['expo-quick-actions', 'quick-actions-safe.cjs'],
  ['expo-apple-authentication', 'apple-auth-safe.cjs'],
  ['@react-native-google-signin/google-signin', 'google-signin-safe.cjs'],
  ['expo-application', 'application-safe.cjs'],
  ['expo-updates', 'updates-safe.cjs'],
  ['expo-font', 'font-safe.cjs'],
  ['expo-status-bar', 'status-bar-safe.cjs'],
  ['expo-blur', 'blur-safe.cjs'],
  ['expo-widgets', 'widgets-safe.cjs'],
  ['expo-notifications', 'notifications-safe.cjs'],
  ['react-native-screens', 'screens-safe.cjs'],
  ['react-native-nitro-modules', 'nitro-safe.cjs'],
  ['react-native-mmkv', 'mmkv-safe.cjs'],
  ['expo-iap', 'iap-safe.cjs'],
  ['react-native-android-widget', 'android-widget-safe.cjs'],
  ['@expo/ui/swift-ui', 'ui-swift-safe.cjs'],
  ['@expo/ui/swift-ui/modifiers', 'ui-swift-modifiers-safe.cjs'],
  ['@expo/ui/jetpack-compose', 'ui-compose-safe.cjs'],
]

function shimPath(file) {
  return path.resolve(__dirname, 'native/shim', file)
}

function resolveNativeShim(origin, moduleName) {
  for (const [pkg, file] of NATIVE_SHIMS) {
    if (moduleName !== pkg) continue
    if (origin.endsWith(`native/shim/${file}`)) return null
    return { filePath: shimPath(file), type: 'sourceFile' }
  }
  return null
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    return context.resolveRequest(context, moduleName, platform)
  }
  const origin = String(context.originModulePath || '').replace(/\\/g, '/')
  const shimmed = resolveNativeShim(origin, moduleName)
  if (shimmed) return shimmed

  const resolved = context.resolveRequest(context, moduleName, platform)
  const file = resolved?.filePath?.replace(/\\/g, '/') || ''
  if (file.endsWith('src/site/hash.js')) {
    return { filePath: nativeHash, type: 'sourceFile' }
  }
  if (file.endsWith('src/lib/native.js')) {
    return { filePath: nativeShim, type: 'sourceFile' }
  }
  if (file.endsWith('src/lib/push.js')) {
    return { filePath: pushShim, type: 'sourceFile' }
  }
  if (file.endsWith('src/lib/gem-iap.js')) {
    return { filePath: gemIapShim, type: 'sourceFile' }
  }
  return resolved
}

module.exports = config
