import { cloudSetUp } from './cloud.js'

const LAST_USER = 'did-i-last-user'

export function readAccountUserId() {
  try {
    return localStorage.getItem(LAST_USER) || ''
  } catch {
    return ''
  }
}

export function writeAccountUserId(id) {
  try {
    if (id) localStorage.setItem(LAST_USER, id)
    else localStorage.removeItem(LAST_USER)
  } catch {
    // ok
  }
}

export function accountSessionOn() {
  return cloudSetUp() && Boolean(readAccountUserId())
}
