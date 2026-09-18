const ROUTES = new Set(['/', '/tonight', '/door', '/name', '/read', '/into'])

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
  const face = new URLSearchParams(query).get('face') || ''
  return { path, face }
}

export function readHash() {
  return parseHash().path
}

export function readFace() {
  return parseHash().face
}

export function goHash(path, face = '') {
  const base = path === '/' ? '#/' : `#${path}`
  const next = face ? `${path === '/' ? '#/' : `#${path}`}?face=${encodeURIComponent(face)}` : base
  if (window.location.hash === next || (next === '#/' && !window.location.hash)) return
  window.location.hash = next.replace(/^#/, '')
}
