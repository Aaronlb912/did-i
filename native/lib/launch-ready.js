// InteractionManager is deprecated; an idle callback does the same job.
export function afterIdle(fn) {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => fn())
  else setTimeout(fn, 0)
}

/** Run after the first frame so permission APIs and native modules are safe to touch. */
export function runAfterLaunchReady(task) {
  return new Promise((resolve) => {
    afterIdle(() => {
      requestAnimationFrame(() => {
        Promise.resolve()
          .then(task)
          .catch(() => {})
          .finally(resolve)
      })
    })
  })
}
