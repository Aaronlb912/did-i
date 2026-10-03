// Pathname routes for did-i.app marketing pages. The app lives on /app with #/… routes.

import { webAppPublic } from './web-app.js'

const MARKETING = new Set(['/', '/privacy', '/terms', '/download', '/press', '/beta'])

// /i/CODE is an invite link page (src/site/Invite.jsx).
function isMarketing(path) {
  return MARKETING.has(path) || /^\/i\/[A-Za-z0-9]+$/.test(path) || Boolean(scanFromPath(path)) || Boolean(didYouCodeFromPath(path))
}

// /d/CODE is a Did you link page (src/site/DidYouLanding.jsx).
export function didYouCodeFromPath(path) {
  const hit = /^\/d\/([A-Za-z0-9]{12}|[A-Za-z0-9]{10})$/.exec(path)
  return hit ? hit[1].toLowerCase() : ''
}

// /f/ID and /j/CODE are friend and family QR pages (src/site/ScanLanding.jsx).
export function scanFromPath(path) {
  const hit = /^\/([fj])\/([A-Za-z0-9]+)$/.exec(path)
  return hit ? { kind: hit[1], code: hit[2] } : null
}

export function inviteCodeFromPath(path) {
  const hit = /^\/i\/([A-Za-z0-9]+)$/.exec(path)
  return hit ? hit[1] : ''
}

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
  return isMarketing(path) && path !== '/'
}

export function shouldShowMarketing() {
  return isMarketing(readMarketingPath())
}

/** Production site: /app and other non-marketing paths go back to landing. */
export function redirectBlockedWebApp() {
  if (typeof window === 'undefined') return false
  if (webAppPublic()) return false
  const path = readMarketingPath()
  if (isMarketing(path)) return false
  window.location.replace('/')
  return true
}

/** Old bookmarks used /#/tonight on the landing URL. Send them to /app when web app is public. */
export function redirectLegacyAppHash() {
  if (typeof window === 'undefined') return false
  const path = readMarketingPath()
  if (!isMarketing(path)) return false
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
