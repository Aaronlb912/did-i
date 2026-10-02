import { useCallback, useEffect, useRef, useState } from 'react'
import { cadenceLine } from './board-json.js'
import { cloud, cloudSetUp } from './cloud.js'
import { weAskCount } from './did-we.js'
import { t } from './i18n.js'
import { applyFriendCheerStock, buyFriendCheers, takeFriendCheer } from './purse.js'
import { boardDate, isoDate } from './recurrence.js'
import { saveTogetherPeople } from './together-widget.js'

const FAMILY_LAMP_FIELDS =
  'id, family_id, question, short, cadence, weekdays, once_on, once_when, due_by, for_id, made_by, made_on'

export function familyLampMeta(lamp) {
  return cadenceLine({
    cadence: lamp.cadence || 'daily',
    onceWhen: lamp.once_when === 'by' ? 'by' : 'on',
    onceOn: lamp.once_on || '',
    dueBy: lamp.due_by || '',
    createdOn: lamp.made_on || '',
    weekdays: lamp.weekdays || [],
  })
}

// Everything here needs an account. With no Supabase keys the app still
// runs, these calls just say 'off' and the screens explain why.

async function me() {
  const db = cloud()
  if (!db) return null
  const { data } = await db.auth.getSession()
  return data?.session?.user || null
}

function bad(error) {
  return { miss: error?.message || 'people.reach' }
}

// A family join code is six. An invite code is ten. Same alphabet.
export const FAMILY_CODE_LEN = 6
export const INVITE_CODE_LEN = 10

export function cleanCode(value, len = FAMILY_CODE_LEN) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, len)
}

export function cleanInvite(value) {
  return cleanCode(value, INVITE_CODE_LEN)
}

export function personName(row) {
  if (!row) return ''
  return row.display_name || ''
}

// Up to two letters for an avatar.
export function personInitials(person) {
  const name = String(person?.display_name || '').trim()
  if (name) {
    const words = name.split(/\s+/).filter(Boolean)
    const letters = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]]
    return letters.map((word) => Array.from(word)[0] || '').join('').toUpperCase()
  }
  return '?'
}

// Did they clear their own tonight? Only when they share it.
export function doneTonight(person, dateIso = isoDate(new Date())) {
  return Boolean(person?.share_streak !== false && person?.done_on && person.done_on === dateIso)
}

export function friendAskTitle(person) {
  const name = person?.display_name?.trim()
  return name || ''
}

export function friendAskNote(person) {
  const name = person?.display_name?.trim()
  if (name) return t('people.wantsFromName', { name })
  return t('people.wantsIn')
}

// Profile and what friends are allowed to see -----------------------

export function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40)
}

export async function readMine() {
  const db = cloud()
  if (!db) return null
  const user = await me()
  if (!user) return null
  const { data } = await db
    .from('profiles')
    .select(
      'user_id, friend_id, display_name, share_streak, streak, done_on, invite_code, invited_by, invite_gems_paid',
    )
    .eq('user_id', user.id)
    .maybeSingle()
  return data || { user_id: user.id, display_name: '', share_streak: true }
}

export async function syncDisplayName(keeperName) {
  const name = cleanName(keeperName)
  if (!name) return { miss: '' }
  const mine = await readMine()
  if (!mine || mine.display_name?.trim()) return { miss: '' }
  return saveName(name)
}

