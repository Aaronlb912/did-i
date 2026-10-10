// Did you links: did-i.app/d/CODE holds one question. Opening it on a phone
// with Did I asks to add it to tonight. Without the app, the page
// (src/site/DidYouLanding.jsx) shows the store buttons and the app picks the
// code up on first launch (native/invite-capture.js). Works signed out; a
// signed-in add is counted once on the link (claim_did_you_link).
//
// The same path with a 12 letter code is a Did we link (supabase/
// share-links.sql): opening it asks to join that Did we. Either kind can
// add the person who made it as a friend, only when the opener says so.
import { cloud } from './cloud.js'
import { didYouAsk } from './link-preview.js'

export { didYouAsk }

export const DID_YOU_URL = 'https://did-i.app/d/'
const SHOW_KEY = 'did-i-pending-did-you'
const CLAIM_KEY = 'did-i-did-you-claims'
const FRIEND_KEY = 'did-i-link-friends'
const listeners = new Set()

function cleanCode(code) {
  const clean = String(code || '').toLowerCase()
  return /^(?:[a-z0-9]{10}|[a-z0-9]{12})$/.test(clean) ? clean : ''
}

// A 12 letter code is a Did we link.
export function isWeLinkCode(code) {
  return cleanCode(code).length === 12
}

export function didYouLink(code) {
  const clean = cleanCode(code)
  return clean ? `${DID_YOU_URL}${clean}` : ''
}

// The code from the page link or the didi://d/CODE link its Open button uses.
export function readDidYouLink(text) {
  const hit = /^(?:https:\/\/(?:www\.)?did-i\.app\/d\/|didi(?:-dev)?:\/\/d\/)([a-z0-9]{12}|[a-z0-9]{10})\/?$/i.exec(String(text || '').trim())
  return hit ? hit[1].toLowerCase() : ''
}

// A link anywhere in some text (the copied page link on iPhone), or the Play
// install referrer (did=CODE).
export function didYouFromText(text) {
  const raw = String(text || '')
  const link = /did-i\.app\/d\/([a-z0-9]{12}|[a-z0-9]{10})(?![a-z0-9])/i.exec(raw)
  if (link) return link[1].toLowerCase()
  const ref = /(?:^|[&?\s])did=([a-z0-9]{12}|[a-z0-9]{10})(?![a-z0-9])/i.exec(raw)
  return ref ? ref[1].toLowerCase() : ''
}

// The text that goes in a message. The full https link, so Messages and
// other apps make it tappable.
export function sharedDidYouLine(question, code, lead = 'Did you') {
  return `${didYouAsk(question, lead)} ${didYouLink(code)}`
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

// Asked to add the link's maker before sign-in: done once they sign in.
export function saveLinkFriend(code) {
  const clean = cleanCode(code)
  if (clean) writeList(FRIEND_KEY, [...readList(FRIEND_KEY), clean])
}

export async function claimPendingDidYous() {
  const db = cloud()
  const codes = readList(CLAIM_KEY)
  const friends = readList(FRIEND_KEY)
  if (!db || (!codes.length && !friends.length)) return
  const { data } = await db.auth.getSession()
  if (!data?.session?.user) return
  const waiting = []
  for (const code of friends) {
    const { error } = await db.rpc('befriend_by_link', { code })
    if (error) waiting.push(code)
  }
  writeList(FRIEND_KEY, waiting)
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

// Did you links you made, newest first, with who kept each one.
export async function myDidYouLinks() {
  const db = cloud()
  if (!db) return []
  const { data, error } = await db.rpc('my_did_you_links')
  if (error) throw error
  return (data || []).map((row) => ({ ...row, kept: Array.isArray(row.kept) ? row.kept : [] }))
}

// Stop a link you made. People who already kept it keep it.
export async function endDidYouLink(code) {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db || !clean) return { miss: 'off' }
  const { data, error } = await db.rpc('end_did_you_link', { code: clean })
  if (error) return { miss: error.message || 'people.reach' }
  return data ? { miss: '' } : { miss: 'people.reach' }
}

// Report a Did you or Did we link (by code length). Signed in only; it also
// blocks whoever made it.
// { miss: 'signIn' } when signed out, a locale key on any other miss.
export async function reportDidYouLink(code, why = '') {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db || !clean) return { miss: 'people.reach' }
  const { data: session } = await db.auth.getSession()
  if (!session?.session?.user) return { miss: 'signIn' }
  const fn = clean.length === 12 ? 'report_we_link' : 'report_did_you_link'
  const { error } = await db.rpc(fn, { code: clean, why })
  if (error) return { miss: /too many reports/i.test(error.message || '') ? 'we.missReports' : 'people.reach' }
  return { miss: '' }
}

