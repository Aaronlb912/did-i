// The coach-mark tour runner. Screens register real controls with
// useTourTarget(key); the runner opens each step's screen, measures the
// control, and TourHost draws the cutout. It never sends, answers or buys.
import { useCallback, useRef, useSyncExternalStore } from 'react'
import { Dimensions, Keyboard } from 'react-native'
import { claimTourCoins } from '../../src/lib/wallet.js'
import { readTour, tourWho, writeTour, readWidgetTip, writeWidgetTip } from '../../src/lib/first-run.js'
import { accountSessionOn } from '../../src/lib/session-id.js'
import { t } from '../../src/lib/i18n.js'
import { TOUR_PARTS } from '../../src/lib/tour-steps.js'
import { goHash, readHash } from '../navigation/hash.js'
import { whenNoSheet } from '../components/SheetHost.jsx'
import { confirmDone } from './confirm.js'
import { showWidgetTip, widgetPlaced } from './widget-pin.js'

// Mounted nodes by key. Screens under the top one stay mounted, so a key can
// have several; the newest one that is on screen wins.
const targets = new Map()

// Page scrollers (BoardShell), newest last, so a step can bring its target up.
const scrollers = []
export function setTourScroller(node) {
  if (!node || scrollers.includes(node)) return
  scrollers.push(node)
  if (scrollers.length > 6) scrollers.shift()
}

function scrollNodeUp(node, scroller) {
  return new Promise((resolve) => {
    const inner = scroller?.getInnerViewRef?.()
    if (!scroller?.scrollTo || !inner) return resolve(false)
    try {
      node.measureLayout(
        inner,
        (_x, top) => {
          scroller.scrollTo({ y: Math.max(0, top - 24), animated: false })
          resolve(true)
        },
        () => resolve(false),
      )
    } catch {
      resolve(false)
    }
  })
}

async function bringUp(key) {
  const node = [...(targets.get(key) || [])].pop()
  if (!node) return
  for (const scroller of [...scrollers].reverse()) {
    if (await scrollNodeUp(node, scroller)) return
  }
}

export function useTourTarget(key, onLayout) {
  const node = useRef(null)
  const ref = useCallback(
    (next) => {
      const nodes = targets.get(key) || new Set()
      if (node.current) nodes.delete(node.current)
      node.current = next
      if (next) nodes.add(next)
      targets.set(key, nodes)
    },
    [key],
  )
  const layout = useCallback((event) => onLayout?.(event), [onLayout])
  return { ref, collapsable: false, onLayout: layout }
}

function measureNode(node) {
  return new Promise((resolve) => {
    try {
      node.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null))
    } catch {
      resolve(null)
    }
  })
}

