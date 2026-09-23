import { useEffect, useState } from 'react'
import { deviceKey, deviceLabel, devicePlatform } from './account.js'
import { clearAuthSkip } from './auth-gate.js'
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
import { shelfHeat } from './hall-feel.js'
import { allClearTonight, boardDate, dueTonight } from './recurrence.js'
import { didTonightLabels } from './dit-board.js'
import { DIT_ENABLED } from './features.js'
import { claimCheerGifts, claimInvites, readMine, syncTonightBoard } from './people.js'
import { claimGemPurchases } from './gem-claim.js'
import { applyInvitePayout, mergeGiftCheers } from './purse.js'
import { applyCoinCatalogToShelf, applyGemBalanceToShelf, readCoinCatalog, readGemBalance } from './wallet.js'
import { closeShelfPastNights } from './daily.js'
import { isAppForeground, onAppForegroundChange } from './app-foreground.js'
import { readAccountUserId, writeAccountUserId } from './session-id.js'
import { flushPendingWidgetCloud, widgetCloudPending } from './widget-cloud-sync.js'
import { awaitWidgetTimeline, reconcileShelfFromWidget, reconcileShelfFromWidgetNow } from './widget-reconcile.js'

export const SHELF_IN = 'did-i-shelf-in'
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
  const shelf = clearLocalShelf()
  writeLastUser('')
  clearAuthSkip()
  setState({ how: cloudSetUp() ? 'out' : 'off', at: '', miss: '' })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: shelf }))
  }
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
  const hadAny = boards.some((book) => dueTonight(book, now).length > 0)
  const clear =
    hadAny &&
    boards.every((book) => dueTonight(book, now).length === 0 || allClearTonight(book, now))
  return { streak: shelfHeat(boards, now), doneOn: clear ? night : null }
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
  if (error) return error
  if (!DIT_ENABLED || !mark.doneOn) return null
  const mine = await readMine()
  if (!mine?.public_tonight) return null
  const synced = await syncTonightBoard(didTonightLabels(doc, mark.doneOn), mark.doneOn)
  return synced.miss && synced.miss !== 'setup' ? new Error(synced.miss) : null
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
    if (event === 'SIGNED_OUT') signedOutSync()
  })
}

/** Push pending edits, then pull and merge when the app comes to the front. */
export function bindForegroundSync() {
  if (foregroundBound) return
  foregroundBound = true
  bindAuthSync()

  function onWake() {
    if (!isAppForeground()) return
    pullAndMerge()
  }

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
      signedOutSync()
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

    // Fold in every answer the account has that this phone has not seen.
    const pulled = await pullAnswers(merged)
    if (pulled.miss) throw new Error(pulled.miss)

    let written = writeShelf(closeShelfPastNights(pulled.shelf), metaAt)
    const gifts = await claimCheerGifts()
    if (gifts.ids?.length) {
      const boards = written.boards.map((book) => mergeGiftCheers(book, gifts.ids))
      written = writeShelf({ ...written, boards }, metaAt)
    }
    await claimGemPurchases()
    const invited = await claimInvites()
    if (invited.gems > 0 || invited.looks.length) {
      const boards = written.boards.map((item) =>
        item.id === written.currentId ? applyInvitePayout(item, invited) : item,
      )
      written = writeShelf({ ...written, boards }, metaAt)
    }

    const bal = await readGemBalance()
    if (bal != null) written = applyGemBalanceToShelf(written, bal)
    const coinBag = await readCoinCatalog()
    if (coinBag) written = applyCoinCatalogToShelf(written, coinBag)

    const uploadAt = new Date().toISOString()
    written = reconcileShelfFromWidget(written)
    written = writeShelf(written, uploadAt)
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
    signedOutSync()
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
  }
}

export function pushSoon(shelf) {
  if (!cloudSetUp()) return
  if (state.how === 'off' || state.how === 'out') return
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
  await db.from('devices').upsert(
    {
      user_id: user.id,
      device_key: deviceKey(),
      label: deviceLabel(),
      platform: devicePlatform(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_key' },
  )
}

export async function listDevices() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const { data } = await db
    .from('devices')
    .select('device_key, label, platform, last_seen_at')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false })
  return data || []
}

export async function forgetDevice(key) {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  await db.from('devices').delete().eq('user_id', user.id).eq('device_key', key)
}

export async function loadProfile() {
  const db = cloud()
  if (!db) return null
  const user = await me()
  if (!user) return null
  const { data } = await db
    .from('profiles')
    .select('display_name, look_on, badge_cheer, prefs, gem_balance')
    .eq('user_id', user.id)
    .maybeSingle()
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
  return { miss: error ? error.message : '' }
}

export async function exportAll() {
  const shelf = readShelf()
  const profile = await loadProfile()
  const devices = await listDevices()
  return {
    kind: 'did-i-account',
    pulledAt: new Date().toISOString(),
    prefs: readPrefs(),
    profile,
    devices,
    shelf,
  }
}