export async function saveName(name) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = await db.from('profiles').upsert(
    { user_id: user.id, display_name: cleanName(name), updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  return error ? bad(error) : { miss: '', name: cleanName(name) }
}

export async function shareStreak(on) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = await db.from('profiles').upsert(
    { user_id: user.id, share_streak: Boolean(on), updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  return error ? bad(error) : { miss: '' }
}

// Called after a night is answered so friends see a live streak.
export async function postStreak(streak, doneOn) {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  await db.from('profiles').upsert(
    {
      user_id: user.id,
      streak: Number(streak) || 0,
      done_on: doneOn || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

function togetherRow(row) {
  const shared = row.share_streak !== false
  return {
    id: row.user_id,
    name: personName(row),
    initials: personInitials(row),
    shared,
    doneOn: shared ? row.done_on || '' : '',
  }
}

// Everyone you can see, in one call. The old way was a second query with
// the profile policy re-checked for every row that came back.
async function peopleByIds(db) {
  const { data, error } = await db.rpc('known_people')
  // Every people load comes through here, so the Together widget stays
  // current without a load of its own.
  if (!error) saveTogetherPeople((data || []).map(togetherRow))
  return new Map((data || []).map((row) => [row.user_id, row]))
}

// Keeps the Together widget current when the app comes back to the
// screen. One read, at most every 5 minutes; nothing is written.
let togetherAt = 0
export async function refreshTogether(now = Date.now()) {
  if (now - togetherAt < 5 * 60 * 1000) return
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  togetherAt = now
  try {
    await peopleByIds(db)
  } catch {
    togetherAt = 0
  }
}

// One friend or family member by id, or a bare { user_id } if not known.
export async function personById(id) {
  const db = cloud()
  if (!db || !id) return { user_id: id }
  const who = await peopleByIds(db)
  return who.get(id) || { user_id: id }
}

// Friends -------------------------------------------------------------

export async function listFriends() {
  const empty = { friends: [], asked: [], sent: [] }
  const db = cloud()
  if (!db) return empty
  const user = await me()
  if (!user) return empty
  const { data, error } = await db
    .from('friend_links')
    .select('id, from_id, to_id, state, made_at')
    .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
  if (error || !data) return empty

  const who = await peopleByIds(db)
  // known_people only covers friends and family; people still asking come from here.
  if (data.some((row) => row.to_id === user.id && row.state !== 'ok')) {
    const { data: askers } = await db.rpc('friend_askers')
    for (const row of askers || []) if (!who.has(row.user_id)) who.set(row.user_id, row)
  }
  const friends = []
  const asked = []
  const sent = []
  const seen = new Set()

  for (const row of data) {
    const otherId = row.from_id === user.id ? row.to_id : row.from_id
    const person = who.get(otherId) || { user_id: otherId }
    const item = { id: row.id, person, madeAt: row.made_at }
    if (row.state === 'ok') {
      if (seen.has(otherId)) continue
      seen.add(otherId)
      friends.push(item)
    } else if (row.to_id === user.id) {
      asked.push(item)
    } else {
      sent.push(item)
    }
  }
  friends.sort((a, b) => personName(a.person).localeCompare(personName(b.person)))
  return { friends, asked, sent }
}

// Friend IDs: 12 random digits every account has. Shown in groups of four.
export function formatFriendId(id) {
  const digits = String(id || '').replace(/\D/g, '')
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function cleanFriendId(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 12)
}

export async function myFriendId() {
  const db = cloud()
  if (!db) return { id: '', miss: 'off' }
  const { data, error } = await db.rpc('my_friend_id')
  if (error) return notRunYet(error) ? { id: '', miss: 'setup' } : { id: '', ...bad(error) }
  return { id: String(data || ''), miss: '' }
}

export async function askByFriendId(value) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const code = cleanFriendId(value)
  if (!/^[1-9]\d{11}$/.test(code)) return { miss: 'badId' }
  const { data, error } = await db.rpc('ask_by_friend_id', { wanted: code })
  if (!error && data?.miss === 'nobody') return { miss: 'nobody' }
  if (!error) return { miss: '', person: { user_id: data?.user_id, display_name: data?.display_name || '' } }
  if (notRunYet(error)) return { miss: 'setup' }
  const text = error.message || ''
  if (/too many tries/i.test(text)) return { miss: 'tooMany' }
  if (/nobody/i.test(text)) return { miss: 'nobody' }
  if (/bad id/i.test(text)) return { miss: 'badId' }
  if (/cap|too many/i.test(text)) return { miss: 'askCap' }
  return bad(error)
}

// Who a friend ID belongs to, without asking yet. state: 'friends', 'asked',
// 'asksYou', or ''.
export async function lookUpFriendId(value) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const code = cleanFriendId(value)
  if (!/^[1-9]\d{11}$/.test(code)) return { miss: 'badId' }
  const { data, error } = await db.rpc('look_up_friend_id', { wanted: code })
  if (!error && data?.miss === 'nobody') return { miss: 'nobody' }
  if (!error) {
    return {
      miss: '',
      state: String(data?.state || ''),
      person: { user_id: data?.user_id, display_name: data?.display_name || '', avatar_url: data?.avatar_url || '' },
    }
  }
  if (notRunYet(error)) return { miss: 'setup' }
  const text = error.message || ''
  if (/too many tries/i.test(text)) return { miss: 'tooMany' }
  if (/bad id/i.test(text)) return { miss: 'badId' }
  return bad(error)
}

export async function sayYes(linkId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('say_yes', { link: linkId })
  return error ? bad(error) : { miss: '' }
}

export async function sayNo(linkId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.from('friend_links').delete().eq('id', linkId)
  return error ? bad(error) : { miss: '' }
}

// Take back a request you sent that has not been answered. A yes that
// landed first is left alone (state must still be 'asked').
export async function unsendAsk(linkId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'off' }
  const { error } = await db
    .from('friend_links')
    .delete()
    .eq('id', linkId)
    .eq('from_id', user.id)
    .eq('state', 'asked')
  return error ? bad(error) : { miss: '' }
}

export async function dropFriend(otherId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('drop_friend', { other: otherId })
  return error ? bad(error) : { miss: '' }
}

// Sending a did you to a friend ---------------------------------------

export async function sendDidI(toId, question, note, dueOn, repeat = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const text = String(question || '').trim()
  if (!text) return { miss: 'blank' }
  const { error } = await db.from('sends').insert({
    from_id: user.id,
    to_id: toId,
    kind: 'todo',
    question: text,
    note: String(note || '').trim(),
    due_on: dueOn || isoDate(new Date()),
    ...(repeat ? { repeat } : {}),
  })
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { miss: 'already' }
    if (/too many repeats/i.test(error.message)) return { miss: 'people.missRepeats' }
    return { miss: error.message }
  }
  return { miss: '' }
}

// Report a Did you sent to you. It also leaves your inbox.
export async function reportSend(id, why = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('report_send', { send: id, why })
  if (error) return { miss: /too many reports/i.test(error.message) ? 'we.missReports' : 'people.reach' }
  return { miss: '' }
}

export async function sendCheer(toId, note, cheerId = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = await db.from('sends').insert({
    from_id: user.id,
    to_id: toId,
    kind: 'cheer',
    question: '',
    note: String(note || '').trim(),
    cheer_id: String(cheerId || '').trim().slice(0, 20),
  })
  if (error) {
    if (error.code === 'PGRST204' || /cheer_id/i.test(error.message || '')) {
      const plain = await db.from('sends').insert({
        from_id: user.id,
        to_id: toId,
        kind: 'cheer',
        question: '',
        note: String(note || '').trim(),
      })
      return plain.error ? bad(plain.error) : { miss: '' }
    }
    return bad(error)
  }
  return { miss: '' }
}

function stockFromRpc(data) {
  const bag = data && typeof data === 'object' ? data : {}
  const cheers = bag.cheers == null ? null : Math.max(0, Math.floor(Number(bag.cheers) || 0))
  return {
    gems: Math.max(0, Math.floor(Number(bag.gems) || 0)),
    cheers,
  }
}

export async function readFriendCheers() {
  const db = cloud()
  if (!db) return null
  const user = await me()
  if (!user) return null
  const { data, error } = await db.rpc('read_friend_cheers')
  if (error) return null
  const n = Math.floor(Number(data))
  return Number.isFinite(n) ? Math.max(0, n) : null
}

export async function sendFriendCheer(toId, note, cheerId = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { data, error } = await db.rpc('send_friend_cheer', {
    other: toId,
    note: String(note || '').trim(),
    want: String(cheerId || '').trim().slice(0, 20),
  })
  if (!error) return { miss: '', ...stockFromRpc(data) }
  const message = error.message || ''
  if (error.code === 'PGRST202' || /send_friend_cheer/i.test(message)) return { miss: 'setup' }
  if (/need cheers/i.test(message)) return { miss: 'cheers' }
  if (/not friends|not signed in/i.test(message)) return { miss: 'notFriend' }
  return bad(error)
}

export async function buyCheers(book) {
  const db = cloud()
  if (!db) return { ...buyFriendCheers(book) }
  const user = await me()
  if (!user) return { miss: 'out', book }
  const { data, error } = await db.rpc('buy_friend_cheers')
  if (!error) {
    const stock = stockFromRpc(data)
    return { miss: '', book: applyFriendCheerStock(book, stock.gems, stock.cheers), cheers: stock.cheers }
  }
  const message = error.message || ''
  if (error.code === 'PGRST202' || /buy_friend_cheers/i.test(message)) return { ...buyFriendCheers(book) }
  if (/need gems/i.test(message)) return { miss: 'gems', book }
  if (/cheer cap/i.test(message)) return { miss: 'cap', book }
  return { ...bad(error), book }
}

/** Spends one stored cheer. The gem was spent when the cheers were bought. */
export async function cheerFriend(book, otherId, cheerId = '') {
  const sent = await sendFriendCheer(otherId, '', cheerId)
  if (sent.miss === 'setup') {
    if (takeFriendCheer(book).miss) return { miss: 'cheers', book }
    const { miss } = await sendCheer(otherId, '', cheerId)
    if (miss) return { miss, book }
    return takeFriendCheer(book)
  }
  if (sent.miss) return { miss: sent.miss, book }
  return { miss: '', book: applyFriendCheerStock(book, sent.gems, sent.cheers) }
}

export async function sendFamilyCheer(toId, note, cheerId = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { data, error } = await db.rpc('send_family_cheer', {
    other: toId,
    note: String(note || '').trim(),
    want: String(cheerId || '').trim().slice(0, 20),
  })
  if (!error) return { miss: '', ...stockFromRpc(data) }
  const message = error.message || ''
  if (error.code === 'PGRST202' || /send_family_cheer/i.test(message)) return { miss: 'setup' }
  if (/need cheers/i.test(message)) return { miss: 'cheers' }
  if (/not family|not signed in/i.test(message)) return { miss: 'notFriend' }
  return bad(error)
}

export async function cheerFamily(book, otherId, note, cheerId = '') {
  const sent = await sendFamilyCheer(otherId, note, cheerId)
  if (sent.miss === 'setup') {
    if (takeFriendCheer(book).miss) return { miss: 'cheers', book }
    const { miss } = await sendCheer(otherId, note, cheerId)
    if (miss) return { miss, book }
    return takeFriendCheer(book)
  }
  if (sent.miss) return { miss: sent.miss, book }
  return { miss: '', book: applyFriendCheerStock(book, sent.gems, sent.cheers) }
}

export async function giftCheer(toId, cheerId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('gift_cheer', { other: toId, want: cheerId })
  if (!error) return { miss: '' }
  if (notRunYet(error)) return { miss: 'setup' }
  if (/gift cap/i.test(error.message || '')) return { miss: 'giftCap' }
  if (/not friends/i.test(error.message || '')) return { miss: 'notFriend' }
  return bad(error)
}

// One friend or family member, by id, for the gift screen's heading.
export async function readKnownPerson(id) {
  const db = cloud()
  if (!db || !id) return null
  return (await peopleByIds(db)).get(id) || null
}

// A look, cheer or buddy for a friend or family member. The server takes the
// gems or coins and returns the new balances.
export async function sendGift(toId, kind, itemId, note = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { data, error } = await db.rpc('send_gift', {
    other: toId,
    p_kind: kind,
    p_item_id: itemId,
    p_note: String(note || '').trim().slice(0, 60),
  })
  if (!error) return { miss: '', gems: Number(data?.gems) || 0, coins: Number(data?.coins) || 0 }
  if (notRunYet(error)) return { miss: 'setup' }
  const text = error.message || ''
  if (/gift cap/i.test(text)) return { miss: 'giftCap' }
  if (/not friends|bad person/i.test(text)) return { miss: 'notFriend' }
  if (/need gems/i.test(text)) return { miss: 'gems' }
  if (/need coins/i.test(text)) return { miss: 'coins' }
  if (/bad item/i.test(text)) return { miss: 'gone' }
  return bad(error)
}

// Gifts you sent, newest first, with who they went to and what happened.
export async function listSentGifts() {
  const db = cloud()
  if (!db) return { rows: [], miss: 'off' }
  const user = await me()
  if (!user) return { rows: [], miss: 'out' }
  const { data, error } = await db
    .from('cheer_gifts')
    .select('id, to_id, kind, cheer_id, note, gems, coins, made_at, claimed_at, returned_at')
    .eq('from_id', user.id)
    .order('made_at', { ascending: false })
    .limit(50)
  if (error) return notRunYet(error) ? { rows: [], miss: 'setup' } : { rows: [], ...bad(error) }
  const who = await peopleByIds(db)
  const rows = (data || []).map((row) => ({ ...row, person: who.get(row.to_id) || { user_id: row.to_id } }))
  return { rows, miss: '' }
}

export async function claimGifts() {
  const db = cloud()
  if (!db) return { gifts: [], miss: 'off' }
  const { data, error } = await db.rpc('claim_gifts')
  if (error) return notRunYet(error) ? { gifts: [], miss: 'setup' } : { gifts: [], ...bad(error) }
  // Opened now, so the badge drops without waiting for the next pulse.
  if (pulse.state.gifts) pulseEmit({ ...pulse.state, gifts: 0 })
  return { gifts: Array.isArray(data) ? data : [], miss: '' }
}

export async function returnGift(id) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('return_gift', { gift: id })
  return error ? bad(error) : { miss: '' }
}

