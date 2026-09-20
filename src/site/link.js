import { Capacitor } from '@capacitor/core'
import { goHash } from './hash.js'
import { webAppPublic } from './web-app.js'

export function sitePath(path) {
  if (Capacitor.isNativePlatform()) return `#${path}`
  if (path === '/privacy' || path === '/terms') return path
  return `#${path}`
}

export function goSite(path) {
  const target = sitePath(path)
  if (target.startsWith('#')) goHash(path)
  else window.location.href = target
}

export function openApp() {
  if (!webAppPublic()) {
    window.location.href = '/download'
    return
  }
  window.location.href = '/app'
}

export function appHomeHref() {
  return webAppPublic() ? '/app' : '/download'
}

export { webAppPublic }
