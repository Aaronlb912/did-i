// What a friend or family QR code holds: a did-i.app link. With Did I on the
// phone, the scanner in the app (or the camera app, through the page's Open
// button) goes straight to the friend request or the family. Without it, the
// page (src/site/ScanLanding.jsx) shows the store buttons and keeps the code
// for after install and sign-in.

export const SCAN_URL = 'https://did-i.app/'
const KEY = 'did-i-pending-scan'

export function friendQrLink(friendId) {
  const id = String(friendId || '').replace(/\D/g, '')
  return id.length === 12 ? `${SCAN_URL}f/${id}` : ''
}

export function familyQrLink(code) {
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return clean.length === 6 || clean.length === 10 ? `${SCAN_URL}j/${clean}` : ''
}

// { friend: '123456789012' }, { family: 'ABC123' }, or null. Reads the page
// link and the didi:// link the page's Open button uses.
export function readQrLink(text) {
  const raw = String(text || '').trim().split(/[?#]/)[0]
  const friend = /^(?:https:\/\/(?:www\.)?did-i\.app\/f\/|didi(?:-dev)?:\/\/friend\/)(\d{12})\/?$/i.exec(raw)
  if (friend) return { friend: friend[1] }
  const family = /^(?:https:\/\/(?:www\.)?did-i\.app\/j\/|didi(?:-dev)?:\/\/family\/)([a-z0-9]{6}|[a-z0-9]{10})\/?$/i.exec(raw)
  if (family) return { family: family[1].toUpperCase() }
  return null
}

// The route id Connect reads: friend:ID or family:CODE.
export function scanRouteId(found) {
  if (found?.friend) return `friend:${found.friend}`
  if (found?.family) return `family:${found.family}`
  return ''
}

// A scan link anywhere in some text: the copied page link on iPhone, or the
// Play install referrer (scan=friend:ID).
export function scanFromText(text) {
  const raw = String(text || '')
  const link = /did-i\.app\/([fj])\/([A-Za-z0-9]+)/i.exec(raw)
  if (link) return scanRouteId(readQrLink(`${SCAN_URL}${link[1].toLowerCase()}/${link[2]}`))
  const ref = /scan[=:](friend|family)(?::|%3A)([A-Za-z0-9]+)/i.exec(raw)
  if (!ref) return ''
  const found = ref[1].toLowerCase() === 'friend' ? { friend: ref[2] } : { family: ref[2].toUpperCase() }
  return readQrLink(found.friend ? `didi://friend/${found.friend}` : `didi://family/${found.family}`) ? scanRouteId(found) : ''
}

export function savePendingScan(routeId) {
  if (!/^(friend:\d{12}|family:[A-Z0-9]{6}|family:[A-Z0-9]{10})$/.test(String(routeId || ''))) return false
  try {
    localStorage.setItem(KEY, routeId)
    return true
  } catch {
    return false
  }
}

// Read once: the first signed-in open takes it to Connect.
export function takePendingScan() {
  try {
    const id = localStorage.getItem(KEY) || ''
    if (id) localStorage.removeItem(KEY)
    return id
  } catch {
    return ''
  }
}
