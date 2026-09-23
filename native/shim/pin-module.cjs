/** Keep Metro/Babel default imports from reading `.default` off undefined.
 * A healthy module is returned as itself. A proxy here breaks gesture and
 * reanimated getters and the screen stops taking touches.
 * A getter that throws, or a missing default, falls through to the fallback.
 */

function note(errKey, error) {
  if (!errKey || !error) return
  const box = globalThis
  box[errKey] = String(error.message || error)
}

function seal(mod, defaultExport) {
  if (mod == null || (typeof mod !== 'object' && typeof mod !== 'function')) {
    return { __esModule: true, default: defaultExport ?? mod ?? {} }
  }
  try {
    if (mod.default != null) {
      if (!mod.__esModule) mod.__esModule = true
      return mod
    }
  } catch (error) {
    note(globalThis.__didIPinError, error)
    return { __esModule: true, default: defaultExport ?? {} }
  }
  // Keep the same object. A copy drops non-enumerable exports like createWidget,
  // and the Tonight widget then never gets a snapshot.
  try {
    mod.__esModule = true
    mod.default = defaultExport ?? mod
    return mod
  } catch (error) {
    note(globalThis.__didIPinError, error)
  }
  return new Proxy(mod, {
    get(target, prop) {
      if (prop === '__esModule') return true
      if (prop === 'default') return defaultExport ?? target
      try {
        return target[prop]
      } catch (error) {
        note(globalThis.__didIPinError, error)
        return undefined
      }
    },
  })
}

function pinEsModule(mod, defaultExport) {
  return seal(mod, defaultExport)
}

/** tryRequire must use a string-literal require(), not a dynamic module id. */
function loadPinned(tryRequire, isOk, fallback, errKey) {
  let real = null
  try {
    real = tryRequire()
  } catch (error) {
    note(errKey, error)
    return seal(fallback())
  }
  try {
    if (isOk(real)) return seal(real)
  } catch (error) {
    note(errKey, error)
  }
  return seal(fallback())
}

module.exports = { pinEsModule, loadPinned, seal }