export async function reportGift(id) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('report_gift', { gift: id })
  return error ? bad(error) : { miss: '' }
}

export async function claimCheerGifts() {
  const db = cloud()
  if (!db) return { ids: [], miss: 'off' }
  const { data, error } = await db.rpc('claim_cheer_gifts')
  if (error) return notRunYet(error) ? { ids: [], miss: 'setup' } : { ids: [], ...bad(error) }
  const ids = (data || []).map((row) => row.cheer_id || row).filter(Boolean)
  return { ids, miss: '' }
}

// Sends from Did I (app_sends) this account has not answered yet, from the
// last 30 days. Two reads for everyone, matched here.
async function appSendsWaiting(db, user, mode = 'inbox') {
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [sent, seen] = await Promise.all([
    db
      .from('app_sends')
      .select('id, question, note, made_at, night')
      .eq('mode', mode)
      .gte('made_at', since)
      .order('made_at', { ascending: false })
      .limit(8),
    db.from('app_send_answers').select('app_send_id').eq('user_id', user.id).gte('made_at', since),
  ])
  if (sent.error || seen.error) return []
  const done = new Set((seen.data || []).map((row) => row.app_send_id))
  return (sent.data || []).filter((row) => !done.has(row.id))
}

const DID_I_PERSON = { display_name: 'Did I' }

