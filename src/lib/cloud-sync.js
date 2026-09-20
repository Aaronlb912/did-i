import { useEffect, useState } from 'react'
import { deviceKey, deviceLabel, devicePlatform } from './account.js'
import { readShelf, writeShelf } from './board-shelf.js'
import { cloud, cloudSetUp } from './cloud.js'
import { readPrefs, writePrefs } from './prefs.js'
import { readSavedAt } from './saved-at.js'
import { mergeShelves } from './shelf-merge.js'

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
  setState({ how: cloudSetUp() ? 'out' : 'off', at: '', miss: '' })
}

async function putShelf(db, user, shelf, savedAt) {
  const { error } = await db.from('shelves').upsert(
    {
      user_id: user.id,
      doc: shelf,
      saved_at: savedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return error
}

async function putPrefs(db, user) {
  const { error } = await db.from('profiles').upsert(
    {
      user_id: user.id,
      prefs: readPrefs(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  return error
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

    const written = writeShelf(merged, savedAt)
    window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: written }))

    const remotePrefs = profileRow.data?.prefs
    if (remotePrefs && remoteSavedAt && remoteSavedAt > localSavedAt) {
      writePrefs(remotePrefs, true)
    }

    const bad = (await putShelf(db, user, written, savedAt)) || (await putPrefs(db, user))
    if (bad) throw bad

    touchDevice()
    setState({ how: 'saved', at: new Date().toISOString(), miss: '' })
    return written
  } catch (error) {
    setState({ how: 'miss', miss: error?.message || 'Could not reach the account.' })
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
    const bad = (await putShelf(db, user, doc, readSavedAt())) || (await putPrefs(db, user))
    if (bad) throw bad
    setState({ how: 'saved', at: new Date().toISOString(), miss: '' })
  } catch (error) {
    setState({ how: 'miss', miss: error?.message || 'Could not reach the account.' })
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
