import { useEffect, useState } from 'react'
import { recordAppError } from './app-errors.js'
import { deviceKey, deviceLabel, deviceModel, devicePlatform, takeOldDeviceKey } from './account.js'
import { noteAvatar } from './avatar.js'
import { clearAuthSkip } from './auth-gate.js'
import { forgetAccountCaches } from './account-cache.js'
import { clearLocalShelf, readShelf, writeShelf } from './board-shelf.js'
import { cloud, cloudSetUp } from './cloud.js'
import { readPrefs, writePrefs } from './prefs.js'
import { readSavedAt, stampSavedAt } from './saved-at.js'
import { mergeShelves } from './shelf-merge.js'
import {
  forgetAnswerMarks,
  pruneAnswers,
  pullAnswers,
  purgeDemoAnswers,
  pushAnswers,
  shelfWithoutAnswers,
} from './answer-log.js'
import { stripDemoShelf } from './demo-strip.js'
import { personZone } from './zone.js'
import { shelfStreak } from './hall-feel.js'
import { clearWeNights, onWeNights, weNight } from './we-nights.js'
import { allClearTonight, boardDate, countedTonightRows, dueTonight } from './recurrence.js'
import { claimGifts, claimInvites, onGiftsWaiting, readMine, returnGift } from './people.js'
import { queueGifts } from './gift-inbox.js'
import { applyPendingInvite } from './invite-link.js'
import { claimGemPurchases } from './gem-claim.js'
import { applyInvitePayout, mergeGift, mergePurses } from './purse.js'
import { FRAME_IDS } from './frames.js'
import {
  applyCoinCatalogToShelf,
  applyGemBalanceToShelf,
  applyGemOwnedToShelf,
  grantWeeklyGem,
  readCoinCatalog,
  readGemBalance,
  readGemOwned,
} from './wallet.js'
import { closeShelfPastNights } from './daily.js'
import { isAppForeground, onAppForegroundChange } from './app-foreground.js'
import { readAccountUserId, writeAccountUserId } from './session-id.js'
import { flushPendingWidgetCloud, widgetCloudPending } from './widget-cloud-sync.js'
import { awaitWidgetTimeline, reconcileShelfFromWidget, reconcileShelfFromWidgetNow } from './widget-reconcile.js'

export const SHELF_IN = 'did-i-shelf-in'
const GEM_WEEK_ASKED_KEY = 'did-i-gem-week-asked'
export { accountSessionOn } from './session-id.js'
const SYNC_KEY = 'did-i-sync'

const listeners = new Set()
let timer = 0
let pulling = null
let foregroundBound = false
let authBound = false

function loadPersistedSync() {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object') return null
    return {
      how: saved.how || 'out',
      at: saved.at || '',
      miss: saved.miss || '',
    }
  } catch {
    return null
  }
}

function persistSync(next) {
  try {
    if (next.how === 'off') localStorage.removeItem(SYNC_KEY)
    else {
      localStorage.setItem(
        SYNC_KEY,
        JSON.stringify({ how: next.how, at: next.at || '', miss: next.miss || '' }),
      )
    }
  } catch {
    // ok
  }
}

let state = loadPersistedSync() || { how: cloudSetUp() ? 'out' : 'off', at: '', miss: '' }

function setState(patch) {
  state = { ...state, ...patch }
  persistSync(state)
  listeners.forEach((fn) => fn(state))
}

export function readSync() {
  return state
}

export function onSync(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSync() {
  const [now, setNow] = useState(readSync)
  useEffect(() => onSync(setNow), [])
  return now
}

async function me() {
  const db = cloud()
  if (!db) return null
  const { data } = await db.auth.getSession()
  return data?.session?.user || null
}

function readLastUser() {
  return readAccountUserId()
}

function writeLastUser(id) {
  writeAccountUserId(id)
}

export function signedOutSync() {
  // The next person to sign in on this phone starts from nothing.
  forgetAnswerMarks()
  clearWeNights()
  const shelf = clearLocalShelf()
  keepProfileName('')
  writeLastUser('')
  clearAuthSkip()
  setState({ how: cloudSetUp() ? 'out' : 'off', at: '', miss: '' })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: shelf }))
  }
}