export async function listInbox() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const [{ data }, fromDidI] = await Promise.all([
    db
      .from('sends')
      .select('id, from_id, kind, question, note, due_on, state, made_at, cheer_id, repeat')
      .eq('to_id', user.id)
      .eq('state', 'sent')
      .order('made_at', { ascending: false }),
    appSendsWaiting(db, user),
  ])
  const apps = fromDidI.map((row) => ({
    id: `app:${row.id}`,
    appSend: true,
    kind: 'todo',
    question: row.question,
    note: row.note,
    made_at: row.made_at,
    person: DID_I_PERSON,
  }))
  if (!data?.length) return apps
  const who = await peopleByIds(db)
  return [...apps, ...data.map((row) => ({ ...row, person: who.get(row.from_id) || { user_id: row.from_id } }))]
}

export async function inboxCount() {
  const db = cloud()
  if (!db) return 0
  const user = await me()
  if (!user) return 0
  const [{ count }, fromDidI] = await Promise.all([
    db
      .from('sends')
      .select('id', { count: 'exact', head: true })
      .eq('to_id', user.id)
      .eq('state', 'sent'),
    appSendsWaiting(db, user),
  ])
  return (count || 0) + fromDidI.length
}

// Sends from Did I for one night go straight onto tonight, once per account:
// the answer row is written first, so a second phone or a resync skips it.
async function claimDidITonight(db, user) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const waiting = (await appSendsWaiting(db, user, 'tonight')).filter((row) => row.night >= isoDate(yesterday))
  const added = []
  for (const row of waiting) {
    const { error } = await db.from('app_send_answers').insert({ app_send_id: row.id, user_id: user.id, state: 'added' })
    if (!error) added.push({ question: row.question, night: row.night, fromDidI: true, person: DID_I_PERSON })
  }
  return added
}

export async function friendAskCount() {
  const db = cloud()
  if (!db) return 0
  const user = await me()
  if (!user) return 0
  const { count } = await db
    .from('friend_links')
    .select('id', { count: 'exact', head: true })
    .eq('to_id', user.id)
    .eq('state', 'asked')
  return count || 0
}

