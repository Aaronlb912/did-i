let railPull = { value: 0 }
let railLive = { value: 0 }
let ready = false

function ensureRails() {
  if (ready) return
  ready = true
  try {
    const { makeMutable } = require('react-native-reanimated')
    if (typeof makeMutable === 'function') {
      railPull = makeMutable(0)
      railLive = makeMutable(0)
    }
  } catch {
    // Plain objects keep imports from throwing at bundle load.
  }
}

export function getRailPull() {
  ensureRails()
  return railPull
}

export function getRailLive() {
  ensureRails()
  return railLive
}

export function restRails() {
  ensureRails()
  railPull.value = 0
  railLive.value = 0
}
