import { InteractionManager } from 'react-native'

/** Run after the first frame so permission APIs and native modules are safe to touch. */
export function runAfterLaunchReady(task) {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        Promise.resolve()
          .then(task)
          .catch(() => {})
          .finally(resolve)
      })
    })
  })
}
