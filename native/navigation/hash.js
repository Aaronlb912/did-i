// Same routes as src/site/hash.js, backed by React Navigation on native.

import { markWelcomeSeen } from '../../src/lib/hall-pages.js'

const ROUTES = new Set([
  '/',
  '/home',
  '/tonight',
  '/enter',
  '/about',
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
  '/friends',
  '/family',
  '/inbox',
  '/sent',
  '/everyone',
])

const STACK_KEY = 'did-i-stack'
const ROOT_ROUTES = new Set(['/', '/home', '/tonight', '/lamps', '/later'])
const FALLBACK = {
  '/friends': '/people',
  '/people/connect': '/people',
  '/family': '/people',
  '/inbox': '/people',
  '/sent': '/people',
  '/account': '/settings',
  '/kit': '/shop',
  '/gems': '/shop',
  '/shop/looks': '/shop',
  '/shop/cheers': '/shop',
  '/shop/buddies': '/shop',
  '/settings/phone': '/settings',
  '/pings': '/settings',
  '/me': '/settings',
  '/help': '/settings',
  '/ideas': '/settings',
  '/about': '/settings',
  '/privacy': '/settings',
  '/terms': '/settings',
  '/add': '/lamps',
  '/hang': '/lamps',
  '/lamp': '/lamps',
  '/search': '/lamps',
  '/week': '/',
  '/calendar': '/',
  '/streaks': '/',
  '/stats': '/',
  '/feed': '/',
  '/marks': '/',
  '/shop': '/',
  '/settings': '/',
  '/people': '/',
}

let navigate = null
let current = { path: '/tonight', face: '', id: '', start: '', tag: '', copy: '' }
let muteStack = false
const listeners = new Set()

function readStack() {
  try {
    const raw = sessionStorage.getItem(STACK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeStack(stack) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-50)))
  } catch {
    // ok
  }
}

function routeKey(route = current) {
  const params = new URLSearchParams()
  if (route.face) params.set('face', route.face)
  if (route.id) params.set('id', route.id)
  if (route.start) params.set('start', route.start)
  if (route.tag) params.set('tag', route.tag)
  const qs = params.toString()
  return qs ? `${route.path}?${qs}` : route.path
}

function routeFromKey(key) {
  const [pathPart, query = ''] = key.split('?')
  const path = cleanPath(pathPart)
  const params = new URLSearchParams(query)
  return {
    path,
    face: params.get('face') || '',
    id: params.get('id') || '',
    start: params.get('start') || '',
    tag: params.get('tag') || '',
    copy: params.get('copy') || '',
  }
}

function applyRouteKey(key) {
  current = routeFromKey(key)
  navigate?.(current)
  notify()
}

export function peekBackRoute() {
  const stack = readStack()
  if (stack.length > 1) return routeFromKey(stack[stack.length - 2])
  const parent = FALLBACK[current.path]
  if (parent) {
    return {
      ...current,
      path: parent,
      face: '',
      id: '',
      start: '',
      copy: '',
    }
  }
  return null
}

export function syncNav() {
  if (muteStack) return
  const key = routeKey()
  let stack = readStack()
  if (!stack.length) {
    writeStack([key])
    return
  }
  if (stack[stack.length - 1] === key) return
  const hit = stack.lastIndexOf(key)
  if (hit >= 0) {
    writeStack(stack.slice(0, hit + 1))
    return
  }
  stack.push(key)
  writeStack(stack)
}

export function canGoBack() {
  const { path } = current
  if (ROOT_ROUTES.has(path)) return false
  if (readStack().length > 1) return true
  return Boolean(FALLBACK[path])
}

export function goBack(opts = {}) {
  // A plate or sheet gets first refusal on back, the same as the web.
  const event = {
    type: 'did-i-back',
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
  }
  try {
    global.window?.dispatchEvent?.(event)
  } catch {
    // ok
  }
  if (event.defaultPrevented) return

  const { path } = current
  if (path === '/welcome') {
    markWelcomeSeen()
    goHash(opts.emptyHall ? '/first' : '/')
    return
  }
  if (path === '/enter') {
    if (!opts.needsEnter) goHash('/')
    return
  }
  if (path === '/first') {
    goHash('/')
    return
  }

  const stack = readStack()
  if (stack.length > 1) {
    stack.pop()
    const prev = stack[stack.length - 1]
    writeStack(stack)
    muteStack = true
    applyRouteKey(prev)
    muteStack = false
    return
  }

  const parent = FALLBACK[path]
  if (parent) {
    goHash(parent)
    return
  }
  if (!ROOT_ROUTES.has(path)) goHash('/')
}

export function bindNavigation(fn) {
  navigate = fn
}

export function onRoute(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  listeners.forEach((fn) => fn(current))
  if (global.window?.dispatchEvent) {
    try {
      global.window.dispatchEvent({ type: 'hashchange' })
    } catch {
      // RN stub.
    }
  }
}

export function readRoute() {
  return current
}

export function parseHash() {
  return current
}

export function readHash() {
  return current.path
}

export function readFace() {
  return current.face
}

function extrasToParams(extras) {
  if (!extras) return {}
  if (typeof extras === 'string') return { face: extras }
  return { ...(extras || {}) }
}

function cleanPath(raw) {
  let path = String(raw || '/')
  if (!path.startsWith('/')) path = `/${path}`
  path = path.replace(/\/+$/, '') || '/'
  return ROUTES.has(path) ? path : '/'
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
  const extra = extrasToParams(extras)
  const nextPath = cleanPath(path)
  if (extra.tag === undefined && current.tag) extra.tag = current.tag
  if (extra.tag === 'all') extra.tag = ''
  current = {
    path: nextPath,
    face: extra.face || '',
    id: extra.id || '',
    start: extra.start || '',
    tag: extra.tag || '',
    copy: extra.copy || '',
  }
  navigate?.(current)
  const hash = nextPath === '/' ? '#/' : `#${nextPath}`
  if (global.window?.location) global.window.location.hash = hash
  notify()
  syncNav()
}
