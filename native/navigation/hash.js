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
  '/notes',
  '/search',
  '/me',
  '/settings',
  '/settings/phone',
  '/settings/more',
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
  '/shop/accessories',
  '/shop/frames',
  '/gems',
  '/kit',
  '/gift',
  '/gifts',
  '/account',
  '/people',
  '/people/connect',
  '/people/refer',
  '/scan',
  '/friends',
  '/family',
  '/friend',
  '/inbox',
  '/sent',
  '/we',
  '/we/new',
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
    // When the question in face was asked for, so asking again for the same
    // one brings it back to the top. Stable across renders.
    focusAt: params.focusAt || 0,
  }
}

function paramsOf(route) {
  return { face: route.face, id: route.id, start: route.start, copy: route.copy, focusAt: route.focusAt }
}

function ready() {
  return navigationRef.isReady()
}

let swapping = false
let fromMenu = false

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
      CommonActions.navigate(HALL, { screen: TAB_OF[route.path], params: paramsOf(route) }),
    )
    return
  }
  // Already on it: stay. Anything else opens fresh, so back always
  // retraces the path you took.
  const key = routeKey(route)
  if (routeKey(routeFromScreen(routes[routes.length - 1])) === key) return
  // A done form going back to the screen right behind it is just back.
  if (swapping && routes.length > 1 && routeKey(routeFromScreen(routes[routes.length - 2])) === key) {
    navigationRef.dispatch(StackActions.pop())
    return
  }
  // A menu page goes on top of the page you were on, so back returns there.
  // If it is already open further back, drop back to it instead of stacking a copy.
  if (fromMenu) {
    const at = routes.findIndex((screen, i) => i > 0 && routeKey(routeFromScreen(screen)) === key)
    if (at > 0) {
      navigationRef.dispatch(
        CommonActions.reset({ ...state, index: at, routes: routes.slice(0, at + 1) }),
      )
      return
    }
  }
  const move = swapping && routes.length > 1 ? StackActions.replace : StackActions.push
  navigationRef.dispatch(move(route.path, paramsOf(route)))
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
  if (routeKey(next) !== routeKey(current)) {
    current = next
    notify()
  }
  for (const entry of [...redirects]) redirectIfAt(entry)
}

/** The path of the screen right under the current one ('' at the root). */
export function behindPath() {
  if (!ready()) return ''
  const routes = navigationRef.getRootState()?.routes || []
  if (routes.length < 2) return ''
  const under = routes[routes.length - 2]
  if (under.name !== HALL) return cleanPath(under.name)
  // The hall: whichever tab was showing.
  const tabs = under.state
  return cleanPath(tabs?.routes?.[tabs.index ?? 0]?.name || '/tonight')
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

function samePlace(a, b) {
  return a === b || (HALL_PATHS.has(a) && TAB_OF[a] === TAB_OF[b])
}

const redirects = new Set()

function redirectIfAt({ from, to, when }) {
  if (samePlace(current.path, from) && when()) goHash(to)
}

/** While mounted, sends `from` on to `to` each time the stack settles on it and `when()` still holds. */
export function redirectFrom(from, to, when = () => true) {
  const entry = { from, to, when }
  redirects.add(entry)
  redirectIfAt(entry)
  return () => {
    redirects.delete(entry)
  }
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
    // A new ask for a question (a notification, a link) refocuses it; carrying
    // the same face along, as a tag change does, does not.
    focusAt: extra.face ? (extra.face === current.face && extra.keepFocus ? current.focusAt : Date.now()) : 0,
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

/** From the main menu: the stack becomes Home plus this screen. */
export function goFromMenu(path, extras) {
  fromMenu = true
  try {
    goHash(path, extras)
  } finally {
    fromMenu = false
  }
}

/** Go to path in place of this screen, so back skips it (a form that is done). */
export function swapHash(path, extras) {
  swapping = true
  try {
    goHash(path, extras)
  } finally {
    swapping = false
  }
}