// Which line a link that did not open gets: stopped by its maker, or bad.
export function deadLinkKey(stopped) {
  return stopped ? 'didYouLink.stopped' : 'didYouLink.bad'
}

// A Did you link that looked up as nothing: was it stopped? Falls back to
// the plain "bad" line when the check fails.
export async function deadDidYouLinkKey(code) {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db || !clean || clean.length !== 10) return deadLinkKey(false)
  const { data, error } = await db.rpc('did_you_link_stopped', { code: clean })
  return deadLinkKey(!error && Boolean(data))
}

// A sent Did you can be edited while it waits for an answer.
export function canEditSent(row) {
  return Boolean(row && row.kind !== 'cheer' && row.state === 'sent')
}

// The same limits as sending: 1 to 200 letters, trimmed. { text, miss }.
export function cleanSentEdit(value) {
  const text = String(value || '').trim()
  if (!text) return { text: '', miss: 'sent.editBlank' }
  if (text.length > 200) return { text: '', miss: 'sent.editLong' }
  return { text, miss: '' }
}

// Add whoever made a Did you link as a friend. Signed in only.
export async function befriendByLink(code) {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db || !clean) return { miss: 'off' }
  const { data, error } = await db.rpc('befriend_by_link', { code: clean })
  if (error) return { miss: error.message || 'people.reach' }
  return { added: Boolean(data) }
}

// Already friends with whoever made the link: the sheet then skips "add".
export async function linkMakerIsFriend(code) {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db || !clean) return false
  const { data: session } = await db.auth.getSession()
  if (!session?.session?.user) return false
  const { data, error } = await db.rpc('link_maker_is_friend', { code: clean })
  return error ? false : Boolean(data)
}

// Did we links ------------------------------------------------------------

// { question, name, avatarUrl, people, full }, null when unknown, ended or
// past its 7 days, or { miss } when the network failed.
export async function lookUpWeLink(code) {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db) return { miss: 'off' }
  if (clean.length !== 12) return null
  const { data, error } = await db.rpc('look_up_we_link', { code: clean })
  if (error) return { miss: error.message || 'people.reach' }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.question) return null
  return {
    question: row.question,
    name: row.name || '',
    avatarUrl: row.avatar_url || '',
    people: Number(row.people) || 0,
    full: Boolean(row.full_up),
  }
}

// { card } or { miss }: gone, full, blocked, cap, or a network message.
export async function joinWeLink(code, addFriend = false) {
  const db = cloud()
  const clean = cleanCode(code)
  if (!db) return { miss: 'off' }
  if (clean.length !== 12) return { miss: 'gone' }
  const { data, error } = await db.rpc('we_join_link', { code: clean, add_friend: Boolean(addFriend) })
  if (error) return { miss: error.message || 'people.reach' }
  if (data?.miss) return { miss: data.miss }
  return { card: data?.card || '' }
}

// A Did we link opened on the website while signed out. Kept until sign-in,
// then the web app takes it back to the join page (src/App.jsx).
const WE_WEB_KEY = 'did-i-we-link-web'

export function saveWebWeLink(code) {
  const clean = cleanCode(code)
  if (clean.length !== 12) return
  try {
    localStorage.setItem(WE_WEB_KEY, clean)
  } catch {
    // Without storage they open the link again after signing in.
  }
}

export function takeWebWeLink() {
  try {
    const code = cleanCode(localStorage.getItem(WE_WEB_KEY) || '')
    localStorage.removeItem(WE_WEB_KEY)
    return code.length === 12 ? code : ''
  } catch {
    return ''
  }
}

export const WE_LINK_MISS = { gone: 'didYouLink.bad', full: 'weLink.full', blocked: 'weLink.blocked', cap: 'weLink.cap' }

export async function makeWeLink(card) {
  const db = cloud()
  if (!db) return { code: '', miss: 'off' }
  const { data, error } = await db.rpc('we_make_link', { card })
  if (error) return { code: '', miss: /too many/i.test(error.message || '') ? 'linkCap' : error.message || 'people.reach' }
  return { code: cleanCode(data), miss: '' }
}

export async function endWeLinks(card) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('we_end_links', { card })
  return error ? { miss: error.message || 'people.reach' } : {}
}

// The link you already have for this card, if it still works.
export async function myWeLink(card) {
  const db = cloud()
  if (!db) return ''
  const { data } = await db
    .from('we_links')
    .select('code, ends_at')
    .eq('card_id', card)
    .eq('ended', false)
    .gt('ends_at', new Date().toISOString())
    .order('made_at', { ascending: false })
    .limit(1)
  return cleanCode(data?.[0]?.code)
}
