import { AppState } from 'react-native'
import * as Updates from '../shim/updates-safe.cjs'
import { t } from '../../src/lib/i18n.js'
import { HALL_PATHS, readRoute } from '../navigation/hash.js'
import { sheetIsUp } from '../components/SheetHost.jsx'
import { confirmDone } from './confirm.js'

// Over-the-air updates without two restarts. The launch check only downloads;
// the update runs on the next cold start. Here, coming back to the app after a
// while checks and downloads too, and a downloaded update reloads right away,
// but only on Tonight or Home with no sheet up, so nothing half typed is lost.
// Otherwise it waits for the next return.
const AWAY_MS = 5 * 60 * 1000
const FRESH_MS = 4000
const UPDATED_KEY = 'did-i-ota-updated'

let started = false
let leftAt = 0
let ready = false
let checking = false

function canUse() {
  return !__DEV__ && Updates.isEnabled === true && typeof Updates.checkForUpdateAsync === 'function'
}

// A safe moment: just back in the app, on a main screen, nothing open.
export function safeToReload({ path, sheetUp, state }) {
  return state === 'active' && !sheetUp && HALL_PATHS.has(path || '/')
}

function reloadIfSafe() {
  if (!ready) return
  const route = readRoute()
  if (!safeToReload({ path: route?.path, sheetUp: sheetIsUp(), state: AppState.currentState })) return
  try {
    globalThis.localStorage?.setItem(UPDATED_KEY, '1')
  } catch {
    // ok: the toast is only a nicety
  }
  Updates.reloadAsync().catch(() => {
    ready = false
  })
}

async function checkAndFetch() {
  if (checking || ready) return
  checking = true
  try {
    const found = await Updates.checkForUpdateAsync()
    if (found?.isAvailable) {
      const got = await Updates.fetchUpdateAsync()
      if (got?.isNew) ready = true
    }
  } catch {
    // No signal or the server is down: the launch check tries again.
  } finally {
    checking = false
  }
}

export function startOtaRefresh() {
  if (started || !canUse()) return
  started = true
  // After a reload from here, say so once.
  try {
    if (globalThis.localStorage?.getItem(UPDATED_KEY)) {
      globalThis.localStorage.removeItem(UPDATED_KEY)
      setTimeout(() => confirmDone(t('update.applied')), 800)
    }
  } catch {
    // ok
  }
  AppState.addEventListener('change', (next) => {
    if (next !== 'active') {
      leftAt = leftAt || Date.now()
      return
    }
    const away = leftAt ? Date.now() - leftAt : 0
    leftAt = 0
    if (ready) {
      reloadIfSafe()
      return
    }
    if (away < AWAY_MS) return
    // A slow download lands mid-use: wait for the next return instead.
    const back = Date.now()
    checkAndFetch().then(() => {
      if (Date.now() - back < FRESH_MS) reloadIfSafe()
    })
  })
}
