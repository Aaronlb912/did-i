import { cloud, cloudSetUp } from '../lib/cloud.js'

export function waitlistReady() {
  return cloudSetUp()
}

export async function joinWaitlist(email) {
  const sb = cloud()
  if (!sb) return { ok: false, miss: 'web.waitlist.offline' }

  const trimmed = String(email || '').trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return { ok: false, miss: 'web.waitlist.bad' }

  const { error } = await sb.from('waitlist').insert({ email: trimmed })
  if (error) {
    if (error.code === '23505') return { ok: true, dup: true }
    return { ok: false, miss: 'web.waitlist.miss' }
  }
  return { ok: true }
}

export async function fetchWaitlistCount() {
  const sb = cloud()
  if (!sb) return null
  const { data, error } = await sb.rpc('waitlist_count')
  if (error) return null
  return Number(data) || 0
}
