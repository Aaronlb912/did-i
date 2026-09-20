// Pathname routes for did-i.app marketing pages. The app lives on /app with #/… routes.

import { webAppPublic } from './web-app.js'

const MARKETING = new Set(['/', '/privacy', '/terms', '/download'])

export function normalizePath(pathname) {
  let raw = String(pathname || '/')
  if (!raw.startsWith('/')) raw = `/${raw}`
  raw = raw.replace(/\/+$/, '') || '/'
  return raw
}

export function readMarketingPath() {
  if (typeof window === 'undefined') return '/'
  return normalizePath(window.location.pathname)
}

export function isAppPath() {
  if (typeof window === 'undefined') return true
  if (!webAppPublic()) return false
  const path = readMarketingPath()
  return path === '/app' || path.startsWith('/app/')
}

export function isMarketingOnlyPath() {
  const path = readMarketingPath()
  return MARKETING.has(path) && path !== '/'
}

export function shouldShowMarketing() {
  return MARKETING.has(readMarketingPath())
}

/** Production site: /app and other non-marketing paths go back to landing. */
export function redirectBlockedWebApp() {
  if (typeof window === 'undefined') return false
  if (webAppPublic()) return false
  const path = readMarketingPath()
  if (MARKETING.has(path)) return false
  window.location.replace('/')
  return true
}

/** Old bookmarks used /#/tonight on the landing URL. Send them to /app when web app is public. */
export function redirectLegacyAppHash() {
  if (typeof window === 'undefined') return false
  const path = readMarketingPath()
  if (!MARKETING.has(path)) return false
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash || hash === '/') return false
  if (!webAppPublic()) {
    window.location.replace(path)
    return true
  }
  const nextHash = hash.startsWith('/') ? hash : `/${hash}`
  window.location.replace(`/app#${nextHash}`)
  return true
}

export function goMarketing(path) {
  const next = normalizePath(path)
  window.history.pushState({ marketing: next }, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
