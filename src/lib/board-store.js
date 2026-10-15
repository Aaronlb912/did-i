const DB_NAME = 'did-i'
const STORE = 'kv'
const KEY = 'board'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function saveBoardForSw(book) {
  return putForSw(KEY, book)
}

// The reminder prefs the worker needs (it cannot read localStorage): which
// pings are off and quiet hours.
export function savePrefsForSw(prefs) {
  if (typeof indexedDB === 'undefined' || !prefs) return Promise.resolve()
  const { pingsOff, quietOn, quietFrom, quietTo } = prefs
  return putForSw('prefs', { pingsOff, quietOn, quietFrom, quietTo })
}

export function loadPrefsForSw() {
  return getForSw('prefs')
}

async function putForSw(key, value) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Page pings still work if IndexedDB is blocked.
  }
}

export function loadBoardForSw() {
  return getForSw(KEY)
}

async function getForSw(key) {
  try {
    const db = await openDb()
    const book = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return book
  } catch {
    return null
  }
}
