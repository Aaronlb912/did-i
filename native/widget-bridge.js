import { AppState, Platform } from 'react-native'
import { readShelf } from '../src/lib/board-shelf.js'
import { setWidgetBeforePull } from '../src/lib/widget-reconcile.js'
import { publishShelf } from '../src/lib/widget-tonight.js'
import { nativeBridgeReady } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { markWidgetTimelineRead, pullWidgetTimelineIntoShelf, setWidgetTimelineReader, syncTonightWidget } from './widget-sync.js'
import { reconcileShelfFromWidgetNow } from './widget-reconcile.js'

let started = false
let appStateSub = null
let pendingRefresh = null

async function loadWidgetModule() {
  return import('../widgets/DidITonightWidget.tsx')
}

/** Register listeners and push the first snapshot (Expo widgets doc pattern). */
export async function initWidgetsOnLaunch(shelf = readShelf()) {
  if (!nativeWidgetsEnabled() || Platform.OS === 'web') return
  if (started) {
    await syncTonightWidget(shelf)
    return
  }
  started = true

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    if (Platform.OS === 'ios') await loadWidgetModule()
    // No file extension, so iOS loads widget-setup.ios.js and Android loads
    // widget-setup.android.js. The .js file is the empty web stub.
    const setup = await import('./widget-setup')
    if (typeof setup.installWidgetSetup === 'function') setup.installWidgetSetup()
  }

  await syncTonightWidget(shelf)

  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (state) => {
      // Taps may land while away; read them before the next write.
      if (state !== 'active') markWidgetTimelineRead(false)
      if (state !== 'active' || !nativeBridgeReady()) return
      beginWidgetRefresh().catch(() => {})
    })
  }
}

/** Merge the latest WidgetKit timeline into the shelf (after taps while app was backgrounded). */
export async function refreshWidgetTimelineFromKit() {
  if (!nativeWidgetsEnabled() || !nativeBridgeReady()) return readShelf()
  const merged = await reconcileShelfFromWidgetNow({ pullTimeline: true })
  markWidgetTimelineRead()
  publishShelf(merged)
  syncTonightWidget(merged).catch(() => {})
  return merged
}

export function beginWidgetRefresh() {
  if (!nativeWidgetsEnabled() || Platform.OS === 'web' || !nativeBridgeReady()) {
    return Promise.resolve(readShelf())
  }
  if (!pendingRefresh) {
    pendingRefresh = refreshWidgetTimelineFromKit().finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

setWidgetBeforePull(() => beginWidgetRefresh())
setWidgetTimelineReader(() => beginWidgetRefresh())

export async function pullTimelineOnly(shelf) {
  if (!nativeWidgetsEnabled()) return shelf
  return pullWidgetTimelineIntoShelf(shelf)
}