// No session. A phone that was signed in lost its account (signed out
// somewhere else), so it starts the next person from nothing. A phone-only
// shelf never belonged to an account, and wiping it throws away the
// questions someone just added.
export function sessionMissing() {
  if (readLastUser()) {
    signedOutSync()
    return
  }
  if (state.how !== 'out') setState({ how: 'out', miss: '' })
}

// Structure only. Answers go through answer-log.js, one at a time,
// because they are the part that grows without end.
async function putShelf(db, user, shelf, savedAt) {
  const { error } = await db.from('shelves').upsert(
    {
      user_id: user.id,
      doc: shelfWithoutAnswers(shelf),
      saved_at: savedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return error
}

// The streak and the night, so friends and Did I tonight have something
// to read. Answers themselves never leave answer_log.
function nightMark(shelf, now = new Date()) {
  const boards = shelf?.boards || []
  const night = boardDate(now)
  const we = weNight(night)
  const hadAny = we.due > 0 || boards.some((book) => countedTonightRows(dueTonight(book, now)).length > 0)
  const clear =
    hadAny &&
    (!we.due || we.clear) &&
    boards.every((book) => countedTonightRows(dueTonight(book, now)).length === 0 || allClearTonight(book, now))
  // The real streak, not the room's glow that stops at five.
  return { streak: shelfStreak(boards, now), doneOn: clear ? night : null, night }
}

async function putPrefs(db, user, shelf) {
  const doc = shelf || readShelf()
  const mark = nightMark(doc)
  const { error } = await db.from('profiles').upsert(
    {
      user_id: user.id,
      prefs: readPrefs(),
      zone: personZone(),
      streak: mark.streak,
      done_on: mark.doneOn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (!error) {
    markCleared(db, user, mark)
    markCard(db, user, doc)
  }
  return error || null
}

// The look and frame you wear, for the small card on a friend's page. Its
// own write, sent only when it changes, so a server without frame_on yet
// never stops the sync above.
let cardSent = ''
function markCard(db, user, shelf) {
  const purse = mergePurses(shelf?.boards || [])
  const look = /^[a-z0-9-]{1,24}$/.test(purse.lookOn || '') ? purse.lookOn : 'lime'
  const frame = FRAME_IDS.has(purse.frame) ? purse.frame : ''
  const key = `${user.id}:${look}:${frame}`
  if (key === cardSent) return
  cardSent = key
  Promise.resolve(db.from('profiles').update({ look_on: look, frame_on: frame }).eq('user_id', user.id))
    .then((res) => {
      if (res?.error) cardSent = ''
    })
    .catch(() => {
      cardSent = ''
    })
}

// Tonight cleared or not, for a friend's week. Sent only when it changes.
let clearedSent = ''
function markCleared(db, user, mark) {
  const key = `${user.id}:${mark.night}:${mark.doneOn ? 1 : 0}`
  if (key === clearedSent) return
  clearedSent = key
  Promise.resolve(db.rpc('mark_cleared', { night: mark.night, cleared: Boolean(mark.doneOn) }))
    .then((res) => {
      if (res?.error) clearedSent = ''
    })
    .catch(() => {
      clearedSent = ''
    })
}

/** Lets push run while a session exists but sync UI still says signed out. */
export function armSyncForUser() {
  if (!cloudSetUp() || state.how === 'off') return
  if (state.how === 'out') setState({ how: 'busy', miss: '' })
}

/** Pull when the account session appears or returns. */
export function bindAuthSync() {
  if (authBound) return
  authBound = true
  const db = cloud()
  if (!db) return

  db.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      armSyncForUser()
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') pullAndMerge()
      return
    }
    if (event === 'SIGNED_OUT') {
      forgetAccountCaches()
      sessionMissing()
    }
  })
}

/** Push pending edits, then pull and merge when the app comes to the front. */
export function bindForegroundSync() {
  if (foregroundBound) return
  foregroundBound = true
  bindAuthSync()

  const db = cloud()
  if (db) {
    db.auth.getSession().then(({ data }) => {
      if (data?.session) armSyncForUser()
    })
  }

  function onWake() {
    if (!isAppForeground()) return
    pullAndMerge()
  }

  // A gift arrived while the app is open: sync opens it. At most once a minute.
  let giftWakeAt = 0
  onGiftsWaiting(() => {
    if (Date.now() - giftWakeAt < 60000) return
    giftWakeAt = Date.now()
    onWake()
  })

  function onSleep() {
    reconcileLocalShelfFromWidget()
    flushPushSoon()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onWake()
      else onSleep()
    })
  }

  onAppForegroundChange((on) => {
    if (on) onWake()
    else onSleep()
  })
}