export async function peopleBadgeCount() {
  const [inbox, asks, weAsks] = await Promise.all([
    inboxCount(),
    friendAskCount(),
    weAskCount().catch(() => 0),
  ])
  return inbox + asks + weAsks
}

// What you have sent other people, and how it went.
export async function listSent() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const { data } = await db
    .from('sends')
    .select('id, to_id, kind, question, note, due_on, state, made_at, repeat')
    .eq('from_id', user.id)
    .order('made_at', { ascending: false })
    .limit(100)
  if (!data?.length) return []
  const who = await peopleByIds(db)
  return data.map((row) => ({ ...row, person: who.get(row.to_id) || { user_id: row.to_id } }))
}

// Did yous between you and one friend, both ways, newest first.
export async function sendsWith(otherId) {
  const empty = { mine: [], theirs: [], miss: '' }
  const db = cloud()
  if (!db || !otherId) return { ...empty, miss: 'off' }
  const user = await me()
  if (!user) return { ...empty, miss: 'off' }
  const { data, error } = await db
    .from('sends')
    .select('id, from_id, to_id, kind, question, state, made_at, repeat')
    .eq('kind', 'todo')
    .or(`and(from_id.eq.${user.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${user.id})`)
    .order('made_at', { ascending: false })
    .limit(100)
  if (error) return { ...empty, ...bad(error) }
  const rows = data || []
  return {
    mine: rows.filter((row) => row.from_id === user.id),
    theirs: rows.filter((row) => row.from_id === otherId),
    miss: '',
  }
}

// Only worth doing while they have not answered it.
export async function takeBack(id) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.from('sends').delete().eq('id', id).eq('state', 'sent')
  return error ? bad(error) : { miss: '' }
}

// The last few nights on a family tag, for everyone in it.
export async function familyHistory(familyId, nights) {
  const db = cloud()
  if (!db) return []
  const { data } = await db
    .from('family_answers')
    .select('lamp_id, user_id, status, period_key')
    .eq('family_id', familyId)
    .in('period_key', nights)
  return data || []
}

export async function editFamilyLamp(id, question) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const text = String(question || '').trim()
  if (!text) return { miss: 'blank' }
  const { error } = await db.from('family_lamps').update({ question: text }).eq('id', id)
  return error ? bad(error) : { miss: '' }
}

export async function answerSend(id, keep) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  if (String(id).startsWith('app:')) {
    const user = await me()
    if (!user) return { miss: 'off' }
    const { error } = await db
      .from('app_send_answers')
      .insert({ app_send_id: String(id).slice(4), user_id: user.id, state: keep ? 'kept' : 'passed' })
    // Already answered on another phone is fine.
    return error && error.code !== '23505' ? bad(error) : { miss: '' }
  }
  const { error } = await db
    .from('sends')
    .update({ state: keep ? 'kept' : 'passed' })
    .eq('id', id)
  return error ? bad(error) : { miss: '' }
}

// Blocking ---------------------------------------------------------------
//
// One sided and quiet. They are not told. Blocking also pulls down the
// friendship and any nudge still waiting, so nothing is left over.

export async function blockPerson(otherId, why = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('block_person', { other: otherId, why })
  return error ? bad(error) : { miss: '' }
}

export async function unblockPerson(otherId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('unblock_person', { other: otherId })
  return error ? bad(error) : { miss: '' }
}

export async function listBlocks() {
  const db = cloud()
  if (!db) return []
  const { data } = await db.rpc('my_blocks')
  return data || []
}

// Invites --------------------------------------------------------------

export const INVITE_GEMS_CAP = 10
export const INVITE_LOOK_AT = 3

export function inviteGemsFor(which) {
  const n = Math.floor(Number(which) || 0)
  return n < 1 ? 1 : n
}

export function inviteGemsLeft(already) {
  return Math.max(INVITE_GEMS_CAP - Math.max(0, Math.floor(Number(already) || 0)), 0)
}

export function inviteGemsDue(joined, invitesPaid, gemsPaid) {
  let left = inviteGemsLeft(gemsPaid)
  let due = 0
  for (let i = invitesPaid + 1; i <= joined && left > 0; i += 1) {
    const pay = Math.min(inviteGemsFor(i), left)
    due += pay
    left -= pay
  }
  return due
}

export async function myInvite() {
  const db = cloud()
  if (!db) return ''
  const { data } = await db.rpc('my_invite')
  return data || ''
}

export async function useInvite(code) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const want = cleanInvite(code)
  if (want.length !== INVITE_CODE_LEN) return { miss: 'code' }
  const { data, error } = await db.rpc('use_invite', { want_code: want })
  if (error) return bad(error)
  if (data === 'ok') return { miss: '' }
  return { miss: data || 'nobody' }
}

// What the account owes you. Calling it twice pays once.
export async function claimInvites() {
  const db = cloud()
  if (!db) return { gems: 0, looks: [], joined: 0 }
  const { data } = await db.rpc('claim_invites')
  return {
    gems: Number(data?.gems) || 0,
    looks: Array.isArray(data?.looks) ? data.looks : [],
    joined: Number(data?.joined) || 0,
  }
}

export function invitePayoutNote(won) {
  if (!won) return ''
  if (won.looks?.length) return t('people.wonLook', { gems: won.gems })
  if (won.gems > 0) return t('people.wonGems', { gems: won.gems })
  return ''
}

