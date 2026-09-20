import { useEffect } from 'react'
import { goHash, parseHash } from './hash.js'
import { markWelcomeSeen } from '../lib/hall-pages.js'

const STACK_KEY = 'did-i-stack'
let muteStack = false

/** Tab roots — no back affordance. */
export const ROOT_ROUTES = new Set(['/', '/home', '/tonight', '/lamps', '/later', '/everyone'])

/** When there is no browser history, step here instead. */
const FALLBACK = {
  '/friends': '/people',
  '/family': '/people',
  '/inbox': '/people',
  '/sent': '/people',
  '/account': '/settings',
  '/kit': '/shop',
  '/gems': '/shop',
  '/shop/looks': '/shop',
  '/shop/cheers': '/shop',
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
    // Private mode.
  }
}

export function routeKey(route = parseHash()) {
  const params = new URLSearchParams()
  if (route.face) params.set('face', route.face)
  if (route.id) params.set('id', route.id)
  if (route.start) params.set('start', route.start)
  if (route.tag) params.set('tag', route.tag)
  const qs = params.toString()
  return qs ? `${route.path}?${qs}` : route.path
}

function applyRouteKey(key) {
  const hash = key === '/' ? '#/' : `#${key}`
  const url = `${window.location.pathname}${window.location.search}${hash}`
  window.history.replaceState(null, '', url)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** Keep a small in-app stack. Browser history alone is not enough on a cold open. */
export function syncNav() {
  if (muteStack || typeof window === 'undefined') return
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
  const { path } = parseHash()
  if (ROOT_ROUTES.has(path)) return false
  if (readStack().length > 1) return true
  return Boolean(FALLBACK[path])
}

export function goBack(opts = {}) {
  const event = new CustomEvent('did-i-back', { cancelable: true })
  window.dispatchEvent(event)
  if (event.defaultPrevented) return

  const { path } = parseHash()

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

/** Close a sheet or confirm before leaving the screen. */
export function useBackDismiss(active, onDismiss) {
  useEffect(() => {
    if (!active || !onDismiss) return
    function onBack(event) {
      onDismiss()
      event.preventDefault()
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  }, [active, onDismiss])
}

const EDGE = 24
const SWIPE = 72

/** Swipe in from the left edge to go back. */
export function useSwipeBack(enabled = true) {
  useEffect(() => {
    if (!enabled || !canGoBack()) return

    let startX = 0
    let startY = 0
    let tracking = false

    function onStart(event) {
      const touch = event.touches[0]
      if (!touch || touch.clientX > EDGE) return
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
    }

    function onMove(event) {
      if (!tracking) return
      const touch = event.touches[0]
      if (!touch) return
      if (Math.abs(touch.clientY - startY) > 48) tracking = false
    }

    function onEnd(event) {
      if (!tracking) return
      tracking = false
      const touch = event.changedTouches[0]
      if (!touch) return
      if (touch.clientX - startX >= SWIPE) goBack()
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [enabled])
}
