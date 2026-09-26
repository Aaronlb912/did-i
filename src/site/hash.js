const ROUTES = new Set([
  '/',
  '/home',
  '/tonight',
  '/enter',
  '/sign-in',
  '/about',
  '/door',
  '/name',
  '/read',
  '/into',
  '/lamps',
  '/week',
  '/calendar',
  '/streaks',
  '/stats',
  '/feed',
  '/search',
  '/me',
  '/settings',
  '/settings/phone',
  '/add',
  '/hang',
  '/lamp',
  '/welcome',
  '/pings',
  '/help',
  '/privacy',
  '/terms',
  '/ideas',
  '/later',
  '/first',
  '/marks',
  '/shop',
  '/shop/looks',
  '/shop/cheers',
  '/shop/buddies',
  '/gems',
  '/kit',
  '/account',
  '/people',
  '/people/connect',
  '/people/refer',
  '/friends',
  '/family',
  '/inbox',
  '/sent',
])

export function parseHash() {
  let raw = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '')
  let query = ''
  const cut = raw.indexOf('?')
  if (cut >= 0) {
    query = raw.slice(cut + 1)
    raw = raw.slice(0, cut)
  }
  if (!raw || raw === '/') raw = '/'
  else {
    if (!raw.startsWith('/')) raw = `/${raw}`
    raw = raw.replace(/\/+$/, '') || '/'
  }
  const path = ROUTES.has(raw) ? raw : '/'
  const params = new URLSearchParams(query)
  const face = params.get('face') || ''
  const id = params.get('id') || ''
  const start = params.get('start') || ''
  const tag = params.get('tag') || ''
  const copy = params.get('copy') || ''
  return { path, face, id, start, tag, copy }
}

export function readHash() {
  return parseHash().path
}

export function readFace() {
  return parseHash().face
}

function extrasToParams(extras) {
  if (!extras) return new URLSearchParams()
  if (typeof extras === 'string') {
    const params = new URLSearchParams()
    if (extras) params.set('face', extras)
    return params
  }
  const params = new URLSearchParams()
  if (extras.face) params.set('face', extras.face)
  if (extras.id) params.set('id', extras.id)
  if (extras.start) params.set('start', extras.start)
  if (extras.tag) params.set('tag', extras.tag)
  if (extras.copy) params.set('copy', extras.copy)
  return params
}

export function goFromPush(where) {
  const raw = String(where || '/').trim()
  if (!raw) return
  const cut = raw.indexOf('?')
  const pathPart = cut >= 0 ? raw.slice(0, cut) : raw
  const params = new URLSearchParams(cut >= 0 ? raw.slice(cut + 1) : '')
  const extras = {}
  if (params.get('id')) extras.id = params.get('id')
  if (params.get('face')) extras.face = params.get('face')
  if (params.get('start')) extras.start = params.get('start')
  goHash(pathPart, extras)
}

export function goHash(path, extras = '') {
  const current = parseHash()
  const extra = typeof extras === 'string' ? { face: extras } : { ...(extras || {}) }
  if (extra.tag === undefined && current.tag) extra.tag = current.tag
  if (extra.tag === 'all') extra.tag = ''
  const params = extrasToParams(extra)
  const qs = params.toString()
  const base = path === '/' ? '#/' : `#${path}`
  const hash = qs ? `${base}?${qs}` : base
  if (window.location.hash === hash || (hash === '#/' && !window.location.hash)) return
  window.location.hash = hash.replace(/^#/, '')
}