// Families -------------------------------------------------------------

export async function listFamilies() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const { data } = await db
    .from('family_members')
    .select('role, family_id, families(id, name, code)')
    .eq('user_id', user.id)
  return (data || [])
    .filter((row) => row.families)
    .map((row) => ({ ...row.families, role: row.role }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export async function makeFamily(name) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { data, error } = await db.rpc('make_family', { want_name: String(name || '').trim() })
  if (error) return bad(error)
  return { miss: '', id: data }
}

export async function joinFamily(code) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const want = cleanCode(code)
  if (want.length !== FAMILY_CODE_LEN) return { miss: 'code' }
  const { data, error } = await db.rpc('join_family', { want_code: want })
  if (error) {
    if (/too many tries/i.test(error.message)) return { miss: 'tooMany' }
    return { miss: /no family/i.test(error.message) ? 'nofamily' : error.message }
  }
  return { miss: '', id: data }
}

// Which family a code belongs to, before joining: { name, members, already }.
export async function lookUpFamily(code) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const want = cleanCode(code)
  if (want.length !== FAMILY_CODE_LEN) return { miss: 'code' }
  const { data, error } = await db.rpc('look_up_family', { want_code: want })
  if (error) {
    if (notRunYet(error)) return { miss: 'setup' }
    if (/too many tries/i.test(error.message)) return { miss: 'tooMany' }
    return bad(error)
  }
  if (data?.miss === 'nofamily') return { miss: 'nofamily' }
  return {
    miss: '',
    code: want,
    id: data?.id,
    name: String(data?.name || ''),
    members: Number(data?.members) || 0,
    already: Boolean(data?.already),
  }
}

export async function leaveFamily(familyId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = await db
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', user.id)
  if (error) return { miss: /one parent/i.test(error.message) ? 'lastparent' : error.message }
  return { miss: '' }
}

export async function readFamily(familyId) {
  const db = cloud()
  if (!db) return null
  const user = await me()
  if (!user) return null
  const [famRow, memberRows, tagRows] = await Promise.all([
    db.from('families').select('id, name, code, fold_hour').eq('id', familyId).maybeSingle(),
    db.from('family_members').select('user_id, role, joined_at').eq('family_id', familyId),
    db.from('family_tags').select('id, title, look').eq('family_id', familyId).order('made_at'),
  ])
  if (!famRow.data) return null
  const who = await peopleByIds(db)
  const members = (memberRows.data || [])
    .map((row) => ({
      ...row,
      you: row.user_id === user.id,
      person: who.get(row.user_id) || { user_id: row.user_id },
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'parent' ? -1 : 1
      return personName(a.person).localeCompare(personName(b.person))
    })
  const mine = members.find((row) => row.you)
  return {
    ...famRow.data,
    members,
    tag: tagRows.data?.[0] || null,
    role: mine?.role || 'kid',
    parent: mine?.role === 'parent',
    youId: user.id,
  }
}

export async function setRole(familyId, userId, role) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db
    .from('family_members')
    .update({ role })
    .eq('family_id', familyId)
    .eq('user_id', userId)
  if (error) return { miss: /one parent/i.test(error.message) ? 'lastparent' : error.message }
  return { miss: '' }
}

export async function dropMember(familyId, userId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', userId)
  if (error) return { miss: /one parent/i.test(error.message) ? 'lastparent' : error.message }
  return { miss: '' }
}

// The questions on a family tag ---------------------------------------

export async function listFamilyLamps(familyId, periodKey) {
  const db = cloud()
  if (!db) return { lamps: [], answers: [] }
  const [lampRows, answerRows] = await Promise.all([
    db
      .from('family_lamps')
      .select(FAMILY_LAMP_FIELDS)
      .eq('family_id', familyId)
      .eq('archived', false)
      .order('made_on'),
    db
      .from('family_answers')
      .select('lamp_id, user_id, status, answered_at')
      .eq('family_id', familyId)
      .eq('period_key', periodKey || isoDate(new Date())),
  ])
  return { lamps: lampRows.data || [], answers: answerRows.data || [] }
}

export async function addFamilyLamp(familyId, tagId, question, forId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const text = String(question || '').trim()
  if (!text) return { miss: 'blank' }
  if (!tagId) return { miss: 'notag' }
  const { error } = await db.from('family_lamps').insert({
    family_id: familyId,
    tag_id: tagId,
    question: text,
    for_id: forId || null,
    made_by: user.id,
  })
  return error ? bad(error) : { miss: '' }
}

export async function dropFamilyLamp(id) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.from('family_lamps').update({ archived: true }).eq('id', id)
  return error ? bad(error) : { miss: '' }
}

export async function answerFamilyLamp(familyId, lampId, periodKey, status) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = await db.from('family_answers').upsert(
    {
      family_id: familyId,
      lamp_id: lampId,
      user_id: user.id,
      period_key: periodKey,
      status,
      answered_at: new Date().toISOString(),
    },
    { onConflict: 'lamp_id,user_id,period_key' },
  )
  return error ? bad(error) : { miss: '' }
}


