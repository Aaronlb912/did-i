import { useEffect, useState } from 'react'
import { cloud } from './cloud.js'

// Your own profile picture: a public link in the avatars bucket, saved on
// your profile so friends, family and anyone who looks up your friend ID see
// it. The phone picks, crops and shrinks the photo (native/lib/avatar-pick.js);
// this file only stores it.

const KEY = 'did-i-avatar'
const listeners = new Set()

function readKept() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

function keep(url) {
  try {
    if (url) localStorage.setItem(KEY, url)
    else localStorage.removeItem(KEY)
  } catch {
    // Shows again after the next profile load.
  }
  listeners.forEach((fn) => fn(url))
}

async function me(db) {
  const { data } = await db.auth.getSession()
  return data?.session?.user || null
}

// Files in your folder other than `keepName`, so a change leaves one behind.
async function clearOld(db, uid, keepName = '') {
  const { data } = await db.storage.from('avatars').list(uid, { limit: 20 })
  const old = (data || []).map((file) => `${uid}/${file.name}`).filter((path) => path !== keepName)
  if (old.length) await db.storage.from('avatars').remove(old)
}

// bytes: a small square JPEG (ArrayBuffer). Returns { url } or { miss }.
export async function saveAvatar(bytes) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me(db)
  if (!user) return { miss: 'out' }
  // Make room first: the bucket holds at most 3 files per person.
  await clearOld(db, user.id).catch(() => {})
  const path = `${user.id}/${Date.now()}.jpg`
  const up = await db.storage.from('avatars').upload(path, bytes, { contentType: 'image/jpeg' })
  if (up.error) return { miss: /size|large/i.test(up.error.message) ? 'avatar.tooBig' : 'avatar.saveFail' }
  const url = db.storage.from('avatars').getPublicUrl(path).data.publicUrl
  const { error } = await db
    .from('profiles')
    .upsert({ user_id: user.id, avatar_url: url, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { miss: 'avatar.saveFail' }
  keep(url)
  return { url }
}

export async function removeAvatar() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me(db)
  if (!user) return { miss: 'out' }
  const { error } = await db
    .from('profiles')
    .upsert({ user_id: user.id, avatar_url: '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return { miss: 'avatar.saveFail' }
  await clearOld(db, user.id).catch(() => {})
  keep('')
  return { miss: '' }
}

// Set from the profile load, so a photo set on another phone shows here.
export function noteAvatar(url) {
  const next = String(url || '')
  if (next !== readKept()) keep(next)
}

export function useMyAvatar() {
  const [url, setUrl] = useState(readKept)
  useEffect(() => {
    listeners.add(setUrl)
    return () => listeners.delete(setUrl)
  }, [])
  return url
}