// Pull what the account has, fold it into what this phone has, then send
// the combined shelf back so every phone ends up holding the same thing.
function reconcileLocalShelfFromWidget() {
  return reconcileShelfFromWidgetNow()
}

async function pullAndMergeOnce() {
  const db = cloud()
  if (!db) return null
  try {
    const user = await me()
    if (!user) {
      sessionMissing()
      return null
    }
    setState({ how: 'busy', miss: '' })
    const [shelfRow, profileRow] = await Promise.all([
      db.from('shelves').select('doc, saved_at').eq('user_id', user.id).maybeSingle(),
      db.from('profiles').select('prefs').eq('user_id', user.id).maybeSingle(),
    ])
    if (shelfRow.error) throw shelfRow.error

    await awaitWidgetTimeline()
    const lastUser = readLastUser()
    let local = reconcileLocalShelfFromWidget()
    let localSavedAt = readSavedAt()
    if (lastUser && lastUser !== user.id) {
      local = clearLocalShelf()
      localSavedAt = ''
    }
    const remote = shelfRow.data?.doc || null
    const remoteSavedAt = shelfRow.data?.saved_at || ''
    const merged = mergeShelves(local, remote, localSavedAt, remoteSavedAt)
    const metaAt = remoteSavedAt > localSavedAt ? remoteSavedAt : localSavedAt
    // A delete or a tap made on this phone while the pull was out would be
    // written over by the older shelf the pull started from. When the phone
    // saved since, fold its newest copy in first (its gone list included).
    let seenAt = readSavedAt()
    const land = (next, at) => {
      const nowAt = readSavedAt()
      const base = nowAt !== seenAt ? mergeShelves(readShelf(), next, nowAt, at) : next
      const out = writeShelf(base, at)
      seenAt = readSavedAt()
      return out
    }

    // Fold in every answer the account has that this phone has not seen.
    const pulled = await pullAnswers(merged)
    if (pulled.miss) throw new Error(pulled.miss)

    let written = land(closeShelfPastNights(pulled.shelf), metaAt)
    // Gifts go straight into the collection. One already owned goes back to
    // the giver; the rest wait for the pop-up.
    const { gifts } = await claimGifts()
    if (gifts.length) {
      const fresh = []
      let boards = written.boards
      for (const gift of gifts) {
        if (boards.some((book) => mergeGift(book, gift).had)) {
          await returnGift(gift.id).catch(() => {})
          continue
        }
        boards = boards.map((book) => mergeGift(book, gift).book)
        fresh.push(gift)
      }
      written = land({ ...written, boards }, metaAt)
      queueGifts(fresh)
    }
    await claimGemPurchases()
    // A code saved from an invite link is used here, so the claim below pays it.
    await applyPendingInvite().catch(() => {})
    const invited = await claimInvites()
    if (invited.gems > 0 || invited.looks.length || invited.buddies.length || invited.frames.length) {
      let changed = false
      const boards = written.boards.map((item) => {
        if (item.id !== written.currentId) return item
        const next = applyInvitePayout(item, invited)
        if (next !== item) changed = true
        return next
      })
      if (changed) written = land({ ...written, boards }, metaAt)
    }

    // A weekly gem earned signed out only lived on the phone, and the server
    // balance below replaced it. Ask the server for that week once per
    // account; it checks the week and pays each week at most once.
    const gemWeek = String(written.gemWeek || '')
    const gemAsk = `${user.id}:${gemWeek}`
    let gemAsked = ''
    try {
      gemAsked = localStorage.getItem(GEM_WEEK_ASKED_KEY) || ''
    } catch {
      gemAsked = ''
    }
    if (gemWeek && gemAsked !== gemAsk) {
      const paid = await grantWeeklyGem(gemWeek).catch(() => null)
      if (paid != null) {
        try {
          localStorage.setItem(GEM_WEEK_ASKED_KEY, gemAsk)
        } catch {
          // Asks again next sync; the server still pays once.
        }
      }
    }

    const bal = await readGemBalance()
    if (bal != null) written = applyGemBalanceToShelf(written, bal)
    const coinBag = await readCoinCatalog()
    if (coinBag) written = applyCoinCatalogToShelf(written, coinBag)
    const gemBag = await readGemOwned()
    if (gemBag) written = applyGemOwnedToShelf(written, gemBag)

    const uploadAt = new Date().toISOString()
    written = reconcileShelfFromWidget(written)
    written = land(written, uploadAt)
    window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: written }))

    const remotePrefs = profileRow.data?.prefs
    if (remotePrefs && remoteSavedAt && remoteSavedAt > localSavedAt) {
      writePrefs(remotePrefs, true)
    }

    const bad = (await putShelf(db, user, written, uploadAt)) || (await putPrefs(db, user, written))
    if (bad) throw bad

    // Opening the app is the one moment worth reconciling in full: send
    // everything, then clear out answers whose question is gone.
    const sent = await pushAnswers(written, true)
    if (sent.miss) throw new Error(sent.miss)
    await pruneAnswers(written)
    if (widgetCloudPending()) await flushPendingWidgetCloud()

    touchDevice()
    writeLastUser(user.id)
    setState({ how: 'saved', at: new Date().toISOString(), miss: '' })
    return written
  } catch (error) {
    setState({ how: 'miss', miss: error?.message || 'account.syncMiss' })
    recordAppError('sync', error).catch(() => {})
    return null
  }
}