async function measureTarget(key) {
  const { width, height } = Dimensions.get('window')
  for (const node of [...(targets.get(key) || [])].reverse()) {
    const rect = await measureNode(node)
    if (rect && rect.x < width && rect.y < height && rect.x + rect.w > 0 && rect.y + rect.h > 0) {
      // A tall target (a whole list) cuts out its top half only.
      return { ...rect, h: Math.min(rect.h, height * 0.5) }
    }
  }
  return null
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The target's rect once it shows, or null if it never does. */
export async function whenTarget(key, ms = 2500) {
  const end = Date.now() + ms
  for (;;) {
    const rect = await measureTarget(key)
    if (rect) return rect
    if (Date.now() >= end) return null
    await sleep(120)
  }
}

let state = { phase: 'idle', part: 'basics', index: 0, rect: null, replay: false, pays: false, claim: 'idle', coins: 0, skips: [] }
const subs = new Set()
let run = 0
let session = 0

function set(next) {
  state = { ...state, ...next }
  subs.forEach((fn) => fn())
}

function subscribe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

export function useTour() {
  return useSyncExternalStore(subscribe, () => state)
}

export const tourActive = () => state.phase !== 'idle'

const TODAY = new Set(['/', '/home', '/tonight'])
const samePlace = (a, b) => a === b || (TODAY.has(a) && TODAY.has(b))

/** Opens a part. welcome shows the first card; otherwise the steps start now. */
export function startTour(part, { replay = false, welcome = false } = {}) {
  run += 1
  const mine = ++session
  set({ phase: welcome ? 'welcome' : 'loading', part, index: 0, rect: null, replay, pays: false, claim: 'idle', coins: 0, skips: [] })
  // Drop the dots of steps that will skip, so the count is right from the start:
  // the widget step when one is placed, Not yet when nothing waits there now.
  // A step that turns out to have its target after all takes its dot back.
  const steps = TOUR_PARTS[part].steps
  const early = steps.flatMap((step, i) => (step.target && step.path === '/tonight' && i > 0 && !(targets.get(step.target) || new Set()).size ? [i] : []))
  if (early.length) set({ skips: early })
  const widgetAt = steps.findIndex((step) => step.widget)
  if (widgetAt >= 0) {
    widgetPlaced().then((placed) => {
      if (placed && session === mine) skipAt(widgetAt)
    }).catch(() => {})
  }
  if (!welcome) runStep(0)
}

export function tourBegin() {
  runStep(0)
}

function skipAt(index) {
  if (!state.skips.includes(index)) set({ skips: [...state.skips, index] })
}

async function runStep(index) {
  const token = ++run
  const steps = TOUR_PARTS[state.part].steps
  if (index >= steps.length) return finish()
  const step = steps[index]
  set({ phase: 'loading', index, rect: null })
  if (step.widget) {
    const placed = await widgetPlaced().catch(() => false)
    if (token !== run) return undefined
    if (placed) {
      skipAt(index)
      return runStep(index + 1)
    }
    return set({ phase: 'widget' })
  }
  if (!samePlace(readHash(), step.path)) {
    goHash(step.path)
    await sleep(600)
  }
  if (token !== run) return undefined
  if (step.path === '/add') {
    // Add opens with the keyboard up; it would push the controls around.
    Keyboard.dismiss()
    await sleep(350)
  }
  // A target below the fold measures as off screen: scroll it up first.
  if (step.scroll) {
    await sleep(200)
    await bringUp(step.target)
    await sleep(120)
    if (token !== run) return undefined
  }
  let rect = await whenTarget(step.target)
  if (token !== run) return undefined
  if (!rect) {
    skipAt(index)
    return runStep(index + 1)
  }
  if (step.scroll) {
    await bringUp(step.target)
    await sleep(120)
    rect = (await measureTarget(step.target)) || rect
    if (token !== run) return undefined
  }
  set({ phase: 'step', rect, skips: state.skips.filter((i) => i !== index) })
  // Screens finish sliding in a beat later.
  await sleep(450)
  if (token !== run) return undefined
  const again = await measureTarget(step.target)
  if (token === run && again) set({ rect: again })
  return undefined
}

export function tourNext() {
  if (state.phase === 'step') runStep(state.index + 1)
}

/** The widget step's Next: the existing widget tip, then on. */
export async function tourWidgetNext(colors) {
  const token = ++run
  const index = state.index
  set({ phase: 'tip' })
  showWidgetTip(colors, () => writeWidgetTip({ ...readWidgetTip(), done: true }))
  await whenNoSheet()
  if (token === run) runStep(index + 1)
}

function leave() {
  if (!samePlace(readHash(), '/tonight')) goHash('/tonight')
}

/** Skip, Not now and Android back: the part counts as seen. */
export function tourSkip() {
  run += 1
  const { part, phase } = state
  if (readTour()[part] === 'new') writeTour({ [part]: 'seen' })
  set({ phase: 'idle', rect: null })
  if (phase !== 'welcome') leave()
}

/** Add closed. A step that lives on Add has nothing left to point at: end the part as seen. */
export function tourAddClosed() {
  if (state.phase === 'idle') return
  if (TOUR_PARTS[state.part].steps[state.index]?.scope !== 'add') return
  run += 1
  if (readTour()[state.part] === 'new') writeTour({ [state.part]: 'seen' })
  set({ phase: 'idle', rect: null })
}

export function tourClose() {
  run += 1
  set({ phase: 'idle', rect: null })
  leave()
}

const NUDGE_WAIT = 3 * 24 * 60 * 60 * 1000

/** Basics finished 3+ days ago, More never opened, never nudged: ask once. */
export function moreNudgeDue(now = Date.now()) {
  const tour = readTour()
  return tour.basics === 'done' && tour.more === 'new' && !tour.moreNudged && Number(tour.basicsAt) > 0 && now - Number(tour.basicsAt) >= NUDGE_WAIT
}

export function startMoreNudge() {
  writeTour({ moreNudged: true })
  startTour('more', { welcome: true })
}

export function tourMore() {
  startTour('more')
}

// The shell owns the shelf: it applies the balance the server returns.
let applyBalance = null
export function setTourBalanceHandler(fn) {
  applyBalance = fn
}

/**
 * Asks the server for a part's coins. Returns coins paid, null if it failed,
 * or undefined if the account changed while it ran (nothing is marked paid).
 */
async function pay(part) {
  const who = tourWho()
  const res = await claimTourCoins(part)
  if (tourWho() !== who) return undefined
  if (!res) return null
  writeTour({ [`${part}Claim`]: 'paid' }, who)
  if (res.paid > 0) applyBalance?.(res.balance, who)
  return res.paid
}

async function claimEnd(part) {
  if (!accountSessionOn()) return set({ claim: 'signin' })
  set({ claim: 'busy' })
  const coins = await pay(part)
  if (coins === undefined) {
    // Another account is signed in now; the end card would pay the wrong one.
    if (state.phase === 'end') set({ phase: 'idle', rect: null })
    return undefined
  }
  if (state.phase !== 'end' || state.part !== part) {
    if (coins) confirmDone(t('tour.paid', { n: coins }))
    return undefined
  }
  return set(coins == null ? { claim: 'fail' } : { claim: 'ok', coins })
}

export function tourRetry() {
  claimEnd(state.part)
}

function finish() {
  const { part } = state
  const first = readTour()[part] !== 'done'
  writeTour({
    [part]: 'done',
    ...(first ? { [`${part}Claim`]: 'pending' } : {}),
    // Starts the clock on the one nudge for the second part.
    ...(first && part === 'basics' ? { basicsAt: Date.now() } : {}),
  })
  set({ phase: 'end', rect: null, pays: first, claim: 'idle', coins: 0 })
  if (first) claimEnd(part)
}

/** Signed in later: pays any part finished while signed out or offline. */
export async function claimPendingTour() {
  if (state.phase !== 'idle' || !accountSessionOn()) return
  const tour = readTour()
  for (const part of Object.keys(TOUR_PARTS)) {
    if (tour[`${part}Claim`] !== 'pending') continue
    const coins = await pay(part)
    if (coins) confirmDone(t('tour.paid', { n: coins }))
  }
}
