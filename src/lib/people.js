import { useCallback, useEffect, useState } from 'react'
import { cloud, cloudSetUp } from './cloud.js'
import { t } from './i18n.js'
import { boardDate, isoDate } from './recurrence.js'

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

export function cleanPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return ''
}

export function looksLikePhone(value) {
  return cleanPhone(value).length >= 11
}

export function formatPhone(value) {
  const clean = cleanPhone(value)
  if (!clean) return ''
  const digits = clean.slice(1)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`
  }
  return clean
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
  return row.display_name || formatPhone(row.phone) || ''
}

export function friendAskTitle(person) {
  const name = person?.display_name?.trim()
  if (name) return name
  if (person?.phone) return formatPhone(person.phone)
  return ''
}

export function friendAskNote(person) {
  const name = person?.display_name?.trim()
  const phone = person?.phone ? formatPhone(person.phone) : ''
  if (name && phone) return t('people.wantsFrom', { name, phone })
  if (phone) return t('people.wantsFromPhone', { phone })
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
      'user_id, phone, display_name, share_streak, public_tonight, streak, done_on, invite_code, invited_by, invite_gems_paid',
    )
    .eq('user_id', user.id)
    .maybeSingle()
  return data || { user_id: user.id, phone: '', display_name: '', share_streak: true }
}

export async function savePhone(value) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const phone = cleanPhone(value)
  if (!looksLikePhone(phone)) return { miss: 'short' }
  const { data, error } = await db.rpc('set_my_phone', { wanted: phone })
  if (error) {
    if (/unique|duplicate/i.test(error.message)) return { miss: 'taken' }
    return bad(error)
  }
  return { miss: '', phone: data || phone }
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

// Everyone you can see, in one call. The old way was a second query with
// the profile policy re-checked for every row that came back.
async function peopleByIds(db) {
  const { data } = await db.rpc('known_people')
  return new Map((data || []).map((row) => [row.user_id, row]))
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

export async function askFriend(phone) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const want = cleanPhone(phone)
  if (!looksLikePhone(want)) return { miss: 'short' }
  const mine = await readMine()
  if (!mine?.phone) return { miss: 'nophone' }
  const { data, error } = await db.rpc('find_phone', { wanted: want })
  if (error) return bad(error)
  const found = Array.isArray(data) ? data[0] : data
  if (!found) return { miss: 'nobody' }
  const { error: askErr } = await db
    .from('friend_links')
    .insert({ from_id: user.id, to_id: found.user_id, state: 'asked' })
  if (askErr && !/duplicate|unique/i.test(askErr.message)) return bad(askErr)
  return { miss: '', person: found }
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

export async function dropFriend(otherId) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('drop_friend', { other: otherId })
  return error ? bad(error) : { miss: '' }
}

// Sending a did you to a friend ---------------------------------------

export async function sendDidI(toId, question, note, dueOn) {
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
  })
  if (error) return { miss: /duplicate|unique/i.test(error.message) ? 'already' : error.message }
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

export async function claimCheerGifts() {
  const db = cloud()
  if (!db) return { ids: [], miss: 'off' }
  const { data, error } = await db.rpc('claim_cheer_gifts')
  if (error) return notRunYet(error) ? { ids: [], miss: 'setup' } : { ids: [], ...bad(error) }
  const ids = (data || []).map((row) => row.cheer_id || row).filter(Boolean)
  return { ids, miss: '' }
}

export async function listInbox() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const { data } = await db
    .from('sends')
    .select('id, from_id, kind, question, note, due_on, state, made_at, cheer_id')
    .eq('to_id', user.id)
    .eq('state', 'sent')
    .order('made_at', { ascending: false })
  if (!data?.length) return []
  const who = await peopleByIds(db)
  return data.map((row) => ({ ...row, person: who.get(row.from_id) || { user_id: row.from_id } }))
}

export async function inboxCount() {
  const db = cloud()
  if (!db) return 0
  const user = await me()
  if (!user) return 0
  const { count } = await db
    .from('sends')
    .select('id', { count: 'exact', head: true })
    .eq('to_id', user.id)
    .eq('state', 'sent')
  return count || 0
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
  const [inbox, asks] = await Promise.all([inboxCount(), friendAskCount()])
  return inbox + asks
}

// What you have sent other people, and how it went.
export async function listSent() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const { data } = await db
    .from('sends')
    .select('id, to_id, kind, question, note, due_on, state, made_at')
    .eq('from_id', user.id)
    .order('made_at', { ascending: false })
    .limit(100)
  if (!data?.length) return []
  const who = await peopleByIds(db)
  return data.map((row) => ({ ...row, person: who.get(row.to_id) || { user_id: row.to_id } }))
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
  if (error) return { miss: /no family/i.test(error.message) ? 'nofamily' : error.message }
  return { miss: '', id: data }
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
      .select('id, question, short, cadence, weekdays, once_on, for_id, made_by, made_on')
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

// Tonight, across every family you are in -----------------------------

function dueOnFamilyNight(lamp, night) {
  if (lamp.cadence === 'once') return !lamp.once_on || lamp.once_on === night
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
      .select('id, family_id, question, short, cadence, weekdays, once_on, for_id, made_by, made_on')
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

function onVisible(fn) {
  if (typeof document !== 'undefined') {
    function onShow() {
      if (!document.hidden) fn()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }
  const hook = globalThis.__didIOnVisible
  if (typeof hook === 'function') return hook(fn)
  return () => {}
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

// Did I tonight ---------------------------------------------------------
//
// The one place in the app where somebody who is not a friend can see
// anything about you, and only after the switch is on. Reads go through
// tonight_wall(), which is one call whatever the size of the list.

export const TONIGHT_CHEER_GEMS = 1

export async function setPublicTonight(on) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('set_public_tonight', { on_it: Boolean(on) })
  if (!error) return { miss: '' }
  return notRunYet(error) ? { miss: 'setup' } : bad(error)
}

// PostgREST says this when the function is not in the schema cache,
// which in practice means supabase/tonight.sql has not been run yet.
function notRunYet(error) {
  return error?.code === 'PGRST202' || /schema cache/i.test(error?.message || '')
}

export async function tonightWall(night) {
  const db = cloud()
  if (!db) return { rows: [], tally: 0, miss: 'off' }
  const [wall, tally] = await Promise.all([
    db.rpc('tonight_wall', { wanted: night }),
    db.rpc('tonight_tally', { wanted: night }),
  ])
  if (wall.error) {
    if (notRunYet(wall.error)) return { rows: [], tally: 0, miss: 'setup' }
    return { rows: [], tally: 0, ...bad(wall.error) }
  }
  return { rows: wall.data || [], tally: tally.data || 0, miss: '' }
}

export async function reportTonightLine(id, why = '') {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { error } = await db.rpc('report_tonight', { line: id, why })
  return error ? bad(error) : { miss: '' }
}

export function cleanLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 60)
}

// Push every DID label for tonight up to the board. No picking lines.
export async function syncTonightBoard(labels, night) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const clean = (labels || []).map(cleanLine).filter(Boolean)
  const { error } = await db.rpc('sync_tonight', { wanted: night, labels: clean })
  if (!error) return { miss: '' }
  if (notRunYet(error)) return { miss: 'setup' }
  return bad(error)
}

export async function cheerOn(otherId, night) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const { data, error } = await db.rpc('cheer_on', { other: otherId, wanted: night })
  if (error) return notRunYet(error) ? { miss: 'setup' } : bad(error)
  return { miss: '', fresh: Boolean(data) }
}

// A small poll so a badge can show up without a socket.

export function usePeopleCount(user) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!cloudSetUp() || !user) {
      setCount(0)
      return undefined
    }
    let alive = true
    async function look() {
      const n = await peopleBadgeCount()
      if (alive) setCount(n)
    }
    look()
    // Every minute per person is a lot of traffic for a badge. The check on
    // coming back to the tab is what actually keeps it fresh.
    const timer = window.setInterval(look, 300000)
    const stopVisible = onVisible(look)
    return () => {
      alive = false
      window.clearInterval(timer)
      stopVisible()
    }
  }, [user])

  return count
}
