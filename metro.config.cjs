const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const nativeHash = path.resolve(__dirname, 'native/navigation/hash.js')
const nativeShim = path.resolve(__dirname, 'native/shim/native.js')
const pushShim = path.resolve(__dirname, 'native/shim/push.js')
const gemIapShim = path.resolve(__dirname, 'native/iap/gem-store.js')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    return context.resolveRequest(context, moduleName, platform)
  }
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
