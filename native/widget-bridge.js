import { AppState, Platform } from 'react-native'
import { readShelf } from '../src/lib/board-shelf.js'
import { nativeBridgeReady } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { pullWidgetTimelineIntoShelf, syncTonightWidget } from './widget-sync.js'
import { reconcileShelfFromWidgetNow } from './widget-reconcile.js'

let started = false
let appStateSub = null

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
      if (state !== 'active' || !nativeBridgeReady()) return
      refreshWidgetTimelineFromKit().catch(() => {})
    })
  }
}

/** Merge the latest WidgetKit timeline into the shelf (after taps while app was backgrounded). */
export async function refreshWidgetTimelineFromKit() {
  if (!nativeWidgetsEnabled() || !nativeBridgeReady()) return readShelf()
  const merged = await reconcileShelfFromWidgetNow({ pullTimeline: true })
  await syncTonightWidget(merged)
  return merged
}

export async function pullTimelineOnly(shelf) {
  if (!nativeWidgetsEnabled()) return shelf
  return pullWidgetTimelineIntoShelf(shelf)
}
