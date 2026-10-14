// Per-account lists kept for a fast first paint (native useKept with KEEP,
// Did we cards). Signing out removes them so nothing stays on the device.
export const ACCOUNT_CACHE_PREFIXES = ['did-i-kept:', 'did-i-we-cards:', 'did-i-gifts-']

function storedKeys(store) {
  // The phone's storage shim lists keys itself; browsers use length/key().
  if (typeof store.allKeys === 'function') return store.allKeys()
  const keys = []
  for (let i = 0; i < (store.length || 0); i += 1) keys.push(store.key(i))
  return keys
}

export function forgetAccountCaches() {
  try {
    const store = globalThis.localStorage
    if (!store) return
    for (const key of storedKeys(store)) {
      if (key && ACCOUNT_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) store.removeItem(key)
    }
  } catch {
    // Nothing more to clear.
  }
}