export function pullAndMerge() {
  if (pulling) return pulling
  pulling = pullAndMergeOnce().finally(() => {
    pulling = null
  })
  return pulling
}

export async function pushNow(shelf) {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) {
    sessionMissing()
    return
  }
  setState({ how: 'busy', miss: '' })
  try {
    const doc = shelf || readShelf()
    // Usually one answer. The document only moves because a tag or a
    // question changed, and those are small.
    const sent = await pushAnswers(doc)
    if (sent.miss) throw new Error(sent.miss)
    const uploadAt = new Date().toISOString()
    stampSavedAt(uploadAt)
    const bad = (await putShelf(db, user, doc, uploadAt)) || (await putPrefs(db, user, doc))
    if (bad) throw bad
    setState({ how: 'saved', at: new Date().toISOString(), miss: '' })
  } catch (error) {
    setState({ how: 'miss', miss: error?.message || 'account.syncMiss' })
    recordAppError('sync', error).catch(() => {})
  }
}

let weMark = ''
onWeNights(() => {
  const now = weNight(boardDate(new Date()))
  const mark = `${boardDate(new Date())}:${now.due}:${now.done}`
  if (mark === weMark) return
  const first = !weMark
  weMark = mark
  if (!first) pushSoon(readShelf())
})

export function pushSoon(shelf) {
  if (!cloudSetUp()) return
  if (state.how === 'off') return
  if (state.how === 'out') {
    armSyncForUser()
    if (state.how === 'out') return
  }
  window.clearTimeout(timer)
  const doc = shelf
  timer = window.setTimeout(() => pushNow(doc), 1500)
}

export function flushPushSoon() {
  if (!cloudSetUp()) return
  if (state.how === 'off' || state.how === 'out') return
  if (!timer) return
  window.clearTimeout(timer)
  timer = 0
  return pushNow(readShelf())
}

export async function touchDevice() {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  const row = {
    user_id: user.id,
    device_key: deviceKey(),
    label: deviceLabel(),
    platform: devicePlatform(),
    last_seen_at: new Date().toISOString(),
  }
  const model = deviceModel()
  const first = await db.from('devices').upsert(model ? { ...row, model } : row, { onConflict: 'user_id,device_key' })
  // Before supabase/device-names.sql is applied there is no model column.
  if (first?.error && model) await db.from('devices').upsert(row, { onConflict: 'user_id,device_key' })
  // This phone moved to its stable id: its old row is the same phone.
  const old = takeOldDeviceKey()
  if (old && old !== deviceKey()) {
    await db.from('devices').delete().eq('user_id', user.id).eq('device_key', old)
  }
}

