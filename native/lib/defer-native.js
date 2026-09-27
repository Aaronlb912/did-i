import { afterIdle, runAfterLaunchReady } from './launch-ready.js'

/** iOS WidgetKit + some TurboModules fatal if touched in the first second after launch. */
const BRIDGE_DELAY_MS = 1200

let bridgeReady = false
let pendingWidgetShelf = null

export function nativeBridgeReady() {
  return bridgeReady
}

export function markNativeBridgeReady() {
  if (bridgeReady) return
  bridgeReady = true
  if (pendingWidgetShelf) {
    const shelf = pendingWidgetShelf
    pendingWidgetShelf = null
    import('../widget-sync.js')
      .then((mod) => mod.syncTonightWidget(shelf))
      .catch(() => {})
  }
}

export function queueWidgetSync(shelf) {
  pendingWidgetShelf = shelf
}

export function afterNativeBridgeReady(task) {
  return new Promise((resolve) => {
    runAfterLaunchReady(() => {
      afterIdle(() => {
        setTimeout(() => {
          markNativeBridgeReady()
          Promise.resolve()
            .then(task)
            .catch(() => {})
            .finally(resolve)
        }, BRIDGE_DELAY_MS)
      })
    })
  })
}
