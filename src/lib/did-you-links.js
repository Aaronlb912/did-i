// Did you links: did-i.app/d/CODE holds one question. Opening it on a phone
// with Did I asks to add it to tonight. Without the app, the page
// (src/site/DidYouLanding.jsx) shows the store buttons and the app picks the
// code up on first launch (native/invite-capture.js). Works signed out; a
// signed-in add is counted once on the link (claim_did_you_link).
import { cloud } from './cloud.js'

export const DID_YOU_URL = 'https://did-i.app/d/'
const SHOW_KEY = 'did-i-pending-did-you'
const CLAIM_KEY = 'did-i-did-you-claims'
const listeners = new Set()

function cleanCode(code) {
  const clean = String(code || '').toLowerCase()
  return /^[a-z0-9]{10}$/.test(clean) ? clean : ''
}

export function didYouLink(code) {
  const clean = cleanCode(code)
  return clean ? `${DID_YOU_URL}${clean}` : ''
}

// The code from the page link or the didi://d/CODE link its Open button uses.
export function readDidYouLink(text) {
  const hit = /^(?:https:\/\/(?:www\.)?did-i\.app\/d\/|didi(?:-dev)?:\/\/d\/)([a-z0-9]{10})\/?$/i.exec(String(text || '').trim())
  return hit ? hit[1].toLowerCase() : ''
}

// A link anywhere in some text (the copied page link on iPhone), or the Play
// install referrer (did=CODE).
export function didYouFromText(text) {
  const raw = String(text || '')
  const link = /did-i\.app\/d\/([a-z0-9]{10})(?![a-z0-9])/i.exec(raw)
  if (link) return link[1].toLowerCase()
  const ref = /(?:^|[&?\s])did=([a-z0-9]{10})(?![a-z0-9])/i.exec(raw)
  return ref ? ref[1].toLowerCase() : ''
}

export function sharedDidYouLine(question, code) {
  return `${String(question || '').trim()} ${didYouLink(code).replace(/^https:\/\//, '')}`
}

function readList(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(list) ? list.filter(cleanCode).slice(-20) : []
  } catch {
    return []
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(list)].slice(-20)))
  } catch {
    // Nothing to keep it in; the link can be opened again.
  }
}

// A link to ask about once the app is ready.
export function savePendingDidYou(code) {
  const clean = cleanCode(code)
  if (!clean) return false
  writeList(SHOW_KEY, [...readList(SHOW_KEY), clean])
  for (const fn of listeners) fn()
  return true
}

export function peekPendingDidYou() {
  return readList(SHOW_KEY)[0] || ''
}

export function dropPendingDidYou(code) {
  writeList(SHOW_KEY, readList(SHOW_KEY).filter((item) => item !== code))
}

export function onPendingDidYou(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Added before sign-in: counted on the link once they sign in.
export function saveDidYouClaim(code) {
  const clean = cleanCode(code)
  if (clean) writeList(CLAIM_KEY, [...readList(CLAIM_KEY), clean])
}

export async function claimPendingDidYous() {
  const db = cloud()
  const codes = readList(CLAIM_KEY)
  if (!db || !codes.length) return
  const { data } = await db.auth.getSession()
  if (!data?.session?.user) return
  const left = []
  for (const code of codes) {
    const { error } = await db.rpc('claim_did_you_link', { code })
    if (error) left.push(code)
  }
  writeList(CLAIM_KEY, left)
  if (!left.length) {
    try {
      localStorage.removeItem(CLAIM_KEY)
    } catch {
      // ok
    }
  }
}

// { question, name, avatarUrl } with name null for Did I, null when the code
// is unknown or ended, or { miss } when the network failed.
export async function lookUpDidYouLink(code) {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db) return { miss: 'off' }
  if (!clean) return null
  const { data, error } = await db.rpc('look_up_did_you_link', { code: clean })
  if (error) return { miss: error.message || 'people.reach' }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.question) return null
  return { question: row.question, name: row.name || null, avatarUrl: row.avatar_url || '' }
}

export async function makeDidYouLink(question) {
  const db = cloud()
  if (!db) return { code: '', miss: 'off' }
  const text = String(question || '').trim()
  if (!text) return { code: '', miss: 'blank' }
  const { data, error } = await db.rpc('make_did_you_link', { question: text })
  if (error) return { code: '', miss: /too many/i.test(error.message || '') ? 'linkCap' : error.message || 'people.reach' }
  return { code: cleanCode(data), miss: '' }
}