// Phones seen in the last 90 days. The server removes older rows when a
// phone checks in (supabase/reliability.sql).
export const DEVICE_FRESH_DAYS = 90

export async function listDevices() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const since = new Date(Date.now() - DEVICE_FRESH_DAYS * 86400000).toISOString()
  const pick = (cols) =>
    db
      .from('devices')
      .select(cols)
      .eq('user_id', user.id)
      .gt('last_seen_at', since)
      .order('last_seen_at', { ascending: false })
  const named = await pick('device_key, label, platform, last_seen_at, model, name')
  if (!named.error) return named.data || []
  // Older database: no model or name yet.
  const { data } = await pick('device_key, label, platform, last_seen_at')
  return data || []
}

// The owner's own name for a phone. 40 characters, same as the server check.
export const DEVICE_NAME_MAX = 40

export async function renameDevice(key, name) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const clean = String(name || '').trim().slice(0, DEVICE_NAME_MAX)
  const { error } = await db.from('devices').update({ name: clean }).eq('user_id', user.id).eq('device_key', key)
  return { miss: error ? error.message : '' }
}

// Every phone but this one. Their app signs in again on next open if still
// signed in; this only clears the list (and their push token).
export async function forgetOtherDevices() {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  await db.from('devices').delete().eq('user_id', user.id).neq('device_key', deviceKey())
}

export async function forgetDevice(key) {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  await db.from('devices').delete().eq('user_id', user.id).eq('device_key', key)
}

// Your display name from the last profile load, so Account and Friends show
// it right away instead of "Add your name" while the server answers.
const NAME_KEY = 'did-i-profile-name'

export function keptProfileName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

function keepProfileName(name) {
  try {
    if (name) localStorage.setItem(NAME_KEY, String(name))
    else localStorage.removeItem(NAME_KEY)
  } catch {
    // Shows again after the next profile load.
  }
}

export async function loadProfile() {
  const db = cloud()
  if (!db) return null
  const user = await me()
  if (!user) return null
  const { data } = await db
    .from('profiles')
    .select('display_name, look_on, badge_cheer, prefs, gem_balance, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()
  if (data) {
    noteAvatar(data.avatar_url)
    keepProfileName(data.display_name || '')
  }
  return data || null
}

export async function saveProfile(patch) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = await db.from('profiles').upsert(
    { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  if (!error && typeof patch?.display_name === 'string') keepProfileName(patch.display_name)
  return { miss: error ? error.message : '' }
}

export async function exportAll() {
  const shelf = readShelf()
  const profile = await loadProfile()
  const devices = await listDevices()
  const social = await exportSocial().catch(() => ({}))
  return {
    kind: 'did-i-account',
    pulledAt: new Date().toISOString(),
    prefs: readPrefs(),
    profile,
    devices,
    shelf,
    ...social,
  }
}

// Your side of Did we and Did you: the cards you are on, your own rows and
// answers, and what you sent or got. Only what the database lets you read.
async function exportSocial() {
  const db = cloud()
  const user = db ? await me() : null
  if (!db || !user) return {}
  const [mine, answers, sends] = await Promise.all([
    db
      .from('we_members')
      .select('card_id, state, turn, asked_at, joined_at, said_no_at, folder, topics')
      .eq('user_id', user.id),
    db.from('we_answers').select('card_id, night, status, answered_at').eq('user_id', user.id).limit(5000),
    db
      .from('sends')
      .select('id, from_id, to_id, kind, question, note, due_on, state, made_at, repeat')
      .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
      .limit(5000),
  ])
  const ids = (mine.data || []).map((row) => row.card_id)
  const cards = ids.length
    ? (
        await db
          .from('we_cards')
          .select('id, question, mode, shows, cadence, weekdays, goal_nights, starts_on, archived, made_at')
          .in('id', ids)
      ).data || []
    : []
  return {
    didWe: { cards, memberships: mine.data || [], answers: answers.data || [] },
    didYou: sends.data || [],
  }
}
