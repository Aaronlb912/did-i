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

// The live session's user: a Did before the first sync stores the id is not paid on the phone.
let sessionUser = ''

export function noteSessionUser(id) {
  sessionUser = id || ''
}

// Who is signed in now: the saved id, or the live session's before the first sync saves it.
export function currentUserId() {
  return readAccountUserId() || sessionUser
}

export function accountSessionOn() {
  return cloudSetUp() && Boolean(readAccountUserId() || sessionUser)
}