function dueOnFamilyNight(lamp, night) {
  if (lamp.cadence === 'once') {
    if (lamp.once_when === 'by') {
      const dueBy = String(lamp.due_by || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueBy)) return true
      const start = String(lamp.made_on || '').trim() || night
      if (night < start) return false
      return night <= dueBy
    }
    return !lamp.once_on || lamp.once_on === night
  }
  if (lamp.cadence === 'weekly') {
    const day = new Date(`${night}T12:00:00`).getDay()
    return (lamp.weekdays || []).includes(day)
  }
  return true
}

// Only what is actually on you: yours by name, or everyone's.
export async function familyTonight() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []

  const { data: mineRows } = await db
    .from('family_members')
    .select('family_id, families(id, name, fold_hour)')
    .eq('user_id', user.id)
  const families = (mineRows || []).map((row) => row.families).filter(Boolean)
  if (!families.length) return []

  // One query for every family's questions, one for my answers, instead of
  // a pair per family. Somebody in four families made nine round trips.
  const ids = families.map((family) => family.id)
  const nights = new Map(families.map((family) => [family.id, boardDate()]))

  const [lampRows, answerRows] = await Promise.all([
    db
      .from('family_lamps')
      .select(FAMILY_LAMP_FIELDS)
      .in('family_id', ids)
      .eq('archived', false)
      .or(`for_id.is.null,for_id.eq.${user.id}`),
    db
      .from('family_answers')
      .select('lamp_id, family_id, user_id, status, period_key')
      .in('family_id', ids)
      .eq('user_id', user.id)
      .in('period_key', [...new Set(nights.values())]),
  ])

  const out = []
  for (const lamp of lampRows.data || []) {
    const family = families.find((item) => item.id === lamp.family_id)
    if (!family) continue
    const night = nights.get(family.id)
    if (!dueOnFamilyNight(lamp, night)) continue
    if (lamp.made_on && lamp.made_on > night) continue
    out.push({
      family,
      lamp,
      night,
      answer:
        (answerRows.data || []).find(
          (row) => row.lamp_id === lamp.id && row.period_key === night,
        ) || null,
    })
  }
  return out
}

// The phone shell hands over an app-state hook. Check it first: the phone
// also has a stand-in document whose listeners never fire.
function onVisible(fn) {
  const hook = globalThis.__didIOnVisible
  if (typeof hook === 'function') return hook(fn)
  if (typeof document !== 'undefined') {
    function onShow() {
      if (!document.hidden) fn()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }
  return () => {}
}

// PostgREST says this when a function is not in the schema cache, which
// in practice means its SQL file has not been run yet.
function notRunYet(error) {
  return error?.code === 'PGRST202' || /schema cache/i.test(error?.message || '')
}

// Friends who can add to your tonight ------------------------------------
//
// Off by default. Only you can read or change your own list; the friend is
// never told. Family did yous always go straight on and need no switch.

export async function listAutoAdds() {
  const db = cloud()
  if (!db) return new Set()
  const user = await me()
  if (!user) return new Set()
  const { data, error } = await db.from('auto_adds').select('friend_id').eq('owner_id', user.id)
  if (error) return new Set()
  return new Set((data || []).map((row) => row.friend_id))
}

export async function setAutoAdd(friendId, on) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = on
    ? await db.from('auto_adds').insert({ owner_id: user.id, friend_id: friendId })
    : await db.from('auto_adds').delete().eq('owner_id', user.id).eq('friend_id', friendId)
  if (error && !(on && /duplicate|unique/i.test(error.message || ''))) {
    return notRunYet(error) || error.code === '42P01' ? { miss: 'setup' } : bad(error)
  }
  // Anything they already sent can come through now.
  if (on) refreshPeople()
  return { miss: '' }
}

// The did you pulse -------------------------------------------------------
//
// One poll for the whole app, however many badges are on screen. Each look
// claims anything allowed straight onto tonight, counts what still waits,
// and notices a did you that arrived since the last look so the app can
// show a banner. Nothing polls faster than five minutes; coming back to
// the app is what keeps it fresh.

const PULSE_MS = 300000
const PULSE_STALE_MS = 60000
const PULSE_ZERO = { inbox: 0, asks: 0, gifts: 0, news: null }

// Cloud sync is what opens gifts (claim, collection, pop-up). The pulse only
// notices one waiting and asks sync to run, so a gift sent while the app is
// open still shows up.
let giftWaker = null
export function onGiftsWaiting(fn) {
  giftWaker = fn
}

const pulse = {
  userId: '',
  state: PULSE_ZERO,
  seen: null,
  at: 0,
  subs: new Set(),
  adder: null,
  busy: null,
  stop: null,
}

function pulseEmit(next) {
  pulse.state = next
  for (const fn of pulse.subs) fn(next)
}

async function claimAutoSends(db) {
  const { data, error } = await db.rpc('claim_auto_sends')
  if (error) return []
  return (data || []).filter((row) => String(row.question || '').trim())
}

