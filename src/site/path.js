// Pathname routes for did-i.app marketing pages. The app itself stays on /app or #/…

const MARKETING = new Set(['/', '/privacy', '/terms'])

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
  const path = readMarketingPath()
  if (path === '/app' || path.startsWith('/app/')) return true
  const hash = window.location.hash.replace(/^#/, '')
  if (hash && hash !== '/') return true
  return false
}

export function isMarketingOnlyPath() {
  const path = readMarketingPath()
  return MARKETING.has(path) && path !== '/'
}

export function shouldShowMarketing() {
  const path = readMarketingPath()
  if (path === '/privacy' || path === '/terms') return true
  if (path === '/' && !isAppPath()) return true
  return false
}

export function goMarketing(path) {
  const next = normalizePath(path)
  window.history.pushState({ marketing: next }, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
