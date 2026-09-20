import { useEffect, useState } from 'react'
import { deviceKey, deviceLabel, devicePlatform } from './account.js'
import { readShelf, writeShelf } from './board-shelf.js'
import { cloud, cloudSetUp } from './cloud.js'
import { readPrefs, writePrefs } from './prefs.js'
import { readSavedAt } from './saved-at.js'
import { mergeShelves } from './shelf-merge.js'
import {
  forgetAnswerMarks,
  pruneAnswers,
  pullAnswers,
  pushAnswers,
  shelfWithoutAnswers,
} from './answer-log.js'
import { personZone } from './zone.js'
import { shelfHeat } from './hall-feel.js'
import { allClearTonight, boardDate, dueTonight } from './recurrence.js'
import { didTonightLabels } from './dit-board.js'
import { DIT_ENABLED } from './features.js'
import { claimCheerGifts, readMine, syncTonightBoard } from './people.js'
import { claimGemPurchases } from './gem-buy.js'
import { addGemsShelf, mergeGiftCheers } from './purse.js'
import { closeShelfPastNights } from './daily.js'

export const SHELF_IN = 'did-i-shelf-in'

const listeners = new Set()
let state = { how: cloudSetUp() ? 'out' : 'off', at: '', miss: '' }
let timer = 0

function setState(patch) {
  state = { ...state, ...patch }
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

export function signedOutSync() {
  // The next person to sign in on this phone starts from nothing.
  forgetAnswerMarks()
  setState({ how: cloudSetUp() ? 'out' : 'off', at: '', miss: '' })
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

// Pull what the account has, fold it into what this phone has, then send
// the combined shelf back so every phone ends up holding the same thing.
export async function pullAndMerge() {
  const db = cloud()
  if (!db) return null
  const user = await me()
  if (!user) {
    signedOutSync()
    return null
  }
  setState({ how: 'busy', miss: '' })
  try {
    const [shelfRow, profileRow] = await Promise.all([
      db.from('shelves').select('doc, saved_at').eq('user_id', user.id).maybeSingle(),
      db.from('profiles').select('prefs').eq('user_id', user.id).maybeSingle(),
    ])
    if (shelfRow.error) throw shelfRow.error

    const local = readShelf()
    const localSavedAt = readSavedAt()
    const remote = shelfRow.data?.doc || null
    const remoteSavedAt = shelfRow.data?.saved_at || ''
    const merged = mergeShelves(local, remote, localSavedAt, remoteSavedAt)
    const savedAt = remoteSavedAt > localSavedAt ? remoteSavedAt : localSavedAt

    // Fold in every answer the account has that this phone has not seen.
    const pulled = await pullAnswers(merged)
    if (pulled.miss) throw new Error(pulled.miss)

    let written = writeShelf(closeShelfPastNights(pulled.shelf), savedAt)
    const gifts = await claimCheerGifts()
    if (gifts.ids?.length) {
      const boards = written.boards.map((book) => mergeGiftCheers(book, gifts.ids))
      written = writeShelf({ ...written, boards }, savedAt)
    }
    const bought = await claimGemPurchases()
    if (bought.gems > 0) {
      written = writeShelf(addGemsShelf(written, bought.gems), savedAt)
    }
    window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: written }))

    const remotePrefs = profileRow.data?.prefs
    if (remotePrefs && remoteSavedAt && remoteSavedAt > localSavedAt) {
      writePrefs(remotePrefs, true)
    }

    const bad = (await putShelf(db, user, written, savedAt)) || (await putPrefs(db, user, written))
    if (bad) throw bad

    // Opening the app is the one moment worth reconciling in full: send
    // everything, then clear out answers whose question is gone.
    const sent = await pushAnswers(written, true)
    if (sent.miss) throw new Error(sent.miss)
    await pruneAnswers(written)

    touchDevice()
    setState({ how: 'saved', at: new Date().toISOString(), miss: '' })
    return written
  } catch (error) {
    setState({ how: 'miss', miss: error?.message || 'account.syncMiss' })
    return null
  }
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
    const bad = (await putShelf(db, user, doc, readSavedAt())) || (await putPrefs(db, user, doc))
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
    .select('display_name, look_on, badge_cheer, prefs')
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
