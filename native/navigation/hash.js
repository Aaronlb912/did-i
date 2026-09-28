// Same routes as src/site/hash.js, backed by React Navigation on native.
// Every route is its own native-stack screen named by its path, pushed over
// the hall: the system tab bar with Tonight ('/', '/home', '/tonight') and
// Questions ('/lamps'). goHash stays the one call
// the screens make, so they read the same as the web.

import { CommonActions, createNavigationContainerRef, StackActions } from '@react-navigation/native'
import { markWelcomeSeen } from '../../src/lib/hall-pages.js'

const ROUTES = new Set([
  '/',
  '/home',
  '/tonight',
  '/enter',
  '/sign-in',
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
  '/people/refer',
  '/friends',
  '/family',
  '/inbox',
  '/sent',
])

/** The root screen every other route is pushed over. */
export const HALL = 'hall'
export const HALL_PATHS = new Set(['/', '/home', '/tonight', '/lamps'])
const TAB_OF = { '/': '/tonight', '/home': '/tonight', '/tonight': '/tonight', '/lamps': '/lamps' }
/** One native-stack screen per route that is not the hall. */
export const STACK_PATHS = [...ROUTES].filter((path) => !HALL_PATHS.has(path))
/** Screens with their own way out; the edge swipe would skip it. */
export const OWN_BACK = new Set(['/first', '/welcome', '/enter'])

export const navigationRef = createNavigationContainerRef()

// The tag filter follows you from screen to screen, like the web's ?tag=.
let tag = ''
let current = { path: '/tonight', face: '', id: '', start: '', tag: '', copy: '' }
let pending = null
const listeners = new Set()

function routeKey(route = current) {
  const params = new URLSearchParams()
  if (route.face) params.set('face', route.face)
  if (route.id) params.set('id', route.id)
  if (route.start) params.set('start', route.start)
  if (route.tag) params.set('tag', route.tag)
  const qs = params.toString()
  return qs ? `${route.path}?${qs}` : route.path
}

/** The hash route a navigation route stands for. */
export function routeFromScreen(screen) {
  const params = screen?.params || {}
  // The hall before its tabs mount is Tonight.
  const name = screen?.name === HALL ? '/tonight' : screen?.name
  return {
    path: cleanPath(name),
    face: params.face || '',
    id: params.id || '',
    start: params.start || '',
    tag,
    copy: params.copy || '',
  }
}

function paramsOf(route) {
  return { face: route.face, id: route.id, start: route.start, copy: route.copy }
}

function ready() {
  return navigationRef.isReady()
}

function go(route) {
  if (!ready()) {
    pending = route
    return
  }
  const state = navigationRef.getRootState()
  const routes = state?.routes || []
  if (!routes.length) {
    pending = route
    return
  }
  if (HALL_PATHS.has(route.path)) {
    if (routes.length > 1) navigationRef.dispatch(StackActions.popToTop())
    navigationRef.dispatch(
      CommonActions.navigate({
        name: HALL,
        params: { screen: TAB_OF[route.path], params: paramsOf(route) },
      }),
    )
    return
  }
  // Already in the stack: go back to it, the same as the web trims its history.
  const key = routeKey(route)
  const at = routes.findIndex((screen) => routeKey(routeFromScreen(screen)) === key)
  if (at >= 0) {
    if (at < routes.length - 1) navigationRef.dispatch(StackActions.pop(routes.length - 1 - at))
    return
  }
  navigationRef.dispatch(StackActions.push(route.path, paramsOf(route)))
}

/** A goHash that came before the stack was mounted runs once it is. */
export function flushNavigation() {
  const next = pending
  pending = null
  if (next) go(next)
}

/** The stack moved by itself (edge swipe, header back, system back). */
export function syncFromNavigation() {
  if (!ready()) return
  const screen = navigationRef.getCurrentRoute()
  if (!screen) return
  const next = routeFromScreen(screen)
  if (routeKey(next) === routeKey(current)) return
  current = next
  notify()
}

/** A screen is pushed over the hall. Switching tabs is not history to go back through. */
export function canGoBack() {
  return ready() && (navigationRef.getRootState()?.routes?.length || 0) > 1
}

/** Back from the current screen. False when there is nowhere to go, so Android can leave the app. */
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
  if (event.defaultPrevented) return true

  const { path } = current
  if (path === '/welcome') {
    markWelcomeSeen()
    goHash(opts.emptyHall ? '/first' : '/')
    return true
  }
  if (path === '/enter') {
    if (!opts.needsEnter) goHash('/')
    return true
  }
  // The first question has to be added before anything else opens.
  if (path === '/first') return true

  // Includes Questions back to Tonight, the Material way.
  if (ready() && navigationRef.canGoBack()) {
    navigationRef.goBack()
    return true
  }
  if (!HALL_PATHS.has(path)) {
    goHash('/')
    return true
  }
  return false
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
  if (extra.tag !== undefined) tag = extra.tag === 'all' ? '' : extra.tag
  current = {
    path: nextPath,
    face: extra.face || '',
    id: extra.id || '',
    start: extra.start || '',
    tag,
    copy: extra.copy || '',
  }
  const hash = nextPath === '/' ? '#/' : `#${nextPath}`
  if (global.window?.location) global.window.location.hash = hash
  notify()
  try {
    go(current)
  } catch {
    // The screen already moved. A navigator reject must not freeze the tap.
  }
}