async function pulseLook() {
  if (pulse.busy) return pulse.busy
  pulse.busy = (async () => {
    const db = cloud()
    const user = db ? await me() : null
    if (!db || !user || user.id !== pulse.userId) return
    pulse.at = Date.now()
    // Only claim while something is there to put the questions on tonight.
    const adder = pulse.adder
    const claimed = adder ? await claimAutoSends(db) : []
    // Straight onto tonight before anything else can fail; the server has
    // already marked these kept.
    // Nobody chose these for tonight, so they are optional (see normalizeLamp).
    if (claimed.length) {
      const senders = await peopleByIds(db)
      adder(claimed.map((row) => ({ question: row.question, repeat: row.repeat, optional: true, person: senders.get(row.sender_id) })))
    }
    const fromDidI = adder ? await claimDidITonight(db, user) : []
    if (fromDidI.length) adder(fromDidI)
    const [waiting, asks] = await Promise.all([
      db
        .from('sends')
        .select('id, from_id, kind, question', { count: 'exact' })
        .eq('to_id', user.id)
        .eq('state', 'sent')
        .order('made_at', { ascending: false })
        .limit(20),
      friendAskCount(),
    ])
    const giftRows = await db
      .from('cheer_gifts')
      .select('id', { count: 'exact', head: true })
      .eq('to_id', user.id)
      .is('claimed_at', null)
    const gifts = giftRows.count || 0
    if (user.id !== pulse.userId) return
    if (gifts && giftWaker) giftWaker()
    const rows = waiting.data || []
    const fresh = pulse.seen ? rows.filter((row) => !pulse.seen.has(row.id)) : []
    pulse.seen = new Set([...(pulse.seen || []), ...rows.map((row) => row.id)])

    let news = pulse.state.news
    if (claimed.length || fresh.length) {
      const who = await peopleByIds(db)
      const nameOf = (id) => personName(who.get(id)) || ''
      if (claimed.length) {
        news = {
          id: `added-${claimed[0].send_id}`,
          kind: 'added',
          n: claimed.length,
          name: nameOf(claimed[0].sender_id),
          question: claimed[0].question,
        }
      } else {
        news = {
          id: fresh[0].id,
          kind: fresh[0].kind === 'cheer' ? 'cheer' : 'todo',
          n: fresh.length,
          name: nameOf(fresh[0].from_id),
          question: fresh[0].question,
        }
      }
    }
    pulseEmit({ inbox: waiting.count ?? rows.length, asks, gifts, news })
  })()
    .catch(() => {})
    .finally(() => {
      pulse.busy = null
    })
  return pulse.busy
}

function pulseWatch(user, fn) {
  if (pulse.userId !== user.id) {
    pulse.userId = user.id
    pulse.seen = null
    pulse.at = 0
    pulse.state = PULSE_ZERO
  }
  pulse.subs.add(fn)
  fn(pulse.state)
  if (!pulse.stop) {
    const timer = setInterval(pulseLook, PULSE_MS)
    const stopVisible = onVisible(pulseLook)
    pulse.stop = () => {
      clearInterval(timer)
      stopVisible()
    }
  }
  if (Date.now() - pulse.at > PULSE_STALE_MS) pulseLook()
  return () => {
    pulse.subs.delete(fn)
    if (!pulse.subs.size && pulse.stop) {
      pulse.stop()
      pulse.stop = null
    }
  }
}

/** Look again now, for example after answering something in the inbox. */
export function refreshPeople() {
  if (!pulse.userId) return Promise.resolve()
  return pulseLook()
}

/** What the banner says for a piece of news, and where a tap goes. */
export function didYouNewsLines(news) {
  const name = news.name || t('people.someone')
  if (news.kind === 'added') {
    return {
      title: news.n > 1 ? t('didyou.addedSome', { n: news.n }) : t('didyou.added', { name }),
      body: news.n > 1 ? '' : news.question,
      go: '/tonight',
    }
  }
  if (news.kind === 'cheer') return { title: t('didyou.newCheer', { name }), body: '', go: '/inbox' }
  return {
    title: news.n > 1 ? t('didyou.newSome', { n: news.n }) : t('didyou.newOne', { name }),
    body: news.n > 1 ? '' : news.question,
    go: '/inbox',
  }
}

/** The banner was seen or closed. */
export function dismissPeopleNews() {
  if (pulse.state.news) pulseEmit({ ...pulse.state, news: null })
}

/** { inbox, asks, news } for the signed-in person. */
export function usePeoplePulse(user) {
  const [state, setState] = useState(pulse.state)

  useEffect(() => {
    if (!cloudSetUp() || !user?.id) {
      setState(PULSE_ZERO)
      return undefined
    }
    return pulseWatch(user, setState)
  }, [user?.id])

  return state
}

export function usePeopleCount(user) {
  const { inbox, asks } = usePeoplePulse(user)
  return inbox + asks
}

/**
 * The app shell hands over how to put did yous on tonight. Without it the
 * pulse only counts, so a did you is never marked kept and then lost.
 */
export function useAutoAdd(user, add) {
  const live = useRef(add)
  live.current = add

  useEffect(() => {
    if (!cloudSetUp() || !user?.id) return undefined
    const adder = (questions) => live.current(questions)
    pulse.adder = adder
    // A look that started before this could not claim anything; run one more.
    Promise.resolve(pulse.busy).then(() => {
      if (pulse.adder === adder && pulse.userId === user.id) pulseLook()
    })
    return () => {
      if (pulse.adder === adder) pulse.adder = null
    }
  }, [user?.id])
}

export function useFamilyTonight(user) {
  const [rows, setRows] = useState([])

  const look = useCallback(async () => {
    if (!cloudSetUp() || !user) {
      setRows([])
      return
    }
    setRows(await familyTonight())
  }, [user])

  useEffect(() => {
    look()
    return onVisible(look)
  }, [look])

  return { rows, reload: look }
}
