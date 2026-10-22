import { AppState, DeviceEventEmitter, NativeModules, Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
import { setAnswerKeyStore } from '../src/lib/answer-key.js'
import { pullAndMerge } from '../src/lib/cloud-sync.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { refreshTogether } from '../src/lib/people.js'
import { saveWeReminders, weTonight } from '../src/lib/did-we.js'
import { armLampPings } from '../src/lib/notify.js'
import { syncTogetherWidget, syncTonightWidget } from './widget-sync.js'

// Answers made away from the app.
//  - The answer key (src/lib/answer-key.js) is kept by native code: iOS
//    modules/didi-wake (Keychain, shared with the widget), Android WidgetTap
//    (Keystore). JS hands it over and never stores it.
//  - A silent wake (supabase/wake-push.sql) means an answer changed on another
//    device or by someone who shares with you: pull, then redraw the widgets
//    (which also sends the watch its cards). While the app is open the live
//    channel already does this, so a wake then is ignored.

let iosMod
function ios() {
  if (iosMod !== undefined) return iosMod
  iosMod = Platform.OS === 'ios' ? requireOptionalNativeModule('DidIWake') || null : null
  return iosMod
}

function android() {
  return Platform.OS === 'android' ? NativeModules.WidgetTap || null : null
}

const keyStore = (() => {
  if (ios()?.setAnswerKey) {
    return {
      save: async (json) => Boolean(ios().setAnswerKey(json)),
      clear: async () => ios().clearAnswerKey?.(),
    }
  }
  if (android()?.setAnswerKey) {
    return {
      save: (json) => android().setAnswerKey(json),
      clear: () => android().clearAnswerKey?.(),
    }
  }
  return null
})()
setAnswerKeyStore(keyStore)

let running = null

// Pull and redraw. Never throws; capped so iOS gets its time back.
export function runWake(ms = 20000) {
  if (running) return running
  let timer
  const work = (async () => {
    try {
      await pullAndMerge()
      const shelf = readShelf()
      await syncTonightWidget(shelf)
      await refreshTogether().catch(() => {})
      await syncTogetherWidget()
      // A Did we answered on another phone: drop today's reminder here too.
      const we = await weTonight().catch(() => ({ miss: 'off' }))
      if (!we.miss && saveWeReminders(we.cards)) await armLampPings(readShelf().boards).catch(() => {})
    } catch {
      // The next open pulls anyway.
    }
  })()
  running = Promise.race([work, new Promise((resolve) => { timer = setTimeout(resolve, ms) })]).finally(() => {
    clearTimeout(timer)
    running = null
  })
  return running
}

// Android widget task: a wake that came in while JS was not running.
export async function takeAndroidWake() {
  try {
    return Boolean(await android()?.takeWake?.())
  } catch {
    return false
  }
}

let installed = false

// iOS: the app delegate holds the push's time until wakeDone. Android: the
// Firebase service sends didiWake while JS runs (WakeMessagingService).
// first: Android's pending widget and watch taps, applied (and paid) before
// the pull can bring this phone's own answer back from the account.
export function installWake({ first } = {}) {
  if (installed) return
  installed = true
  const open = () => AppState.currentState === 'active'
  const mod = ios()
  if (mod?.addListener) {
    const onWake = () => {
      const done = () => {
        try {
          mod.wakeDone?.()
        } catch {
          // ok
        }
      }
      if (open()) done()
      else runWake().finally(done)
    }
    mod.addListener('onWake', onWake)
    let pending = false
    try {
      pending = Boolean(mod.takeWake?.())
    } catch {
      pending = false
    }
    if (pending) onWake()
    return
  }
  if (android()) {
    DeviceEventEmitter.addListener('didiWake', async () => {
      if (open()) return
      try {
        await first?.()
      } catch {
        // The taps stay queued; the pull still runs.
      }
      runWake()
    })
  }
}
